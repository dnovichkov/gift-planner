import { Modal } from './Modal.js';
import { authService } from '../services/AuthService.js';
import { toast } from './Toast.js';

/**
 * Модальное окно авторизации (вход/регистрация)
 */
export class AuthModal extends Modal {
  /**
   * @param {Function} onSuccess - Callback после успешной авторизации
   */
  constructor(onSuccess = null) {
    super({
      title: 'Авторизация',
      content: '',
      closeOnBackdrop: true,
    });

    this.mode = 'login'; // login | register
    this.onSuccess = onSuccess;
  }

  template() {
    if (!this.state.isOpen) {
      return '';
    }

    return `
      <div class="modal-overlay" data-modal-overlay>
        <div class="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal__header">
            <h2 id="modal-title" class="modal__title">Авторизация</h2>
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
            <div class="auth-tabs">
              <button class="auth-tab ${this.mode === 'login' ? 'auth-tab--active' : ''}" data-tab="login">
                Вход
              </button>
              <button class="auth-tab ${this.mode === 'register' ? 'auth-tab--active' : ''}" data-tab="register">
                Регистрация
              </button>
            </div>

            <form class="auth-form" id="auth-form">
              <div class="form-group">
                <label for="auth-email">Email</label>
                <input
                  type="email"
                  id="auth-email"
                  name="email"
                  required
                  placeholder="Введите email"
                  autocomplete="email"
                  class="form-input"
                >
              </div>

              <div class="form-group">
                <label for="auth-password">Пароль</label>
                <input
                  type="password"
                  id="auth-password"
                  name="password"
                  required
                  placeholder="Введите пароль"
                  autocomplete="${this.mode === 'login' ? 'current-password' : 'new-password'}"
                  minlength="6"
                  class="form-input"
                >
              </div>

              <div class="auth-error" id="auth-error" style="display: none;"></div>

              <div class="modal__actions">
                <button type="button" class="btn btn-secondary" data-cancel>
                  Отмена
                </button>
                <button type="submit" class="btn btn-primary" id="auth-submit">
                  ${this.mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    super.bindEvents();

    // Переключение табов
    const tabs = this.container.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      this.addEventListener(tab, 'click', () => this.switchTab(tab.dataset.tab));
    });

    // Отправка формы
    const form = this.container.querySelector('#auth-form');
    if (form) {
      this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
    }

    // Кнопка отмены
    const cancelBtn = this.container.querySelector('[data-cancel]');
    if (cancelBtn) {
      this.addEventListener(cancelBtn, 'click', () => this.close());
    }
  }

  /**
   * Переключить между вкладками входа и регистрации
   */
  switchTab(mode) {
    this.mode = mode;
    this.hideError();
    this.render();
  }

  /**
   * Обработка отправки формы
   */
  async handleSubmit(e) {
    e.preventDefault();

    const email = this.container.querySelector('#auth-email')?.value.trim();
    const password = this.container.querySelector('#auth-password')?.value;

    if (!email || !password) {
      this.showError('Заполните все поля');
      return;
    }

    if (password.length < 6) {
      this.showError('Пароль должен быть не менее 6 символов');
      return;
    }

    const submitBtn = this.container.querySelector('#auth-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Загрузка...';
    }

    try {
      if (this.mode === 'login') {
        await authService.signIn(email, password);
        toast.success('Вы успешно вошли в систему');
      } else {
        await authService.signUp(email, password);
        toast.success('Регистрация успешна! Проверьте почту для подтверждения.');
      }

      this.close();

      if (this.onSuccess) {
        this.onSuccess();
      }
    } catch (error) {
      console.error('Auth error:', error);
      this.showError(this.getErrorMessage(error));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = this.mode === 'login' ? 'Войти' : 'Зарегистрироваться';
      }
    }
  }

  /**
   * Показать сообщение об ошибке
   */
  showError(message) {
    const errorEl = this.container.querySelector('#auth-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  /**
   * Скрыть сообщение об ошибке
   */
  hideError() {
    const errorEl = this.container.querySelector('#auth-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  /**
   * Получить понятное сообщение об ошибке
   */
  getErrorMessage(error) {
    const messages = {
      'Invalid login credentials': 'Неверный email или пароль',
      'Email not confirmed': 'Email не подтверждён. Проверьте почту.',
      'User already registered': 'Пользователь уже зарегистрирован',
      'Password should be at least 6 characters': 'Пароль должен быть не менее 6 символов',
      'Unable to validate email address: invalid format': 'Неверный формат email',
      'Signup requires a valid password': 'Введите корректный пароль',
    };

    return messages[error.message] || error.message || 'Произошла ошибка';
  }
}
