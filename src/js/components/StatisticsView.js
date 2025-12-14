import { Component } from './Component.js';
import { createSmartProgressBar } from './ProgressBar.js';
import { statisticsService } from '../services/StatisticsService.js';
import { toast } from './Toast.js';
import { AppEvents } from '../events.js';

/**
 * Компонент статистики праздника
 */
export class StatisticsView extends Component {
  constructor(container, holidayId) {
    super(container, { holidayId });
  }

  getInitialState() {
    return {
      stats: null,
      loading: true,
    };
  }

  subscribeToEvents() {
    // Обновляем статистику при любых изменениях
    this.subscribe(AppEvents.RECIPIENT_CREATED, () => this.loadStats());
    this.subscribe(AppEvents.RECIPIENT_UPDATED, () => this.loadStats());
    this.subscribe(AppEvents.RECIPIENT_DELETED, () => this.loadStats());
    this.subscribe(AppEvents.GIFT_CREATED, () => this.loadStats());
    this.subscribe(AppEvents.GIFT_UPDATED, () => this.loadStats());
    this.subscribe(AppEvents.GIFT_DELETED, () => this.loadStats());
    this.subscribe(AppEvents.GIFT_STATUS_CHANGED, () => this.loadStats());
  }

  async init() {
    super.init();
    await this.loadStats();
  }

  async loadStats() {
    try {
      const stats = await statisticsService.getHolidayStatistics(this.props.holidayId);
      this.setState({ stats, loading: false });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      toast.error('Не удалось загрузить статистику');
    }
  }

  template() {
    const { stats, loading } = this.state;

    if (loading) {
      return `<div class="loading-state"><div class="spinner"></div><p>Загрузка...</p></div>`;
    }

    if (!stats) {
      return `<div class="error-state">Нет данных</div>`;
    }

    const progressBar = createSmartProgressBar({
      percent: stats.overview.completionPercent,
      showLabel: true,
      size: 'lg',
    });

    return `
      <div class="statistics-view">
        <section class="stats-section">
          <h3>Общая готовность</h3>
          ${progressBar}
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-card__value">${stats.overview.totalRecipients}</span>
              <span class="stat-card__label">Одариваемых</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">${stats.overview.boughtGifts}/${stats.overview.totalGifts}</span>
              <span class="stat-card__label">Подарков куплено</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">${stats.overview.notBoughtGifts}</span>
              <span class="stat-card__label">Осталось купить</span>
            </div>
          </div>
        </section>

        <section class="stats-section">
          <h3>Финансы</h3>
          <div class="stats-grid">
            ${stats.holiday.budget > 0 ? `
              <div class="stat-card">
                <span class="stat-card__value">${stats.financial.budget.toLocaleString()} ₽</span>
                <span class="stat-card__label">Бюджет</span>
              </div>
            ` : ''}
            <div class="stat-card">
              <span class="stat-card__value">${stats.financial.totalCost.toLocaleString()} ₽</span>
              <span class="stat-card__label">Всего запланировано</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">${stats.financial.spentCost.toLocaleString()} ₽</span>
              <span class="stat-card__label">Потрачено</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">${stats.financial.remainingCost.toLocaleString()} ₽</span>
              <span class="stat-card__label">Осталось потратить</span>
            </div>
          </div>
          ${stats.financial.overBudget ? `
            <div class="alert alert-warning">
              ⚠️ Превышен бюджет на ${(stats.financial.totalCost - stats.financial.budget).toLocaleString()} ₽
            </div>
          ` : ''}
        </section>

        <section class="stats-section">
          <h3>По одариваемым</h3>
          <div class="recipients-stats">
            <h4>Готовы (${stats.recipients.ready.length})</h4>
            ${stats.recipients.ready.length > 0 ? `
              <ul class="stats-list">
                ${stats.recipients.ready.map(r => `
                  <li>${r.name} - ${r.totalGifts} подарков</li>
                `).join('')}
              </ul>
            ` : '<p>Нет готовых</p>'}

            <h4>Не готовы (${stats.recipients.notReady.length})</h4>
            ${stats.recipients.notReady.length > 0 ? `
              <ul class="stats-list">
                ${stats.recipients.notReady.map(r => `
                  <li>${r.name} - ${r.boughtGifts}/${r.totalGifts} (${r.completionPercent}%)</li>
                `).join('')}
              </ul>
            ` : '<p>Все готовы!</p>'}
          </div>
        </section>

        <section class="stats-section">
          <h3>По приоритетам</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-card__value">${stats.priorities.bought.high}/${stats.priorities.total.high}</span>
              <span class="stat-card__label">🔴 Высокий</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">${stats.priorities.bought.medium}/${stats.priorities.total.medium}</span>
              <span class="stat-card__label">🟡 Средний</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">${stats.priorities.bought.low}/${stats.priorities.total.low}</span>
              <span class="stat-card__label">🟢 Низкий</span>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  bindEvents() {
    // Статистика - просмотровый компонент, нет интерактивных элементов
  }

  render() {
    this.container.innerHTML = '';
    this.isRendered = false;
    super.render();
  }
}
