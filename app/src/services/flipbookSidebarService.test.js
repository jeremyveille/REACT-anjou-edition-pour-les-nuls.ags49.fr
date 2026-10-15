import { 
  DEFAULT_GLOBAL_SIDEBAR, 
  GLOBAL_SIDEBAR_STORAGE_KEY,
  getLocalGlobalSidebar, 
  saveGlobalSidebarTemplate, 
  resolveFlipbookSidebar, 
  applyGlobalTemplateToAll, 
  applyGlobalTemplateToFlipbooks 
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

  test('saveGlobalSidebarTemplate persists in localStorage and dispatches event', async () => {
    const mockListener = jest.fn();
    window.addEventListener('ae_global_sidebar_updated', mockListener);

    const customTemplate = {
      ...DEFAULT_GLOBAL_SIDEBAR,
      styles: {
        ...DEFAULT_GLOBAL_SIDEBAR.styles,
        leftWidth: 24,
        primaryColor: '#059669'
      }
    };

    const result = await saveGlobalSidebarTemplate(customTemplate);
    expect(result.success).toBe(true);

    const storedRaw = localStorage.getItem(GLOBAL_SIDEBAR_STORAGE_KEY);
    expect(storedRaw).toBeTruthy();
    const parsed = JSON.parse(storedRaw);
    expect(parsed.styles.leftWidth).toBe(24);
    expect(parsed.styles.primaryColor).toBe('#059669');

    expect(mockListener).toHaveBeenCalledTimes(1);
    window.removeEventListener('ae_global_sidebar_updated', mockListener);
  });

  test('resolveFlipbookSidebar resolves global template when sidebarMode is "global"', () => {
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

    // Existing book from initial data (has leftSidebar & rightSidebar, no sidebarMode property)
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

  test('applyGlobalTemplateToAll updates all books to sidebarMode: "global"', () => {
    const books = [
      { id: '1', title: 'Livre 1', sidebarMode: 'custom' },
      { id: '2', title: 'Livre 2' },
      { id: '3', title: 'Livre 3', sidebarMode: 'global' }
    ];

    const updated = applyGlobalTemplateToAll(books);
    expect(updated.every(b => b.sidebarMode === 'global')).toBe(true);
  });

  test('applyGlobalTemplateToFlipbooks selectively updates specified IDs', () => {
    const books = [
      { id: '1', title: 'Livre 1', sidebarMode: 'custom' },
      { id: '2', title: 'Livre 2', sidebarMode: 'custom' }
    ];

    const updated = applyGlobalTemplateToFlipbooks(['1'], books);
    expect(updated.find(b => b.id === '1').sidebarMode).toBe('global');
    expect(updated.find(b => b.id === '2').sidebarMode).toBe('custom');
  });
});
