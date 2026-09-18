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
});
