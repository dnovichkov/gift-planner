import { Component } from './Component.js';
import { createButton, createIconButton } from './Button.js';
import { createListCard } from './Card.js';
import { createRecipientTypeBadge } from './Badge.js';
import { createSmartProgressBar } from './ProgressBar.js';
import { RecipientModal } from './RecipientModal.js';
import { createConfirmModal } from './Modal.js';
import { recipientService } from '../services/RecipientService.js';
import { router } from '../router.js';
import { toast } from './Toast.js';
import { AppEvents } from '../events.js';

/**
 * Компонент списка одариваемых
 */
export class RecipientsList extends Component {
  /**
   * @param {HTMLElement|string} container - Контейнер
   * @param {string} holidayId - ID праздника
   */
  constructor(container, holidayId) {
    super(container, { holidayId });
  }

  getInitialState() {
    return {
      recipients: [],
      loading: true,
      filter: 'all', // all, adult, child, family
      searchQuery: '',
    };
  }

  subscribeToEvents() {
    this.subscribe(AppEvents.RECIPIENT_CREATED, () => this.loadRecipients());
    this.subscribe(AppEvents.RECIPIENT_UPDATED, () => this.loadRecipients());
    this.subscribe(AppEvents.RECIPIENT_DELETED, () => this.loadRecipients());
    this.subscribe(AppEvents.GIFT_CREATED, () => this.loadRecipients());
    this.subscribe(AppEvents.GIFT_UPDATED, () => this.loadRecipients());
    this.subscribe(AppEvents.GIFT_DELETED, () => this.loadRecipients());
    this.subscribe(AppEvents.GIFT_STATUS_CHANGED, () => this.loadRecipients());
  }

  async init() {
    super.init();
    await this.loadRecipients();
  }

  async loadRecipients() {
    try {
      const recipients = await recipientService.getByHolidayId(
        this.props.holidayId,
        {
          type: this.state.filter !== 'all' ? this.state.filter : undefined,
          search: this.state.searchQuery || undefined,
        }
      );

      // Получаем статистику для каждого одариваемого
      const recipientsWithStats = await Promise.all(
        recipients.map(async (recipient) => {
          const stats = await recipientService.getStats(recipient.id);
          return { ...recipient, stats };
        })
      );

      this.setState({
        recipients: recipientsWithStats,
        loading: false,
      });
    } catch (error) {
      console.error('Ошибка загрузки одариваемых:', error);
      toast.error('Не удалось загрузить список');
    }
  }

  template() {
    const { recipients, loading } = this.state;

    if (loading) {
      return `<div class="loading-state"><div class="spinner"></div><p>Загрузка...</p></div>`;
    }

    const headerHtml = `
      <div class="list-header">
        <div class="list-filters">
          <button class="filter-btn ${this.state.filter === 'all' ? 'active' : ''}" data-filter="all">
            Все (${recipients.length})
          </button>
          <button class="filter-btn ${this.state.filter === 'adult' ? 'active' : ''}" data-filter="adult">
            Взрослые
          </button>
          <button class="filter-btn ${this.state.filter === 'child' ? 'active' : ''}" data-filter="child">
            Дети
          </button>
          <button class="filter-btn ${this.state.filter === 'family' ? 'active' : ''}" data-filter="family">
            Семьи
          </button>
        </div>
        ${createButton({
          text: 'Добавить одариваемого',
          variant: 'primary',
          size: 'sm',
          icon: '➕',
          id: 'add-recipient-btn',
        })}
      </div>
    `;

    if (recipients.length === 0) {
      return `
        ${headerHtml}
        <div class="empty-state">
          <p>Нет одариваемых. Добавьте первого!</p>
        </div>
      `;
    }

    const recipientsHtml = recipients.map(r => this.renderRecipientCard(r)).join('');

    return `
      ${headerHtml}
      <div class="recipients-list">
        ${recipientsHtml}
      </div>
    `;
  }

  renderRecipientCard(recipient) {
    const { stats } = recipient;
    const progressBar = createSmartProgressBar({
      percent: stats.completionPercent,
      showLabel: true,
      size: 'sm',
    });

    const badge = createRecipientTypeBadge(recipient.type);

    const subtitle = `
      <div class="recipient-card-info">
        ${badge}
        <span>${stats.boughtGifts}/${stats.totalGifts} подарков</span>
        ${stats.totalCost > 0 ? `<span>${stats.totalCost.toLocaleString()} ₽</span>` : ''}
      </div>
      ${progressBar}
    `;

    const actions = `
      ${createIconButton({
        icon: '✏️',
        title: 'Редактировать',
        variant: 'ghost',
        size: 'sm',
        id: `edit-recipient-${recipient.id}`,
      })}
      ${createIconButton({
        icon: '🗑️',
        title: 'Удалить',
        variant: 'ghost',
        size: 'sm',
        id: `delete-recipient-${recipient.id}`,
      })}
    `;

    return createListCard({
      title: recipient.name,
      subtitle,
      actions,
      onClick: `window.location.hash = '#/recipient/${recipient.id}'`,
      className: 'recipient-card',
      id: `recipient-card-${recipient.id}`,
    });
  }

  bindEvents() {
    // Кнопка добавления
    const addBtn = document.getElementById('add-recipient-btn');
    if (addBtn) {
      this.addEventListener(addBtn, 'click', () => this.showCreateModal());
    }

    // Фильтры
    const filterBtns = this.container.querySelectorAll('[data-filter]');
    filterBtns.forEach(btn => {
      this.addEventListener(btn, 'click', (e) => {
        const filter = e.target.dataset.filter;
        this.setState({ filter });
        this.loadRecipients();
      });
    });

    // Кнопки редактирования и удаления
    this.state.recipients.forEach(recipient => {
      const editBtn = document.getElementById(`edit-recipient-${recipient.id}`);
      const deleteBtn = document.getElementById(`delete-recipient-${recipient.id}`);

      if (editBtn) {
        this.addEventListener(editBtn, 'click', (e) => {
          e.stopPropagation();
          this.showEditModal(recipient);
        });
      }

      if (deleteBtn) {
        this.addEventListener(deleteBtn, 'click', async (e) => {
          e.stopPropagation();
          await this.deleteRecipient(recipient);
        });
      }
    });
  }

  showCreateModal() {
    const modal = new RecipientModal(this.props.holidayId, null, () => {
      modal.destroy();
    });
    modal.open();
  }

  showEditModal(recipient) {
    const modal = new RecipientModal(this.props.holidayId, recipient, () => {
      modal.destroy();
    });
    modal.open();
  }

  async deleteRecipient(recipient) {
    const confirmed = await createConfirmModal({
      title: 'Удалить одариваемого?',
      message: `Вы действительно хотите удалить "${recipient.name}"? Все подарки также будут удалены.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await recipientService.delete(recipient.id);
        toast.success('Одариваемый удалён');
      } catch (error) {
        console.error('Ошибка удаления:', error);
        toast.error('Не удалось удалить');
      }
    }
  }

  render() {
    this.container.innerHTML = '';
    this.isRendered = false;
    super.render();
  }
}
