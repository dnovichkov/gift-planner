import { eventBus, AppEvents } from '../events.js';

/**
 * Базовый класс для всех UI-компонентов
 * Предоставляет шаблонный метод render(), обработку событий и подписки
 */
export class Component {
  /**
   * @param {HTMLElement|string} container - Родительский элемент или его селектор
   * @param {Object} props - Свойства компонента
   */
  constructor(container, props = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!this.container) {
      throw new Error(`Container для компонента не найден: ${container}`);
    }
    
    this.props = props;
    this.state = {};
    this.eventSubscriptions = [];
    this.eventListeners = [];
    
    this.init();
  }

  /**
   * Инициализация компонента (вызывается в конструкторе)
   */
  init() {
    this.setState(this.getInitialState());
    this.subscribeToEvents();
  }

  /**
   * Возвращает начальное состояние компонента
   * @returns {Object}
   */
  getInitialState() {
    return {};
  }

  /**
   * Подписаться на событие EventBus
   * @param {string} event - Название события
   * @param {Function} callback - Callback
   */
  subscribe(event, callback) {
    eventBus.on(event, callback);
    this.eventSubscriptions.push({ event, callback });
  }

  /**
   * Отписаться от события
   * @param {string} event - Название события
   * @param {Function} callback - Callback
   */
  unsubscribe(event, callback) {
    eventBus.off(event, callback);
    this.eventSubscriptions = this.eventSubscriptions.filter(
      sub => !(sub.event === event && sub.callback === callback)
    );
  }

  /**
   * Добавить слушатель событий на DOM-элемент
   * @param {HTMLElement} element - Элемент
   * @param {string} event - Событие
   * @param {Function} handler - Обработчик
   * @param {Object} options - Опции
   */
  addEventListener(element, event, handler, options = {}) {
    const wrappedHandler = (e) => {
      try {
        handler.call(this, e);
      } catch (error) {
        console.error(`Ошибка в обработчике события ${event}:`, error);
      }
    };
    
    element.addEventListener(event, wrappedHandler, options);
    this.eventListeners.push({ element, event, handler: wrappedHandler });
  }

  /**
   * Установить состояние компонента
   * @param {Object} newState - Новое состояние
   * @param {boolean} shouldRender - Нужно ли перерендерить
   */
  setState(newState, shouldRender = true) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    if (shouldRender) {
      this.render();
    }
    
    this.onStateChange(prevState, this.state);
  }

  /**
   * Вызывается при изменении состояния
   * @param {Object} prevState - Предыдущее состояние
   * @param {Object} newState - Новое состояние
   */
  onStateChange(prevState, newState) {
    // Переопределяется в наследниках
  }

  /**
   * Подписаться на события (переопределяется в наследниках)
   */
  subscribeToEvents() {
    // Переопределяется в наследниках
  }

  /**
   * Сгенерировать HTML шаблон
   * @returns {string} HTML строка
   */
  template() {
    return '<div>Base Component</div>';
  }

  /**
   * Отрендерить компонент
   */
  render() {
    try {
      const html = this.template();
      
      // Если это первый рендер, очистить контейнер
      if (!this.isRendered) {
        this.container.innerHTML = '';
        this.isRendered = true;
      }
      
      // Обновить HTML
      this.container.insertAdjacentHTML('beforeend', html);
      
      // Привязать события
      this.bindEvents();
      
      // Вызвать хук после рендера
      this.onRender();
    } catch (error) {
      console.error('Ошибка рендеринга компонента:', error);
      this.showError(error);
    }
  }

  /**
   * Хук, вызываемый после рендера
   */
  onRender() {
    // Переопределяется в наследниках
  }

  /**
   * Привязать DOM-события (переопределяется в наследниках)
   */
  bindEvents() {
    // Переопределяется в наследниках
  }

  /**
   * Показать состояние загрузки
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="loading-state">
        <div class="spinner" aria-hidden="true"></div>
        <p>Загрузка...</p>
      </div>
    `;
  }

  /**
   * Показать ошибку
   * @param {Error|string} error - Ошибка
   */
  showError(error) {
    const message = error instanceof Error ? error.message : error;
    this.container.innerHTML = `
      <div class="error-state" role="alert">
        <h3>Ошибка</h3>
        <p>${message}</p>
        <button onclick="location.reload()">Перезагрузить</button>
      </div>
    `;
  }

  /**
   * Показать пустое состояние
   * @param {string} title - Заголовок
   * @param {string} description - Описание
   * @param {string} actionText - Текст кнопки действия
   * @param {Function} onAction - Обработчик клика
   */
  showEmptyState(title, description, actionText = '', onAction = null) {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon" aria-hidden="true">📭</div>
        <h3>${title}</h3>
        <p>${description}</p>
        ${actionText ? `<button class="btn-primary" id="empty-action">${actionText}</button>` : ''}
    `;
    
    if (actionText && onAction) {
      const btn = document.getElementById('empty-action');
      this.addEventListener(btn, 'click', onAction);
    }
  }

  /**
   * Очистить компонент
   */
  clear() {
    this.container.innerHTML = '';
  }

  /**
   * Уничтожить компонент (очистить все подписки)
   */
  destroy() {
    this.eventSubscriptions.forEach(({ event, callback }) => {
      eventBus.off(event, callback);
    });
    
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    
    this.eventSubscriptions = [];
    this.eventListeners = [];
    this.clear();
  }
}