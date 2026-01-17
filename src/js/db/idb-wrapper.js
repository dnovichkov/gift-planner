// Импорт idb из установленного пакета
import { openDB } from 'idb';

export class IDBWrapper {
  constructor(dbName, version, storesConfig) {
    this.dbName = dbName;
    this.version = version;
    this.storesConfig = storesConfig;
    this.db = null;
  }

  async openDb() {
    if (this.db) return this.db;

    this.db = await openDB(this.dbName, this.version, {
      upgrade: (db, oldVersion, newVersion) => {
        console.log(`Обновление БД ${this.dbName} с v${oldVersion} до v${newVersion}`);

        Object.entries(this.storesConfig).forEach(([storeName, config]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: config.keyPath,
              autoIncrement: config.autoIncrement || false,
            });

            if (config.indexes) {
              config.indexes.forEach(index => {
                store.createIndex(index.name, index.keyPath, { unique: index.unique || false });
              });
            }
          }
        });
      },
    });

    console.log(`БД ${this.dbName} открыта`);
    return this.db;
  }

  async add(storeName, data) {
    await this.openDb();
    const id = crypto.randomUUID();
    const dataWithId = { ...data, id, createdAt: new Date().toISOString() };
    await this.db.add(storeName, dataWithId);
    return id;
  }

  async get(storeName, id) {
    await this.openDb();
    return await this.db.get(storeName, id);
  }

  async getAll(storeName) {
    await this.openDb();
    return await this.db.getAll(storeName);
  }

  async update(storeName, data) {
    await this.openDb();
    data.updatedAt = new Date().toISOString();
    await this.db.put(storeName, data);
  }

  async delete(storeName, id) {
    await this.openDb();
    await this.db.delete(storeName, id);
  }

  async clear(storeName) {
    await this.openDb();
    await this.db.clear(storeName);
  }

  /**
   * Получить записи по индексу
   * @param {string} storeName - Название хранилища
   * @param {string} indexName - Название индекса
   * @param {any} value - Значение для поиска
   * @returns {Promise<Array>} Массив найденных записей
   */
  async getByIndex(storeName, indexName, value) {
    await this.openDb();
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    return await index.getAll(value);
  }

  /**
   * Добавить или обновить запись (upsert для синхронизации)
   * Использует стратегию Last-Write-Wins по полю updatedAt
   * @param {string} storeName - Название хранилища
   * @param {Object} data - Данные для сохранения
   * @returns {Promise<Object>} Результат операции
   */
  async upsert(storeName, data) {
    await this.openDb();
    const existing = await this.db.get(storeName, data.id);

    if (existing) {
      const existingUpdated = new Date(existing.updatedAt || existing.createdAt || 0);
      const incomingUpdated = new Date(data.updatedAt || data.createdAt || 0);

      if (incomingUpdated >= existingUpdated) {
        const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
        await this.db.put(storeName, merged);
        return { action: 'updated', data: merged };
      }
      return { action: 'skipped', data: existing };
    }

    const newData = { ...data, createdAt: data.createdAt || new Date().toISOString() };
    await this.db.put(storeName, newData);
    return { action: 'created', data: newData };
  }

  /**
   * Добавить операцию в очередь синхронизации
   * @param {Object} operation - Операция для синхронизации
   * @returns {Promise<string>} ID операции
   */
  async addToSyncQueue(operation) {
    await this.openDb();
    const queueItem = {
      id: crypto.randomUUID(),
      ...operation,
      createdAt: new Date().toISOString(),
      retries: 0,
    };
    await this.db.add('syncQueue', queueItem);
    return queueItem.id;
  }

  /**
   * Получить все элементы очереди синхронизации
   * @returns {Promise<Array>} Массив операций, отсортированных по дате создания
   */
  async getSyncQueue() {
    await this.openDb();
    const items = await this.db.getAll('syncQueue');
    return items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  /**
   * Удалить элемент из очереди синхронизации
   * @param {string} id - ID элемента
   */
  async removeSyncQueueItem(id) {
    await this.openDb();
    await this.db.delete('syncQueue', id);
  }

  /**
   * Обновить элемент очереди синхронизации
   * @param {string} id - ID элемента
   * @param {Object} data - Данные для обновления
   */
  async updateSyncQueueItem(id, data) {
    await this.openDb();
    const item = await this.db.get('syncQueue', id);
    if (item) {
      await this.db.put('syncQueue', { ...item, ...data });
    }
  }

  /**
   * Очистить очередь синхронизации
   */
  async clearSyncQueue() {
    await this.openDb();
    await this.db.clear('syncQueue');
  }

  /**
   * Получить количество элементов в очереди синхронизации
   * @returns {Promise<number>} Количество элементов
   */
  async getSyncQueueCount() {
    await this.openDb();
    return await this.db.count('syncQueue');
  }
}

export const dbConfig = {
  name: 'GiftPlannerDB',
  version: 2, // Увеличена версия для добавления syncQueue
  stores: {
    holidays: {
      keyPath: 'id',
      indexes: [
        { name: 'date', keyPath: 'date' },
        { name: 'userId', keyPath: 'userId' },
      ]
    },
    recipients: {
      keyPath: 'id',
      indexes: [
        { name: 'holidayId', keyPath: 'holidayId' },
        { name: 'type', keyPath: 'type' },
        { name: 'userId', keyPath: 'userId' },
      ]
    },
    gifts: {
      keyPath: 'id',
      indexes: [
        { name: 'recipientId', keyPath: 'recipientId' },
        { name: 'holidayId', keyPath: 'holidayId' },
        { name: 'status', keyPath: 'status' },
        { name: 'userId', keyPath: 'userId' },
      ]
    },
    syncQueue: {
      keyPath: 'id',
      indexes: [
        { name: 'entityType', keyPath: 'entityType' },
        { name: 'createdAt', keyPath: 'createdAt' },
      ]
    }
  }
};

export const db = new IDBWrapper(dbConfig.name, dbConfig.version, dbConfig.stores);