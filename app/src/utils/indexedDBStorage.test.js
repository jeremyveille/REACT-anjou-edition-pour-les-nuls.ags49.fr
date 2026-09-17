import { initDB, storePDFFile, getPDFFile, deletePDFFile } from './indexedDBStorage';

describe('indexedDBStorage tests', () => {
  beforeEach(() => {
    // Mock window.indexedDB
    const mockStore = {};
    const mockObjectStore = {
      put: jest.fn((val, key) => {
        mockStore[key] = val;
        const req = { onsuccess: null, onerror: null, result: true };
        queueMicrotask(() => req.onsuccess && req.onsuccess({ target: { result: true } }));
        return req;
      }),
      get: jest.fn((key) => {
        const val = mockStore[key] || null;
        const req = { result: val, onsuccess: null, onerror: null };
        queueMicrotask(() => req.onsuccess && req.onsuccess({ target: { result: val } }));
        return req;
      }),
      delete: jest.fn((key) => {
        delete mockStore[key];
        const req = { onsuccess: null, onerror: null, result: true };
        queueMicrotask(() => req.onsuccess && req.onsuccess({ target: { result: true } }));
        return req;
      })
    };

    const mockDb = {
      objectStoreNames: { contains: jest.fn(() => true) },
      createObjectStore: jest.fn(),
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => mockObjectStore)
      }))
    };

    window.indexedDB = {
      open: jest.fn(() => {
        const req = { result: mockDb, onsuccess: null, onerror: null, onupgradeneeded: null };
        queueMicrotask(() => req.onsuccess && req.onsuccess({ target: { result: mockDb } }));
        return req;
      })
    };
  });

  test('initializes DB successfully', async () => {
    const db = await initDB();
    expect(db).toBeDefined();
  });

  test('stores, retrieves and deletes a PDF file in IndexedDB', async () => {
    const mockFile = new Blob(['mock-pdf-content'], { type: 'application/pdf' });
    
    // Store
    const storeSuccess = await storePDFFile('test-book-1', mockFile);
    expect(storeSuccess).toBe(true);

    // Get
    const retrieved = await getPDFFile('test-book-1');
    expect(retrieved).toBeDefined();

    // Delete
    const deleteSuccess = await deletePDFFile('test-book-1');
    expect(deleteSuccess).toBe(true);
  });
});
