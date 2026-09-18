import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PageBuilder from './PageBuilder';
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

  test('getDefaultHomepageBlocks provides all standard editable sections', () => {
    const homeBlocks = getDefaultHomepageBlocks();
    expect(homeBlocks.length).toBeGreaterThanOrEqual(1);
    
    const hasFlipbook = homeBlocks.some(b => 
      b.type === 'flipbookFeatured' || 
      (b.children && b.children.some(c => c.type === 'flipbookFeatured' || (c.children && c.children.some(d => d.type === 'flipbookFeatured'))))
    );
    expect(hasFlipbook).toBe(true);
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

    jest.spyOn(pageService, 'getPages').mockResolvedValue([mockPage]);

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
    jest.spyOn(pageService, 'getPages').mockResolvedValue([mockPage]);

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

    jest.spyOn(pageService, 'getPages').mockResolvedValue([initialVideoPage]);

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
    const saveBtn = screen.getByRole('button', { name: /Mettre à jour|Publier/i });
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
    jest.spyOn(pageService, 'getPages').mockResolvedValue([persistedPage]);

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

    jest.spyOn(pageService, 'getPages').mockResolvedValue([mockPage]);

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
});
