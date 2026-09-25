import { pageService, auditService, EDITORIAL_STATUS, normalizeStatus, isAuthorizedAdmin } from './pageService';
import { db, auth } from '../firebase';
import { addDoc } from 'firebase/firestore';

jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123', email: 'admin@anjou-edition.fr' } },
  storage: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  setDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn((col, data) => Promise.resolve({ id: 'mock_doc_id_123', ...data })),
  deleteDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  orderBy: jest.fn()
}));

describe('pageService Security & Workflow tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('getPages is strictly read-only and does NOT write or seed documents when collection is empty', async () => {
    const pages = await pageService.getPages('pages');
    expect(pages).toBeDefined();
    expect(Array.isArray(pages)).toBe(true);
    // When Firestore returns empty, getPages must NOT call addDoc
    expect(addDoc).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: 'Accueil - Anjou Edition' }));
    expect(pages.length).toBe(0);
  });

  test('normalizeStatus handles French and canonical status strings properly', () => {
    expect(normalizeStatus('Publié')).toBe(EDITORIAL_STATUS.PUBLISHED);
    expect(normalizeStatus('publie')).toBe(EDITORIAL_STATUS.PUBLISHED);
    expect(normalizeStatus('published')).toBe(EDITORIAL_STATUS.PUBLISHED);
    expect(normalizeStatus('Approuvé')).toBe(EDITORIAL_STATUS.APPROVED);
    expect(normalizeStatus('En attente de relecture')).toBe(EDITORIAL_STATUS.PENDING_REVIEW);
    expect(normalizeStatus('Brouillon')).toBe(EDITORIAL_STATUS.DRAFT);
    expect(normalizeStatus(null)).toBe(EDITORIAL_STATUS.DRAFT);
  });

  test('isAuthorizedAdmin returns true for verified admin email', () => {
    expect(isAuthorizedAdmin()).toBe(true);
  });

  test('savePage creates a new page in local and Firestore with audit log', async () => {
    const newPage = {
      title: 'Nouvelle Page de Test',
      category: 'Poésies',
      status: 'draft',
      blocks: []
    };

    const saved = await pageService.savePage(newPage, null, 'pages');
    expect(saved).toBeDefined();
    expect(saved.title).toBe('Nouvelle Page de Test');
    expect(saved.slug).toBe('nouvelle-page-de-test');
    expect(saved.status).toBe(EDITORIAL_STATUS.DRAFT);
    expect(saved.id).toBeDefined();

    // Verify localStorage persistence
    const local = JSON.parse(localStorage.getItem('ae_pages') || '[]');
    expect(local.some(p => p.title === 'Nouvelle Page de Test')).toBe(true);
  });

  test('savePage updates an existing page and increments version', async () => {
    const initial = await pageService.savePage({ title: 'Ancien Titre', status: 'draft' }, null, 'pages');
    
    const updated = await pageService.savePage({ title: 'Titre Modifié', status: 'pending_review', version: initial.version }, initial.id, 'pages');
    expect(updated.title).toBe('Titre Modifié');
    expect(updated.status).toBe(EDITORIAL_STATUS.PENDING_REVIEW);
    expect(updated.version).toBe(2);
    
    const local = JSON.parse(localStorage.getItem('ae_pages') || '[]');
    const found = local.find(p => p.id === initial.id);
    expect(found.title).toBe('Titre Modifié');
  });

  test('deletePage removes a page from local storage and registers audit log', async () => {
    const page = await pageService.savePage({ title: 'Page à supprimer' }, null, 'pages');
    
    await pageService.deletePage(page.id, 'pages');
    
    const local = JSON.parse(localStorage.getItem('ae_pages') || '[]');
    expect(local.some(p => p.id === page.id)).toBe(false);
  });

  test('updateStatus modifies the status of a page with workflow metadata', async () => {
    const page = await pageService.savePage({ title: 'Page Statut Test', status: 'draft' }, null, 'pages');
    
    await pageService.updateStatus(page.id, 'published', 'pages');
    
    const local = JSON.parse(localStorage.getItem('ae_pages') || '[]');
    const found = local.find(p => p.id === page.id);
    expect(found.status).toBe(EDITORIAL_STATUS.PUBLISHED);
    expect(found.publishedBy).toBe('admin@anjou-edition.fr');
    expect(found.publishedAt).toBeDefined();
  });

  test('deduplicateItems removes duplicate documents and retains the primary one', async () => {
    // Seed duplicate items directly in localStorage
    const duplicates = [
      { id: 'dup1', title: 'Page Doublon', slug: 'page-doublon', updatedAt: '2026-06-01T10:00:00Z', blocks: [] },
      { id: 'dup2', title: 'Page Doublon', slug: 'page-doublon', updatedAt: '2026-06-02T12:00:00Z', blocks: [{ id: 'b1', type: 'heading' }] }
    ];
    localStorage.setItem('ae_pages', JSON.stringify(duplicates));

    const result = await pageService.deduplicateItems('pages');
    expect(result.totalFound).toBe(2);
    expect(result.uniqueCount).toBe(1);
    expect(result.removedIds).toContain('dup1');

    const cleanLocal = JSON.parse(localStorage.getItem('ae_pages') || '[]');
    expect(cleanLocal.length).toBe(1);
    expect(cleanLocal[0].id).toBe('dup2');
  });

  test('auditService records log entries correctly', async () => {
    const entry = await auditService.log({
      action: 'CREATE',
      resourceType: 'page',
      resourceId: 'page_test_99',
      resourceTitle: 'Test Page Audit',
      details: { sample: true }
    });

    expect(entry.action).toBe('CREATE');
    expect(entry.resourceTitle).toBe('Test Page Audit');
    expect(entry.actorRole).toBe('admin');
  });

  test('getMediaList returns media array and seeds fallback items when empty', async () => {
    const mediaList = await pageService.getMediaList();
    expect(Array.isArray(mediaList)).toBe(true);
    expect(mediaList.length).toBeGreaterThan(0);
    expect(mediaList[0]).toHaveProperty('id');
    expect(mediaList[0]).toHaveProperty('url');
    expect(mediaList.some(m => m.url === '/anjou-edition-livre.png')).toBe(true);

    const feat = await pageService.getFeaturedArticle();
    expect(feat).toBeDefined();
    expect(feat.image).toBe('/anjou-edition-livre.png');
  });

  test('saveMediaItem persists a media item to local storage and returns normalized object', async () => {
    const item = {
      id: 'custom_media_1',
      name: 'Mon Beau Manoir.jpg',
      url: 'https://images.unsplash.com/photo-12345',
      type: 'image',
      size: 204800
    };

    const saved = await pageService.saveMediaItem(item);
    expect(saved.id).toBe('custom_media_1');
    expect(saved.name).toBe('Mon Beau Manoir.jpg');

    const local = JSON.parse(localStorage.getItem('ae_media_library') || '[]');
    expect(local.some(m => m.id === 'custom_media_1')).toBe(true);
  });

  test('deleteMediaItem removes a media item from local storage', async () => {
    const item = {
      id: 'media_to_delete',
      name: 'A supprimer.jpg',
      url: 'https://mock.url/del.jpg'
    };
    await pageService.saveMediaItem(item);

    const result = await pageService.deleteMediaItem('media_to_delete');
    expect(result).toBe(true);

    const local = JSON.parse(localStorage.getItem('ae_media_library') || '[]');
    expect(local.some(m => m.id === 'media_to_delete')).toBe(false);
  });
});
