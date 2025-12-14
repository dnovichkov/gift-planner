import { Component } from '../components/Component.js';
import { Tabs } from '../components/Tabs.js';
import { RecipientsList } from '../components/RecipientsList.js';
import { ShoppingList } from '../components/ShoppingList.js';
import { StatisticsView } from '../components/StatisticsView.js';
import { holidayService } from '../services/HolidayService.js';
import { toast } from '../components/Toast.js';
import { router } from '../router.js';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Страница деталей праздника с вкладками
 */
export class HolidayDashboard extends Component {
  constructor(container, holidayId) {
    super(container, { holidayId });
  }

  getInitialState() {
    return {
      holiday: null,
      loading: true,
      activeTab: 'recipients',
    };
  }

  async init() {
    super.init();
    await this.loadHoliday();
  }

  async loadHoliday() {
    try {
      const holiday = await holidayService.getById(this.props.holidayId);
      if (!holiday) {
        toast.error('Праздник не найден');
        router.navigate('/');
        return;
      }
      this.setState({ holiday, loading: false });
    } catch (error) {
      console.error('Ошибка загрузки праздника:', error);
      toast.error('Не удалось загрузить праздник');
      this.setState({ loading: false });
    }
  }

  template() {
    const { holiday, loading } = this.state;

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

    if (!holiday) {
      return `
        <div class="container">
          <div class="error-state">
            <p>Праздник не найден</p>
          </div>
        </div>
      `;
    }

    const dateFormatted = format(new Date(holiday.date), 'd MMMM yyyy', { locale: ru });

    return `
      <div class="container">
        <div class="page-header">
          <button class="btn-back" id="back-btn">← Назад</button>
          <div>
            <h1>${holiday.name}</h1>
            <p class="holiday-date">${dateFormatted}</p>
          </div>
        </div>
        <div id="holiday-tabs-container"></div>
      </div>
    `;
  }

  onRender() {
    super.onRender();
    this.renderTabs();
  }

  renderTabs() {
    const tabsContainer = document.getElementById('holiday-tabs-container');
    if (!tabsContainer) return;

    this.tabsComponent = new Tabs(tabsContainer, {
      activeTab: this.state.activeTab,
      tabs: [
        { id: 'recipients', label: 'Одариваемые', content: '<div id="recipients-content"></div>' },
        { id: 'shopping', label: 'Список покупок', content: '<div id="shopping-content"></div>' },
        { id: 'statistics', label: 'Статистика', content: '<div id="statistics-content"></div>' },
      ],
      onTabChange: (tabId) => {
        this.setState({ activeTab: tabId }, false);
        this.renderTabContent(tabId);
      },
    });

    // Рендерим содержимое первой вкладки
    setTimeout(() => {
      this.renderTabContent(this.state.activeTab);
    }, 0);
  }

  renderTabContent(tabId) {
    // Очищаем предыдущие компоненты вкладок
    if (this.recipientsList) this.recipientsList.destroy();
    if (this.shoppingList) this.shoppingList.destroy();
    if (this.statisticsView) this.statisticsView.destroy();

    switch (tabId) {
      case 'recipients':
        const recipientsContainer = document.getElementById('recipients-content');
        if (recipientsContainer) {
          this.recipientsList = new RecipientsList(recipientsContainer, this.props.holidayId);
        }
        break;

      case 'shopping':
        const shoppingContainer = document.getElementById('shopping-content');
        if (shoppingContainer) {
          this.shoppingList = new ShoppingList(shoppingContainer, this.props.holidayId);
        }
        break;

      case 'statistics':
        const statisticsContainer = document.getElementById('statistics-content');
        if (statisticsContainer) {
          this.statisticsView = new StatisticsView(statisticsContainer, this.props.holidayId);
        }
        break;
    }
  }

  bindEvents() {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        router.navigate('/');
      });
    }
  }

  render() {
    this.container.innerHTML = '';
    this.isRendered = false;
    super.render();
  }

  destroy() {
    if (this.recipientsList) this.recipientsList.destroy();
    if (this.shoppingList) this.shoppingList.destroy();
    if (this.statisticsView) this.statisticsView.destroy();
    super.destroy();
  }
}
