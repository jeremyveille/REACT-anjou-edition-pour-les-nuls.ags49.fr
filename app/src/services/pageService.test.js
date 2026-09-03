import { pageService } from './pageService';
import { db } from '../firebase';

jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123', email: 'test@anjou-edition.fr' } },
  storage: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  setDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn((col, data) => Promise.resolve({ id: 'mock_doc_id_123', ...data })),
  deleteDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  orderBy: jest.fn()
}));

describe('pageService tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('getPages retrieves pages and seeds defaults when collection is empty', async () => {
    const pages = await pageService.getPages('pages');
    expect(pages).toBeDefined();
    expect(Array.isArray(pages)).toBe(true);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages[0]).toHaveProperty('title');
  });

  test('savePage creates a new page in local and returns it with ID', async () => {
    const newPage = {
      title: 'Nouvelle Page de Test',
      category: 'Poésies',
      blocks: []
    };

    const saved = await pageService.savePage(newPage, null, 'pages');
    expect(saved).toBeDefined();
    expect(saved.title).toBe('Nouvelle Page de Test');
    expect(saved.slug).toBe('nouvelle-page-de-test');
    expect(saved.id).toBeDefined();

    // Verify localStorage persistence
    const local = JSON.parse(localStorage.getItem('ae_pages') || '[]');
    expect(local.some(p => p.title === 'Nouvelle Page de Test')).toBe(true);
  });

  test('savePage updates an existing page correctly', async () => {
    // Initial page
    const initial = await pageService.savePage({ title: 'Ancien Titre' }, null, 'pages');
    
    // Update
    const updated = await pageService.savePage({ title: 'Titre Modifié' }, initial.id, 'pages');
    expect(updated.title).toBe('Titre Modifié');
    
    const local = JSON.parse(localStorage.getItem('ae_pages') || '[]');
    const found = local.find(p => p.id === initial.id);
    expect(found.title).toBe('Titre Modifié');
  });

  test('deletePage removes a page from local storage', async () => {
    const page = await pageService.savePage({ title: 'Page à supprimer' }, null, 'pages');
    
    await pageService.deletePage(page.id, 'pages');
    
    const local = JSON.parse(localStorage.getItem('ae_pages') || '[]');
    expect(local.some(p => p.id === page.id)).toBe(false);
  });

  test('updateStatus modifies the status of a page', async () => {
    const page = await pageService.savePage({ title: 'Page Statut Test', status: 'draft' }, null, 'pages');
    
    await pageService.updateStatus(page.id, 'published', 'pages');
    
    const local = JSON.parse(localStorage.getItem('ae_pages') || '[]');
    const found = local.find(p => p.id === page.id);
    expect(found.status).toBe('published');
  });
});
