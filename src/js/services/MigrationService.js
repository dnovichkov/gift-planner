/**
 * Сервис миграции локальных данных
 * Переносит данные без userId в аккаунт пользователя при первом входе
 */

import { db } from '../db/idb-wrapper.js';
import { eventBus, AppEvents } from '../events.js';
import { toast } from '../components/Toast.js';

class MigrationService {
  constructor() {
    this.MIGRATION_KEY_PREFIX = 'giftplanner_migrated_';
  }

  /**
   * Инициализация сервиса миграции
   * @param {Object} authService - Сервис авторизации
   * @param {Object} syncManager - Менеджер синхронизации
   */
  init(authService, syncManager) {
    this.authService = authService;
    this.syncManager = syncManager;

    // Слушаем событие авторизации
    eventBus.on(AppEvents.AUTH_STATE_CHANGED, async ({ user, isAuthenticated }) => {
      if (isAuthenticated && user) {
        await this.checkAndMigrate(user.id);
      }
    });

    console.log('[MigrationService] Инициализирован');
  }

  /**
   * Проверить и выполнить миграцию если нужно
   * @param {string} userId - ID пользователя
   */
  async checkAndMigrate(userId) {
    const migrationKey = `${this.MIGRATION_KEY_PREFIX}${userId}`;
    const alreadyMigrated = localStorage.getItem(migrationKey);

    if (alreadyMigrated) {
      console.log('[MigrationService] Миграция уже выполнена для пользователя:', userId);
      return;
    }

    // Проверяем, есть ли локальные данные без userId
    const localData = await this.getLocalDataWithoutUserId();

    if (localData.total > 0) {
      console.log('[MigrationService] Найдены локальные данные:', localData);
      const shouldMigrate = await this.promptMigration(localData);

      if (shouldMigrate) {
        await this.performMigration(userId, localData);
      }
    }

    // Помечаем миграцию как выполненную
    localStorage.setItem(migrationKey, new Date().toISOString());
  }

  /**
   * Получить локальные данные без userId
   * @returns {Promise<Object>} Объект с данными
   */
  async getLocalDataWithoutUserId() {
    const holidays = (await db.getAll('holidays')).filter(h => !h.userId);
    const recipients = (await db.getAll('recipients')).filter(r => !r.userId);
    const gifts = (await db.getAll('gifts')).filter(g => !g.userId);

    return {
      holidays,
      recipients,
      gifts,
      total: holidays.length + recipients.length + gifts.length,
    };
  }

  /**
   * Запросить подтверждение миграции у пользователя
   * @param {Object} localData - Локальные данные
   * @returns {Promise<boolean>} Согласие пользователя
   */
  async promptMigration(localData) {
    return new Promise((resolve) => {
      const message = `Обнаружены локальные данные:\n` +
        `- Праздников: ${localData.holidays.length}\n` +
        `- Одариваемых: ${localData.recipients.length}\n` +
        `- Подарков: ${localData.gifts.length}\n\n` +
        `Хотите перенести их в ваш аккаунт для синхронизации?`;

      // Используем confirm для MVP
      // В будущем можно заменить на кастомный модал
      resolve(window.confirm(message));
    });
  }

  /**
   * Выполнить миграцию данных
   * @param {string} userId - ID пользователя
   * @param {Object} localData - Локальные данные
   */
  async performMigration(userId, localData) {
    console.log('[MigrationService] Начинаем миграцию для пользователя:', userId);
    toast.info('Перенос данных в аккаунт...');

    try {
      let migratedCount = 0;

      // Мигрируем holidays
      for (const holiday of localData.holidays) {
        const updatedHoliday = { ...holiday, userId };
        await db.update('holidays', updatedHoliday);
        await this.syncManager.queueOperation('create', 'holidays', holiday.id, updatedHoliday);
        migratedCount++;
      }

      // Мигрируем recipients
      for (const recipient of localData.recipients) {
        const updatedRecipient = { ...recipient, userId };
        await db.update('recipients', updatedRecipient);
        await this.syncManager.queueOperation('create', 'recipients', recipient.id, updatedRecipient);
        migratedCount++;
      }

      // Мигрируем gifts
      for (const gift of localData.gifts) {
        const updatedGift = { ...gift, userId };
        await db.update('gifts', updatedGift);
        await this.syncManager.queueOperation('create', 'gifts', gift.id, updatedGift);
        migratedCount++;
      }

      // Запускаем синхронизацию
      await this.syncManager.processQueue();

      console.log('[MigrationService] Миграция завершена:', migratedCount, 'записей');
      toast.success(`Перенесено ${migratedCount} записей в ваш аккаунт`);

      // Обновляем UI
      eventBus.emit(AppEvents.DATA_LOADED);
    } catch (error) {
      console.error('[MigrationService] Ошибка миграции:', error);
      toast.error('Ошибка переноса данных');
    }
  }

  /**
   * Сбросить флаг миграции для пользователя (для тестирования)
   * @param {string} userId - ID пользователя
   */
  resetMigrationFlag(userId) {
    const migrationKey = `${this.MIGRATION_KEY_PREFIX}${userId}`;
    localStorage.removeItem(migrationKey);
    console.log('[MigrationService] Флаг миграции сброшен для:', userId);
  }
}

export const migrationService = new MigrationService();
