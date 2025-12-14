import { Component } from './Component.js';

/**
 * Базовый компонент модального окна
 */
export class Modal extends Component {
  /**
   * @param {Object} props - Свойства
   * @param {string} props.title - Заголовок модального окна
   * @param {string} props.content - Содержимое
   * @param {Function} props.onClose - Callback при закрытии
   * @param {boolean} props.closeOnBackdrop - Закрывать при клике на фон
   */
  constructor(props = {}) {
    // Модальное окно всегда рендерится в специальном контейнере
    const container = document.getElementById('modal-container');
    super(container, props);
  }

  getInitialState() {
    return {
      isOpen: false,
    };
  }

  template() {
    if (!this.state.isOpen) {
      return '';
    }

    const { title = '', content = '' } = this.props;

    return `
      <div class="modal-overlay" data-modal-overlay>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal__header">
            <h2 id="modal-title" class="modal__title">${title}</h2>
            <button
              class="modal__close"
              data-modal-close
              aria-label="Закрыть"
              type="button"
            >
              ✕
            </button>
          </div>
          <div class="modal__content">
            ${content}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Закрытие по кнопке
    const closeButton = this.container.querySelector('[data-modal-close]');
    if (closeButton) {
      this.addEventListener(closeButton, 'click', () => this.close());
    }

    // Закрытие по клику на фон
    if (this.props.closeOnBackdrop !== false) {
      const overlay = this.container.querySelector('[data-modal-overlay]');
      if (overlay) {
        this.addEventListener(overlay, 'click', (e) => {
          if (e.target === overlay) {
            this.close();
          }
        });
      }
    }

    // Закрытие по Escape
    this.addEventListener(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.state.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Открыть модальное окно
   */
  open() {
    this.setState({ isOpen: true });
    document.body.style.overflow = 'hidden'; // Блокируем скролл
  }

  /**
   * Закрыть модальное окно
   */
  close() {
    this.setState({ isOpen: false });
    document.body.style.overflow = ''; // Разблокируем скролл

    if (this.props.onClose) {
      this.props.onClose();
    }
  }

  render() {
    // Очищаем контейнер перед рендером
    this.container.innerHTML = '';
    this.isRendered = false;
    super.render();
  }

  destroy() {
    document.body.style.overflow = ''; // Разблокируем скролл при уничтожении
    super.destroy();
  }
}

/**
 * Создать модальное окно подтверждения
 * @param {Object} options - Параметры
 * @returns {Promise<boolean>} true если подтверждено, false если отменено
 */
export function createConfirmModal({
  title = 'Подтверждение',
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'danger', // primary, danger
}) {
  return new Promise((resolve) => {
    const content = `
      <p>${message}</p>
      <div class="modal__actions">
        <button class="btn btn-secondary" data-cancel>
          ${cancelText}
        </button>
        <button class="btn btn-${variant}" data-confirm>
          ${confirmText}
        </button>
      </div>
    `;

    const modal = new Modal({
      title,
      content,
      closeOnBackdrop: true,
      onClose: () => {
        resolve(false);
        modal.destroy();
      },
    });

    modal.open();

    // Привязываем события к кнопкам после рендера
    setTimeout(() => {
      const confirmBtn = document.querySelector('[data-confirm]');
      const cancelBtn = document.querySelector('[data-cancel]');

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          resolve(true);
          modal.close();
          modal.destroy();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          resolve(false);
          modal.close();
          modal.destroy();
        });
      }
    }, 0);
  });
}
