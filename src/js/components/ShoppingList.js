import { Component } from './Component.js';
import { createSelect } from './Select.js';
import { createCheckbox } from './Checkbox.js';
import { createPriorityBadge } from './Badge.js';
import { giftService } from '../services/GiftService.js';
import { toast } from './Toast.js';
import { AppEvents } from '../events.js';

/**
 * Компонент списка покупок
 */
export class ShoppingList extends Component {
  /**
   * @param {HTMLElement|string} container - Контейнер
   * @param {string} holidayId - ID праздника
   */
  constructor(container, holidayId) {
    super(container, { holidayId });
  }

  getInitialState() {
    return {
      gifts: [],
      loading: true,
      sortBy: 'priority', // priority, cost, recipient
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
      const gifts = await giftService.getShoppingList(
        this.props.holidayId,
        { sortBy: this.state.sortBy }
      );

      this.setState({ gifts, loading: false });
    } catch (error) {
      console.error('Ошибка загрузки списка покупок:', error);
      toast.error('Не удалось загрузить список');
    }
  }

  template() {
    const { gifts, loading } = this.state;

    if (loading) {
      return `<div class="loading-state"><div class="spinner"></div><p>Загрузка...</p></div>`;
    }

    const totalCost = gifts.reduce((sum, g) => sum + (g.cost || 0), 0);

    const headerHtml = `
      <div class="shopping-list-header">
        <div class="shopping-list-stats">
          <h3>Список покупок</h3>
          <p>${gifts.length} подарков на ${totalCost.toLocaleString()} ₽</p>
        </div>
        ${createSelect({
          label: 'Сортировка',
          name: 'sort',
          options: [
            { value: 'priority', label: 'По приоритету' },
            { value: 'cost', label: 'По стоимости' },
            { value: 'recipient', label: 'По получателю' },
          ],
          value: this.state.sortBy,
          id: 'shopping-sort',
        })}
      </div>
    `;

    if (gifts.length === 0) {
      return `
        ${headerHtml}
        <div class="empty-state">
          <p>🎉 Все подарки куплены!</p>
        </div>
      `;
    }

    const giftsHtml = gifts.map(g => this.renderGiftItem(g)).join('');

    return `
      ${headerHtml}
      <div class="shopping-list">
        ${giftsHtml}
      </div>
    `;
  }

  renderGiftItem(gift) {
    const priorityBadge = createPriorityBadge(gift.priority);

    return `
      <div class="shopping-item" id="gift-${gift.id}">
        ${createCheckbox({
          label: '',
          name: `gift-${gift.id}`,
          checked: false,
          onChange: `window.toggleGiftStatus('${gift.id}')`,
          id: `checkbox-${gift.id}`,
        })}
        <div class="shopping-item__content">
          <div class="shopping-item__main">
            <h4 class="shopping-item__name">${gift.name}</h4>
            <span class="shopping-item__recipient">для ${gift.recipientName}</span>
          </div>
          <div class="shopping-item__meta">
            ${priorityBadge}
            ${gift.cost > 0 ? `<span class="shopping-item__cost">${gift.cost.toLocaleString()} ₽</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Сортировка
    const sortSelect = document.getElementById('shopping-sort');
    if (sortSelect) {
      this.addEventListener(sortSelect, 'change', (e) => {
        this.setState({ sortBy: e.target.value });
        this.loadGifts();
      });
    }

    // Глобальная функция для переключения статуса
    window.toggleGiftStatus = async (giftId) => {
      try {
        await giftService.toggleStatus(giftId);
        toast.success('Статус подарка изменён');
      } catch (error) {
        console.error('Ошибка изменения статуса:', error);
        toast.error('Не удалось изменить статус');
      }
    };
  }

  render() {
    this.container.innerHTML = '';
    this.isRendered = false;
    super.render();
  }

  destroy() {
    // Очищаем глобальную функцию
    delete window.toggleGiftStatus;
    super.destroy();
  }
}
