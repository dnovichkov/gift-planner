import { router } from './router.js';
import { eventBus, AppEvents } from './events.js';
import { db } from './db/idb-wrapper.js';
import { toast } from './components/Toast.js';
import { HomePage } from './pages/HomePage.js';
import { HolidayDashboard } from './pages/HolidayDashboard.js';
import { RecipientDetail } from './pages/RecipientDetail.js';

class App {
  constructor() {
    this.router = router;
    this.eventBus = eventBus;
    this.db = db;
    this.currentPage = null;
  }

  async init() {
    console.log('Gift Planner запускается...');

    try {
      // Инициализируем базу данных
      await this.db.openDb();
      console.log('База данных готова');

      // Инициализируем Toast
      toast.init();

      // Регистрируем маршруты
      this.setupRoutes();

      // Инициализируем роутер
      this.router.init();

      // Глобальный обработчик ошибок
      window.addEventListener('error', (e) => {
        console.error('Глобальная ошибка:', e.error);
        toast.error('Произошла ошибка: ' + (e.error?.message || 'Неизвестная ошибка'));
      });

      // Слушаем изменения маршрута
      eventBus.on(AppEvents.ROUTE_CHANGED, (data) => {
        this.handleRouteChange(data);
      });

      // Глобальное событие загрузки данных
      eventBus.emit(AppEvents.DATA_LOADED);

    } catch (error) {
      console.error('Ошибка инициализации приложения:', error);
      document.getElementById('app-main').innerHTML = `
        <div class="error-state">
          <h1>Ошибка инициализации</h1>
          <p>${error.message}</p>
          <p>Проверьте консоль браузера (F12) для деталей.</p>
        </div>
      `;
    }
  }

  setupRoutes() {
    // Главная страница
    router.addRoute('/', { component: HomePage, name: 'home' });

    // Страница праздника
    router.addRoute('/holiday/:id', { component: HolidayDashboard, name: 'holiday' });

    // Страница одариваемого
    router.addRoute('/recipient/:id', { component: RecipientDetail, name: 'recipient' });
  }

  handleRouteChange({ path, params, route }) {
    // Уничтожаем предыдущую страницу
    if (this.currentPage) {
      this.currentPage.destroy();
      this.currentPage = null;
    }

    const container = document.getElementById('app-main');
    if (!container) {
      console.error('Контейнер app-main не найден');
      return;
    }

    // Проверяем что route существует
    if (!route) {
      console.error('Route не найден для пути:', path);
      return;
    }

    // Создаём и рендерим новую страницу
    const ComponentClass = route.component;

    if (path === '/') {
      this.currentPage = new ComponentClass(container);
    } else if (path === '/holiday/:id') {
      this.currentPage = new ComponentClass(container, params.id);
    } else if (path === '/recipient/:id') {
      this.currentPage = new ComponentClass(container, params.id);
    }
  }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});