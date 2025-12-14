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
      upgrade: (db) => {
        console.log(`Создание БД ${this.dbName} v${this.version}`);
        
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
}

export const dbConfig = {
  name: 'GiftPlannerDB',
  version: 1,
  stores: {
    holidays: {
      keyPath: 'id',
      indexes: [
        { name: 'date', keyPath: 'date' },
      ]
    },
    recipients: {
      keyPath: 'id',
      indexes: [
        { name: 'holidayId', keyPath: 'holidayId' },
        { name: 'type', keyPath: 'type' },
      ]
    },
    gifts: {
      keyPath: 'id',
      indexes: [
        { name: 'recipientId', keyPath: 'recipientId' },
        { name: 'holidayId', keyPath: 'holidayId' },
        { name: 'status', keyPath: 'status' },
      ]
    }
  }
};

export const db = new IDBWrapper(dbConfig.name, dbConfig.version, dbConfig.stores);