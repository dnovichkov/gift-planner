# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gift Planner is a client-side web application for planning and tracking gifts for holidays. Built with vanilla JavaScript (ES6 modules), Vite, and IndexedDB for local data storage.

**Language:** Russian (all UI text, comments, and documentation)

## Development Commands

```bash
# Start development server on http://localhost:3000
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```

## Architecture

### Data Flow & State Management

The application uses a **Pub/Sub event-driven architecture**:

1. **Event Bus** (`src/js/events.js`): Central communication hub between all components
   - All components subscribe to `AppEvents` (HOLIDAY_CREATED, GIFT_UPDATED, etc.)
   - Services emit events after data operations
   - Prevents tight coupling between UI components and data services

2. **Component Base Class** (`src/js/components/Component.js`):
   - All UI components extend this base class
   - Provides lifecycle methods: `init()`, `render()`, `destroy()`
   - Manages event subscriptions and cleanup automatically
   - State management via `setState()` triggers re-renders

3. **Router** (`src/js/router.js`):
   - Hash-based routing (`#/holiday/:id`)
   - Supports dynamic parameters in routes
   - Emits `ROUTE_CHANGED` events when navigation occurs

### Data Layer

**IndexedDB Wrapper** (`src/js/db/idb-wrapper.js`):
- Three object stores: `holidays`, `recipients`, `gifts`
- All entities use auto-generated UUIDs
- Includes indexes on `holidayId`, `recipientId`, `status`, `type`, `date`
- Uses the `idb` library (v7) loaded from CDN

**Data Structure:**
```javascript
holidays: { id, name, date, description, budget, createdAt }
recipients: { id, holidayId, name, type, note, budget, createdAt }
gifts: { id, recipientId, holidayId, name, description, cost, status, priority, createdAt }
```

### Service Layer Pattern

Services (`src/js/services/*`) should:
1. Import and use the `db` instance from `idb-wrapper.js`
2. Perform CRUD operations on IndexedDB
3. Emit appropriate `AppEvents` after data changes
4. Handle cascading deletes (e.g., deleting a holiday deletes its recipients and gifts)

### Component Structure

- **Pages** (`src/js/pages/*`): Top-level route components (HomePage, HolidayDashboard, RecipientDetail)
- **UI Components** (`src/js/components/*`): Reusable components (Button, Card, Modal, Toast)
- **Feature Components** (`src/js/components/*`): Domain-specific components (HolidayModal, GiftList, ShoppingList)

## Design System

All design tokens are defined in `src/styles/tokens.css` using CSS custom properties:

**Colors:**
- Primary accent: `--color-accent` (#208c8d)
- Background: `--color-background` (#fcfcf9)
- Text: `--color-text-primary` (#134252), `--color-text-secondary` (#626c71)
- Status: `--color-success`, `--color-error`, `--color-warning`
- Holiday accents: `--color-holiday-red`, `--color-holiday-green`, `--color-holiday-gold`

**Spacing:** Use CSS variables (`--spacing-xs` through `--spacing-3xl`)

**Typography:** Segoe UI primary, fallback to Roboto/system fonts

**See:** `requirements/Design_System.md` for complete design specifications

## Key Patterns

### Creating New Components

```javascript
import { Component } from '../components/Component.js';
import { eventBus, AppEvents } from '../events.js';

export class MyComponent extends Component {
  getInitialState() {
    return { items: [] };
  }

  subscribeToEvents() {
    this.subscribe(AppEvents.ITEM_CREATED, (item) => {
      this.setState({ items: [...this.state.items, item] });
    });
  }

  template() {
    return `<div>${this.state.items.map(i => `<p>${i.name}</p>`).join('')}</div>`;
  }

  bindEvents() {
    const btn = this.container.querySelector('#my-btn');
    this.addEventListener(btn, 'click', this.handleClick);
  }

  handleClick(e) {
    // 'this' is bound to component instance
  }

  destroy() {
    super.destroy(); // Cleans up all subscriptions automatically
  }
}
```

### Creating New Services

```javascript
import { db } from '../db/idb-wrapper.js';
import { eventBus, AppEvents } from '../events.js';

export class MyService {
  async create(data) {
    const id = await db.add('storeName', data);
    eventBus.emit(AppEvents.ITEM_CREATED, { id, ...data });
    return id;
  }

  async update(id, data) {
    await db.update('storeName', { id, ...data });
    eventBus.emit(AppEvents.ITEM_UPDATED, { id, ...data });
  }

  async delete(id) {
    await db.delete('storeName', id);
    eventBus.emit(AppEvents.ITEM_DELETED, id);
  }
}

export const myService = new MyService();
```

### Adding Routes

```javascript
// In main.js or page setup
import { router } from './router.js';
import { MyPage } from './pages/MyPage.js';

router.addRoute('/my-route/:id', { component: MyPage, name: 'my-page' });

// Subscribe to route changes
eventBus.on(AppEvents.ROUTE_CHANGED, ({ path, params, route }) => {
  const container = document.getElementById('app-main');
  const page = new route.config.component(container, params);
});

// Navigate
router.navigate('/my-route/123');
```

## Important Implementation Notes

1. **Event Cleanup:** Always call `super.destroy()` in component destructors to prevent memory leaks from event subscriptions

2. **IndexedDB Typo:** There's a typo in `idb-wrapper.js:59` - `openDB()` is called but should be `openDb()` (lowercase 'b')

3. **Empty Placeholders:** Many service and page files exist but are empty. Implement them following the patterns above.

4. **Russian Language:** All user-facing strings, comments in new code, and console logs should be in Russian

5. **No Backend:** This is a 100% client-side application. All data persists only in the browser's IndexedDB. No API calls or server communication.

6. **Cascading Deletes:** When deleting a holiday, must also delete all associated recipients and gifts. When deleting a recipient, must delete all associated gifts.

## Requirements Documentation

- **Technical Specification:** `requirements/Gift_Planning_TZ.md` - Complete functional requirements in Russian
- **Design System:** `requirements/Design_System.md` - Detailed UI/UX specifications, component designs, color palette

When implementing new features, always reference these documents for business logic and design decisions.
