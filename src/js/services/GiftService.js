import { db } from '../db/idb-wrapper.js';
import { eventBus, AppEvents } from '../events.js';

/**
 * Сервис для управления подарками
 */
class GiftService {
  /**
   * Создать новый подарок
   * @param {string} recipientId - ID одариваемого
   * @param {string} holidayId - ID праздника
   * @param {Object} data - Данные подарка
   * @returns {Promise<string>} ID созданного подарка
   */
  async create(recipientId, holidayId, data) {
    const giftData = {
      recipientId,
      holidayId,
      name: data.name,
      description: data.description || '',
      cost: data.cost || 0,
      status: data.status || 'not_bought', // not_bought, bought
      priority: data.priority || 'medium', // low, medium, high
    };

    const id = await db.add('gifts', giftData);
    const gift = await this.getById(id);

    eventBus.emit(AppEvents.GIFT_CREATED, gift);
    console.log('Подарок создан:', gift);

    return id;
  }

  /**
   * Получить подарок по ID
   * @param {string} id - ID подарка
   * @returns {Promise<Object>} Подарок
   */
  async getById(id) {
    return await db.get('gifts', id);
  }

  /**
   * Получить все подарки для одариваемого
   * @param {string} recipientId - ID одариваемого
   * @returns {Promise<Array>} Список подарков
   */
  async getByRecipientId(recipientId) {
    const allGifts = await db.getAll('gifts');
    return allGifts.filter(g => g.recipientId === recipientId);
  }

  /**
   * Получить все подарки для праздника
   * @param {string} holidayId - ID праздника
   * @returns {Promise<Array>} Список подарков
   */
  async getByHolidayId(holidayId) {
    const allGifts = await db.getAll('gifts');
    return allGifts.filter(g => g.holidayId === holidayId);
  }

  /**
   * Получить список покупок (некупленные подарки) для праздника
   * @param {string} holidayId - ID праздника
   * @param {Object} options - Опции сортировки
   * @returns {Promise<Array>} Список некупленных подарков с информацией об одариваемых
   */
  async getShoppingList(holidayId, options = {}) {
    const gifts = await this.getByHolidayId(holidayId);
    const notBoughtGifts = gifts.filter(g => g.status === 'not_bought');

    // Получаем информацию об одариваемых
    const allRecipients = await db.getAll('recipients');
    const recipientsMap = new Map(allRecipients.map(r => [r.id, r]));

    // Добавляем информацию об одариваемом к каждому подарку
    const enrichedGifts = notBoughtGifts.map(gift => ({
      ...gift,
      recipientName: recipientsMap.get(gift.recipientId)?.name || 'Неизвестно',
    }));

    // Сортировка
    return this.sortGifts(enrichedGifts, options.sortBy || 'priority');
  }

  /**
   * Сортировать подарки
   * @param {Array} gifts - Список подарков
   * @param {string} sortBy - Критерий сортировки (priority, cost, recipient)
   * @returns {Array} Отсортированный список
   */
  sortGifts(gifts, sortBy) {
    const priorityOrder = { high: 1, medium: 2, low: 3 };

    switch (sortBy) {
      case 'priority':
        return gifts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      case 'cost':
        return gifts.sort((a, b) => (b.cost || 0) - (a.cost || 0));
      case 'recipient':
        return gifts.sort((a, b) =>
          (a.recipientName || '').localeCompare(b.recipientName || '', 'ru')
        );
      default:
        return gifts;
    }
  }

  /**
   * Обновить подарок
   * @param {string} id - ID подарка
   * @param {Object} data - Новые данные
   * @returns {Promise<void>}
   */
  async update(id, data) {
    const gift = await this.getById(id);

    const updatedGift = {
      ...gift,
      ...data,
      id, // Гарантируем, что ID не изменится
    };

    await db.update('gifts', updatedGift);

    eventBus.emit(AppEvents.GIFT_UPDATED, updatedGift);
    console.log('Подарок обновлён:', updatedGift);
  }

  /**
   * Переключить статус подарка (купленный/некупленный)
   * @param {string} id - ID подарка
   * @returns {Promise<void>}
   */
  async toggleStatus(id) {
    const gift = await this.getById(id);
    const newStatus = gift.status === 'bought' ? 'not_bought' : 'bought';

    await this.update(id, { status: newStatus });

    eventBus.emit(AppEvents.GIFT_STATUS_CHANGED, { id, status: newStatus });
    console.log(`Статус подарка изменён: ${gift.name} -> ${newStatus}`);
  }

  /**
   * Удалить подарок
   * @param {string} id - ID подарка
   * @returns {Promise<void>}
   */
  async delete(id) {
    await db.delete('gifts', id);

    eventBus.emit(AppEvents.GIFT_DELETED, id);
    console.log('Подарок удалён:', id);
  }

  /**
   * Отметить все подарки одариваемого как купленные
   * @param {string} recipientId - ID одариваемого
   * @returns {Promise<void>}
   */
  async markAllAsBought(recipientId) {
    const gifts = await this.getByRecipientId(recipientId);

    for (const gift of gifts) {
      if (gift.status !== 'bought') {
        await this.update(gift.id, { status: 'bought' });
      }
    }

    console.log('Все подарки отмечены как купленные для одариваемого:', recipientId);
  }
}

export const giftService = new GiftService();
