import { db } from '../db/idb-wrapper.js';
import { eventBus, AppEvents } from '../events.js';
import { recipientService } from './RecipientService.js';

/**
 * Сервис для управления праздниками
 */
class HolidayService {
  /**
   * Создать новый праздник
   * @param {Object} data - Данные праздника
   * @returns {Promise<string>} ID созданного праздника
   */
  async create(data) {
    const holidayData = {
      name: data.name,
      date: data.date,
      description: data.description || '',
      budget: data.budget || 0,
    };

    const id = await db.add('holidays', holidayData);
    const holiday = await this.getById(id);

    eventBus.emit(AppEvents.HOLIDAY_CREATED, holiday);
    console.log('Праздник создан:', holiday);

    return id;
  }

  /**
   * Получить праздник по ID
   * @param {string} id - ID праздника
   * @returns {Promise<Object>} Праздник
   */
  async getById(id) {
    return await db.get('holidays', id);
  }

  /**
   * Получить все праздники
   * @returns {Promise<Array>} Список праздников
   */
  async getAll() {
    const holidays = await db.getAll('holidays');

    // Сортируем по дате (ближайшие впереди)
    return holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Обновить праздник
   * @param {string} id - ID праздника
   * @param {Object} data - Новые данные
   * @returns {Promise<void>}
   */
  async update(id, data) {
    const holiday = await this.getById(id);

    const updatedHoliday = {
      ...holiday,
      ...data,
      id, // Гарантируем, что ID не изменится
    };

    await db.update('holidays', updatedHoliday);

    eventBus.emit(AppEvents.HOLIDAY_UPDATED, updatedHoliday);
    console.log('Праздник обновлён:', updatedHoliday);
  }

  /**
   * Удалить праздник и все связанные данные (каскадное удаление)
   * @param {string} id - ID праздника
   * @returns {Promise<void>}
   */
  async delete(id) {
    // Получаем всех одариваемых для этого праздника
    const recipients = await recipientService.getByHolidayId(id);

    // Удаляем каждого одариваемого (что также удалит их подарки)
    for (const recipient of recipients) {
      await recipientService.delete(recipient.id);
    }

    // Удаляем сам праздник
    await db.delete('holidays', id);

    eventBus.emit(AppEvents.HOLIDAY_DELETED, id);
    console.log('Праздник удалён:', id);
  }

  /**
   * Получить статистику праздника
   * @param {string} holidayId - ID праздника
   * @returns {Promise<Object>} Статистика
   */
  async getStats(holidayId) {
    const holiday = await this.getById(holidayId);
    const recipients = await recipientService.getByHolidayId(holidayId);

    // Собираем все подарки
    const allGifts = await db.getAll('gifts');
    const holidayGifts = allGifts.filter(g => g.holidayId === holidayId);

    const totalGifts = holidayGifts.length;
    const boughtGifts = holidayGifts.filter(g => g.status === 'bought').length;
    const notBoughtGifts = totalGifts - boughtGifts;

    const totalCost = holidayGifts.reduce((sum, g) => sum + (g.cost || 0), 0);
    const spentCost = holidayGifts
      .filter(g => g.status === 'bought')
      .reduce((sum, g) => sum + (g.cost || 0), 0);
    const remainingCost = totalCost - spentCost;

    const completionPercent = totalGifts > 0
      ? Math.round((boughtGifts / totalGifts) * 100)
      : 0;

    return {
      holiday,
      totalRecipients: recipients.length,
      totalGifts,
      boughtGifts,
      notBoughtGifts,
      totalCost,
      spentCost,
      remainingCost,
      completionPercent,
    };
  }
}

export const holidayService = new HolidayService();
