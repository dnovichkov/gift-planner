import { db } from '../db/idb-wrapper.js';
import { recipientService } from './RecipientService.js';
import { giftService } from './GiftService.js';

/**
 * Сервис для получения статистики
 */
class StatisticsService {
  /**
   * Получить детальную статистику по празднику
   * @param {string} holidayId - ID праздника
   * @returns {Promise<Object>} Детальная статистика
   */
  async getHolidayStatistics(holidayId) {
    const holiday = await db.get('holidays', holidayId);
    const recipients = await recipientService.getByHolidayId(holidayId);
    const gifts = await giftService.getByHolidayId(holidayId);

    // Общая статистика
    const totalRecipients = recipients.length;
    const totalGifts = gifts.length;
    const boughtGifts = gifts.filter(g => g.status === 'bought').length;
    const notBoughtGifts = totalGifts - boughtGifts;

    const completionPercent = totalGifts > 0
      ? Math.round((boughtGifts / totalGifts) * 100)
      : 0;

    // Финансовая статистика
    const totalCost = gifts.reduce((sum, g) => sum + (g.cost || 0), 0);
    const spentCost = gifts
      .filter(g => g.status === 'bought')
      .reduce((sum, g) => sum + (g.cost || 0), 0);
    const remainingCost = totalCost - spentCost;

    // Статистика по одариваемым
    const recipientStats = await Promise.all(
      recipients.map(async (recipient) => {
        const stats = await recipientService.getStats(recipient.id);
        return {
          id: recipient.id,
          name: recipient.name,
          type: recipient.type,
          ...stats,
        };
      })
    );

    // Разделяем на готовых и не готовых
    const readyRecipients = recipientStats.filter(r => r.isComplete);
    const notReadyRecipients = recipientStats.filter(r => !r.isComplete);

    // Статистика по приоритетам
    const priorityStats = {
      high: gifts.filter(g => g.priority === 'high').length,
      medium: gifts.filter(g => g.priority === 'medium').length,
      low: gifts.filter(g => g.priority === 'low').length,
    };

    const boughtByPriority = {
      high: gifts.filter(g => g.priority === 'high' && g.status === 'bought').length,
      medium: gifts.filter(g => g.priority === 'medium' && g.status === 'bought').length,
      low: gifts.filter(g => g.priority === 'low' && g.status === 'bought').length,
    };

    return {
      holiday,
      overview: {
        totalRecipients,
        totalGifts,
        boughtGifts,
        notBoughtGifts,
        completionPercent,
      },
      financial: {
        budget: holiday.budget || 0,
        totalCost,
        spentCost,
        remainingCost,
        budgetRemaining: (holiday.budget || 0) - totalCost,
        overBudget: totalCost > (holiday.budget || 0),
      },
      recipients: {
        all: recipientStats,
        ready: readyRecipients,
        notReady: notReadyRecipients,
      },
      priorities: {
        total: priorityStats,
        bought: boughtByPriority,
      },
    };
  }

  /**
   * Получить общую статистику по всем праздникам
   * @returns {Promise<Object>} Общая статистика
   */
  async getOverallStatistics() {
    const holidays = await db.getAll('holidays');
    const allRecipients = await db.getAll('recipients');
    const allGifts = await db.getAll('gifts');

    const totalHolidays = holidays.length;
    const totalRecipients = allRecipients.length;
    const totalGifts = allGifts.length;
    const boughtGifts = allGifts.filter(g => g.status === 'bought').length;

    const totalSpent = allGifts
      .filter(g => g.status === 'bought')
      .reduce((sum, g) => sum + (g.cost || 0), 0);

    const upcomingHolidays = holidays.filter(h =>
      new Date(h.date) >= new Date()
    ).length;

    return {
      totalHolidays,
      upcomingHolidays,
      totalRecipients,
      totalGifts,
      boughtGifts,
      totalSpent,
      completionPercent: totalGifts > 0
        ? Math.round((boughtGifts / totalGifts) * 100)
        : 0,
    };
  }

  /**
   * Получить топ самых дорогих подарков
   * @param {string} holidayId - ID праздника (опционально)
   * @param {number} limit - Количество подарков
   * @returns {Promise<Array>} Список подарков
   */
  async getTopExpensiveGifts(holidayId = null, limit = 5) {
    let gifts = await db.getAll('gifts');

    if (holidayId) {
      gifts = gifts.filter(g => g.holidayId === holidayId);
    }

    // Получаем информацию об одариваемых
    const allRecipients = await db.getAll('recipients');
    const recipientsMap = new Map(allRecipients.map(r => [r.id, r]));

    // Обогащаем данные
    const enrichedGifts = gifts.map(gift => ({
      ...gift,
      recipientName: recipientsMap.get(gift.recipientId)?.name || 'Неизвестно',
    }));

    // Сортируем по стоимости и берём топ
    return enrichedGifts
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, limit);
  }

  /**
   * Получить прогресс по дням до праздника
   * @param {string} holidayId - ID праздника
   * @returns {Promise<Object>} Информация о прогрессе
   */
  async getProgressToHoliday(holidayId) {
    const holiday = await db.get('holidays', holidayId);
    const gifts = await giftService.getByHolidayId(holidayId);

    const today = new Date();
    const holidayDate = new Date(holiday.date);
    const daysRemaining = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24));

    const totalGifts = gifts.length;
    const boughtGifts = gifts.filter(g => g.status === 'bought').length;
    const notBoughtGifts = totalGifts - boughtGifts;

    const isOverdue = daysRemaining < 0;
    const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;

    return {
      holiday,
      daysRemaining: Math.abs(daysRemaining),
      isOverdue,
      isUrgent,
      totalGifts,
      boughtGifts,
      notBoughtGifts,
      giftsPerDay: daysRemaining > 0 && notBoughtGifts > 0
        ? Math.ceil(notBoughtGifts / daysRemaining)
        : 0,
    };
  }
}

export const statisticsService = new StatisticsService();
