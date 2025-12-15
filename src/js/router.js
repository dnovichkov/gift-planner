import { eventBus, AppEvents } from './events.js';

/**
 * Простой Hash-based Router
 * Поддерживает параметры в пути: #/holiday/:id
 */
export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.currentParams = {};
    
    // Базовые маршруты
    this.routes.set('/', { component: null, name: 'home' });
  }

  /**
   * Инициализация роутера
   */
  init() {
    console.log('[ROUTER] init() вызван');
    console.log('[ROUTER] Текущий hash:', window.location.hash);
    console.log('[ROUTER] Зарегистрированные маршруты:', Array.from(this.routes.keys()));

    window.addEventListener('hashchange', () => this.handleRouteChange());
    console.log('[ROUTER] hashchange listener добавлен');

    // Обработка кнопки "Назад" браузера
    window.addEventListener('popstate', () => this.handleRouteChange());
    console.log('[ROUTER] popstate listener добавлен');

    // Вызываем обработку текущего маршрута сразу при инициализации
    console.log('[ROUTER] Вызываем handleRouteChange()...');
    this.handleRouteChange();
    console.log('[ROUTER] init() завершён');
  }

  /**
   * Добавить маршрут
   * @param {string} path - Путь маршрута (например, '/holiday/:id')
   * @param {Object} config - Конфигурация маршрута
   */
  addRoute(path, config) {
    this.routes.set(path, config);
    console.log(`Добавлен маршрут: ${path}`);
  }

  /**
   * Обработка изменения маршрута
   */
  handleRouteChange() {
    const hash = window.location.hash.replace('#', '') || '/';
    console.log('[ROUTER] handleRouteChange() - hash:', hash);

    const { path, params } = this.parsePath(hash);
    console.log('[ROUTER] parsePath результат:', { path, params });

    const route = this.findRoute(path);
    console.log('[ROUTER] findRoute результат:', route);

    if (route) {
      this.currentRoute = path;
      this.currentParams = params;

      const routeConfig = this.routes.get(path);
      console.log('[ROUTER] Получен route config:', routeConfig);

      // Эмитируем событие изменения маршрута
      console.log('[ROUTER] Эмитируем ROUTE_CHANGED...');
      eventBus.emit(AppEvents.ROUTE_CHANGED, {
        path: this.currentRoute,
        params: this.currentParams,
        route: routeConfig
      });

      console.log('[ROUTER] Маршрут найден и обработан:', path, params);
    } else {
      console.warn('[ROUTER] Маршрут не найден:', path, ', переход на главную');
      this.navigate('/');
    }
  }

  /**
   * Парсинг пути с параметрами
   * @param {string} path - Путь из URL
   * @returns {Object} Объект с path и params
   */
  parsePath(path) {
    const segments = path.split('/').filter(Boolean);
    const params = {};
    
    // Ищем совпадение с зарегистрированными маршрутами
    for (const [routePath] of this.routes) {
      const routeSegments = routePath.split('/').filter(Boolean);
      
      if (routeSegments.length === segments.length) {
        let match = true;
        const routeParams = {};
        
        for (let i = 0; i < routeSegments.length; i++) {
          const routeSegment = routeSegments[i];
          const pathSegment = segments[i];
          
          if (routeSegment.startsWith(':')) {
            // Это параметр
            const paramName = routeSegment.slice(1);
            routeParams[paramName] = decodeURIComponent(pathSegment);
          } else if (routeSegment !== pathSegment) {
            match = false;
            break;
          }
        }
        
        if (match) {
          return { path: routePath, params: routeParams };
        }
      }
    }
    
    // Если не найдено, возвращаем как есть
    return { path, params };
  }

  /**
   * Поиск совпадающего маршрута
   * @param {string} path - Путь для поиска
   * @returns {Object|null} Найденный маршрут
   */
  findRoute(path) {
    // Прямое совпадение
    if (this.routes.has(path)) {
      return { path, config: this.routes.get(path) };
    }
    
    // Проверка маршрутов с параметрами
    for (const [routePath, config] of this.routes) {
      if (this.matchRoute(routePath, path)) {
        return { path: routePath, config };
      }
    }
    
    return null;
  }

  /**
   * Проверка совпадения маршрута с параметрами
   * @param {string} routePath - Путь маршрута с параметрами
   * @param {string} actualPath - Фактический путь
   * @returns {boolean}
   */
  matchRoute(routePath, actualPath) {
    const routeSegments = routePath.split('/').filter(Boolean);
    const actualSegments = actualPath.split('/').filter(Boolean);
    
    if (routeSegments.length !== actualSegments.length) {
      return false;
    }
    
    return routeSegments.every((segment, i) => {
      return segment.startsWith(':') || segment === actualSegments[i];
    });
  }

  /**
   * Навигация к маршруту
   * @param {string} path - Путь для навигации
   * @param {Object} params - Параметры (опционально)
   */
  navigate(path) {
    const url = `#${path}`;
    
    if (window.location.hash === url) {
      // Если уже на этом маршруте, просто обновляем
      this.handleRouteChange();
    } else {
      window.location.hash = path;
    }
    
    eventBus.emit(AppEvents.NAVIGATE, { path });
  }

  /**
   * Назад в истории
   */
  back() {
    window.history.back();
  }

  /**
   * Получить текущий путь
   * @returns {string}
   */
  getCurrentPath() {
    return this.currentRoute;
  }

  /**
   * Получить параметры текущего маршрута
   * @returns {Object}
   */
  getCurrentParams() {
    return this.currentParams;
  }

  /**
   * Получить параметр по имени
   * @param {string} name - Имя параметра
   * @returns {string|undefined}
   */
  getParam(name) {
    return this.currentParams[name];
  }

  /**
   * Удалить все маршруты (для тестов)
   */
  clear() {
    this.routes.clear();
    this.routes.set('/', { component: null });
  }
}

// Глобальный экземпляр роутера
export const router = new Router();