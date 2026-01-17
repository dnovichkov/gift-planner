import { db } from '../db/idb-wrapper.js';
import { eventBus, AppEvents } from '../events.js';
import { giftService } from './GiftService.js';

// Ленивый импорт для избежания циклических зависимостей
let authService = null;
let syncManager = null;

const getAuthService = async () => {
  if (!authService) {
    const module = await import('./AuthService.js');
    authService = module.authService;
  }
  return authService;
};

const getSyncManager = async () => {
  if (!syncManager) {
    const module = await import('./SyncManager.js');
    syncManager = module.syncManager;
  }
  return syncManager;
};

/**
 * Сервис для управления одариваемыми
 * Поддерживает синхронизацию с Supabase
 */
class RecipientService {
  /**
   * Создать нового одариваемого
   * @param {string} holidayId - ID праздника
   * @param {Object} data - Данные одариваемого
   * @returns {Promise<string>} ID созданного одариваемого
   */
  async create(holidayId, data) {
    const auth = await getAuthService();
    const userId = auth?.getUserId() || null;

    const recipientData = {
      holidayId,
      name: data.name,
      type: data.type || 'adult', // adult, child, family
      note: data.note || '',
      budget: data.budget || 0,
      userId,
    };

    const id = await db.add('recipients', recipientData);
    const recipient = await this.getById(id);

    eventBus.emit(AppEvents.RECIPIENT_CREATED, recipient);
    console.log('Одариваемый создан:', recipient);

    // Добавляем в очередь синхронизации
    if (userId) {
      const sync = await getSyncManager();
      await sync.queueOperation('create', 'recipients', id, recipient);
    }

    return id;
  }

  /**
   * Получить одариваемого по ID
   * @param {string} id - ID одариваемого
   * @returns {Promise<Object>} Одариваемый
   */
  async getById(id) {
    return await db.get('recipients', id);
  }

  /**
   * Получить всех одариваемых для праздника
   * @param {string} holidayId - ID праздника
   * @param {Object} filters - Фильтры (type, search)
   * @returns {Promise<Array>} Список одариваемых
   */
  async getByHolidayId(holidayId, filters = {}) {
    const allRecipients = await db.getAll('recipients');
    let recipients = allRecipients.filter(r => r.holidayId === holidayId);

    // Фильтр по типу
    if (filters.type && filters.type !== 'all') {
      recipients = recipients.filter(r => r.type === filters.type);
    }

    // Поиск по имени
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      recipients = recipients.filter(r =>
        r.name.toLowerCase().includes(searchLower)
      );
    }

    return recipients;
  }

  /**
   * Обновить одариваемого
   * @param {string} id - ID одариваемого
   * @param {Object} data - Новые данные
   * @returns {Promise<void>}
   */
  async update(id, data) {
    const recipient = await this.getById(id);

    const updatedRecipient = {
      ...recipient,
      ...data,
      id, // Гарантируем, что ID не изменится
    };

    await db.update('recipients', updatedRecipient);

    eventBus.emit(AppEvents.RECIPIENT_UPDATED, updatedRecipient);
    console.log('Одариваемый обновлён:', updatedRecipient);

    // Добавляем в очередь синхронизации
    const auth = await getAuthService();
    if (auth?.isAuthenticated()) {
      const sync = await getSyncManager();
      await sync.queueOperation('update', 'recipients', id, updatedRecipient);
    }
  }

  /**
   * Удалить одариваемого и все его подарки (каскадное удаление)
   * @param {string} id - ID одариваемого
   * @returns {Promise<void>}
   */
  async delete(id) {
    // Получаем все подарки для этого одариваемого
    const gifts = await giftService.getByRecipientId(id);

    // Удаляем каждый подарок
    for (const gift of gifts) {
      await giftService.delete(gift.id);
    }

    // Удаляем самого одариваемого
    await db.delete('recipients', id);

    eventBus.emit(AppEvents.RECIPIENT_DELETED, id);
    console.log('Одариваемый удалён:', id);

    // Добавляем в очередь синхронизации
    const auth = await getAuthService();
    if (auth?.isAuthenticated()) {
      const sync = await getSyncManager();
      await sync.queueOperation('delete', 'recipients', id, null);
    }
  }

  /**
   * Получить статистику одариваемого
   * @param {string} recipientId - ID одариваемого
   * @returns {Promise<Object>} Статистика
   */
  async getStats(recipientId) {
    const recipient = await this.getById(recipientId);
    const gifts = await giftService.getByRecipientId(recipientId);

    const totalGifts = gifts.length;
    const boughtGifts = gifts.filter(g => g.status === 'bought').length;
    const totalCost = gifts.reduce((sum, g) => sum + (g.cost || 0), 0);
    const completionPercent = totalGifts > 0
      ? Math.round((boughtGifts / totalGifts) * 100)
      : 0;

    return {
      recipient,
      totalGifts,
      boughtGifts,
      totalCost,
      completionPercent,
      isComplete: totalGifts > 0 && boughtGifts === totalGifts,
    };
  }
}

export const recipientService = new RecipientService();
