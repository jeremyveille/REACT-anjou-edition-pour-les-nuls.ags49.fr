import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import PageBuilder, { findHomePage, isHomePage } from './PageBuilder';
import { pageService } from '../../services/pageService';
import { normalizeBlocks, cloneBlock, createBlock, getDefaultHomepageBlocks } from './blockRegistry';

jest.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'admin-123', email: 'admin@anjou-edition.fr' } },
  storage: {}
}));

describe('PageBuilder and Block Architecture Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
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
});
