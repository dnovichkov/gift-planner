import { Component } from './Component.js';
import { createButton, createIconButton } from './Button.js';
import { createCheckbox } from './Checkbox.js';
import { createPriorityBadge, createGiftStatusBadge } from './Badge.js';
import { GiftModal } from './GiftModal.js';
import { createConfirmModal } from './Modal.js';
import { giftService } from '../services/GiftService.js';
import { toast } from './Toast.js';
import { AppEvents } from '../events.js';

/**
 * Компонент списка подарков для одариваемого
 */
export class GiftList extends Component {
  /**
   * @param {HTMLElement|string} container - Контейнер
   * @param {string} recipientId - ID одариваемого
   * @param {string} holidayId - ID праздника
   */
  constructor(container, recipientId, holidayId) {
    super(container, { recipientId, holidayId });
  }

  getInitialState() {
    return {
      gifts: [],
      loading: true,
    };
  }

  subscribeToEvents() {
    this.subscribe(AppEvents.GIFT_CREATED, () => this.loadGifts());
    this.subscribe(AppEvents.GIFT_UPDATED, () => this.loadGifts());
    this.subscribe(AppEvents.GIFT_DELETED, () => this.loadGifts());
    this.subscribe(AppEvents.GIFT_STATUS_CHANGED, () => this.loadGifts());
  }

  async init() {
    super.init();
    await this.loadGifts();
  }

  async loadGifts() {
    try {
      const gifts = await giftService.getByRecipientId(this.props.recipientId);
      this.setState({ gifts, loading: false });
    } catch (error) {
      console.error('Ошибка загрузки подарков:', error);
      toast.error('Не удалось загрузить подарки');
    }
  }

  template() {
    const { gifts, loading } = this.state;

    if (loading) {
      return `<div class="loading-state"><div class="spinner"></div><p>Загрузка...</p></div>`;
    }

    const headerHtml = `
      <div class="gift-list-header">
        <h3>Подарки</h3>
        ${createButton({
          text: 'Добавить подарок',
          variant: 'primary',
          size: 'sm',
          icon: '➕',
          id: 'add-gift-btn',
        })}
      </div>
    `;

    if (gifts.length === 0) {
      return `
        ${headerHtml}
        <div class="empty-state">
          <p>Пока нет подарков. Добавьте первый!</p>
        </div>
      `;
    }

    const giftsHtml = gifts.map(g => this.renderGiftItem(g)).join('');

    return `
      ${headerHtml}
      <div class="gift-list">
        ${giftsHtml}
      </div>
    `;
  }

  renderGiftItem(gift) {
    const priorityBadge = createPriorityBadge(gift.priority);
    const statusBadge = createGiftStatusBadge(gift.status);
    const boughtClass = gift.status === 'bought' ? 'gift-item--bought' : '';

    return `
      <div class="gift-item ${boughtClass}" id="gift-item-${gift.id}">
        <div class="gift-item__checkbox">
          ${createCheckbox({
            label: '',
            name: `gift-${gift.id}`,
            checked: gift.status === 'bought',
            onChange: `window.toggleGift('${gift.id}')`,
            id: `gift-checkbox-${gift.id}`,
          })}
        </div>
        <div class="gift-item__content">
          <div class="gift-item__main">
            <h4 class="gift-item__name">${gift.name}</h4>
            ${gift.description ? `<p class="gift-item__desc">${gift.description}</p>` : ''}
          </div>
          <div class="gift-item__meta">
            ${priorityBadge}
            ${statusBadge}
            ${gift.cost > 0 ? `<span class="gift-item__cost">${gift.cost.toLocaleString()} ₽</span>` : ''}
          </div>
        </div>
        <div class="gift-item__actions">
          ${createIconButton({
            icon: '✏️',
            title: 'Редактировать',
            variant: 'ghost',
            size: 'sm',
            id: `edit-gift-${gift.id}`,
          })}
          ${createIconButton({
            icon: '🗑️',
            title: 'Удалить',
            variant: 'ghost',
            size: 'sm',
            id: `delete-gift-${gift.id}`,
          })}
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Кнопка добавления
    const addBtn = document.getElementById('add-gift-btn');
    if (addBtn) {
      this.addEventListener(addBtn, 'click', () => this.showCreateModal());
    }

    // Глобальная функция для переключения статуса
    window.toggleGift = async (giftId) => {
      try {
        await giftService.toggleStatus(giftId);
      } catch (error) {
        console.error('Ошибка изменения статуса:', error);
        toast.error('Не удалось изменить статус');
      }
    };

    // Кнопки редактирования и удаления
    this.state.gifts.forEach(gift => {
      const editBtn = document.getElementById(`edit-gift-${gift.id}`);
      const deleteBtn = document.getElementById(`delete-gift-${gift.id}`);

      if (editBtn) {
        this.addEventListener(editBtn, 'click', () => this.showEditModal(gift));
      }

      if (deleteBtn) {
        this.addEventListener(deleteBtn, 'click', async () => await this.deleteGift(gift));
      }
    });
  }

  showCreateModal() {
    const modal = new GiftModal(
      this.props.recipientId,
      this.props.holidayId,
      null,
      () => modal.destroy()
    );
    modal.open();
  }

  showEditModal(gift) {
    const modal = new GiftModal(
      this.props.recipientId,
      this.props.holidayId,
      gift,
      () => modal.destroy()
    );
    modal.open();
  }

  async deleteGift(gift) {
    const confirmed = await createConfirmModal({
      title: 'Удалить подарок?',
      message: `Вы действительно хотите удалить подарок "${gift.name}"?`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await giftService.delete(gift.id);
        toast.success('Подарок удалён');
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

  destroy() {
    delete window.toggleGift;
    super.destroy();
  }
}
