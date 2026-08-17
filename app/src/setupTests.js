// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock ResizeObserver for environments where it is not defined (e.g. jsdom)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Firebase libraries to prevent actual network calls and resource leaks
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn().mockReturnValue({}),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn().mockReturnValue({
    currentUser: { uid: 'admin-123' },
    onAuthStateChanged: jest.fn((auth, cb) => {
      cb({ uid: 'admin-123' });
      return jest.fn();
    })
  }),
}));

jest.mock('firebase/firestore', () => {
  return {
    getFirestore: jest.fn().mockReturnValue({}),
    collection: jest.fn().mockImplementation((db, path) => path),
    query: jest.fn().mockImplementation((col) => col),
    orderBy: jest.fn().mockImplementation(() => ({})),
    getDocs: jest.fn().mockImplementation((colPath) => {
      let docs = [];
      // Mock menus specifically if populated in localStorage or mock variables
      if (colPath === "menus") {
        const local = global.localStorage.getItem("ae_menus");
        const list = local ? JSON.parse(local) : [];
        docs = list.map(item => ({
          id: item.id,
          data: () => item
        }));
      }
      const snapshot = {
        empty: docs.length === 0,
        docs: docs,
        forEach: function(cb) { docs.forEach(cb); }
      };
      return Promise.resolve(snapshot);
    }),

    doc: jest.fn().mockImplementation((db, path, id) => id || path),
    getDoc: jest.fn().mockImplementation(() => Promise.resolve({
      exists: () => false,
      data: () => ({})
    })),
    setDoc: jest.fn().mockImplementation(() => Promise.resolve()),
    addDoc: jest.fn().mockImplementation(() => Promise.resolve({ id: "mock-id" })),
    deleteDoc: jest.fn().mockImplementation(() => Promise.resolve()),
    serverTimestamp: jest.fn().mockReturnValue("mock-timestamp")
  };
});


jest.mock('firebase/storage', () => ({
  getStorage: jest.fn().mockReturnValue({}),
  ref: jest.fn().mockImplementation((storage, path) => path),
  uploadBytes: jest.fn().mockImplementation(() => Promise.resolve({})),
  getDownloadURL: jest.fn().mockImplementation(() => Promise.resolve("https://example.com/mock-file.pdf"))
}));

