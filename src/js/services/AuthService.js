/**
 * Сервис авторизации через Supabase
 * Управляет регистрацией, входом, выходом и состоянием сессии
 */

import { createClient } from '@supabase/supabase-js';
import { supabaseConfig, isSupabaseConfigured } from '../config/supabase.config.js';
import { eventBus, AppEvents } from '../events.js';

class AuthService {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.isOnline = navigator.onLine;
    this.isConfigured = false;
  }

  /**
   * Инициализация Supabase клиента
   * @returns {boolean} true если Supabase успешно инициализирован
   */
  init() {
    this.isConfigured = isSupabaseConfigured();

    if (this.isConfigured) {
      this.supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: localStorage,
        }
      });

      // Слушаем изменения сессии
      this.supabase.auth.onAuthStateChange((event, session) => {
        this.handleAuthChange(event, session);
      });

      console.log('[AuthService] Supabase клиент инициализирован');
    } else {
      console.warn('[AuthService] Supabase не настроен, работа только в офлайн режиме');
    }

    // Слушаем изменения сети
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    return this.isConfigured;
  }

  /**
   * Обработка изменения состояния авторизации
   */
  handleAuthChange(event, session) {
    console.log('[AuthService] Auth event:', event);

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      this.currentUser = session?.user || null;
      if (this.currentUser) {
        eventBus.emit(AppEvents.AUTH_STATE_CHANGED, {
          user: this.currentUser,
          isAuthenticated: true
        });
      }
    } else if (event === 'SIGNED_OUT') {
      this.currentUser = null;
      eventBus.emit(AppEvents.AUTH_STATE_CHANGED, {
        user: null,
        isAuthenticated: false
      });
    }
  }

  /**
   * Обработка перехода в онлайн
   */
  handleOnline() {
    this.isOnline = true;
    console.log('[AuthService] Онлайн');
    eventBus.emit(AppEvents.NETWORK_STATUS_CHANGED, { isOnline: true });
  }

  /**
   * Обработка перехода в офлайн
   */
  handleOffline() {
    this.isOnline = false;
    console.log('[AuthService] Офлайн');
    eventBus.emit(AppEvents.NETWORK_STATUS_CHANGED, { isOnline: false });
  }

  /**
   * Регистрация нового пользователя
   * @param {string} email - Email пользователя
   * @param {string} password - Пароль (минимум 6 символов)
   * @returns {Promise<Object>} Данные пользователя
   */
  async signUp(email, password) {
    if (!this.isConfigured) {
      throw new Error('Supabase не настроен');
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('[AuthService] Ошибка регистрации:', error);
      eventBus.emit(AppEvents.AUTH_ERROR, { error, action: 'signUp' });
      throw error;
    }

    console.log('[AuthService] Регистрация успешна:', data.user?.email);
    return data;
  }

  /**
   * Вход в систему
   * @param {string} email - Email пользователя
   * @param {string} password - Пароль
   * @returns {Promise<Object>} Данные сессии
   */
  async signIn(email, password) {
    if (!this.isConfigured) {
      throw new Error('Supabase не настроен');
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[AuthService] Ошибка входа:', error);
      eventBus.emit(AppEvents.AUTH_ERROR, { error, action: 'signIn' });
      throw error;
    }

    console.log('[AuthService] Вход успешен:', data.user?.email);
    return data;
  }

  /**
   * Выход из системы
   */
  async signOut() {
    if (!this.isConfigured || !this.supabase) {
      this.currentUser = null;
      eventBus.emit(AppEvents.AUTH_STATE_CHANGED, {
        user: null,
        isAuthenticated: false
      });
      return;
    }

    const { error } = await this.supabase.auth.signOut();

    if (error) {
      console.error('[AuthService] Ошибка выхода:', error);
      throw error;
    }

    console.log('[AuthService] Выход выполнен');
  }

  /**
   * Сброс пароля
   * @param {string} email - Email пользователя
   */
  async resetPassword(email) {
    if (!this.isConfigured) {
      throw new Error('Supabase не настроен');
    }

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      console.error('[AuthService] Ошибка сброса пароля:', error);
      throw error;
    }

    console.log('[AuthService] Письмо для сброса пароля отправлено');
  }

  /**
   * Получить текущего пользователя
   * @returns {Promise<Object|null>} Пользователь или null
   */
  async getCurrentUser() {
    if (!this.isConfigured) return null;

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('[AuthService] Ошибка получения пользователя:', error);
      return null;
    }
  }

  /**
   * Получить текущую сессию
   * @returns {Promise<Object|null>} Сессия или null
   */
  async getSession() {
    if (!this.isConfigured) return null;

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('[AuthService] Ошибка получения сессии:', error);
      return null;
    }
  }

  /**
   * Проверить, авторизован ли пользователь
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Получить ID текущего пользователя
   * @returns {string|null}
   */
  getUserId() {
    return this.currentUser?.id || null;
  }

  /**
   * Получить email текущего пользователя
   * @returns {string|null}
   */
  getUserEmail() {
    return this.currentUser?.email || null;
  }

  /**
   * Получить Supabase клиент для прямых запросов
   * @returns {Object|null}
   */
  getClient() {
    return this.supabase;
  }

  /**
   * Проверить, настроен ли Supabase
   * @returns {boolean}
   */
  isSupabaseEnabled() {
    return this.isConfigured;
  }

  /**
   * Проверить, есть ли подключение к интернету
   * @returns {boolean}
   */
  isNetworkOnline() {
    return this.isOnline;
  }
}

export const authService = new AuthService();
