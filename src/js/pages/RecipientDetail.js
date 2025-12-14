import { Component } from '../components/Component.js';
import { GiftList } from '../components/GiftList.js';
import { createRecipientTypeBadge } from '../components/Badge.js';
import { createSmartProgressBar } from '../components/ProgressBar.js';
import { recipientService } from '../services/RecipientService.js';
import { toast } from '../components/Toast.js';
import { router } from '../router.js';

/**
 * Страница деталей одариваемого
 */
export class RecipientDetail extends Component {
  constructor(container, recipientId) {
    super(container, { recipientId });
  }

  getInitialState() {
    return {
      recipient: null,
      stats: null,
      loading: true,
    };
  }

  async init() {
    super.init();
    await this.loadRecipient();
  }

  async loadRecipient() {
    try {
      const recipient = await recipientService.getById(this.props.recipientId);
      if (!recipient) {
        toast.error('Одариваемый не найден');
        router.back();
        return;
      }

      const stats = await recipientService.getStats(this.props.recipientId);
      this.setState({ recipient, stats, loading: false });
    } catch (error) {
      console.error('Ошибка загрузки одариваемого:', error);
      toast.error('Не удалось загрузить данные');
      this.setState({ loading: false });
    }
  }

  template() {
    const { recipient, stats, loading } = this.state;

    if (loading) {
      return `
        <div class="container">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Загрузка...</p>
          </div>
        </div>
      `;
    }

    if (!recipient) {
      return `
        <div class="container">
          <div class="error-state">
            <p>Одариваемый не найден</p>
          </div>
        </div>
      `;
    }

    const badge = createRecipientTypeBadge(recipient.type);
    const progressBar = createSmartProgressBar({
      percent: stats.completionPercent,
      showLabel: true,
      size: 'lg',
    });

    return `
      <div class="container">
        <div class="page-header">
          <button class="btn-back" id="back-btn">← Назад</button>
          <div>
            <div class="recipient-header">
              <h1>${recipient.name}</h1>
              ${badge}
            </div>
            ${recipient.note ? `<p class="recipient-note">${recipient.note}</p>` : ''}
          </div>
        </div>

        <div class="recipient-stats-card">
          <h3>Прогресс</h3>
          ${progressBar}
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-card__value">${stats.boughtGifts}/${stats.totalGifts}</span>
              <span class="stat-card__label">Подарков готово</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">${stats.totalCost.toLocaleString()} ₽</span>
              <span class="stat-card__label">Общая стоимость</span>
            </div>
            ${recipient.budget > 0 ? `
              <div class="stat-card">
                <span class="stat-card__value">${recipient.budget.toLocaleString()} ₽</span>
                <span class="stat-card__label">Бюджет</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div id="gift-list-container"></div>
      </div>
    `;
  }

  onRender() {
    super.onRender();
    this.renderGiftList();
  }

  renderGiftList() {
    const container = document.getElementById('gift-list-container');
    if (!container) return;

    this.giftList = new GiftList(
      container,
      this.props.recipientId,
      this.state.recipient.holidayId
    );
  }

  bindEvents() {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        router.back();
      });
    }
  }

  render() {
    this.container.innerHTML = '';
    this.isRendered = false;
    super.render();
  }

  destroy() {
    if (this.giftList) this.giftList.destroy();
    super.destroy();
  }
}
