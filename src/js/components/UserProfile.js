import { Component } from './Component.js';
import { authService } from '../services/AuthService.js';
import { syncManager } from '../services/SyncManager.js';
import { AuthModal } from './AuthModal.js';
import { toast } from './Toast.js';
import { AppEvents } from '../events.js';

/**
 * Компонент профиля пользователя в шапке приложения
 * Показывает статус авторизации, сети и синхронизации
 */
export class UserProfile extends Component {
  getInitialState() {
    return {
      user: null,
      isOnline: navigator.onLine,
      isSyncing: false,
      pendingSync: 0,
    };
  }

  subscribeToEvents() {
    this.subscribe(AppEvents.AUTH_STATE_CHANGED, ({ user }) => {
      this.setState({ user });
      this.updatePendingCount();
    });

    this.subscribe(AppEvents.NETWORK_STATUS_CHANGED, ({ isOnline }) => {
      this.setState({ isOnline });
    });

    this.subscribe(AppEvents.SYNC_STARTED, () => {
      this.setState({ isSyncing: true });
    });

    this.subscribe(AppEvents.SYNC_COMPLETED, () => {
      this.setState({ isSyncing: false });
      this.updatePendingCount();
    });

    this.subscribe(AppEvents.SYNC_ERROR, () => {
      this.setState({ isSyncing: false });
    });
  }

  async updatePendingCount() {
    try {
      const count = await syncManager.getQueueCount();
      this.setState({ pendingSync: count }, false);
    } catch (e) {
      // Игнорируем ошибки
    }
  }

  template() {
    const { user, isOnline, isSyncing, pendingSync } = this.state;

    // Индикатор статуса сети
    const networkStatus = isOnline
      ? '<span class="status-dot status-dot--online" title="Онлайн"></span>'
      : '<span class="status-dot status-dot--offline" title="Офлайн"></span>';

    // Индикатор синхронизации
    let syncIndicator = '';
    if (isSyncing) {
      syncIndicator = '<span class="sync-indicator sync-indicator--active" title="Синхронизация..."></span>';
    } else if (pendingSync > 0) {
      syncIndicator = `<span class="sync-indicator sync-indicator--pending" title="Ожидает синхронизации: ${pendingSync}"></span>`;
    }

    if (user) {
      // Авторизованный пользователь
      const email = user.email || 'Пользователь';
      const shortEmail = email.length > 20 ? email.substring(0, 17) + '...' : email;

      return `
        <div class="user-profile user-profile--authenticated">
          ${networkStatus}
          ${syncIndicator}
          <span class="user-email" title="${email}">${shortEmail}</span>
          <button class="btn btn-ghost btn-sm user-profile__btn" id="sync-btn" title="Синхронизировать">
            <span class="btn-icon">↻</span>
          </button>
          <button class="btn btn-ghost btn-sm user-profile__btn" id="logout-btn" title="Выйти">
            <span class="btn-icon">⎋</span>
          </button>
        </div>
      `;
    }

    // Неавторизованный пользователь
    return `
      <div class="user-profile">
        ${networkStatus}
        <button class="btn btn-primary btn-sm" id="login-btn">Войти</button>
      </div>
    `;
  }

  bindEvents() {
    const loginBtn = this.container.querySelector('#login-btn');
    const logoutBtn = this.container.querySelector('#logout-btn');
    const syncBtn = this.container.querySelector('#sync-btn');

    if (loginBtn) {
      this.addEventListener(loginBtn, 'click', () => this.showLoginModal());
    }

    if (logoutBtn) {
      this.addEventListener(logoutBtn, 'click', () => this.handleLogout());
    }

    if (syncBtn) {
      this.addEventListener(syncBtn, 'click', () => this.handleSync());
    }
  }

  /**
   * Показать модальное окно авторизации
   */
  showLoginModal() {
    const modal = new AuthModal(() => {
      // После успешного входа запускаем синхронизацию
      syncManager.syncAll();
    });
    modal.open();
  }

  /**
   * Обработка выхода из системы
   */
  async handleLogout() {
    try {
      await authService.signOut();
      toast.info('Вы вышли из системы');
      // Перезагружаем страницу для обновления данных
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Ошибка выхода');
    }
  }

  /**
   * Обработка ручной синхронизации
   */
  async handleSync() {
    if (!this.state.isOnline) {
      toast.warning('Нет подключения к интернету');
      return;
    }

    if (this.state.isSyncing) {
      toast.info('Синхронизация уже выполняется');
      return;
    }

    try {
      await syncManager.syncAll();
      toast.success('Данные синхронизированы');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Ошибка синхронизации');
    }
  }

  render() {
    // Очищаем предыдущий контент
    this.container.innerHTML = '';
    this.isRendered = false;

    const html = this.template();
    this.container.insertAdjacentHTML('beforeend', html);
    this.bindEvents();
  }
}
