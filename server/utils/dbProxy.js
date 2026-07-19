import mongoose from 'mongoose';

/**
 * DATABASE PROXY LAYER (IN-MEMORY FALLBACK)
 * 
 * For Beginners:
 * What is a Proxy in JavaScript?
 * A Proxy is a special wrapper object that lets us intercept and customize operations performed
 * on a target object (like getting a property, setting a property, or calling a method).
 * It acts like an "agent" or "middleman" standing in front of the target.
 * 
 * Why are we using it here?
 * This project uses MongoDB (via Mongoose) to save users, strategies, and backtests.
 * However, we want this project to run seamlessly EVEN IF a student doesn't have MongoDB installed
 * or running on their local computer!
 * 
 * How it works:
 * 1. We create a Proxy wrapper around our Mongoose Models.
 * 2. When the backend code calls database queries (like `User.create` or `Backtest.find`),
 *    the Proxy intercepts the call.
 * 3. It checks if MongoDB is connected:
 *    - If connected: It passes the call straight through to the real MongoDB database.
 *    - If disconnected: It runs matching operations on a global JavaScript array (`memoryStore`) in RAM!
 * 
 * This allows the entire website to function perfectly offline without MongoDB.
 */

// Global in-memory data store holding arrays of records for each collection.
const memoryStore = {
  users: [],
  strategies: [],
  backtests: [],
  leaderboards: [],
  otps: []
};

/**
 * Mock query object that implements standard Mongoose query chain operations.
 * Chaining operations like `.sort()` and `.limit()` are supported.
 * Since it is a 'thenable', developers can simply await it.
 */
class MockQuery {
  constructor(data, collection, keyField) {
    this.data = data;
    this.collection = collection;
    this.keyField = keyField;
  }

  /**
   * Sorts the matched items by one or more keys.
   * Handles multi-key sorting sequentially, matching MongoDB sort behavior.
   * @param {Object} sortObj - Sort criteria, e.g. { returnPercent: -1, sharpeRatio: -1 }
   */
  sort(sortObj) {
    if (!sortObj) return this;
    const keys = Object.keys(sortObj);
    this.data.sort((a, b) => {
      for (const key of keys) {
        const order = sortObj[key];
        let valA = a[key] ?? 0;
        let valB = b[key] ?? 0;

        // Convert Dates to timestamp for clean numerical comparison
        if (valA instanceof Date) valA = valA.getTime();
        if (valB instanceof Date) valB = valB.getTime();

        if (valA < valB) return order === -1 ? 1 : -1;
        if (valA > valB) return order === -1 ? -1 : 1;
      }
      return 0;
    });
    return this;
  }

  /**
   * Limits the number of returned query items.
   * @param {number} num - Max number of items to return
   */
  limit(num) {
    if (num !== undefined) {
      this.data = this.data.slice(0, num);
    }
    return this;
  }

  /**
   * Standard Thenable handler that triggers when the query is awaited.
   * Wraps items so they have active helper methods like `.save()`.
   */
  then(onFulfilled, onRejected) {
    const wrapped = this.data.map(item => wrapDocument(item, this.collection, this.keyField));
    return Promise.resolve(wrapped).then(onFulfilled, onRejected);
  }
}

/**
 * Mock query object for a single result (e.g. findOne).
 * Allows sort/limit chaining to prevent runtime crashes, then resolves to a single item.
 */
class MockSingleQuery {
  constructor(data, collection, keyField) {
    this.data = data;
    this.collection = collection;
    this.keyField = keyField;
  }

  sort() { return this; }
  limit() { return this; }

  then(onFulfilled, onRejected) {
    const wrapped = this.data ? wrapDocument(this.data, this.collection, this.keyField) : null;
    return Promise.resolve(wrapped).then(onFulfilled, onRejected);
  }
}

/**
 * Attaches a non-enumerable `.save()` method to mock documents so that
 * standard Mongoose saving code (e.g. document.save()) functions correctly in-memory.
 */
