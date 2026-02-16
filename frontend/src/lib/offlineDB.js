// IndexedDB utility for offline document storage and queue management

const DB_NAME = 'tls-offline-db';
const DB_VERSION = 1;

// Store names
const STORES = {
  DOCUMENTS: 'documents',
  STAMP_QUEUE: 'stamp_queue',
  CACHED_STAMPS: 'cached_stamps',
  SETTINGS: 'settings'
};

let dbInstance = null;

// Initialize the database
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('IndexedDB initialized');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Documents store - for caching uploaded documents
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
        docStore.createIndex('created_at', 'created_at', { unique: false });
        docStore.createIndex('name', 'name', { unique: false });
      }

      // Stamp queue store - for queued stamp operations
      if (!db.objectStoreNames.contains(STORES.STAMP_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.STAMP_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Cached stamps store - for offline verification
      if (!db.objectStoreNames.contains(STORES.CACHED_STAMPS)) {
        const stampStore = db.createObjectStore(STORES.CACHED_STAMPS, { keyPath: 'stamp_id' });
        stampStore.createIndex('advocate_id', 'advocate_id', { unique: false });
        stampStore.createIndex('cached_at', 'cached_at', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });
};

// Generic CRUD operations
const getStore = async (storeName, mode = 'readonly') => {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
};

// =============== DOCUMENT OPERATIONS ===============

// Store a document for offline use
export const storeDocument = async (file, metadata = {}) => {
  const store = await getStore(STORES.DOCUMENTS, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const doc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result, // Base64 encoded
        created_at: new Date().toISOString(),
        ...metadata
      };

      const request = store.put(doc);
      request.onsuccess = () => resolve(doc);
      request.onerror = () => reject(request.error);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

// Get a stored document
export const getDocument = async (id) => {
  const store = await getStore(STORES.DOCUMENTS);
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get all stored documents
export const getAllDocuments = async () => {
  const store = await getStore(STORES.DOCUMENTS);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Delete a document
export const deleteDocument = async (id) => {
  const store = await getStore(STORES.DOCUMENTS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

// Convert base64 to File
export const base64ToFile = (dataUrl, filename) => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

// =============== STAMP QUEUE OPERATIONS ===============

// Queue a stamp operation for later sync
export const queueStampOperation = async (stampData) => {
  const store = await getStore(STORES.STAMP_QUEUE, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const operation = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending', // pending, syncing, completed, failed
      created_at: new Date().toISOString(),
      attempts: 0,
      last_attempt: null,
      error: null,
      ...stampData
    };

    const request = store.put(operation);
    request.onsuccess = () => {
      console.log('Stamp operation queued:', operation.id);
      resolve(operation);
    };
    request.onerror = () => reject(request.error);
  });
};

// Get all pending stamp operations
export const getPendingStampOperations = async () => {
  const store = await getStore(STORES.STAMP_QUEUE);
  const index = store.index('status');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll('pending');
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Get all stamp operations
export const getAllStampOperations = async () => {
  const store = await getStore(STORES.STAMP_QUEUE);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Update stamp operation status
export const updateStampOperation = async (id, updates) => {
  const store = await getStore(STORES.STAMP_QUEUE, 'readwrite');
  
  return new Promise(async (resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const operation = getRequest.result;
      if (!operation) {
        reject(new Error('Operation not found'));
        return;
      }

      const updated = { ...operation, ...updates };
      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve(updated);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Delete a stamp operation
export const deleteStampOperation = async (id) => {
  const store = await getStore(STORES.STAMP_QUEUE, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

// Clear completed operations
export const clearCompletedOperations = async () => {
  const store = await getStore(STORES.STAMP_QUEUE, 'readwrite');
  const index = store.index('status');
  
  return new Promise((resolve, reject) => {
    const request = index.getAllKeys('completed');
    request.onsuccess = () => {
      const keys = request.result || [];
      let deleted = 0;
      
      keys.forEach(key => {
        store.delete(key);
        deleted++;
      });
      
      resolve(deleted);
    };
    request.onerror = () => reject(request.error);
  });
};

// =============== CACHED STAMPS OPERATIONS ===============

// Cache a stamp for offline verification
export const cacheStamp = async (stampData) => {
  const store = await getStore(STORES.CACHED_STAMPS, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const cached = {
      ...stampData,
      cached_at: new Date().toISOString()
    };

    const request = store.put(cached);
    request.onsuccess = () => resolve(cached);
    request.onerror = () => reject(request.error);
  });
};

// Get cached stamp by ID
export const getCachedStamp = async (stampId) => {
  const store = await getStore(STORES.CACHED_STAMPS);
  return new Promise((resolve, reject) => {
    const request = store.get(stampId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get all cached stamps
export const getAllCachedStamps = async () => {
  const store = await getStore(STORES.CACHED_STAMPS);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Delete old cached stamps (older than 30 days)
export const cleanupCachedStamps = async (maxAgeDays = 30) => {
  const store = await getStore(STORES.CACHED_STAMPS, 'readwrite');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const stamps = request.result || [];
      let deleted = 0;
      
      stamps.forEach(stamp => {
        if (new Date(stamp.cached_at) < cutoffDate) {
          store.delete(stamp.stamp_id);
          deleted++;
        }
      });
      
      resolve(deleted);
    };
    request.onerror = () => reject(request.error);
  });
};

// =============== SETTINGS OPERATIONS ===============

// Get a setting
export const getSetting = async (key) => {
  const store = await getStore(STORES.SETTINGS);
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
};

// Set a setting
export const setSetting = async (key, value) => {
  const store = await getStore(STORES.SETTINGS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put({ key, value });
    request.onsuccess = () => resolve(value);
    request.onerror = () => reject(request.error);
  });
};

// =============== SYNC UTILITIES ===============

// Get queue count for badge/indicator
export const getQueueCount = async () => {
  const pending = await getPendingStampOperations();
  return pending.length;
};

// Check if there are pending operations
export const hasPendingOperations = async () => {
  const count = await getQueueCount();
  return count > 0;
};

// Clear all data (for logout)
export const clearAllData = async () => {
  const db = await initDB();
  const storeNames = [STORES.DOCUMENTS, STORES.STAMP_QUEUE, STORES.CACHED_STAMPS, STORES.SETTINGS];
  
  return Promise.all(storeNames.map(storeName => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }));
};

export default {
  initDB,
  storeDocument,
  getDocument,
  getAllDocuments,
  deleteDocument,
  base64ToFile,
  queueStampOperation,
  getPendingStampOperations,
  getAllStampOperations,
  updateStampOperation,
  deleteStampOperation,
  clearCompletedOperations,
  cacheStamp,
  getCachedStamp,
  getAllCachedStamps,
  cleanupCachedStamps,
  getSetting,
  setSetting,
  getQueueCount,
  hasPendingOperations,
  clearAllData
};
