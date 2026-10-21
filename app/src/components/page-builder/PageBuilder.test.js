import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import PageBuilder, { findHomePage, isHomePage } from './PageBuilder';
import { pageService } from '../../services/pageService';
import { normalizeBlocks, cloneBlock, createBlock, getDefaultHomepageBlocks, ANJOU_EDITION_PALETTE } from './blockRegistry';
import { TreeStructureView, getNodeDisplayInfo, countBlocksStats } from './TreeStructureView';
import { BuilderSidebar } from './BuilderSidebar';
import { SECTION_TEMPLATES, instantiateSectionTemplate } from './sectionTemplates';
import { BlockRenderer } from './BlockRenderer';
import { BuilderSettings, SHADOW_PRESETS, resolveShadowValue } from './BuilderSettings';
import { IframePreview } from './IframePreview';
import { BuilderCanvas } from './BuilderCanvas';

jest.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'admin-123', email: 'admin@anjou-edition.fr' } },
  storage: {}
}));

describe('PageBuilder and Block Architecture Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    window.history.pushState(null, '', '/ae-dashboard/builder');
  });

  test('isHomePage and findHomePage identify the home page accurately with correct priority', () => {
    // 1. Priority 1: explicitly defined as home
    const pagesWithExplicit = [
      { id: 'p1', title: 'Autre page', slug: 'autre' },
      { id: 'p2', title: 'Page Spéciale', slug: 'special', isHome: true },
      { id: 'p3', title: 'Accueil', slug: 'accueil' }
    ];
    expect(findHomePage(pagesWithExplicit).id).toBe('p2');

    // 2. Priority 2: slug is '/' or 'accueil' or 'home'
    const pagesWithSlug = [
      { id: 'p1', title: 'Contact', slug: 'contact' },
      { id: 'p2', title: 'Bienvenue', slug: 'accueil' },
      { id: 'p3', title: 'Accueil Ancien', slug: 'old-home' }
    ];
    expect(findHomePage(pagesWithSlug).id).toBe('p2');

    // 3. Priority 3: title is 'Accueil' or contains 'accueil'
    const pagesWithTitle = [
      { id: 'p1', title: 'À propos', slug: 'a-propos' },
      { id: 'p2', title: 'Accueil - Anjou Edition', slug: 'home-custom' }
    ];
    expect(findHomePage(pagesWithTitle).id).toBe('p2');

    // Fallback if none matches
    const pagesNone = [
      { id: 'p1', title: 'Page A', slug: 'page-a' },
      { id: 'p2', title: 'Page B', slug: 'page-b' }
    ];
    expect(findHomePage(pagesNone).id).toBe('p1');
    expect(findHomePage([])).toBeNull();

    // isHomePage checks
    expect(isHomePage({ isHome: true })).toBe(true);
    expect(isHomePage({ isHomePage: true })).toBe(true);
    expect(isHomePage({ slug: 'accueil' })).toBe(true);
    expect(isHomePage({ slug: '/' })).toBe(true);
    expect(isHomePage({ title: 'Accueil' })).toBe(true);
    expect(isHomePage({ title: 'Accueil - Anjou Edition' })).toBe(true);
    expect(isHomePage({ title: 'Contact', slug: 'contact' })).toBe(false);
  });

  test('blockRegistry creates valid blocks and normalizes missing properties', () => {
    const headingBlock = createBlock('heading', { content: 'Mon Super Titre' });
    expect(headingBlock).toBeDefined();
    expect(headingBlock.id).toMatch(/^heading_/);
    expect(headingBlock.settings.content).toBe('Mon Super Titre');
    expect(headingBlock.settings.level).toBe('h2');

    const popularVideosBlock = createBlock('popularVideos', { title: 'Mes Vidéos Favorites' });
    expect(popularVideosBlock.settings.title).toBe('Mes Vidéos Favorites');
    expect(Array.isArray(popularVideosBlock.settings.videos)).toBe(true);

    // Test normalization on incomplete or legacy data
    const rawLegacy = [
      { type: 'heading', settings: { content: 'Titre Ancien' } },
      { type: 'unknown_type' }
    ];
    const normalized = normalizeBlocks(rawLegacy);
    expect(normalized.length).toBe(2);
    expect(normalized[0].id).toBeDefined();
    expect(normalized[0].type).toBe('heading');
    expect(normalized[1].type).toBe('text');
  });

  test('blockRegistry cloneBlock generates unique IDs for cloned block and children', () => {
    const parent = createBlock('section');
    const child = createBlock('heading', { content: 'Enfant Titre' });
    parent.children = [child];

    const cloned = cloneBlock(parent);
    expect(cloned.id).not.toBe(parent.id);
    expect(cloned.children[0].id).not.toBe(child.id);
    expect(cloned.children[0].settings.content).toBe('Enfant Titre');
  });

  test('getDefaultHomepageBlocks returns an array for default homepage blocks without welcome or flipbook block', () => {
    const homeBlocks = getDefaultHomepageBlocks();
    expect(Array.isArray(homeBlocks)).toBe(true);
    
    const hasExcluded = homeBlocks.some(b => 
      b.type === 'flipbookFeatured' || 
      (b.settings?.content && (b.settings.content.includes('Bienvenue sur le portail') || b.settings.content.includes('Explorez le patrimoine')))
    );
    expect(hasExcluded).toBe(false);
  });

  test('renders PageBuilder with default canvas and allows block selection and property modification', async () => {
    const mockPage = {
      id: 'page_test_1',
      title: 'Accueil - Anjou Edition',
      slug: 'accueil',
      category: 'Accueil',
      status: 'draft',
      blocks: [
        {
          id: 'sec_1',
          type: 'section',
          settings: { classes: 'py-4' },
          children: [
            {
              id: 'heading_1',
              type: 'heading',
              settings: { content: 'Titre Modifiable', level: 'h2' }
            },
            {
              id: 'vids_1',
              type: 'popularVideos',
              settings: {
                title: 'Section Vidéos Spéciales',
                videos: [
                  { id: 'v1', title: 'Vidéo Château 1', duration: '10:00' }
                ]
              }
            }
          ]
        }
      ]
    };

    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve([]);
      return Promise.resolve([mockPage]);
    });

    render(
      <PageBuilder
        editingId="page_test_1"
        editingType="page"
        onClose={() => {}}
        onSaveSuccess={() => {}}
      />
    );

    // Wait for page to load into editor
    expect(await screen.findByDisplayValue('Accueil - Anjou Edition')).toBeInTheDocument();
    expect(await screen.findByText('Titre Modifiable')).toBeInTheDocument();
    expect(await screen.findByText('Section Vidéos Spéciales')).toBeInTheDocument();

    // Select the "Section Vidéos Spéciales" block by clicking on its rendered element
    const vidsElement = screen.getByText('Section Vidéos Spéciales');
    fireEvent.click(vidsElement);

    // Check that the properties panel switches to Vidéos Populaires settings
    const titleInput = await screen.findByDisplayValue('Section Vidéos Spéciales');
    expect(titleInput).toBeInTheDocument();

    // Modify the title of Vidéos Populaires
    fireEvent.change(titleInput, { target: { value: 'Mes Sélections Vidéos 2026' } });
    
    // Canvas should reflect the new modified title immediately!
    expect(await screen.findByText('Mes Sélections Vidéos 2026')).toBeInTheDocument();
  });

  test('allows duplicating, moving, and deleting blocks in the hierarchy', async () => {
    const mockPage = {
      id: 'page_test_2',
      title: 'Page Test Hiérarchie',
      slug: 'page-test-hierarchie',
      blocks: [
        {
          id: 'sec_1',
          type: 'section',
          settings: {},
          children: [
            { id: 'h_1', type: 'heading', settings: { content: 'Premier Titre' } },
            { id: 'h_2', type: 'heading', settings: { content: 'Deuxième Titre' } }
          ]
        }
      ]
    };
    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve([]);
      return Promise.resolve([mockPage]);
    });

    render(
      <PageBuilder
        editingId="page_test_2"
        editingType="page"
        onClose={() => {}}
        onSaveSuccess={() => {}}
      />
    );

    expect(await screen.findByText('Premier Titre')).toBeInTheDocument();
    expect(screen.getByText('Deuxième Titre')).toBeInTheDocument();

    // Duplicate Premier Titre
    const duplicateBtns = screen.getAllByRole('button', { name: /Dupliquer le bloc/i });
    fireEvent.click(duplicateBtns[0]);

    // Should now have two elements with "Premier Titre"
    await waitFor(() => {
      const titles = screen.getAllByText('Premier Titre');
      expect(titles.length).toBe(2);
    });

    // Delete one of the elements
    const deleteBtns = screen.getAllByRole('button', { name: /Supprimer le bloc/i });
    fireEvent.click(deleteBtns[deleteBtns.length - 1]);
  });

  test('Video component property editing, validation, real-time update and persistence', async () => {
    window.alert = jest.fn();
    const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ id: 'page_video_test' });

    const initialVideoPage = {
      id: 'page_video_test',
      title: 'Page Vidéo Démo',
      slug: 'page-video-demo',
      category: 'Patrimoine',
      status: 'draft',
      blocks: [
        {
          id: 'sec_video_1',
          type: 'section',
          settings: { classes: 'py-4' },
          children: [
            {
              id: 'col_video_1',
              type: 'column',
              settings: {},
              children: [
                {
                  id: 'vid_block_1',
                  type: 'video',
                  settings: {
                    url: 'https://www.youtube.com/watch?v=initial1234',
                    videoId: 'initial1234',
                    classes: 'my-custom-video-class'
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve([]);
      return Promise.resolve([initialVideoPage]);
    });

    const { rerender } = render(
      <PageBuilder
        editingId="page_video_test"
        editingType="page"
        onClose={() => {}}
        onSaveSuccess={() => {}}
      />
    );

    // 1. Attendre le chargement
    expect(await screen.findByDisplayValue('Page Vidéo Démo')).toBeInTheDocument();

    // 2. Vérifier que la vidéo initiale est rendue avec son URL iframe embed
    const iframe = await screen.findByTitle('Vidéo');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/initial1234');

    // 3. Sélectionner le bloc Vidéo en cliquant dessus
    const videoBlockWrapper = iframe.closest('.pb-editor-wrapper');
    fireEvent.click(videoBlockWrapper);

    // 4. Vérifier que le panneau Propriétés affiche le label "Lien YouTube" avec l'URL existante
    const youtubeInput = await screen.findByLabelText(/Lien YouTube/i);
    expect(youtubeInput).toBeInTheDocument();
    expect(youtubeInput.value).toBe('https://www.youtube.com/watch?v=initial1234');

    // Vérifier également la présence du lien "Ouvrir sur YouTube"
    const openLink = screen.getByRole('link', { name: /Ouvrir sur YouTube/i });
    expect(openLink).toBeInTheDocument();
    expect(openLink.getAttribute('href')).toBe('https://www.youtube.com/watch?v=initial1234');

    // 5. Remplacer l'URL par un lien format youtu.be
    fireEvent.change(youtubeInput, { target: { value: 'https://youtu.be/nouvelle123' } });
    expect(youtubeInput.value).toBe('https://youtu.be/nouvelle123');

    // Vérifier la mise à jour immédiate de l'iframe dans le constructeur sans recharger
    expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/nouvelle123');

    // 6. Tester un lien format YouTube Shorts
    fireEvent.change(youtubeInput, { target: { value: 'https://youtube.com/shorts/shortVid999' } });
    expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/shortVid999');

    // 7. Tester un lien format YouTube Embed
    fireEvent.change(youtubeInput, { target: { value: 'https://www.youtube.com/embed/embedVid888' } });
    expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/embedVid888');

    // 8. Tester une saisie invalide : afficher message d'erreur sans casser le constructeur
    fireEvent.change(youtubeInput, { target: { value: 'https://invalid-video-site.com/video' } });
    expect(await screen.findByText(/Lien YouTube (?:invalide|non valide)/i)).toBeInTheDocument();
    // Le lecteur conserve le dernier identifiant valide sans planter
    expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/embedVid888');

    // 9. Revenir à une URL valide (format watch avec paramètres)
    fireEvent.change(youtubeInput, { target: { value: 'https://www.youtube.com/watch?v=finalVid555&t=30s' } });
    await waitFor(() => {
      expect(screen.queryByText(/Lien YouTube (?:invalide|non valide)/i)).toBeNull();
    });
    expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/finalVid555');

    // 10. Sauvegarder la page
    const saveBtn = screen.getByRole('button', { name: /Enregistrer|Mettre à jour|Publier/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    const savedPayload = saveSpy.mock.calls[0][0];
    const savedVideoBlock = savedPayload.blocks[0].children[0].children[0];
    expect(savedVideoBlock.type).toBe('video');
    expect(savedVideoBlock.settings.url).toBe('https://www.youtube.com/watch?v=finalVid555&t=30s');
    expect(savedVideoBlock.settings.videoId).toBe('finalVid555');
    expect(savedVideoBlock.settings.classes).toBe('my-custom-video-class');

    // 11. Vérifier la persistance après rechargement
    const persistedPage = {
      ...initialVideoPage,
      blocks: savedPayload.blocks
    };
    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve([]);
      return Promise.resolve([persistedPage]);
    });

    rerender(
      <PageBuilder
        editingId="page_video_test"
        editingType="page"
        onClose={() => {}}
        onSaveSuccess={() => {}}
      />
    );

    const reloadedIframe = await screen.findByTitle('Vidéo');
    expect(reloadedIframe.getAttribute('src')).toBe('https://www.youtube.com/embed/finalVid555');
  });

  test('handles global keyboard shortcuts: Ctrl+Z, Ctrl+Y, Ctrl+D, Delete, and Escape', async () => {
    const mockPage = {
      id: 'page_shortcuts_test',
      title: 'Page Raccourcis',
      slug: 'page-raccourcis',
      blocks: [
        {
          id: 'sec_kb',
          type: 'section',
          settings: {},
          children: [
            { id: 'h_kb1', type: 'heading', settings: { content: 'Titre Original' } }
          ]
        }
      ]
    };

    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve([]);
      return Promise.resolve([mockPage]);
    });

    render(
      <PageBuilder
        editingId="page_shortcuts_test"
        editingType="page"
        onClose={() => {}}
        onSaveSuccess={() => {}}
      />
    );

    expect(await screen.findByText('Titre Original')).toBeInTheDocument();

    // Select the heading block
    const headingElem = screen.getByText('Titre Original');
    fireEvent.click(headingElem);

    // Test Ctrl+D (Duplicate)
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    
    // Should now have 2 heading elements with 'Titre Original'
    await waitFor(() => {
      const allHeadings = screen.getAllByText('Titre Original');
      expect(allHeadings.length).toBe(2);
    });

    // Test Ctrl+Z (Undo)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await waitFor(() => {
      const allHeadings = screen.getAllByText('Titre Original');
      expect(allHeadings.length).toBe(1);
    });

    // Test Ctrl+Y (Redo)
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    await waitFor(() => {
      const allHeadings = screen.getAllByText('Titre Original');
      expect(allHeadings.length).toBe(2);
    });

    // Test Delete (Supprimer) on the selected duplicated block
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => {
      const allHeadings = screen.getAllByText('Titre Original');
      expect(allHeadings.length).toBe(1);
    });

    // Select the remaining block again and press Escape to deselect
    fireEvent.click(screen.getByText('Titre Original'));
    expect(screen.getByText('Propriétés du composant')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    // After escape, properties panel is dismissed and widget catalog is shown
    await waitFor(() => {
      expect(screen.queryByText('Propriétés du composant')).toBeNull();
    });
  });

  // =========================================================================
  // 7 MANDATORY TARGET SELECTION & CONTENT SWITCHING SCENARIOS
  // =========================================================================

  const samplePages = [
    {
      id: 'page_home_real',
      title: 'Accueil',
      slug: 'accueil',
      category: 'Accueil',
      status: 'published',
      blocks: [
        {
          id: 'sec_home_1',
          type: 'section',
          children: [
            { id: 'h_home_1', type: 'heading', settings: { content: 'Bienvenue sur Accueil Réel' } }
          ]
        }
      ]
    },
    {
      id: 'page_contact_real',
      title: 'Contact',
      slug: 'contact',
      category: 'Contact',
      status: 'draft',
      blocks: [
        {
          id: 'sec_contact_1',
          type: 'section',
          children: [
            { id: 'h_contact_1', type: 'heading', settings: { content: 'Page de Contact Réelle' } }
          ]
        }
      ]
    }
  ];

  const sampleArticles = [
    {
      id: 'art_1_real',
      title: 'Mon Premier Article',
      slug: 'mon-premier-article',
      category: 'Histoire',
      status: 'published',
      blocks: [
        {
          id: 'sec_art_1',
          type: 'section',
          children: [
            { id: 'h_art_1', type: 'heading', settings: { content: 'Contenu Article 1' } }
          ]
        }
      ]
    }
  ];

  test('TEST 1: Ouvrir directement le constructeur sélectionne automatiquement Accueil et charge son contenu réel', async () => {
    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve(sampleArticles);
      return Promise.resolve(samplePages);
    });

    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);

    // Attendre le chargement
    expect(await screen.findByText('Bienvenue sur Accueil Réel')).toBeInTheDocument();
    
    // Vérifier l'indication visuelle dans le sélecteur
    const selectorBtn = screen.getByTestId('content-selector-btn');
    expect(selectorBtn).toHaveTextContent('Accueil');
    expect(screen.getByPlaceholderText(/Titre de la page/i)).toHaveValue('Accueil');
  });

  test('TEST 2: Modifier un texte dans Accueil puis enregistrer modifie uniquement Accueil', async () => {
    window.alert = jest.fn();
    const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ id: 'page_home_real' });
    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve(sampleArticles);
      return Promise.resolve(samplePages);
    });

    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);

    expect(await screen.findByText('Bienvenue sur Accueil Réel')).toBeInTheDocument();

    // Cliquer sur le titre pour ouvrir les réglages
    fireEvent.click(screen.getByText('Bienvenue sur Accueil Réel'));

    // Modifier le texte du titre
    const headingInput = await screen.findByDisplayValue('Bienvenue sur Accueil Réel');
    fireEvent.change(headingInput, { target: { value: 'Bienvenue en Anjou Modifié' } });

    // Enregistrer
    const saveBtn = screen.getByRole('button', { name: /Enregistrer|Publier/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    // Vérifier que seul l'ID réel de l'accueil ('page_home_real') sur la collection 'pages' a été sauvegardé
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Accueil',
        blocks: expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                settings: expect.objectContaining({ content: 'Bienvenue en Anjou Modifié' })
              })
            ])
          })
        ])
      }),
      'page_home_real',
      'pages'
    );
  });

  test('TEST 3: Choisir « Contact » dans le sélecteur charge Contact et Accueil n’est plus affichée', async () => {
    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve(sampleArticles);
      return Promise.resolve(samplePages);
    });

    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);

    expect(await screen.findByText('Bienvenue sur Accueil Réel')).toBeInTheDocument();

    // Ouvrir le sélecteur de contenu
    const selectorBtn = screen.getByTestId('content-selector-btn');
    fireEvent.click(selectorBtn);

    // Cliquer sur "Contact" dans la liste
    const contactOption = await screen.findByRole('option', { name: /Contact/i });
    fireEvent.click(contactOption);

    // Le contenu de Contact doit maintenant être visible
    expect(await screen.findByText('Page de Contact Réelle')).toBeInTheDocument();
    // Le contenu d'Accueil ne doit plus être affiché
    expect(screen.queryByText('Bienvenue sur Accueil Réel')).toBeNull();
    // Le sélecteur doit afficher "Contact"
    expect(screen.getByTestId('content-selector-btn')).toHaveTextContent('Contact');
  });

  test('TEST 4: Modifier Contact puis publier modifie uniquement Contact', async () => {
    window.alert = jest.fn();
    const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ id: 'page_contact_real' });
    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve(sampleArticles);
      return Promise.resolve(samplePages);
    });

    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);

    // Basculer vers Contact
    expect(await screen.findByText('Bienvenue sur Accueil Réel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('content-selector-btn'));
    fireEvent.click(await screen.findByRole('option', { name: /Contact/i }));

    expect(await screen.findByText('Page de Contact Réelle')).toBeInTheDocument();

    // Modifier le titre de page Contact
    const titleInput = screen.getByPlaceholderText(/Titre de la page/i);
    fireEvent.change(titleInput, { target: { value: 'Contactez-nous' } });

    // Modifier le statut à publié
    const statusSelect = screen.getByLabelText(/Statut de publication/i);
    fireEvent.change(statusSelect, { target: { value: 'published' } });

    // Sauvegarder
    const saveBtn = screen.getByRole('button', { name: /Enregistrer|Publier/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    // Seule la page Contact ('page_contact_real') est modifiée
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Contactez-nous',
        status: 'published'
      }),
      'page_contact_real',
      'pages'
    );
  });

  test('TEST 5: Recharger le constructeur sans paramètre sélectionne de nouveau Accueil par défaut', async () => {
    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve(sampleArticles);
      return Promise.resolve(samplePages);
    });

    window.history.pushState(null, '', '/ae-dashboard/builder');

    const { unmount } = render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
    expect(await screen.findByText('Bienvenue sur Accueil Réel')).toBeInTheDocument();

    unmount();

    // Nouveau montage sans paramètre
    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
    expect(await screen.findByText('Bienvenue sur Accueil Réel')).toBeInTheDocument();
    expect(screen.getByTestId('content-selector-btn')).toHaveTextContent('Accueil');
  });

  test('TEST 6: Modifier Accueil sans sauvegarder puis sélectionner Contact affiche une confirmation avec 3 choix', async () => {
    window.alert = jest.fn();
    const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ id: 'page_home_real' });
    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve(sampleArticles);
      return Promise.resolve(samplePages);
    });

    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);

    expect(await screen.findByText('Bienvenue sur Accueil Réel')).toBeInTheDocument();

    // 1. Modifier le titre d'Accueil sans enregistrer
    const titleInput = screen.getByPlaceholderText(/Titre de la page/i);
    fireEvent.change(titleInput, { target: { value: 'Accueil Modifié Sans Sauvegarder' } });

    // 2. Tenter de sélectionner Contact
    fireEvent.click(screen.getByTestId('content-selector-btn'));
    fireEvent.click(await screen.findByRole('option', { name: /Contact/i }));

    // 3. Vérifier que la modale d'avertissement apparaît
    const modal = await screen.findByTestId('unsaved-changes-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent(/Modifications non enregistrées/i);
    expect(modal).toHaveTextContent(/Des modifications de la page/i);

    // Vérifier la présence des 3 boutons dans la modale
    const cancelBtn = within(modal).getByRole('button', { name: /^Annuler$/i });
    const discardBtn = within(modal).getByRole('button', { name: /Continuer sans enregistrer/i });
    const saveAndContBtn = within(modal).getByRole('button', { name: /Enregistrer et continuer/i });

    expect(cancelBtn).toBeInTheDocument();
    expect(discardBtn).toBeInTheDocument();
    expect(saveAndContBtn).toBeInTheDocument();

    // Test bouton Annuler : la modale disparaît et Accueil reste affiché
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(screen.queryByTestId('unsaved-changes-modal')).toBeNull();
    });
    expect(screen.getByPlaceholderText(/Titre de la page/i)).toHaveValue('Accueil Modifié Sans Sauvegarder');

    // Tenter à nouveau et cliquer "Continuer sans enregistrer"
    fireEvent.click(screen.getByTestId('content-selector-btn'));
    fireEvent.click(await screen.findByRole('option', { name: /Contact/i }));
    const modalSecond = await screen.findByTestId('unsaved-changes-modal');
    fireEvent.click(within(modalSecond).getByRole('button', { name: /Continuer sans enregistrer/i }));

    // Contact doit maintenant être chargé
    expect(await screen.findByText('Page de Contact Réelle')).toBeInTheDocument();
    expect(screen.getByTestId('content-selector-btn')).toHaveTextContent('Contact');
  });

  test('TEST 7: Ouvrir une URL contenant explicitement un pageId charge la page demandée à la place d’Accueil', async () => {
    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve(sampleArticles);
      return Promise.resolve(samplePages);
    });

    window.history.pushState(null, '', '/ae-dashboard/builder?pageId=page_contact_real');

    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);

    // La page Contact doit être chargée automatiquement
    expect(await screen.findByText('Page de Contact Réelle')).toBeInTheDocument();
    expect(screen.getByTestId('content-selector-btn')).toHaveTextContent('Contact');
    expect(screen.queryByText('Bienvenue sur Accueil Réel')).toBeNull();
  });

  test('TEST 8: Hydratation en mémoire de la page d’accueil legacy/vide sans bloc d\'introduction ni lecteur de flipbook', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const legacyHomePage = {
      id: 'page_home_legacy',
      title: 'Accueil',
      slug: 'accueil',
      category: 'Accueil',
      status: 'published',
      blocks: [] // Empty blocks representing legacy document
    };

    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve([]);
      return Promise.resolve([legacyHomePage]);
    });

    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);

    // 1. Attendre que le canvas se charge
    const titleInput = await screen.findByPlaceholderText(/Titre de la page/i);
    expect(titleInput).toHaveValue('Accueil');

    // 2. Vérifier qu'aucun bloc d'introduction ni lecteur de flipbook n'apparaît
    expect(screen.queryByText(/Bienvenue sur le portail littéraire et culturel d'Anjou Édition/i)).toBeNull();
    expect(screen.queryByText(/Explorez le patrimoine/i)).toBeNull();
    expect(screen.queryByText('Lecteur de Flipbook Interactif')).toBeNull();

    // 3. Vérifier la présence des logs de diagnostic
    expect(logSpy).toHaveBeenCalledWith('[PageBuilder] Home page resolved:', 'page_home_legacy');

    logSpy.mockRestore();
  });

  test('TEST 9: Modification des réglages du bloc Flipbook dans le constructeur', async () => {
    window.alert = jest.fn();
    const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ id: 'page_custom_flipbook' });

    const flipbookPage = {
      id: 'page_custom_flipbook',
      title: 'Ouvrages',
      slug: 'ouvrages',
      category: 'Outils',
      status: 'published',
      blocks: [
        {
          id: 'sec_fb',
          type: 'section',
          settings: { classes: 'py-4' },
          children: [
            {
              id: 'cnt_fb',
              type: 'container',
              children: [
                {
                  id: 'fb_feat',
                  type: 'flipbookFeatured',
                  settings: {
                    title: 'Sélection de Flipbooks',
                    mode: 'reader',
                    selectedBookId: '4455'
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve([]);
      return Promise.resolve([flipbookPage]);
    });

    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);

    // 1. Sélectionner le bloc Flipbook
    const flipbookTitle = await screen.findByText('Sélection de Flipbooks');
    fireEvent.click(flipbookTitle);

    // 2. Vérifier les réglages dans le panneau latéral
    const titleInput = await screen.findByDisplayValue('Sélection de Flipbooks');
    expect(titleInput).toBeInTheDocument();

    // 3. Modifier le titre
    fireEvent.change(titleInput, { target: { value: 'Grand Flipbook Vignoble 2026' } });
    expect(await screen.findByText('Grand Flipbook Vignoble 2026')).toBeInTheDocument();

    // 4. Vérifier le flipbook sélectionné dans la liste déroulante
    const bookSelect = screen.getByDisplayValue(/Les Secrets du Vignoble Angevin/i);
    expect(bookSelect).toBeInTheDocument();

    // 5. Sauvegarder
    const saveBtn = screen.getByRole('button', { name: /Enregistrer|Publier/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ouvrages',
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'section',
            children: expect.arrayContaining([
              expect.objectContaining({
                type: 'container',
                children: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'flipbookFeatured',
                    settings: expect.objectContaining({
                      title: 'Grand Flipbook Vignoble 2026',
                      selectedBookId: '4455'
                    })
                  })
                ])
              })
            ])
          })
        ])
      }),
      'page_custom_flipbook',
      'pages'
    );
  });

  test('TEST 10: Visual Image and Video Replacement, Media Library modal interaction, and saving', async () => {
    window.alert = jest.fn();
    const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ id: 'page_media_test' });

    const mediaTestPage = {
      id: 'page_media_test',
      title: 'Page Médias Anjou',
      slug: 'page-medias-anjou',
      category: 'Accueil',
      status: 'draft',
      blocks: [
        {
          id: 'sec_media_1',
          type: 'section',
          children: [
            {
              id: 'col_media_1',
              type: 'column',
              children: [
                {
                  id: 'img_test_1',
                  type: 'image',
                  settings: {
                    src: 'https://images.unsplash.com/photo-old.jpg',
                    alt: 'Ancienne image'
                  }
                },
                {
                  id: 'vid_test_1',
                  type: 'video',
                  settings: {
                    url: 'https://www.youtube.com/watch?v=oldVid123',
                    videoId: 'oldVid123'
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve([]);
      return Promise.resolve([mediaTestPage]);
    });

    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);

    // 1. Vérifier le chargement des médias existants
    const imgElement = await screen.findByAltText('Ancienne image');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement.getAttribute('src')).toContain('photo-old.jpg');

    // 2. Cliquer sur l'image pour la sélectionner et ouvrir les réglages
    fireEvent.click(imgElement);

    // 3. Modifier la source de l'image
    const srcInput = await screen.findByDisplayValue('https://images.unsplash.com/photo-old.jpg');
    fireEvent.change(srcInput, { target: { value: 'https://images.unsplash.com/photo-chateau-saumur-hd.jpg' } });
    
    const altInput = screen.getByDisplayValue('Ancienne image');
    fireEvent.change(altInput, { target: { value: 'Château de Saumur HD' } });

    // Vérifier la mise à jour immédiate sur le canevas et le panneau de prévisualisation
    const updatedImgs = await screen.findAllByAltText('Château de Saumur HD');
    expect(updatedImgs.length).toBeGreaterThanOrEqual(1);

    // 4. Sélectionner le bloc vidéo
    const videoIframe = screen.getByTitle('Vidéo');
    fireEvent.click(videoIframe);

    const ytInput = await screen.findByLabelText(/Lien YouTube/i);
    fireEvent.change(ytInput, { target: { value: 'https://www.youtube.com/watch?v=newLoireVid' } });

    // 5. Enregistrer les modifications
    const saveBtn = screen.getByRole('button', { name: /Enregistrer|Publier/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    const payload = saveSpy.mock.calls[0][0];
    const savedImg = payload.blocks[0].children[0].children[0];
    const savedVid = payload.blocks[0].children[0].children[1];

    expect(savedImg.settings.src).toBe('https://images.unsplash.com/photo-chateau-saumur-hd.jpg');
    expect(savedImg.settings.alt).toBe('Château de Saumur HD');
    expect(savedVid.settings.videoId).toBe('newLoireVid');
  });

  test('TEST 11: Bouton Annuler rétablit l’état initial du canevas et des médias', async () => {
    window.confirm = jest.fn(() => true);

    const testRevertPage = {
      id: 'page_revert_test',
      title: 'Page Rétablissement',
      slug: 'page-retablissement',
      category: 'Accueil',
      status: 'draft',
      blocks: [
        {
          id: 'sec_rev_1',
          type: 'section',
          children: [
            {
              id: 'h_rev_1',
              type: 'heading',
              settings: { content: 'Titre Initial Inchangeable' }
            }
          ]
        }
      ]
    };

    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve([]);
      return Promise.resolve([testRevertPage]);
    });

    render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);

    expect(await screen.findByText('Titre Initial Inchangeable')).toBeInTheDocument();

    // Modifier le titre
    fireEvent.click(screen.getByText('Titre Initial Inchangeable'));
    const input = await screen.findByDisplayValue('Titre Initial Inchangeable');
    fireEvent.change(input, { target: { value: 'Titre Altéré Temporaire' } });

    expect(await screen.findByText('Titre Altéré Temporaire')).toBeInTheDocument();

    // Cliquer sur le bouton "Annuler"
    const cancelBtn = screen.getByRole('button', { name: /Annuler les modifications non enregistrées/i });
    fireEvent.click(cancelBtn);

    // Vérifier que le titre initial est restauré
    await waitFor(() => {
      expect(screen.getByText('Titre Initial Inchangeable')).toBeInTheDocument();
      expect(screen.queryByText('Titre Altéré Temporaire')).toBeNull();
    });
  });

  // =========================================================================
  // JALON M2 : Recherche avec Reset ✕, Arborescence, Repli Sidebar & Modèles
  // =========================================================================
  describe('Jalon M2 : Recherche, Arborescence TreeStructureView, Repli Sidebar & Modèles', () => {
    const sampleTreeBlocks = [
      {
        id: 'sec_1',
        type: 'section',
        settings: { classes: 'py-5', style: { backgroundColor: '#ffffff' } },
        children: [
          {
            id: 'cont_1',
            type: 'container',
            settings: { fluid: false },
            children: [
              {
                id: 'row_1',
                type: 'row',
                settings: {},
                children: [
                  {
                    id: 'col_1',
                    type: 'column',
                    settings: { sizeClasses: 'col-md-8' },
                    children: [
                      {
                        id: 'head_1',
                        type: 'heading',
                        settings: { level: 'h1', content: 'Chef-d’œuvre Poétique' }
                      },
                      {
                        id: 'txt_1',
                        type: 'text',
                        settings: { content: '<p>Écrit inédit par nos auteurs.</p>' }
                      }
                    ]
                  },
                  {
                    id: 'col_2',
                    type: 'column',
                    settings: { sizeClasses: 'col-md-4' },
                    children: [
                      {
                        id: 'vid_1',
                        type: 'video',
                        settings: { title: 'Entretien avec l’auteur', videoId: 'abc123' },
                        hidden: true
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ];

    test('getNodeDisplayInfo extrait fidèlement les métadonnées pour chaque type de bloc', () => {
      const secInfo = getNodeDisplayInfo({ type: 'section', settings: { classes: 'ma-classe-custom' } });
      expect(secInfo.label).toBe('Section');
      expect(secInfo.badgeText).toBe('Section');
      expect(secInfo.snippet).toBe('ma-classe-custom');
      expect(secInfo.isContainer).toBe(true);

      const headingInfo = getNodeDisplayInfo({ type: 'heading', settings: { level: 'h3', content: 'Mon H3' } });
      expect(headingInfo.label).toBe('Titre (H3)');
      expect(headingInfo.badgeText).toBe('H3');
      expect(headingInfo.snippet).toBe('Mon H3');

      const textInfo = getNodeDisplayInfo({ type: 'text', settings: { content: '<p>Ligne <strong>HTML</strong></p>' } });
      expect(textInfo.label).toBe('Texte / HTML');
      expect(textInfo.snippet).toContain('Ligne HTML');

      const videoInfo = getNodeDisplayInfo({ type: 'video', settings: { title: 'Vidéo Test' } });
      expect(videoInfo.label).toBe('Vidéo');
      expect(videoInfo.snippet).toBe('Vidéo Test');
    });

    test('countBlocksStats calcule le total des sections et des blocs', () => {
      const stats = countBlocksStats(sampleTreeBlocks);
      expect(stats.sections).toBe(1);
      expect(stats.totalBlocks).toBe(8);
    });

    test('TreeStructureView affiche un état vide propre quand blocks est vide et appelle onOpenLibrary', () => {
      const handleOpenLib = jest.fn();
      render(<TreeStructureView blocks={[]} onOpenLibrary={handleOpenLib} />);

      expect(screen.getByTestId('tree-empty-state')).toBeInTheDocument();
      expect(screen.getByText('Structure vierge')).toBeInTheDocument();

      const openLibBtn = screen.getByRole('button', { name: /Ouvrir la Bibliothèque/i });
      fireEvent.click(openLibBtn);
      expect(handleOpenLib).toHaveBeenCalledTimes(1);
    });

    test('TreeStructureView affiche la hiérarchie récursive, le nœud actif et les nœuds masqués', () => {
      render(<TreeStructureView blocks={sampleTreeBlocks} activeBlockId="head_1" />);

      expect(screen.getByText(/1 section • 8 éléments/i)).toBeInTheDocument();
      expect(screen.getByTestId('tree-node-sec_1')).toBeInTheDocument();
      expect(screen.getByTestId('tree-node-head_1')).toHaveClass('pb-tree-node-active');
      expect(screen.getByTestId('tree-node-vid_1')).toHaveClass('pb-tree-node-hidden');
      expect(screen.getByTestId('tree-node-vid_1')).toHaveTextContent('Masqué');
    });

    test('TreeStructureView déclenche onSelectBlock au clic et isole les actions secondaires avec stopPropagation', () => {
      const handleSelect = jest.fn();
      const handleToggleHide = jest.fn();
      const handleRemove = jest.fn();

      render(
        <TreeStructureView
          blocks={sampleTreeBlocks}
          onSelectBlock={handleSelect}
          onToggleHideBlock={handleToggleHide}
          onRemoveBlock={handleRemove}
        />
      );

      // Clic sur nœud
      fireEvent.click(screen.getByTestId('tree-node-txt_1'));
      expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'txt_1' }));

      // Clic sur bouton masquage sans déclencher onSelectBlock
      handleSelect.mockClear();
      fireEvent.click(screen.getByTestId('tree-toggle-hide-head_1'));
      expect(handleToggleHide).toHaveBeenCalledWith('head_1');
      expect(handleSelect).not.toHaveBeenCalled();

      // Clic sur suppression sans déclencher onSelectBlock
      fireEvent.click(screen.getByTestId('tree-remove-head_1'));
      expect(handleRemove).toHaveBeenCalledWith('head_1', 'col_1');
      expect(handleSelect).not.toHaveBeenCalled();
    });

    test('TreeStructureView permet de replier/déplier individuellement et via les boutons Tout replier / Tout déplier', () => {
      render(<TreeStructureView blocks={sampleTreeBlocks} />);

      expect(screen.getByTestId('tree-node-head_1')).toBeInTheDocument();

      // Tout replier
      fireEvent.click(screen.getByRole('button', { name: /Tout replier/i }));
      expect(screen.queryByTestId('tree-node-cont_1')).not.toBeInTheDocument();

      // Tout déplier
      fireEvent.click(screen.getByRole('button', { name: /Tout déplier/i }));
      expect(screen.getByTestId('tree-node-cont_1')).toBeInTheDocument();
    });

    test('BuilderSidebar propose un champ de recherche avec bouton ✕ de réinitialisation, pilules de catégories et modèles', () => {
      const handleInsertTemplate = jest.fn();
      render(
        <BuilderSidebar
          activeTab="widgets"
          setActiveTab={() => {}}
          onAddBlock={() => {}}
          onInsertSectionTemplate={handleInsertTemplate}
          activeBlock={null}
          builderPageCategory="Accueil"
          setBuilderPageCategory={() => {}}
          blocks={sampleTreeBlocks}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Rechercher un composant ou modèle/i);
      expect(searchInput).toBeInTheDocument();

      // Aucun bouton reset initialement
      expect(screen.queryByRole('button', { name: /Effacer la recherche/i })).toBeNull();

      // Saisie d'un terme
      fireEvent.change(searchInput, { target: { value: 'colonne' } });
      const resetBtn = screen.getByRole('button', { name: /Effacer la recherche/i });
      expect(resetBtn).toBeInTheDocument();

      // Clic sur reset
      fireEvent.click(resetBtn);
      expect(searchInput.value).toBe('');

      // Pilules de catégories
      const pillContent = screen.getByRole('button', { name: 'Contenu' });
      fireEvent.click(pillContent);
      expect(pillContent).toHaveClass('pb-category-pill-active');

      // Modèle prêt à l'insertion
      const pillTemplates = screen.getByRole('button', { name: 'Modèles' });
      fireEvent.click(pillTemplates);
      const insertBtns = screen.getAllByRole('button', { name: /Insérer cette section/i });
      expect(insertBtns.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(insertBtns[0]);
      expect(handleInsertTemplate).toHaveBeenCalledTimes(1);
    });

    test('PageBuilder intègre le repli/dépli de la barre latérale via bouton toolbar et raccourci Ctrl+B', async () => {
      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([
          {
            id: 'page_repli_test',
            title: 'Page Test Repli Toolbar',
            slug: 'page-test-repli-toolbar',
            category: 'Outils',
            status: 'draft',
            blocks: sampleTreeBlocks
          }
        ]);
      });

      render(
        <PageBuilder
          editingId="page_repli_test"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      expect(await screen.findByDisplayValue('Page Test Repli Toolbar')).toBeInTheDocument();

      const toggleBtn = screen.getByTestId('toggle-sidebar-btn');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('aria-label', 'Réduire le panneau');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

      const sidebarContainer = document.getElementById('bpb-sidebar-container');
      expect(sidebarContainer).not.toHaveClass('bpb-sidebar-collapsed');

      // Clic pour replier
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-label', 'Agrandir le panneau');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(sidebarContainer).toHaveClass('bpb-sidebar-collapsed');

      // Clic pour réouvrir
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-label', 'Réduire le panneau');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(sidebarContainer).not.toHaveClass('bpb-sidebar-collapsed');

      // Raccourci Ctrl+B pour replier
      fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
      expect(sidebarContainer).toHaveClass('bpb-sidebar-collapsed');

      // Raccourci Ctrl+B pour réouvrir
      fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
      expect(sidebarContainer).not.toHaveClass('bpb-sidebar-collapsed');
    });

    test('PageBuilder gère l insertion en 1 clic de modèles de sections avec mise à jour du state et sélection', async () => {
      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([
          {
            id: 'page_template_insert',
            title: 'Page Insertion Modèle',
            slug: 'page-insertion-modele',
            category: 'Outils',
            status: 'draft',
            blocks: []
          }
        ]);
      });

      render(
        <PageBuilder
          editingId="page_template_insert"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      expect(await screen.findByDisplayValue('Page Insertion Modèle')).toBeInTheDocument();

      // Insérer le premier modèle disponible
      const insertBtn = (await screen.findAllByRole('button', { name: /Insérer cette section/i }))[0];
      expect(insertBtn).toBeInTheDocument();
      fireEvent.click(insertBtn);

      // Vérifier que le modèle est instancié sur le canevas
      await waitFor(() => {
        const sections = document.querySelectorAll('.pb-section-wrapper');
        expect(sections.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // =========================================================================
  // JALON M3 (R2) : Manipulation Avancée, Copier/Coller Style, Masquage & Raccourcis
  // =========================================================================
  describe('Jalon M3 (R2) : Manipulation Avancée, Copier/Coller Style, Masquage & Raccourcis', () => {

    test('TEST-UNIT-R2-STYLE-1 : Copier le style et le coller sur un autre bloc en préservant son contenu éditorial', async () => {
      const mockPage = {
        id: 'page_style_test',
        title: 'Page Style Test',
        slug: 'page-style-test',
        blocks: [
          {
            id: 'sec_1',
            type: 'section',
            children: [
              {
                id: 'h_source',
                type: 'heading',
                settings: {
                  content: 'Titre Source Stylisé',
                  classes: 'custom-card-shadow',
                  style: {
                    color: '#004b7a',
                    backgroundColor: '#e0f2fe',
                    padding: '16px',
                    borderRadius: '8px'
                  }
                }
              },
              {
                id: 'h_target',
                type: 'heading',
                settings: {
                  content: 'Titre Cible Primitif',
                  style: {}
                }
              }
            ]
          }
        ]
      };

      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([mockPage]);
      });

      render(
        <PageBuilder
          editingId="page_style_test"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      expect(await screen.findByText('Titre Source Stylisé')).toBeInTheDocument();
      expect(screen.getByText('Titre Cible Primitif')).toBeInTheDocument();

      // 1. Bouton Coller désactivé avant toute copie
      const pasteBtnsBefore = screen.getAllByRole('button', { name: /Coller le style/i });
      expect(pasteBtnsBefore[0]).toBeDisabled();

      // 2. Clic sur le bouton Copier le style du bloc source
      const copyBtns = screen.getAllByRole('button', { name: /Copier le style/i });
      fireEvent.click(copyBtns[0]);

      // Vérifier le badge presse-papier et toast
      expect(await screen.findByTestId('pb-clipboard-badge')).toBeInTheDocument();

      // 3. Bouton Coller désormais activé
      const pasteBtnsAfter = screen.getAllByRole('button', { name: /Coller le style/i });
      expect(pasteBtnsAfter[1]).not.toBeDisabled();

      // 4. Clic sur Coller le style sur le bloc cible
      fireEvent.click(pasteBtnsAfter[1]);

      // 5. Contenu textuel cible 100% préservé
      expect(screen.getByText('Titre Cible Primitif')).toBeInTheDocument();
    });

    test('TEST-UNIT-R2-STYLE-2 : Compatibilité de transfert de style inter-types (Heading vers Text)', async () => {
      const mockPage = {
        id: 'page_cross_style',
        title: 'Page Cross Style',
        slug: 'page-cross-style',
        blocks: [
          {
            id: 'h_src',
            type: 'heading',
            settings: {
              content: 'Titre Donneur',
              style: { color: '#1e3a8a', backgroundColor: '#dbeafe' }
            }
          },
          {
            id: 'txt_tgt',
            type: 'text',
            settings: {
              content: '<p>Paragraphe Éditorial Intact</p>',
              style: {}
            }
          }
        ]
      };

      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([mockPage]);
      });

      render(
        <PageBuilder
          editingId="page_cross_style"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      expect(await screen.findByText('Titre Donneur')).toBeInTheDocument();
      expect(screen.getByText(/Paragraphe Éditorial Intact/i)).toBeInTheDocument();

      // Copier le style du titre
      const copyBtns = screen.getAllByRole('button', { name: /Copier le style/i });
      fireEvent.click(copyBtns[0]);

      // Coller sur le texte
      const pasteBtns = screen.getAllByRole('button', { name: /Coller le style/i });
      fireEvent.click(pasteBtns[1]);

      // Le texte éditorial reste strictement présent
      expect(screen.getByText(/Paragraphe Éditorial Intact/i)).toBeInTheDocument();
    });

    test('TEST-UNIT-R2-STYLE-3 : Annulation (Ctrl+Z) et Rétablissement (Ctrl+Y / Ctrl+Shift+Z) du collage de style', async () => {
      const mockPage = {
        id: 'page_undo_style',
        title: 'Page Undo Style',
        slug: 'page-undo-style',
        blocks: [
          {
            id: 'b1',
            type: 'heading',
            settings: { content: 'Titre A', style: { color: '#2563eb' } }
          },
          {
            id: 'b2',
            type: 'heading',
            settings: { content: 'Titre B', style: {} }
          }
        ]
      };

      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([mockPage]);
      });

      render(
        <PageBuilder
          editingId="page_undo_style"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      await screen.findByText('Titre A');

      // Copier B1
      const copyBtns = screen.getAllByRole('button', { name: /Copier le style/i });
      fireEvent.click(copyBtns[0]);

      // Coller B2
      const pasteBtns = screen.getAllByRole('button', { name: /Coller le style/i });
      fireEvent.click(pasteBtns[1]);

      // Annuler par Ctrl+Z
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(screen.getByText('Titre B')).toBeInTheDocument();

      // Rétablir par Ctrl+Shift+Z
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
      expect(screen.getByText('Titre B')).toBeInTheDocument();

      // Annuler par Ctrl+Z puis rétablir par Ctrl+Y
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      expect(screen.getByText('Titre B')).toBeInTheDocument();
    });

    test('TEST-UNIT-R2-STYLE-4 : Vidage rapide du presse-papier de style via le bouton de réinitialisation', async () => {
      const mockPage = {
        id: 'page_clear_style',
        title: 'Page Clear Style',
        slug: 'page-clear-style',
        blocks: [
          {
            id: 'b_sample',
            type: 'heading',
            settings: { content: 'Élément Test', style: { color: '#059669' } }
          }
        ]
      };

      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([mockPage]);
      });

      render(
        <PageBuilder
          editingId="page_clear_style"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      await screen.findByText('Élément Test');

      // Au départ, pas de badge presse-papier
      expect(screen.queryByTestId('pb-clipboard-badge')).toBeNull();

      // Copier le style
      const copyBtn = screen.getByRole('button', { name: /Copier le style/i });
      fireEvent.click(copyBtn);

      // Badge présent
      const badge = await screen.findByTestId('pb-clipboard-badge');
      expect(badge).toBeInTheDocument();

      // Cliquer sur le bouton pour vider le presse-papier
      const clearBtn = screen.getByRole('button', { name: /Effacer le style du presse-papier/i });
      fireEvent.click(clearBtn);

      // Le badge disparaît et le bouton coller redevient désactivé
      expect(screen.queryByTestId('pb-clipboard-badge')).toBeNull();
      const pasteBtn = screen.getByRole('button', { name: /Coller le style/i });
      expect(pasteBtn).toBeDisabled();
    });

    test('TEST-UNIT-R2-HIDE-1 : Bascule du masquage temporaire avec badge et classe CSS .pb-block-hidden', async () => {
      const mockPage = {
        id: 'page_hide_test',
        title: 'Page Masquage',
        slug: 'page-masquage',
        blocks: [
          {
            id: 'h_toggle',
            type: 'heading',
            settings: { content: 'Titre Masquable', hidden: false }
          }
        ]
      };

      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([mockPage]);
      });

      render(
        <PageBuilder
          editingId="page_hide_test"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      await screen.findByText('Titre Masquable');

      // 1. Masquer le bloc
      const hideBtn = screen.getByRole('button', { name: /Masquer le bloc Titre/i });
      fireEvent.click(hideBtn);

      // 2. Le badge "Masqué" apparaît
      await waitFor(() => {
        expect(screen.getByText('Masqué')).toBeInTheDocument();
      });

      // 3. Le wrapper a la classe CSS .pb-block-hidden
      const wrapper = document.querySelector('.pb-editor-wrapper.pb-block-hidden');
      expect(wrapper).toBeInTheDocument();

      // 4. Réafficher le bloc
      const showBtn = screen.getByRole('button', { name: /Réafficher le bloc Titre/i });
      fireEvent.click(showBtn);

      await waitFor(() => {
        expect(screen.queryByText('Masqué')).toBeNull();
      });
      expect(document.querySelector('.pb-editor-wrapper.pb-block-hidden')).toBeNull();
    });

    test('TEST-UNIT-R2-HIDE-2 : Exclusion stricte du rendu public pour tout bloc masqué (BlockRenderer isEditing={false})', () => {
      // Bloc avec settings.hidden = true
      const { container: c1 } = render(
        <BlockRenderer
          block={{
            id: 'b_secret_1',
            type: 'text',
            settings: { content: 'Contenu Public Interdit', hidden: true }
          }}
          isEditing={false}
        />
      );
      expect(c1.firstChild).toBeNull();

      // Bloc avec block.hidden = true (rétrocompatibilité)
      const { container: c2 } = render(
        <BlockRenderer
          block={{
            id: 'b_secret_2',
            type: 'heading',
            hidden: true,
            settings: { content: 'Titre Masqué' }
          }}
          isEditing={false}
        />
      );
      expect(c2.firstChild).toBeNull();

      // Bloc non masqué -> rendu effectif
      const { container: c3 } = render(
        <BlockRenderer
          block={{
            id: 'b_visible',
            type: 'heading',
            settings: { content: 'Titre Public Visible', hidden: false }
          }}
          isEditing={false}
        />
      );
      expect(c3.firstChild).not.toBeNull();
    });

    test('TEST-UNIT-R2-HIDE-3 : Sauvegarde et persistance du statut masqué dans Firestore', async () => {
      const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ success: true, id: 'page_save_hide' });
      const mockPage = {
        id: 'page_save_hide',
        title: 'Page Sauvegarde Masquage',
        slug: 'page-sauvegarde-masquage',
        blocks: [
          {
            id: 'h_save_toggle',
            type: 'heading',
            settings: { content: 'Titre à sauvegarder masqué', hidden: false }
          }
        ]
      };

      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([mockPage]);
      });

      render(
        <PageBuilder
          editingId="page_save_hide"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      await screen.findByText('Titre à sauvegarder masqué');

      // Masquer
      const hideBtn = screen.getByRole('button', { name: /Masquer le bloc Titre/i });
      fireEvent.click(hideBtn);

      await waitFor(() => {
        expect(screen.getByText('Masqué')).toBeInTheDocument();
      });

      // Sauvegarder
      const saveBtn = screen.getByRole('button', { name: /Enregistrer|Publier/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalledTimes(1);
      });

      const savedBlocks = saveSpy.mock.calls[0][0].blocks;
      const targetSavedHeading = savedBlocks.find(b => b.id === 'h_save_toggle');
      expect(targetSavedHeading.settings.hidden).toBe(true);
    });

    test('TEST-UNIT-R2-KB-1 : Sauvegarde immédiate par Ctrl+S même lors du focus dans un champ de saisie', async () => {
      const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ success: true, id: 'page_kb_save' });
      const mockPage = {
        id: 'page_kb_save',
        title: 'Page Test Raccourci Sauvegarde',
        slug: 'page-test-raccourci-sauvegarde',
        blocks: [
          {
            id: 'h_kb',
            type: 'heading',
            settings: { content: 'Titre Test KB' }
          }
        ]
      };

      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([mockPage]);
      });

      render(
        <PageBuilder
          editingId="page_kb_save"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      const titleInput = await screen.findByDisplayValue('Page Test Raccourci Sauvegarde');
      titleInput.focus();

      // Déclencher Ctrl+S directement depuis le champ de saisie
      fireEvent.keyDown(titleInput, { key: 's', ctrlKey: true });

      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalledTimes(1);
      });
    });

    test('TEST-UNIT-R2-KB-2 : Isolation des touches Delete et Backspace dans les champs de saisie', async () => {
      const mockPage = {
        id: 'page_kb_isolation',
        title: 'Page Isolation Clavier',
        slug: 'page-isolation-clavier',
        blocks: [
          {
            id: 'h_protected',
            type: 'heading',
            settings: { content: 'Bloc Protégé Contre Suppression Accidentelle' }
          }
        ]
      };

      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([mockPage]);
      });

      render(
        <PageBuilder
          editingId="page_kb_isolation"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      const blockEl = await screen.findByText('Bloc Protégé Contre Suppression Accidentelle');
      // Sélectionner le bloc
      fireEvent.click(blockEl);

      // Focus dans le champ titre de la barre d'outils
      const titleInput = screen.getByDisplayValue('Page Isolation Clavier');
      titleInput.focus();

      // Appuyer sur Delete et Backspace dans le champ
      fireEvent.keyDown(titleInput, { key: 'Delete' });
      fireEvent.keyDown(titleInput, { key: 'Backspace' });

      // Le bloc ne doit absolument PAS avoir été supprimé du canevas
      expect(screen.getByText('Bloc Protégé Contre Suppression Accidentelle')).toBeInTheDocument();
    });

    test('TEST-UNIT-R2-DUP-1 : Duplication récursive et auto-localisante d\'un bloc imbriqué dans une colonne', async () => {
      const mockPage = {
        id: 'page_dup_test',
        title: 'Page Duplication Imbriquée',
        slug: 'page-duplication-imbriquee',
        blocks: [
          {
            id: 'sec_root',
            type: 'section',
            children: [
              {
                id: 'cont_1',
                type: 'container',
                children: [
                  {
                    id: 'row_1',
                    type: 'row',
                    children: [
                      {
                        id: 'col_1',
                        type: 'column',
                        children: [
                          {
                            id: 'h_nested',
                            type: 'heading',
                            settings: { content: 'Titre Imbriqué Profond' }
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([mockPage]);
      });

      render(
        <PageBuilder
          editingId="page_dup_test"
          editingType="page"
          onClose={() => {}}
          onSaveSuccess={() => {}}
        />
      );

      await screen.findByText('Titre Imbriqué Profond');

      // Cliquer sur le bouton dupliquer de ce titre imbriqué
      const dupBtns = screen.getAllByRole('button', { name: /Dupliquer/i });
      fireEvent.click(dupBtns[0]);

      // Vérifier que deux titres sont maintenant présents
      await waitFor(() => {
        const titles = screen.getAllByText('Titre Imbriqué Profond');
        expect(titles.length).toBe(2);
      });
    });

  });

  // =========================================================================
  // JALON M4 : INSPECTEUR ÉTENDU, NUANCIER ANJOU, MÉDIATHÈQUE & 4 PALIERS
  // =========================================================================
  describe('Jalon M4 : Inspecteur Étendu, Nuancier Anjou, Médiathèque & 4 Paliers Responsive (R3, R4, R5)', () => {

    test('M4-1: Dimensionnement fidèle de IframePreview sur les 4 paliers responsive (S, M, L, XL)', () => {
      // Palier S : Smartphone (390px)
      const { container, rerender } = render(<IframePreview device="mobile" title="preview-m4-s" />);
      let iframe = container.querySelector('iframe');
      expect(iframe.style.width).toBe('390px');

      // Palier M : Tablette (768px)
      rerender(<IframePreview device="tablet" title="preview-m4-m" />);
      iframe = container.querySelector('iframe');
      expect(iframe.style.width).toBe('768px');

      // Palier L : Ordinateur Portable (1024px)
      rerender(<IframePreview device="laptop" title="preview-m4-l" />);
      iframe = container.querySelector('iframe');
      expect(iframe.style.width).toBe('1024px');

      // Palier XL : Grand Écran (100%)
      rerender(<IframePreview device="desktop" title="preview-m4-xl" />);
      iframe = container.querySelector('iframe');
      expect(iframe.style.width).toBe('100%');
    });

    test('M4-2: Sélecteur de terminaux à 4 paliers dans la toolbar de PageBuilder avec accessibilité stricte', async () => {
      const mockPage = {
        id: 'p_devices_test',
        title: 'Page Test Paliers',
        slug: 'paliers-test',
        blocks: [
          {
            id: 'sec_1',
            type: 'section',
            children: [
              {
                id: 'h_1',
                type: 'heading',
                settings: { content: 'Titre Paliers M4' }
              }
            ]
          }
        ]
      };

      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([mockPage]);
      });

      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      await screen.findByText('Titre Paliers M4');

      // Vérification des 4 boutons de terminaux avec leurs étiquettes d'accessibilité sans conflit
      const desktopBtn = screen.getByRole('button', { name: /Vue Ordinateur/i });
      const laptopBtn = screen.getByRole('button', { name: /Vue Portable/i });
      const tabletBtn = screen.getByRole('button', { name: /Vue Tablette/i });
      const mobileBtn = screen.getByRole('button', { name: /Vue Mobile/i });

      expect(desktopBtn).toBeInTheDocument();
      expect(laptopBtn).toBeInTheDocument();
      expect(tabletBtn).toBeInTheDocument();
      expect(mobileBtn).toBeInTheDocument();

      // Clics successifs sur les 4 terminaux
      fireEvent.click(laptopBtn);
      fireEvent.click(tabletBtn);
      fireEvent.click(mobileBtn);
      fireEvent.click(desktopBtn);
    });

    test('M4-3: BuilderCanvas applique les classes et largeurs maximales pour S, M, L, XL', () => {
      // Laptop (1024px)
      const { container, rerender } = render(
        <BuilderCanvas blocks={[]} device="laptop" pageSlug="test-laptop" />
      );
      const canvasWrapper = container.querySelector('.pb-canvas-wrapper');
      expect(canvasWrapper).toHaveClass('pb-canvas-laptop');
      expect(canvasWrapper.style.maxWidth).toBe('1024px');

      // Tablette (768px)
      rerender(<BuilderCanvas blocks={[]} device="tablet" pageSlug="test-tablet" />);
      expect(canvasWrapper).toHaveClass('pb-canvas-tablet');
      expect(canvasWrapper.style.maxWidth).toBe('768px');

      // Mobile (390px)
      rerender(<BuilderCanvas blocks={[]} device="mobile" pageSlug="test-mobile" />);
      expect(canvasWrapper).toHaveClass('pb-canvas-mobile');
      expect(canvasWrapper.style.maxWidth).toBe('390px');

      // Desktop (1200px)
      rerender(<BuilderCanvas blocks={[]} device="desktop" pageSlug="test-desktop" />);
      expect(canvasWrapper).toHaveClass('pb-canvas-desktop');
      expect(canvasWrapper.style.maxWidth).toBe('1200px');
    });

    test('M4-4: BuilderSettings permet de configurer le padding général et granulaire ainsi que les marges', () => {
      const mockOnChange = jest.fn();
      const testBlock = {
        id: 'block_spacing_test',
        type: 'heading',
        settings: {
          content: 'Titre Espacement',
          style: {
            padding: '16px',
            paddingTop: '16px',
            paddingBottom: '16px',
            paddingLeft: '16px',
            paddingRight: '16px'
          }
        }
      };

      render(<BuilderSettings block={testBlock} onChange={mockOnChange} />);

      // 1. Champ de padding général
      const paddingInput = screen.getByLabelText(/Espacement intérieur \(Padding\)/i);
      expect(paddingInput).toBeInTheDocument();
      fireEvent.change(paddingInput, { target: { value: '24px' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        'block_spacing_test',
        expect.objectContaining({
          style: expect.objectContaining({
            padding: '24px',
            paddingTop: '24px',
            paddingBottom: '24px',
            paddingLeft: '24px',
            paddingRight: '24px'
          })
        })
      );

      // 2. Marge extérieure haute
      const marginTopInput = screen.getByLabelText(/Marge Haute \(Top\)/i);
      fireEvent.change(marginTopInput, { target: { value: '30px' } });
      expect(mockOnChange).toHaveBeenCalledWith(
        'block_spacing_test',
        expect.objectContaining({
          style: expect.objectContaining({
            marginTop: '30px'
          })
        })
      );
    });

    test('M4-5: BuilderSettings propose la personnalisation des bordures, styles et rayons d\'arrondi', () => {
      const mockOnChange = jest.fn();
      const testBlock = {
        id: 'block_border_test',
        type: 'card',
        settings: {
          title: 'Carte Bordure',
          text: 'Description',
          style: {
            borderStyle: 'none',
            borderRadius: '8px'
          }
        }
      };

      const { rerender } = render(<BuilderSettings block={testBlock} onChange={mockOnChange} />);

      // 1. Style de bordure
      const borderStyleSelect = screen.getByLabelText(/Style de bordure/i);
      expect(borderStyleSelect).toBeInTheDocument();
      fireEvent.change(borderStyleSelect, { target: { value: 'dashed' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        'block_border_test',
        expect.objectContaining({
          style: expect.objectContaining({
            borderStyle: 'dashed'
          })
        })
      );

      // 2. Épaisseur et couleur si bordure active
      const blockWithDashed = {
        ...testBlock,
        settings: {
          ...testBlock.settings,
          style: { borderStyle: 'dashed', borderWidth: '2px', borderColor: '#004b7a' }
        }
      };
      rerender(<BuilderSettings block={blockWithDashed} onChange={mockOnChange} />);

      const borderWidthInput = screen.getByLabelText(/Épaisseur/i);
      fireEvent.change(borderWidthInput, { target: { value: '4px' } });
      expect(mockOnChange).toHaveBeenCalledWith(
        'block_border_test',
        expect.objectContaining({
          style: expect.objectContaining({
            borderWidth: '4px'
          })
        })
      );

      // 3. Bouton raccourci Pilule pour le border-radius
      const piluleBtn = screen.getByRole('button', { name: /Pilule/i });
      fireEvent.click(piluleBtn);
      expect(mockOnChange).toHaveBeenCalledWith(
        'block_border_test',
        expect.objectContaining({
          style: expect.objectContaining({
            borderRadius: '9999px'
          })
        })
      );
    });

    test('M4-6: BuilderSettings gère les presets et résolutions d\'ombres portées (Box Shadow)', () => {
      const mockOnChange = jest.fn();
      const testBlock = {
        id: 'block_shadow_test',
        type: 'heading',
        settings: {
          content: 'Titre Ombre',
          style: {
            boxShadow: 'none'
          }
        }
      };

      render(<BuilderSettings block={testBlock} onChange={mockOnChange} />);

      const shadowSelect = screen.getByLabelText(/Ombre portée/i);
      expect(shadowSelect).toBeInTheDocument();

      // Sélection ombre moyenne
      fireEvent.change(shadowSelect, { target: { value: 'medium' } });
      expect(mockOnChange).toHaveBeenCalledWith(
        'block_shadow_test',
        expect.objectContaining({
          style: expect.objectContaining({
            boxShadow: SHADOW_PRESETS.medium
          })
        })
      );

      // Sélection ombre Bleu Loire
      fireEvent.change(shadowSelect, { target: { value: 'anjou' } });
      expect(mockOnChange).toHaveBeenCalledWith(
        'block_shadow_test',
        expect.objectContaining({
          style: expect.objectContaining({
            boxShadow: SHADOW_PRESETS.anjou
          })
        })
      );

      // Test des fonctions de résolution
      expect(resolveShadowValue('none')).toBe('none');
      expect(resolveShadowValue(SHADOW_PRESETS.light)).toBe('light');
      expect(resolveShadowValue(SHADOW_PRESETS.medium)).toBe('medium');
      expect(resolveShadowValue(SHADOW_PRESETS.large)).toBe('large');
      expect(resolveShadowValue(SHADOW_PRESETS.anjou)).toBe('anjou');
      expect(resolveShadowValue('0 20px 20px rgba(0,0,0,0.5)')).toBe('custom');
    });

    test('M4-7: Nuancier rapide officiel Anjou Édition propose les 17 teintes certifiées pour fond et texte', () => {
      expect(Array.isArray(ANJOU_EDITION_PALETTE)).toBe(true);
      expect(ANJOU_EDITION_PALETTE.length).toBe(17);

      const bleuArdoise = ANJOU_EDITION_PALETTE.find(c => c.value.toLowerCase() === '#004b7a');
      expect(bleuArdoise).toBeDefined();

      const mockOnChange = jest.fn();
      const testBlock = {
        id: 'block_palette_test',
        type: 'heading',
        settings: {
          content: 'Titre Nuancier',
          style: {
            backgroundColor: '',
            color: ''
          }
        }
      };

      render(<BuilderSettings block={testBlock} onChange={mockOnChange} />);

      // Clic sur la pastille Bleu Ardoise #004b7a en mode fond
      const anjouSwatch = screen.getByTitle(/#004b7a/i);
      expect(anjouSwatch).toBeInTheDocument();
      fireEvent.click(anjouSwatch);

      expect(mockOnChange).toHaveBeenCalledWith(
        'block_palette_test',
        expect.objectContaining({
          style: expect.objectContaining({
            backgroundColor: '#004b7a'
          })
        })
      );

      // Basculer la cible sur Texte
      const textTargetBtn = screen.getByRole('button', { name: /✍️ Texte|^Texte$/i });
      fireEvent.click(textTargetBtn);

      // Clic sur la pastille #004b7a en mode texte
      fireEvent.click(anjouSwatch);
      expect(mockOnChange).toHaveBeenCalledWith(
        'block_palette_test',
        expect.objectContaining({
          style: expect.objectContaining({
            color: '#004b7a'
          })
        })
      );
    });

    test('M4-8: BuilderSettings permet d\'activer sélectivement le masquage responsive (hideOnMobile, hideOnTablet, hideOnDesktop)', () => {
      const mockOnChange = jest.fn();
      const testBlock = {
        id: 'block_vis_test',
        type: 'text',
        settings: {
          content: '<p>Contenu test</p>',
          hideOnMobile: false,
          hideOnTablet: false,
          hideOnDesktop: false
        }
      };

      render(<BuilderSettings block={testBlock} onChange={mockOnChange} />);

      // 1. Masquer sur mobile
      const chkMobile = screen.getByLabelText(/Masquer sur mobile/i);
      fireEvent.click(chkMobile);
      expect(mockOnChange).toHaveBeenCalledWith(
        'block_vis_test',
        expect.objectContaining({
          hideOnMobile: true
        })
      );

      // 2. Masquer sur tablette
      const chkTablet = screen.getByLabelText(/Masquer sur tablette/i);
      fireEvent.click(chkTablet);
      expect(mockOnChange).toHaveBeenCalledWith(
        'block_vis_test',
        expect.objectContaining({
          hideOnTablet: true
        })
      );

      // 3. Masquer sur ordinateur
      const chkDesktop = screen.getByLabelText(/Masquer sur ordinateur/i);
      fireEvent.click(chkDesktop);
      expect(mockOnChange).toHaveBeenCalledWith(
        'block_vis_test',
        expect.objectContaining({
          hideOnDesktop: true
        })
      );
    });

    test('M4-9: Bloc Galerie Photos (photoGallery) gère la liste dynamique d\'images et leur réorganisation', () => {
      const mockOnChange = jest.fn();
      const galleryBlock = {
        id: 'gallery_test',
        type: 'photoGallery',
        settings: {
          title: 'Ma Galerie Photo',
          subtitle: 'Description photo',
          layout: 'grid',
          images: [
            { id: 'img_1', url: 'https://example.com/p1.jpg', title: 'Première Photo' },
            { id: 'img_2', url: 'https://example.com/p2.jpg', title: 'Deuxième Photo' }
          ]
        }
      };

      render(<BuilderSettings block={galleryBlock} onChange={mockOnChange} />);

      // Vérifier les titres des photos
      expect(screen.getByDisplayValue('Première Photo')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Deuxième Photo')).toBeInTheDocument();

      // Bouton pour monter la deuxième photo
      const moveUpBtn = screen.getByRole('button', { name: /Monter la photo 2/i });
      fireEvent.click(moveUpBtn);

      expect(mockOnChange).toHaveBeenCalledWith(
        'gallery_test',
        expect.objectContaining({
          images: [
            expect.objectContaining({ id: 'img_2' }),
            expect.objectContaining({ id: 'img_1' })
          ]
        })
      );

      // Bouton supprimer la première photo
      const deletePhotoBtn = screen.getByRole('button', { name: /Supprimer la photo 1/i });
      fireEvent.click(deletePhotoBtn);

      expect(mockOnChange).toHaveBeenCalledWith(
        'gallery_test',
        expect.objectContaining({
          images: [
            expect.objectContaining({ id: 'img_2' })
          ]
        })
      );
    });

    test('M4-10: Bloc Carte (card) dispose d\'un bouton pour retirer l\'image', () => {
      const mockOnChange = jest.fn();
      const cardBlock = {
        id: 'card_test',
        type: 'card',
        settings: {
          title: 'Carte Littéraire',
          text: 'Description littéraire',
          image: 'https://example.com/illustration.jpg'
        }
      };

      render(<BuilderSettings block={cardBlock} onChange={mockOnChange} />);

      const removeImageBtn = screen.getByRole('button', { name: /Retirer l'image de la carte/i });
      expect(removeImageBtn).toBeInTheDocument();

      fireEvent.click(removeImageBtn);
      expect(mockOnChange).toHaveBeenCalledWith(
        'card_test',
        expect.objectContaining({
          image: ''
        })
      );
    });

    test('M4-11: VideoBlockSettings reconnaît les fichiers vidéo directs sans fausse erreur YouTube', () => {
      const mockOnChange = jest.fn();
      const videoBlock = {
        id: 'video_test',
        type: 'video',
        settings: {
          url: 'https://example.com/creations/film-inedit.mp4',
          videoId: ''
        }
      };

      render(<BuilderSettings block={videoBlock} onChange={mockOnChange} />);

      // Le badge "Fichier Direct" doit être visible
      expect(screen.getByText('Fichier Direct')).toBeInTheDocument();
      // Le message d'erreur YouTube ne doit PAS être affiché
      expect(screen.queryByText(/Lien vidéo non valide/i)).not.toBeInTheDocument();
    });

    test('M4-12: Règle Fondamentale d\'Identité — Absence de contenu historique ou patrimonial auto-généré', () => {
      // Vérifier que la palette et les réglages utilisent exclusivement des termes neutres
      ANJOU_EDITION_PALETTE.forEach(color => {
        expect(color.label).not.toMatch(/Plantagenêt|Château d'Angers|Généalogie|Cité Médiévale/i);
      });
    });

  });
});