function wrapDocument(doc, collection, keyField) {
  if (!doc) return null;

  Object.defineProperty(doc, 'save', {
    value: async function() {
      const idx = collection.findIndex(item => item[keyField] === this[keyField]);
      if (idx !== -1) {
        collection[idx] = { ...this, updatedAt: new Date() };
      } else {
        collection.push({ ...this, createdAt: new Date(), updatedAt: new Date() });
      }
      return this;
    },
    enumerable: false,
    writable: true,
    configurable: true
  });

  return doc;
}

/**
 * Checks if a collection record matches key-value query filters.
 */
function matches(item, query) {
  if (!query || Object.keys(query).length === 0) return true;
  for (const key in query) {
    if (item[key] !== query[key]) return false;
  }
  return true;
}

/**
 * Creates a proxy wrapper around a Mongoose model.
 * If MongoDB is connected, calls are forwarded directly to Mongoose.
 * If MongoDB is disconnected, calls are handled by the custom in-memory store.
 * 
 * @param {mongoose.Model} MongooseModel - The real Mongoose model
 * @param {string} collectionName - Target key in the memoryStore
 * @param {string} keyField - Unique key field for this collection (e.g. userId, strategyId)
 */
export function createModelProxy(MongooseModel, collectionName, keyField = 'userId') {
  return new Proxy(MongooseModel, {
    get(target, prop, receiver) {
      // Check if MongoDB is connected (readyState 1)
      const isConnected = mongoose.connection.readyState === 1;
      if (isConnected) {
        return Reflect.get(target, prop, receiver);
      }

      const collection = memoryStore[collectionName];

      switch (prop) {
        case 'create':
          return async (doc) => {
            const newDoc = {
              ...doc,
              createdAt: doc.createdAt || new Date(),
              updatedAt: doc.updatedAt || new Date(),
            };
            collection.push(newDoc);
            return wrapDocument({ ...newDoc }, collection, keyField);
          };

        case 'find':
          return (query) => {
            const filtered = collection.filter(item => matches(item, query));
            // Clone items to prevent mutating array records directly before save is called
            return new MockQuery(filtered.map(x => ({ ...x })), collection, keyField);
          };

        case 'findOne':
          return (query) => {
            const found = collection.find(item => matches(item, query));
            return new MockSingleQuery(found ? { ...found } : null, collection, keyField);
          };

        case 'countDocuments':
          return async (query) => {
            return collection.filter(item => matches(item, query)).length;
          };

        case 'findOneAndUpdate':
          return async (query, update, options = {}) => {
            const index = collection.findIndex(item => matches(item, query));
            let item;

            if (index !== -1) {
              item = collection[index];
              const oldItem = { ...item };
              const updateData = update.$set || update;
              Object.assign(item, updateData);
              item.updatedAt = new Date();
              const wrapped = wrapDocument({ ...item }, collection, keyField);
              return options.new ? wrapped : wrapDocument(oldItem, collection, keyField);
            } else if (options.upsert) {
              const updateData = update.$set || update;
              const newItem = {
                ...query,
                ...updateData,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              collection.push(newItem);
              return wrapDocument({ ...newItem }, collection, keyField);
            }
            return null;
          };

        case 'deleteOne':
          return async (query) => {
            const index = collection.findIndex(item => matches(item, query));
            if (index !== -1) {
              collection.splice(index, 1);
              return { deletedCount: 1 };
            }
            return { deletedCount: 0 };
          };

        case 'deleteMany':
          return async (query) => {
            let count = 0;
            for (let i = collection.length - 1; i >= 0; i--) {
              if (matches(collection[i], query)) {
                collection.splice(i, 1);
                count++;
              }
            }
            return { deletedCount: count };
          };

        case 'updateMany':
          return async (query, update) => {
            let count = 0;
            const updateData = update.$set || update;
            for (const item of collection) {
              if (matches(item, query)) {
                Object.assign(item, updateData);
                item.updatedAt = new Date();
                count++;
              }
            }
            return { matchedCount: count, modifiedCount: count };
          };

        default:
          // Fallback to standard property retrieval (e.g. target.schema, target.modelName)
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
      }
    }
  });
}
