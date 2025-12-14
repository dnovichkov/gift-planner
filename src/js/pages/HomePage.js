import { Component } from '../components/Component.js';
import { createButton, createIconButton } from '../components/Button.js';
import { createCard } from '../components/Card.js';
import { createSmartProgressBar } from '../components/ProgressBar.js';
import { HolidayModal } from '../components/HolidayModal.js';
import { createConfirmModal } from '../components/Modal.js';
import { holidayService } from '../services/HolidayService.js';
import { AppEvents } from '../events.js';
import { router } from '../router.js';
import { toast } from '../components/Toast.js';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Главная страница со списком праздников
 */
export class HomePage extends Component {
  getInitialState() {
    return {
      holidays: [],
      loading: true,
    };
  }

  subscribeToEvents() {
    // Обновляем список при изменении праздников
    this.subscribe(AppEvents.HOLIDAY_CREATED, () => this.loadHolidays());
    this.subscribe(AppEvents.HOLIDAY_UPDATED, () => this.loadHolidays());
    this.subscribe(AppEvents.HOLIDAY_DELETED, () => this.loadHolidays());
  }

  async init() {
    super.init();
    await this.loadHolidays();
  }

  async loadHolidays() {
    try {
      const holidays = await holidayService.getAll();

      // Получаем статистику для каждого праздника
      const holidaysWithStats = await Promise.all(
        holidays.map(async (holiday) => {
          const stats = await holidayService.getStats(holiday.id);
          return { ...holiday, stats };
        })
      );

      this.setState({
        holidays: holidaysWithStats,
        loading: false,
      });
    } catch (error) {
      console.error('Ошибка загрузки праздников:', error);
      this.setState({ loading: false });
      toast.error('Не удалось загрузить праздники');
    }
  }

  template() {
    const { holidays, loading } = this.state;

    if (loading) {
      return `
        <div class="container">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Загрузка праздников...</p>
          </div>
        </div>
      `;
    }

    const headerHtml = `
      <div class="page-header">
        <h1>Мои праздники</h1>
        ${createButton({
          text: 'Новый праздник',
          variant: 'primary',
          icon: '➕',
          id: 'create-holiday-btn',
        })}
      </div>
    `;

    if (holidays.length === 0) {
      return `
        <div class="container">
          ${headerHtml}
          <div class="empty-state">
            <div class="empty-state__icon">🎁</div>
            <h3>Нет праздников</h3>
            <p>Создайте свой первый праздник, чтобы начать планировать подарки</p>
          </div>
        </div>
      `;
    }

    const holidaysHtml = holidays.map(holiday => this.renderHolidayCard(holiday)).join('');

    return `
      <div class="container">
        ${headerHtml}
        <div class="holidays-grid">
          ${holidaysHtml}
        </div>
      </div>
    `;
  }

  renderHolidayCard(holiday) {
    const { stats } = holiday;
    const dateFormatted = format(new Date(holiday.date), 'd MMMM yyyy', { locale: ru });

    const daysUntil = Math.ceil((new Date(holiday.date) - new Date()) / (1000 * 60 * 60 * 24));
    const daysText = daysUntil < 0
      ? `Прошёл ${Math.abs(daysUntil)} дн. назад`
      : daysUntil === 0
      ? 'Сегодня!'
      : `Через ${daysUntil} дн.`;

    const progressBar = createSmartProgressBar({
      percent: stats.completionPercent,
      showLabel: true,
    });

    const actions = `
      <div class="card-actions">
        ${createIconButton({
          icon: '✏️',
          title: 'Редактировать',
          variant: 'ghost',
          size: 'sm',
          id: `edit-holiday-${holiday.id}`,
        })}
        ${createIconButton({
          icon: '🗑️',
          title: 'Удалить',
          variant: 'ghost',
          size: 'sm',
          id: `delete-holiday-${holiday.id}`,
        })}
      </div>
    `;

    const content = `
      <div class="holiday-card-stats">
        <div class="stat">
          <span class="stat__label">Одариваемых</span>
          <span class="stat__value">${stats.totalRecipients}</span>
        </div>
        <div class="stat">
          <span class="stat__label">Подарков</span>
          <span class="stat__value">${stats.boughtGifts}/${stats.totalGifts}</span>
        </div>
        ${holiday.budget > 0 ? `
          <div class="stat">
            <span class="stat__label">Бюджет</span>
            <span class="stat__value">${holiday.budget.toLocaleString()} ₽</span>
          </div>
        ` : ''}
      </div>
      ${progressBar}
      ${actions}
    `;

    return createCard({
      title: holiday.name,
      subtitle: `${dateFormatted} • ${daysText}`,
      content,
      className: 'holiday-card',
      onClick: `window.location.hash = '#/holiday/${holiday.id}'`,
      id: `holiday-card-${holiday.id}`,
    });
  }

  bindEvents() {
    // Кнопка создания праздника
    const createBtn = document.getElementById('create-holiday-btn');
    if (createBtn) {
      this.addEventListener(createBtn, 'click', () => this.showCreateModal());
    }

    // Кнопки редактирования и удаления
    this.state.holidays.forEach(holiday => {
      const editBtn = document.getElementById(`edit-holiday-${holiday.id}`);
      const deleteBtn = document.getElementById(`delete-holiday-${holiday.id}`);

      if (editBtn) {
        this.addEventListener(editBtn, 'click', (e) => {
          e.stopPropagation();
          this.showEditModal(holiday);
        });
      }

      if (deleteBtn) {
        this.addEventListener(deleteBtn, 'click', async (e) => {
          e.stopPropagation();
          await this.deleteHoliday(holiday);
        });
      }
    });
  }

  showCreateModal() {
    const modal = new HolidayModal(null, () => {
      modal.destroy();
    });
    modal.open();
  }

  showEditModal(holiday) {
    const modal = new HolidayModal(holiday, () => {
      modal.destroy();
    });
    modal.open();
  }

  async deleteHoliday(holiday) {
    const confirmed = await createConfirmModal({
      title: 'Удалить праздник?',
      message: `Вы действительно хотите удалить праздник "${holiday.name}"? Все одариваемые и подарки также будут удалены.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await holidayService.delete(holiday.id);
        toast.success('Праздник удалён');
      } catch (error) {
        console.error('Ошибка удаления праздника:', error);
        toast.error('Не удалось удалить праздник');
      }
    }
  }

  render() {
    this.container.innerHTML = '';
    this.isRendered = false;
    super.render();
  }
}
