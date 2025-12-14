import { Component } from './Component.js';

/**
 * Компонент вкладок (табов)
 */
export class Tabs extends Component {
  /**
   * @param {HTMLElement|string} container - Контейнер
   * @param {Object} props - Свойства
   * @param {Array} props.tabs - Массив вкладок [{ id, label, content }]
   * @param {string} props.activeTab - ID активной вкладки
   * @param {Function} props.onTabChange - Callback при смене вкладки
   */
  constructor(container, props = {}) {
    super(container, props);
  }

  getInitialState() {
    return {
      activeTab: this.props.activeTab || (this.props.tabs && this.props.tabs[0]?.id) || null,
    };
  }

  template() {
    const { tabs = [] } = this.props;
    const { activeTab } = this.state;

    if (tabs.length === 0) {
      return '<div class="tabs">Нет вкладок</div>';
    }

    const tabsHtml = tabs.map(tab => {
      const activeClass = tab.id === activeTab ? 'tab--active' : '';
      return `
        <button
          class="tab ${activeClass}"
          data-tab-id="${tab.id}"
          role="tab"
          aria-selected="${tab.id === activeTab}"
        >
          ${tab.label}
        </button>
      `;
    }).join('');

    const activeTabData = tabs.find(t => t.id === activeTab);
    const contentHtml = activeTabData?.content || '';

    return `
      <div class="tabs">
        <div class="tabs__header" role="tablist">
          ${tabsHtml}
        </div>
        <div class="tabs__content" role="tabpanel">
          ${contentHtml}
        </div>
      </div>
    `;
  }

  bindEvents() {
    const tabButtons = this.container.querySelectorAll('[data-tab-id]');

    tabButtons.forEach(button => {
      this.addEventListener(button, 'click', (e) => {
        const tabId = e.target.dataset.tabId;
        this.switchTab(tabId);
      });
    });
  }

  /**
   * Переключить вкладку
   * @param {string} tabId - ID вкладки
   */
  switchTab(tabId) {
    this.setState({ activeTab: tabId });

    if (this.props.onTabChange) {
      this.props.onTabChange(tabId);
    }
  }

  /**
   * Обновить содержимое вкладки
   * @param {string} tabId - ID вкладки
   * @param {string} content - Новое содержимое
   */
  updateTabContent(tabId, content) {
    const tab = this.props.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.content = content;
      if (this.state.activeTab === tabId) {
        this.render();
      }
    }
  }

  render() {
    // Очищаем контейнер перед рендером
    this.container.innerHTML = '';
    this.isRendered = false;
    super.render();
  }
}
