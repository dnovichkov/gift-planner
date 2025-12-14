/**
 * Сервис для показа Toast-уведомлений
 */
class ToastService {
  constructor() {
    this.container = null;
    this.toasts = [];
  }

  /**
   * Инициализировать контейнер для тостов
   */
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      console.error('Toast container не найден');
    }
  }

  /**
   * Показать уведомление
   * @param {Object} options - Параметры уведомления
   */
  show({
    message,
    type = 'info', // success, error, warning, info
    duration = 3000,
    closable = true,
  }) {
    if (!this.container) {
      this.init();
    }

    const id = `toast-${Date.now()}-${Math.random()}`;

    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };

    const icon = iconMap[type] || iconMap.info;

    const closeButton = closable
      ? `<button class="toast__close" data-toast-close="${id}" aria-label="Закрыть">✕</button>`
      : '';

    const toastHtml = `
      <div class="toast toast--${type}" id="${id}" role="alert">
        <div class="toast__icon">${icon}</div>
        <div class="toast__message">${message}</div>
        ${closeButton}
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', toastHtml);

    const toastElement = document.getElementById(id);

    // Анимация появления
    setTimeout(() => {
      toastElement.classList.add('toast--show');
    }, 10);

    // Закрытие по кнопке
    if (closable) {
      const closeBtn = toastElement.querySelector('[data-toast-close]');
      closeBtn.addEventListener('click', () => {
        this.remove(id);
      });
    }

    // Автоматическое удаление
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    this.toasts.push({ id, element: toastElement });

    return id;
  }

  /**
   * Удалить уведомление
   * @param {string} id - ID уведомления
   */
  remove(id) {
    const toast = this.toasts.find(t => t.id === id);
    if (!toast) return;

    toast.element.classList.remove('toast--show');
    toast.element.classList.add('toast--hide');

    setTimeout(() => {
      toast.element.remove();
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, 300); // Время анимации
  }

  /**
   * Показать успешное уведомление
   * @param {string} message - Сообщение
   */
  success(message, duration = 3000) {
    return this.show({ message, type: 'success', duration });
  }

  /**
   * Показать уведомление об ошибке
   * @param {string} message - Сообщение
   */
  error(message, duration = 5000) {
    return this.show({ message, type: 'error', duration });
  }

  /**
   * Показать предупреждение
   * @param {string} message - Сообщение
   */
  warning(message, duration = 4000) {
    return this.show({ message, type: 'warning', duration });
  }

  /**
   * Показать информационное уведомление
   * @param {string} message - Сообщение
   */
  info(message, duration = 3000) {
    return this.show({ message, type: 'info', duration });
  }

  /**
   * Удалить все уведомления
   */
  clear() {
    this.toasts.forEach(toast => {
      toast.element.remove();
    });
    this.toasts = [];
  }
}

// Глобальный экземпляр
export const toast = new ToastService();
