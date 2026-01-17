console.log('[MAIN] Начало загрузки main.js');

import { router } from './router.js';
import { eventBus, AppEvents } from './events.js';
import { db } from './db/idb-wrapper.js';
import { toast } from './components/Toast.js';
import { HomePage } from './pages/HomePage.js';
import { HolidayDashboard } from './pages/HolidayDashboard.js';
import { RecipientDetail } from './pages/RecipientDetail.js';
import { authService } from './services/AuthService.js';
import { syncManager } from './services/SyncManager.js';
import { migrationService } from './services/MigrationService.js';
import { UserProfile } from './components/UserProfile.js';

console.log('[MAIN] Все импорты загружены');

class App {
  constructor() {
    this.router = router;
    this.eventBus = eventBus;
    this.db = db;
    this.currentPage = null;
    this.userProfile = null;
  }

  async init() {
    console.log('[APP] 1. Gift Planner запускается...');

    try {
      // Инициализируем базу данных
      console.log('[APP] 2. Открываем базу данных...');
      await this.db.openDb();
      console.log('[APP] 3. База данных готова');

      // Инициализируем Toast
      console.log('[APP] 4. Инициализируем Toast...');
      toast.init();
      console.log('[APP] 5. Toast готов');

      // Инициализируем AuthService
      console.log('[APP] 5.1. Инициализируем AuthService...');
      const isSupabaseConfigured = authService.init();
      console.log('[APP] 5.2. Supabase настроен:', isSupabaseConfigured);

      // Инициализируем SyncManager и MigrationService
      if (isSupabaseConfigured) {
        console.log('[APP] 5.3. Инициализируем SyncManager...');
        syncManager.init(authService);
        console.log('[APP] 5.4. SyncManager готов');

        console.log('[APP] 5.4.1. Инициализируем MigrationService...');
        migrationService.init(authService, syncManager);
        console.log('[APP] 5.4.2. MigrationService готов');
      }

      // Инициализируем компонент профиля пользователя
      const profileContainer = document.getElementById('user-profile-container');
      if (profileContainer) {
        console.log('[APP] 5.5. Инициализируем UserProfile...');
        this.userProfile = new UserProfile(profileContainer);
        console.log('[APP] 5.6. UserProfile готов');
      }

      // Проверяем текущую сессию
      if (isSupabaseConfigured) {
        console.log('[APP] 5.7. Проверяем сессию...');
        await authService.getCurrentUser();
        console.log('[APP] 5.8. Сессия проверена');
      }

      // Регистрируем маршруты
      console.log('[APP] 6. Регистрируем маршруты...');
      this.setupRoutes();
      console.log('[APP] 7. Маршруты зарегистрированы');

      // Слушаем изменения маршрута ПЕРЕД инициализацией роутера
      console.log('[APP] 8. Подписываемся на ROUTE_CHANGED...');
      eventBus.on(AppEvents.ROUTE_CHANGED, (data) => {
        console.log('[APP] ROUTE_CHANGED event received:', data);
        this.handleRouteChange(data);
      });

      // Инициализируем роутер
      console.log('[APP] 9. Инициализируем роутер...');
      this.router.init();
      console.log('[APP] 10. Роутер инициализирован');

      // Глобальный обработчик ошибок
      window.addEventListener('error', (e) => {
        console.error('Глобальная ошибка:', e.error);
        toast.error('Произошла ошибка: ' + (e.error?.message || 'Неизвестная ошибка'));
      });

      // Глобальное событие загрузки данных
      eventBus.emit(AppEvents.DATA_LOADED);
      console.log('[APP] 11. Инициализация завершена');

    } catch (error) {
      console.error('[APP] ОШИБКА инициализации приложения:', error);
      document.getElementById('app-main').innerHTML = `
        <div class="error-state">
          <h1>Ошибка инициализации</h1>
          <p>${error.message}</p>
          <p>Проверьте консоль браузера (F12) для деталей.</p>
        </div>
      `;
    }
  }

  setupRoutes() {
    // Главная страница
    router.addRoute('/', { component: HomePage, name: 'home' });

    // Страница праздника
    router.addRoute('/holiday/:id', { component: HolidayDashboard, name: 'holiday' });

    // Страница одариваемого
    router.addRoute('/recipient/:id', { component: RecipientDetail, name: 'recipient' });
  }

  handleRouteChange({ path, params, route }) {
    console.log('[APP] handleRouteChange вызван:', { path, params, route });

    // Уничтожаем предыдущую страницу
    if (this.currentPage) {
      console.log('[APP] Уничтожаем предыдущую страницу');
      this.currentPage.destroy();
      this.currentPage = null;
    }

    const container = document.getElementById('app-main');
    if (!container) {
      console.error('[APP] Контейнер app-main не найден');
      return;
    }
    console.log('[APP] Контейнер app-main найден');

    // Проверяем что route существует
    if (!route) {
      console.error('[APP] Route не найден для пути:', path);
      return;
    }
    console.log('[APP] Route найден:', route);

    // Создаём и рендерим новую страницу
    const ComponentClass = route.component;
    console.log('[APP] Создаём компонент для пути:', path);

    if (path === '/') {
      this.currentPage = new ComponentClass(container);
    } else if (path === '/holiday/:id') {
      this.currentPage = new ComponentClass(container, params.id);
    } else if (path === '/recipient/:id') {
      this.currentPage = new ComponentClass(container, params.id);
    }

    console.log('[APP] Компонент создан и отрендерен');
  }
}

// Запуск приложения
console.log('[MAIN] Регистрируем DOMContentLoaded...');
document.addEventListener('DOMContentLoaded', () => {
  console.log('[MAIN] DOMContentLoaded сработал, создаём App...');
  const app = new App();
  console.log('[MAIN] App создан, вызываем init()...');
  app.init();
});
console.log('[MAIN] main.js полностью загружен');