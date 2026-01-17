/**
 * Менеджер синхронизации между IndexedDB и Supabase
 * Реализует offline-first стратегию с Last-Write-Wins conflict resolution
 */

import { db } from '../db/idb-wrapper.js';
import { eventBus, AppEvents } from '../events.js';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTimestamp = null;
    this.syncInterval = null;
    this.SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 минут
    this.MAX_RETRIES = 3;

    // Будут установлены через init()
    this.authService = null;
  }

  /**
   * Инициализация менеджера синхронизации
   * @param {Object} authService - Сервис авторизации
   */
  init(authService) {
    this.authService = authService;

    // Загружаем timestamp последней синхронизации
    this.lastSyncTimestamp = localStorage.getItem('giftplanner_lastSync');

    // Слушаем события сети
    eventBus.on(AppEvents.NETWORK_STATUS_CHANGED, ({ isOnline }) => {
      if (isOnline && this.authService?.isAuthenticated()) {
        console.log('[SyncManager] Сеть восстановлена, обрабатываем очередь');
        this.processQueue();
      }
    });

    // Слушаем изменения авторизации
    eventBus.on(AppEvents.AUTH_STATE_CHANGED, ({ isAuthenticated }) => {
      if (isAuthenticated) {
        this.startPeriodicSync();
        this.syncAll();
      } else {
        this.stopPeriodicSync();
      }
    });

    console.log('[SyncManager] Инициализирован');
  }

  /**
   * Запустить периодическую синхронизацию
   */
  startPeriodicSync() {
    this.stopPeriodicSync();
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && this.authService?.isAuthenticated()) {
        this.syncAll();
      }
    }, this.SYNC_INTERVAL_MS);
    console.log('[SyncManager] Периодическая синхронизация запущена');
  }

  /**
   * Остановить периодическую синхронизацию
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[SyncManager] Периодическая синхронизация остановлена');
    }
  }

  /**
   * Добавить операцию в очередь синхронизации
   * @param {string} operation - Тип операции (create, update, delete)
   * @param {string} entityType - Тип сущности (holidays, recipients, gifts)
   * @param {string} entityId - ID сущности
   * @param {Object} data - Данные сущности
   */
  async queueOperation(operation, entityType, entityId, data) {
    await db.addToSyncQueue({
      operation,
      entityType,
      entityId,
      data,
      userId: this.authService?.getUserId(),
    });

    console.log(`[SyncManager] Операция добавлена в очередь: ${operation} ${entityType} ${entityId}`);

    // Если онлайн, пытаемся сразу синхронизировать
    if (navigator.onLine && this.authService?.isAuthenticated()) {
      this.processQueue();
    }
  }

  /**
   * Обработать очередь синхронизации
   */
  async processQueue() {
    if (this.isSyncing || !this.authService?.isAuthenticated()) {
      return;
    }

    const queue = await db.getSyncQueue();
    if (queue.length === 0) {
      return;
    }

    console.log(`[SyncManager] Обработка очереди: ${queue.length} операций`);

    this.isSyncing = true;
    eventBus.emit(AppEvents.SYNC_STARTED);

    const supabase = this.authService.getClient();
    let successCount = 0;
    let errorCount = 0;

    for (const item of queue) {
      try {
        await this.processSyncItem(supabase, item);
        await db.removeSyncQueueItem(item.id);
        successCount++;
      } catch (error) {
        console.error('[SyncManager] Ошибка синхронизации:', item, error);

        const retries = (item.retries || 0) + 1;

        if (retries >= this.MAX_RETRIES) {
          console.warn('[SyncManager] Максимум попыток достигнут, удаляем из очереди:', item);
          await db.removeSyncQueueItem(item.id);
          eventBus.emit(AppEvents.SYNC_ERROR, { item, error });
          errorCount++;
        } else {
          await db.updateSyncQueueItem(item.id, { retries });
        }
      }
    }

    this.isSyncing = false;
    eventBus.emit(AppEvents.SYNC_COMPLETED, { successCount, errorCount });
    console.log(`[SyncManager] Очередь обработана: ${successCount} успешно, ${errorCount} ошибок`);
  }

  /**
   * Обработать отдельный элемент очереди
   */
  async processSyncItem(supabase, item) {
    const { operation, entityType, entityId, data } = item;

    switch (operation) {
      case 'create':
      case 'update':
        const upsertData = this.toSnakeCase({
          ...data,
          id: entityId,
          userId: this.authService.getUserId(),
        });

        const { error: upsertError } = await supabase
          .from(entityType)
          .upsert(upsertData, { onConflict: 'id' });

        if (upsertError) throw upsertError;
        break;

      case 'delete':
        // Soft delete - устанавливаем deleted_at
        const { error: deleteError } = await supabase
          .from(entityType)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', entityId);

        if (deleteError) throw deleteError;
        break;
    }
  }

  /**
   * Полная синхронизация всех данных
   */
  async syncAll() {
    if (this.isSyncing || !this.authService?.isAuthenticated() || !navigator.onLine) {
      return;
    }

    console.log('[SyncManager] Начало полной синхронизации');

    this.isSyncing = true;
    eventBus.emit(AppEvents.SYNC_STARTED);

    try {
      // Сначала отправляем локальные изменения
      await this.pushToServer();

      // Затем получаем данные с сервера
      await this.pullFromServer('holidays');
      await this.pullFromServer('recipients');
      await this.pullFromServer('gifts');

      // Обновляем timestamp последней синхронизации
      this.lastSyncTimestamp = new Date().toISOString();
      localStorage.setItem('giftplanner_lastSync', this.lastSyncTimestamp);

      console.log('[SyncManager] Синхронизация завершена');
      eventBus.emit(AppEvents.SYNC_COMPLETED, { full: true });
    } catch (error) {
      console.error('[SyncManager] Ошибка синхронизации:', error);
      eventBus.emit(AppEvents.SYNC_ERROR, { error });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Отправить локальные изменения на сервер
   */
  async pushToServer() {
    const queue = await db.getSyncQueue();
    if (queue.length === 0) return;

    const supabase = this.authService.getClient();

    for (const item of queue) {
      try {
        await this.processSyncItem(supabase, item);
        await db.removeSyncQueueItem(item.id);
      } catch (error) {
        console.error('[SyncManager] Ошибка push:', item, error);
        // Продолжаем с другими элементами
      }
    }
  }

  /**
   * Получить данные с сервера
   */
  async pullFromServer(entityType) {
    const supabase = this.authService.getClient();

    let query = supabase
      .from(entityType)
      .select('*')
      .is('deleted_at', null);

    // Если есть timestamp, получаем только изменения
    if (this.lastSyncTimestamp) {
      query = query.gte('updated_at', this.lastSyncTimestamp);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[SyncManager] Ошибка pull ${entityType}:`, error);
      throw error;
    }

    console.log(`[SyncManager] Получено ${data?.length || 0} записей ${entityType}`);

    // Сохраняем данные локально
    for (const item of data || []) {
      const camelCaseItem = this.toCamelCase(item);
      const result = await db.upsert(entityType, camelCaseItem);

      if (result.action !== 'skipped') {
        this.emitDataEvent(entityType, result.action, result.data);
      }
    }

    // Обрабатываем удалённые записи
    await this.handleDeletedRecords(supabase, entityType);
  }

  /**
   * Обработать удалённые на сервере записи
   */
  async handleDeletedRecords(supabase, entityType) {
    const { data: deletedData } = await supabase
      .from(entityType)
      .select('id')
      .not('deleted_at', 'is', null);

    for (const item of deletedData || []) {
      const existing = await db.get(entityType, item.id);
      if (existing) {
        await db.delete(entityType, item.id);
        this.emitDeleteEvent(entityType, item.id);
      }
    }
  }

  /**
   * Эмитить событие об изменении данных
   */
  emitDataEvent(entityType, action, data) {
    const eventMap = {
      holidays: {
        created: AppEvents.HOLIDAY_CREATED,
        updated: AppEvents.HOLIDAY_UPDATED,
      },
      recipients: {
        created: AppEvents.RECIPIENT_CREATED,
        updated: AppEvents.RECIPIENT_UPDATED,
      },
      gifts: {
        created: AppEvents.GIFT_CREATED,
        updated: AppEvents.GIFT_UPDATED,
      }
    };

    const event = eventMap[entityType]?.[action];
    if (event) {
      eventBus.emit(event, data);
    }
  }

  /**
   * Эмитить событие об удалении
   */
  emitDeleteEvent(entityType, id) {
    const eventMap = {
      holidays: AppEvents.HOLIDAY_DELETED,
      recipients: AppEvents.RECIPIENT_DELETED,
      gifts: AppEvents.GIFT_DELETED,
    };

    const event = eventMap[entityType];
    if (event) {
      eventBus.emit(event, id);
    }
  }

  /**
   * Получить количество элементов в очереди
   */
  async getQueueCount() {
    return await db.getSyncQueueCount();
  }

  /**
   * Проверить, идёт ли синхронизация
   */
  isSyncInProgress() {
    return this.isSyncing;
  }

  /**
   * Преобразовать camelCase в snake_case для Supabase
   */
  toSnakeCase(obj) {
    const result = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = obj[key];
    }
    return result;
  }

  /**
   * Преобразовать snake_case в camelCase
   */
  toCamelCase(obj) {
    const result = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = obj[key];
    }
    return result;
  }
}

export const syncManager = new SyncManager();
