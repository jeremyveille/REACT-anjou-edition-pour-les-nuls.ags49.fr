const DB_NAME = 'ae_pdf_store';
const STORE_NAME = 'pdfs';

export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window) || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported or available'));
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const storePDFFile = async (key, file) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(file, key);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (error) {
    console.error("Failed to store PDF in IndexedDB:", error);
    return false;
  }
};

export const getPDFFile = async (key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = (e) => resolve((e && e.target && e.target.result !== undefined) ? e.target.result : (request && request.result ? request.result : null));
      request.onerror = (e) => reject((e && e.target && e.target.error) || new Error('Get request failed'));
    });
  } catch (error) {
    console.error("Failed to retrieve PDF from IndexedDB:", error);
    return null;
  }
};

export const deletePDFFile = async (key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (error) {
    console.error("Failed to delete PDF from IndexedDB:", error);
    return false;
  }
};
