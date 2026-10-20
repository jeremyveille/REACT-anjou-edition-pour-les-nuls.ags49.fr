import { 
  DEFAULT_GLOBAL_SIDEBAR, 
  GLOBAL_SIDEBAR_STORAGE_KEY,
  GLOBAL_SIDEBAR_PREV_STORAGE_KEY,
  getLocalGlobalSidebar, 
  saveGlobalSidebarTemplate, 
  resolveFlipbookSidebar, 
  applyGlobalTemplateToAll, 
  applyGlobalTemplateToFlipbooks,
  createCustomSidebarBackup,
  analyzeFlipbooksSidebarStatus,
  applyGlobalTemplateToAllAndPersist,
  restoreLastSavedGlobalSidebar
} from './flipbookSidebarService';

describe('flipbookSidebarService Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('provides valid DEFAULT_GLOBAL_SIDEBAR without fake tourist/historical data', () => {
    expect(DEFAULT_GLOBAL_SIDEBAR.name).toBe("Modèle global — Anjou Édition");
    expect(DEFAULT_GLOBAL_SIDEBAR.styles.leftWidth).toBe(20);
    expect(DEFAULT_GLOBAL_SIDEBAR.styles.rightWidth).toBe(20);
    expect(DEFAULT_GLOBAL_SIDEBAR.styles.visibility.left.desktop).toBe(true);
    expect(DEFAULT_GLOBAL_SIDEBAR.styles.visibility.right.mobile).toBe(true);

    expect(DEFAULT_GLOBAL_SIDEBAR.leftSidebar.length).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_GLOBAL_SIDEBAR.rightSidebar.length).toBeGreaterThanOrEqual(1);

    // Verify left and right sidebar block types
    const leftTypes = DEFAULT_GLOBAL_SIDEBAR.leftSidebar.map(b => b.type);
    expect(leftTypes).toContain('heading');
    expect(leftTypes).toContain('text');
  });

  test('getLocalGlobalSidebar returns default when localStorage is empty', () => {
    const sidebar = getLocalGlobalSidebar();
    expect(sidebar.name).toBe("Modèle global — Anjou Édition");
    expect(sidebar.styles.leftWidth).toBe(20);
  });

  test('saveGlobalSidebarTemplate persists in localStorage, saves previous version and dispatches event', async () => {
    const mockListener = jest.fn();
    window.addEventListener('ae_global_sidebar_updated', mockListener);

    const firstTemplate = {
      ...DEFAULT_GLOBAL_SIDEBAR,
      styles: {
        ...DEFAULT_GLOBAL_SIDEBAR.styles,
        leftWidth: 22
      }
    };
    await saveGlobalSidebarTemplate(firstTemplate);

    const secondTemplate = {
      ...DEFAULT_GLOBAL_SIDEBAR,
      styles: {
        ...DEFAULT_GLOBAL_SIDEBAR.styles,
        leftWidth: 26,
        primaryColor: '#059669'
      }
    };

    const result = await saveGlobalSidebarTemplate(secondTemplate);
    expect(result.success).toBe(true);

    const storedRaw = localStorage.getItem(GLOBAL_SIDEBAR_STORAGE_KEY);
    expect(storedRaw).toBeTruthy();
    const parsed = JSON.parse(storedRaw);
    expect(parsed.styles.leftWidth).toBe(26);
    expect(parsed.styles.primaryColor).toBe('#059669');

    // Previous version must be backed up for restoration
    const prevRaw = localStorage.getItem(GLOBAL_SIDEBAR_PREV_STORAGE_KEY);
    expect(prevRaw).toBeTruthy();
    const parsedPrev = JSON.parse(prevRaw);
    expect(parsedPrev.styles.leftWidth).toBe(22);

    // Test restoreLastSavedGlobalSidebar
    const restored = await restoreLastSavedGlobalSidebar();
    expect(restored.success).toBe(true);
    expect(restored.data.styles.leftWidth).toBe(22);

    expect(mockListener).toHaveBeenCalled();
    window.removeEventListener('ae_global_sidebar_updated', mockListener);
  });

  test('resolveFlipbookSidebar resolves global template dynamically when sidebarMode is "global"', () => {
    const globalTmpl = {
      leftSidebar: [{ id: 'g1', type: 'heading', text: 'Global Header', enabled: true }],
      rightSidebar: [{ id: 'g2', type: 'button', buttonText: 'Global Btn', enabled: true }],
      styles: { leftWidth: 25, rightWidth: 25 }
    };

    const book = {
      id: 'fb-test',
      title: 'Mon Livre',
      sidebarMode: 'global',
      leftSidebar: [], // Empty individual sidebars
      rightSidebar: []
    };

    const resolved = resolveFlipbookSidebar(book, globalTmpl);
    expect(resolved.mode).toBe('global');
    expect(resolved.isGlobal).toBe(true);
    expect(resolved.leftSidebar[0].text).toBe('Global Header');
    expect(resolved.rightSidebar[0].buttonText).toBe('Global Btn');
    expect(resolved.styles.leftWidth).toBe(25);

    // Propagates immediately when globalTmpl is modified without re-saving book
    const updatedGlobalTmpl = {
      ...globalTmpl,
      leftSidebar: [{ id: 'g1', type: 'heading', text: 'Global Header Modifié', enabled: true }]
    };
    const resolvedAfterUpdate = resolveFlipbookSidebar(book, updatedGlobalTmpl);
    expect(resolvedAfterUpdate.leftSidebar[0].text).toBe('Global Header Modifié');
  });

  test('resolveFlipbookSidebar preserves custom individual sidebars when sidebarMode is "custom"', () => {
    const globalTmpl = {
      leftSidebar: [{ id: 'g1', text: 'Global' }],
      rightSidebar: []
    };

    const book = {
      id: 'fb-custom',
      title: 'Livre Custom',
      sidebarMode: 'custom',
      leftSidebar: [{ id: 'c1', type: 'text', title: 'Bloc Unique Spécifique', enabled: true }],
      rightSidebar: [{ id: 'c2', type: 'video', videoUrl: 'https://youtube.com', enabled: true }]
    };

    const resolved = resolveFlipbookSidebar(book, globalTmpl);
    expect(resolved.mode).toBe('custom');
    expect(resolved.isGlobal).toBe(false);
    expect(resolved.leftSidebar[0].title).toBe('Bloc Unique Spécifique');
    expect(resolved.rightSidebar[0].videoUrl).toBe('https://youtube.com');
  });

  test('resolveFlipbookSidebar maintains backward compatibility for existing books with defined sidebars', () => {
    const globalTmpl = {
      leftSidebar: [{ id: 'g1', text: 'Global' }],
      rightSidebar: []
    };

    const existingBook = {
      id: '4455',
      title: 'Secrets du Vignoble',
      leftSidebar: [{ id: 'old1', text: 'Ancien bloc gauche' }],
      rightSidebar: [{ id: 'old2', text: 'Ancien bloc droit' }]
    };

    const resolved = resolveFlipbookSidebar(existingBook, globalTmpl);
    expect(resolved.mode).toBe('custom');
    expect(resolved.isGlobal).toBe(false);
    expect(resolved.leftSidebar[0].text).toBe('Ancien bloc gauche');
  });

  test('resolveFlipbookSidebar defaults to global for new books or books without sidebars defined', () => {
    const globalTmpl = {
      leftSidebar: [{ id: 'g1', text: 'Global Par Défaut' }],
      rightSidebar: [],
      styles: { leftWidth: 20 }
    };

    const newBook = {
      id: 'new-fb-1',
      title: 'Nouveau Livre'
    };

    const resolved = resolveFlipbookSidebar(newBook, globalTmpl);
    expect(resolved.mode).toBe('global');
    expect(resolved.isGlobal).toBe(true);
    expect(resolved.leftSidebar[0].text).toBe('Global Par Défaut');
  });

  test('applyGlobalTemplateToAll updates all books to sidebarMode: "global" and backs up custom configs', () => {
    const books = [
      { id: '1', title: 'Livre 1', sidebarMode: 'custom', leftSidebar: [{ id: 'b1', text: 'Mon bloc perso' }] },
      { id: '2', title: 'Livre 2' },
      { id: '3', title: 'Livre 3', sidebarMode: 'global' }
    ];

    const updated = applyGlobalTemplateToAll(books);
    expect(updated.every(b => b.sidebarMode === 'global')).toBe(true);
    // Custom sidebar must be preserved in customSidebarBackup
    const book1 = updated.find(b => b.id === '1');
    expect(book1.customSidebarBackup).toBeDefined();
    expect(book1.customSidebarBackup.leftSidebar[0].text).toBe('Mon bloc perso');
  });

  test('analyzeFlipbooksSidebarStatus and applyGlobalTemplateToAllAndPersist return accurate report', async () => {
    const books = [
      { id: '1', title: 'Livre Global', sidebarMode: 'global' },
      { id: '2', title: 'Livre Perso', sidebarMode: 'custom', leftSidebar: [{ id: 'c1', text: 'Perso G' }] }
    ];

    const analysis = analyzeFlipbooksSidebarStatus(books, DEFAULT_GLOBAL_SIDEBAR);
    expect(analysis.totalCount).toBe(2);
    expect(analysis.globalCount).toBe(1);
    expect(analysis.customCount).toBe(1);

    const report = await applyGlobalTemplateToAllAndPersist(books, DEFAULT_GLOBAL_SIDEBAR);
    expect(report.totalCount).toBe(2);
    expect(report.alreadyGlobalCount).toBe(1);
    expect(report.replacedCustomCount).toBe(1);
    expect(report.backedUpCount).toBe(1);
    expect(report.verifiedCount).toBe(2);
    expect(report.updatedFlipbooks[1].customSidebarBackup.leftSidebar[0].text).toBe('Perso G');
  });

  test('applyGlobalTemplateToFlipbooks selectively updates specified IDs', () => {
    const books = [
      { id: '1', title: 'Livre 1', sidebarMode: 'custom', leftSidebar: [{ id: 'c1', text: 'Perso' }] },
      { id: '2', title: 'Livre 2', sidebarMode: 'custom' }
    ];

    const updated = applyGlobalTemplateToFlipbooks(['1'], books);
    expect(updated.find(b => b.id === '1').sidebarMode).toBe('global');
    expect(updated.find(b => b.id === '1').customSidebarBackup.leftSidebar[0].text).toBe('Perso');
    expect(updated.find(b => b.id === '2').sidebarMode).toBe('custom');
  });

  test('saveGlobalSidebarTemplate excludes previousVersion from main payload to prevent doubling document size above 1MB', async () => {
    const largeDataUrl = 'data:image/png;base64,' + 'A'.repeat(400 * 1024);
    const templateWithImage = {
      ...DEFAULT_GLOBAL_SIDEBAR,
      leftSidebar: [
        { id: 'img1', type: 'image', title: 'Illustration', imageUrl: largeDataUrl, imageAlt: 'Alt', enabled: true }
      ]
    };

    const firstRes = await saveGlobalSidebarTemplate(templateWithImage);
    expect(firstRes.success).toBe(true);
    expect(firstRes.data.previousVersion).toBeUndefined();

    const secondRes = await saveGlobalSidebarTemplate({
      ...templateWithImage,
      styles: { ...DEFAULT_GLOBAL_SIDEBAR.styles, leftWidth: 24 }
    });
    expect(secondRes.success).toBe(true);
    expect(secondRes.data.previousVersion).toBeUndefined();
    // Ensures the serialized payload does not double in size
    expect(JSON.stringify(secondRes.data).length).toBeLessThan(600 * 1024);
  });
});

