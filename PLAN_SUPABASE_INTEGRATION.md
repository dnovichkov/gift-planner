# План интеграции Supabase с offline-first поддержкой

## Статус: Код готов, требуется настройка Supabase

Клиентский код полностью реализован. Для запуска необходимо:
1. Создать проект на [supabase.com](https://supabase.com)
2. Выполнить SQL-скрипты из раздела "Шаг 1"
3. Создать файл `.env.local` с credentials

## Обзор

Добавление бэкенда с авторизацией через Supabase при сохранении offline-first подхода.

**Стратегия:** IndexedDB остаётся primary storage, Supabase используется для синхронизации и бэкапа.

**Conflict resolution:** Last-Write-Wins по полю `updatedAt`.

---

## Шаг 1: Настройка Supabase проекта

### 1.1 Создание таблиц в PostgreSQL

```sql
-- Таблица holidays
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT DEFAULT '',
  budget NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Таблица recipients
CREATE TABLE public.recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holiday_id UUID NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'adult' CHECK (type IN ('adult', 'child', 'family')),
  note TEXT DEFAULT '',
  budget NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Таблица gifts
CREATE TABLE public.gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
  holiday_id UUID NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  cost NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'not_bought' CHECK (status IN ('not_bought', 'bought')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Индексы
CREATE INDEX idx_holidays_user_id ON public.holidays(user_id);
CREATE INDEX idx_recipients_holiday_id ON public.recipients(holiday_id);
CREATE INDEX idx_gifts_recipient_id ON public.gifts(recipient_id);
CREATE INDEX idx_gifts_holiday_id ON public.gifts(holiday_id);
```

### 1.2 Row Level Security (RLS)

```sql
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- Политики: пользователь видит только свои данные
CREATE POLICY "Users can CRUD own holidays" ON public.holidays
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own recipients" ON public.recipients
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own gifts" ON public.gifts
  FOR ALL USING (auth.uid() = user_id);
```

### 1.3 Триггер updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER holidays_updated_at BEFORE UPDATE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER recipients_updated_at BEFORE UPDATE ON public.recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER gifts_updated_at BEFORE UPDATE ON public.gifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Шаг 2: Установка зависимостей

```bash
npm install @supabase/supabase-js
```

**Новые файлы:**
- `.env.example` — шаблон переменных окружения
- `src/js/config/supabase.config.js` — конфигурация Supabase

---

## Шаг 3: Слой авторизации

**Новые файлы:**
| Файл | Описание |
|------|----------|
| `src/js/services/AuthService.js` | Сервис авторизации (signUp, signIn, signOut) |
| `src/js/components/AuthModal.js` | Модальное окно входа/регистрации |
| `src/js/components/UserProfile.js` | Компонент профиля в хедере |

**Модификации:**
| Файл | Изменения |
|------|-----------|
| `src/js/events.js` | Добавить AUTH_STATE_CHANGED, NETWORK_STATUS_CHANGED, SYNC_* события |

---

## Шаг 4: Слой синхронизации

**Новые файлы:**
| Файл | Описание |
|------|----------|
| `src/js/services/SyncManager.js` | Управление синхронизацией, очередь операций, conflict resolution |

**Модификации:**
| Файл | Изменения |
|------|-----------|
| `src/js/db/idb-wrapper.js` | Добавить store `syncQueue`, методы `upsert`, `addToSyncQueue`, `getSyncQueue` |

**Логика синхронизации:**
```
1. Все CRUD операции сначала выполняются в IndexedDB
2. Операция добавляется в syncQueue
3. Если онлайн — обрабатываем очередь немедленно
4. Если офлайн — очередь ждёт восстановления связи
5. При синхронизации: push локальных изменений → pull с сервера
```

---

## Шаг 5: Модификация сервисов

**Файлы для изменения:**
| Файл | Изменения |
|------|-----------|
| `src/js/services/HolidayService.js` | Добавить userId, вызов syncManager.queueOperation() |
| `src/js/services/RecipientService.js` | Добавить userId, вызов syncManager.queueOperation() |
| `src/js/services/GiftService.js` | Добавить userId, вызов syncManager.queueOperation() |

**Паттерн изменения:**
```javascript
async create(data) {
  const id = await db.add('holidays', { ...data, userId: authService.getUserId() });
  const holiday = await this.getById(id);
  eventBus.emit(AppEvents.HOLIDAY_CREATED, holiday);

  // НОВОЕ: добавляем в очередь синхронизации
  if (authService.isAuthenticated()) {
    await syncManager.queueOperation('create', 'holidays', id, holiday);
  }

  return id;
}
```

---

## Шаг 6: UI изменения

**Модификации:**
| Файл | Изменения |
|------|-----------|
| `index.html` | Добавить контейнер `#user-profile-container` в header |
| `src/js/main.js` | Инициализация AuthService, SyncManager, UserProfile |

**Новые стили:**
| Файл | Описание |
|------|----------|
| `src/styles/components/auth.css` | Стили для авторизации, индикаторов сети и синхронизации |

---

## Шаг 7: Миграция данных

**Новый файл:**
| Файл | Описание |
|------|----------|
| `src/js/services/MigrationService.js` | Перенос локальных данных в аккаунт при первом входе |

**Логика:**
1. При входе проверяем, есть ли локальные данные без userId
2. Если есть — предлагаем мигрировать в аккаунт
3. При согласии — обновляем userId и синхронизируем

---

## Шаг 8: Тестирование

**Сценарии:**
1. Регистрация / вход / выход
2. Создание данных офлайн → синхронизация при восстановлении связи
3. Синхронизация между устройствами
4. Миграция локальных данных при первом входе
5. Conflict resolution при одновременном редактировании

---

## Итоговая структура новых файлов

```
src/js/
├── config/
│   └── supabase.config.js          [НОВЫЙ]
├── services/
│   ├── AuthService.js              [НОВЫЙ]
│   ├── SyncManager.js              [НОВЫЙ]
│   ├── MigrationService.js         [НОВЫЙ]
│   ├── HolidayService.js           [МОДИФИКАЦИЯ]
│   ├── RecipientService.js         [МОДИФИКАЦИЯ]
│   └── GiftService.js              [МОДИФИКАЦИЯ]
├── components/
│   ├── AuthModal.js                [НОВЫЙ]
│   └── UserProfile.js              [НОВЫЙ]
├── db/
│   └── idb-wrapper.js              [МОДИФИКАЦИЯ]
├── events.js                       [МОДИФИКАЦИЯ]
└── main.js                         [МОДИФИКАЦИЯ]

src/styles/components/
└── auth.css                        [НОВЫЙ]

.env.example                        [НОВЫЙ]
```

---

## Оценка объёма

| Категория | Количество |
|-----------|------------|
| Новых файлов | 7 |
| Модифицированных файлов | 6 |
| Строк нового кода | ~800-1000 |
| SQL для Supabase | ~80 строк |

---

## Требования для начала

1. Создать проект на [supabase.com](https://supabase.com)
2. Получить URL и anon key из настроек проекта
3. Выполнить SQL-скрипты из Шага 1 в SQL Editor Supabase
