/**
 * Event Bus (Pub/Sub) для декуплинга компонентов
 * Позволяет компонентам общаться через события
 */
export class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * Подписаться на событие
   * @param {string} event - Название события
   * @param {Function} callback - Callback-функция
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * Отписаться от события
   * @param {string} event - Название события
   * @param {Function} callback - Callback-функция для удаления
   */
  off(event, callback) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  /**
   * Вызвать событие
   * @param {string} event - Название события
   * @param {...any} data - Данные для передачи в callback
   */
  emit(event, ...data) {
    if (!this.events[event]) return;
    
    console.log(`EventBus: "${event}"`, data);
    this.events[event].forEach(callback => {
      try {
        callback(...data);
      } catch (error) {
        console.error(`Ошибка в обработчике события "${event}":`, error);
      }
    });
  }

  /**
   * Подписаться на событие один раз
   * @param {string} event - Название события
   * @param {Function} callback - Callback-функция
   */
  once(event, callback) {
    const onceWrapper = (...args) => {
      callback(...args);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Очистить все подписки
   */
  clear() {
    this.events = {};
  }

  /**
   * Получить список активных событий
   * @returns {string[]} Массив названий событий
   */
  getEvents() {
    return Object.keys(this.events);
  }
}

// Глобальный экземпляр EventBus
export const eventBus = new EventBus();

// Предопределенные события приложения
export const AppEvents = {
  // Праздники
  HOLIDAY_CREATED: 'holiday:created',
  HOLIDAY_UPDATED: 'holiday:updated',
  HOLIDAY_DELETED: 'holiday:deleted',

  // Одариваемые
  RECIPIENT_CREATED: 'recipient:created',
  RECIPIENT_UPDATED: 'recipient:updated',
  RECIPIENT_DELETED: 'recipient:deleted',

  // Подарки
  GIFT_CREATED: 'gift:created',
  GIFT_UPDATED: 'gift:updated',
  GIFT_DELETED: 'gift:deleted',
  GIFT_STATUS_CHANGED: 'gift:statusChanged',

  // Навигация
  NAVIGATE: 'app:navigate',
  ROUTE_CHANGED: 'app:routeChanged',

  // Общие
  DATA_LOADED: 'data:loaded',
  ERROR: 'app:error',
  SUCCESS: 'app:success',

  // Авторизация
  AUTH_STATE_CHANGED: 'auth:stateChanged',
  AUTH_ERROR: 'auth:error',

  // Сеть и синхронизация
  NETWORK_STATUS_CHANGED: 'network:statusChanged',
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_ERROR: 'sync:error',
  SYNC_CONFLICT: 'sync:conflict',
};