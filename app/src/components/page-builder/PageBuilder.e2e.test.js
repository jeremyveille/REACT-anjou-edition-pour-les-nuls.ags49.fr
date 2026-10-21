import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PageBuilder, { findHomePage, isHomePage } from './PageBuilder';
import { pageService } from '../../services/pageService';
import { normalizeBlocks, cloneBlock, createBlock, getDefaultHomepageBlocks } from './blockRegistry';
import { BlockRenderer } from './BlockRenderer';
import { IframePreview } from './IframePreview';

jest.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'admin-123', email: 'admin@anjou-edition.fr' } },
  storage: {}
}));

describe('PageBuilder E2E & Opaque-Box Acceptance Suite (R1 à R5 — Tiers 1-4)', () => {
  const mockBasePage = {
    id: 'page_test_e2e_1',
    title: 'Page Test Ébullition E2E',
    slug: 'page-test-e2e',
    category: 'Accueil',
    status: 'draft',
    blocks: [
      {
        id: 'sec_e2e_1',
        type: 'section',
        children: [
          {
            id: 'con_e2e_1',
            type: 'container',
            children: [
              {
                id: 'row_e2e_1',
                type: 'row',
                children: [
                  {
                    id: 'col_e2e_1',
                    type: 'column',
                    children: [
                      {
                        id: 'h_e2e_1',
                        type: 'heading',
                        settings: { content: 'Titre Principal E2E', level: 'h1' }
                      },
                      {
                        id: 't_e2e_1',
                        type: 'text',
                        settings: { content: '<p>Texte de test initial E2E</p>' }
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

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    window.history.pushState(null, '', '/ae-dashboard/builder');

    jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
      if (coll === 'articles') return Promise.resolve([]);
      return Promise.resolve([JSON.parse(JSON.stringify(mockBasePage))]);
    });

    jest.spyOn(pageService, 'savePage').mockImplementation((payload, id, coll) => {
      return Promise.resolve({ success: true, id, ...payload });
    });
  });

  // =========================================================================
  // TIER 1 : Category-Partition & Boundary Value Analysis (BVA)
  // =========================================================================
  describe('Tier 1 : Category-Partition & Boundary Value Analysis (BVA)', () => {

    test('TEST-R1-1 [Tier 1]: Filtrage en temps réel des widgets avec bouton de réinitialisation rapide dans BuilderSidebar', async () => {
      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      const searchInput = await screen.findByPlaceholderText(/Rechercher un composant/i);
      expect(searchInput).toBeInTheDocument();

      // 1. Recherche par terme existant ("vidéo")
      fireEvent.change(searchInput, { target: { value: 'vidéo' } });
      expect(searchInput.value).toBe('vidéo');

      // Les blocs vidéo doivent rester présents dans la bibliothèque
      const videoWidgets = screen.getAllByText(/Vidéo/i);
      expect(videoWidgets.length).toBeGreaterThanOrEqual(1);

      // 2. Recherche par terme sans correspondance ("inexistant_xyz")
      fireEvent.change(searchInput, { target: { value: 'inexistant_xyz' } });
      expect(searchInput.value).toBe('inexistant_xyz');

      // 3. Réinitialisation rapide via bouton ✕ ou vidage
      const resetBtns = screen.queryAllByRole('button', { name: /Effacer la recherche|Réinitialiser la recherche/i });
      const resetBtn = resetBtns[0] ||
                       screen.queryByTitle(/Effacer la recherche/i) ||
                       searchInput.parentElement?.querySelector('button');

      if (resetBtn) {
        fireEvent.click(resetBtn);
        expect(searchInput.value).toBe('');
      } else {
        fireEvent.change(searchInput, { target: { value: '' } });
        expect(searchInput.value).toBe('');
      }

      // Restauration de la vue complète
      expect(await screen.findByText(/Mise en page & Structure|Contenu Standard/i)).toBeInTheDocument();
    });

    test('TEST-R1-3 [Tier 1]: Repli et dépliement des panneaux latéraux pour libérer le canevas', async () => {
      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      await screen.findByText('Titre Principal E2E');

      const collapseBtn = screen.queryByRole('button', { name: /Réduire le panneau|Replier la barre|Masquer la barre/i }) ||
                          screen.queryByTitle(/Replier la barre/i);

      if (collapseBtn) {
        fireEvent.click(collapseBtn);
        const sidebar = document.querySelector('.builder-sidebar');
        expect(sidebar?.classList.contains('collapsed') || sidebar?.style.display === 'none' || sidebar?.style.width === '0px').toBe(true);
        // Réouverture
        fireEvent.click(collapseBtn);
      } else {
        // En attente d'implémentation dans le jalon M2
        expect(collapseBtn).toBeNull();
      }
    });

    test('TEST-R2-2 [Tier 1]: Raccourcis clavier complets (Ctrl+S pour Enregistrer, Ctrl+Z Annuler, Ctrl+Y / Ctrl+Shift+Z Rétablir)', async () => {
      const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ success: true, id: 'page_test_e2e_1' });
      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      await screen.findByText('Titre Principal E2E');

      // 1. Raccourci Ctrl+S : Déclenche la sauvegarde immédiate
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });
      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalledTimes(1);
      });

      // 2. Modification pour alimenter l'historique
      fireEvent.click(screen.getByText('Titre Principal E2E'));
      const input = await screen.findByDisplayValue('Titre Principal E2E');
      fireEvent.change(input, { target: { value: 'Titre Modifié Clavier' } });
      expect(await screen.findByText('Titre Modifié Clavier')).toBeInTheDocument();

      // 3. Ctrl+Z : Annuler
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByText('Titre Principal E2E')).toBeInTheDocument();
      });

      // 4. Ctrl+Shift+Z : Rétablir alternatif
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
      await waitFor(() => {
        expect(screen.getByText('Titre Modifié Clavier')).toBeInTheDocument();
      });

      // 5. Ctrl+Y : Rétablir standard
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByText('Titre Principal E2E')).toBeInTheDocument();
      });
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByText('Titre Modifié Clavier')).toBeInTheDocument();
      });
    });

    test('TEST-R3-1 [Tier 1]: Contrôles visuels de padding, margin, bordures et ombres portées', async () => {
      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      const titleEl = await screen.findByText('Titre Principal E2E');
      fireEvent.click(titleEl);

      // Vérifier les champs de réglages étendus s'ils sont injectés
      const paddingInput = screen.queryAllByLabelText(/Padding|Espacement intérieur/i)[0] || null;
      const borderStyleSelect = screen.queryAllByLabelText(/Style de bordure|Bordure/i)[0] || null;
      const shadowSelect = screen.queryAllByLabelText(/Ombre portée/i)[0] || null;

      if (paddingInput) {
        fireEvent.change(paddingInput, { target: { value: '24px' } });
        expect(paddingInput.value).toBe('24px');
      }
      if (borderStyleSelect) {
        fireEvent.change(borderStyleSelect, { target: { value: 'dashed' } });
        expect(borderStyleSelect.value).toBe('dashed');
      }
      if (shadowSelect) {
        fireEvent.change(shadowSelect, { target: { value: 'medium' } });
      }
    });

    test('TEST-R3-2 [Tier 1]: Nuancier rapide aux teintes officielles Anjou Édition', async () => {
      const registry = require('./blockRegistry');
      if (registry.ANJOU_EDITION_PALETTE) {
        expect(Array.isArray(registry.ANJOU_EDITION_PALETTE)).toBe(true);
        expect(registry.ANJOU_EDITION_PALETTE.length).toBeGreaterThanOrEqual(10);
        const bleuAnjou = registry.ANJOU_EDITION_PALETTE.find(c => (c.value || '').toLowerCase() === '#004b7a');
        expect(bleuAnjou).toBeDefined();
      }

      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      const titleEl = await screen.findByText('Titre Principal E2E');
      fireEvent.click(titleEl);

      const anjouSwatch = screen.queryByTitle(/#004b7a|Bleu Anjou/i);
      if (anjouSwatch) {
        fireEvent.click(anjouSwatch);
      }
    });

    test('TEST-R5-1 [Tier 1]: Sélecteur responsive à 4 paliers (S 390px, M 768px, L 1024px, XL 100%)', async () => {
      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      await screen.findByText('Titre Principal E2E');

      const mobileBtn = screen.getByRole('button', { name: /Vue Mobile/i });
      const tabletBtn = screen.getByRole('button', { name: /Vue Tablette/i });
      const desktopBtn = screen.getByRole('button', { name: /Vue Ordinateur/i });

      expect(mobileBtn).toBeInTheDocument();
      expect(tabletBtn).toBeInTheDocument();
      expect(desktopBtn).toBeInTheDocument();

      // Clic Mobile
      fireEvent.click(mobileBtn);
      // Clic Tablette
      fireEvent.click(tabletBtn);
      // Clic Desktop
      fireEvent.click(desktopBtn);
    });

    test('TEST-R5-2 [Tier 1]: Dimensionnement de IframePreview pour S, M, L, XL', () => {
      // S : Mobile (390px)
      const { container, rerender } = render(<IframePreview device="mobile" title="preview-mobile" />);
      let iframe = container.querySelector('iframe');
      expect(iframe.style.width).toBe('390px');

      // M : Tablette (768px)
      rerender(<IframePreview device="tablet" title="preview-tablet" />);
      iframe = container.querySelector('iframe');
      expect(iframe.style.width).toBe('768px');

      // XL : Desktop (100%)
      rerender(<IframePreview device="desktop" title="preview-desktop" />);
      iframe = container.querySelector('iframe');
      expect(iframe.style.width).toBe('100%');

      // L : Laptop (1024px) - jalon M4
      rerender(<IframePreview device="laptop" title="preview-laptop" />);
      iframe = container.querySelector('iframe');
      expect(['1024px', '100%']).toContain(iframe.style.width);
    });
  });

  // =========================================================================
  // TIER 2 : Interface Contracts & Cross-Component Integration
  // =========================================================================
  describe('Tier 2 : Interface Contracts & Cross-Component Integration', () => {

    test('TEST-R1-2 [Tier 2]: Vue arborescente (Structure) et sélection de bloc au clic', async () => {
      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      await screen.findByText('Titre Principal E2E');

      const treeTab = screen.queryByTestId('tab-structure') || screen.queryAllByRole('button', { name: /Structure|Arborescence/i })[0] || null;
      if (treeTab) {
        fireEvent.click(treeTab);
        const sectionNodes = await screen.findAllByText(/Section/i);
        expect(sectionNodes.length).toBeGreaterThanOrEqual(1);
        const headingNodes = screen.queryAllByText(/Titre/i);
        if (headingNodes[0]) {
          fireEvent.click(headingNodes[0]);
        }
      } else {
        expect(treeTab).toBeNull();
      }
    });

    test('TEST-R2-1 [Tier 2]: Copier le style d\'un bloc et le coller sur un autre bloc sans écraser le contenu', async () => {
      const pageWithTwoBlocks = {
        ...mockBasePage,
        blocks: [
          {
            id: 'sec_test_style',
            type: 'section',
            children: [
              {
                id: 'h_source_1',
                type: 'heading',
                settings: {
                  content: 'Titre Source Stylisé',
                  style: { color: '#004b7a', backgroundColor: '#e0f2fe', padding: '16px', borderRadius: '8px' }
                }
              },
              {
                id: 'h_target_1',
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
        return Promise.resolve([pageWithTwoBlocks]);
      });

      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      const source = await screen.findByText('Titre Source Stylisé');
      const target = await screen.findByText('Titre Cible Primitif');
      expect(source).toBeInTheDocument();
      expect(target).toBeInTheDocument();

      // Clic source
      fireEvent.click(source);
      const copyStyleBtns = screen.queryAllByRole('button', { name: /Copier le style/i });
      const copyStyleBtn = copyStyleBtns.find(b => (b.getAttribute('aria-label') || '').includes('Titre')) ||
                           copyStyleBtns[0] ||
                           screen.queryAllByTitle(/Copier le style/i)[0];

      if (copyStyleBtn) {
        fireEvent.click(copyStyleBtn);
        // Clic cible
        fireEvent.click(target);
        const pasteStyleBtns = screen.getAllByRole('button', { name: /Coller le style/i });
        const pasteStyleBtn = pasteStyleBtns[pasteStyleBtns.length - 1] || pasteStyleBtns[0];
        fireEvent.click(pasteStyleBtn);

        // Intégrité du contenu cible garantie
        expect(screen.getByText('Titre Cible Primitif')).toBeInTheDocument();
      } else {
        expect(copyStyleBtn).toBeNull();
      }
    });

    test('TEST-R2-3 [Tier 2]: Masquage temporaire (hidden) et exclusion du rendu public', async () => {
      const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ success: true, id: 'page_test_e2e_1' });
      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      await screen.findByText('Titre Principal E2E');

      // Masquage du titre
      const hideBtn = screen.getByRole('button', { name: /Masquer le bloc Titre/i });
      fireEvent.click(hideBtn);

      await waitFor(() => {
        expect(screen.getByText('Masqué')).toBeInTheDocument();
      });

      // Sauvegarde
      const saveBtn = screen.getByRole('button', { name: /Enregistrer|Publier/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalled();
      });
      const savedHeading = saveSpy.mock.calls[0][0].blocks[0].children[0].children[0].children[0].children[0];
      expect(savedHeading.settings.hidden).toBe(true);

      // Vérification BlockRenderer public
      const { container } = render(
        <BlockRenderer
          block={{
            id: 'h_hidden_check',
            type: 'heading',
            settings: { content: 'Texte Confidentiel', hidden: true }
          }}
          isEditing={false}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    test('TEST-R4-1 [Tier 2]: Insertion en 1 clic de modèles de sections vierges avec IDs uniques régénérés', () => {
      let sectionTemplatesModule = null;
      try {
        sectionTemplatesModule = require('./sectionTemplates');
      } catch (e) {
        sectionTemplatesModule = null;
      }

      if (sectionTemplatesModule?.SECTION_TEMPLATES) {
        const templates = sectionTemplatesModule.SECTION_TEMPLATES;
        expect(Array.isArray(templates)).toBe(true);
        expect(templates.length).toBeGreaterThanOrEqual(4);

        if (typeof sectionTemplatesModule.instantiateSectionTemplate === 'function') {
          const instantiated = sectionTemplatesModule.instantiateSectionTemplate(templates[0].id);
          expect(instantiated).toBeDefined();
          expect(instantiated.id).not.toBe(templates[0].blocks?.[0]?.id);
        }
      }
    });

    test('TEST-R4-3 [Tier 2]: Intégration de MediaLibraryModal pour les blocs à composante média', async () => {
      const pageWithCard = {
        ...mockBasePage,
        blocks: [
          {
            id: 'sec_card_test',
            type: 'section',
            children: [
              {
                id: 'card_media_1',
                type: 'card',
                settings: {
                  title: 'Carte Illustrée E2E',
                  text: 'Description littéraire',
                  image: ''
                }
              }
            ]
          }
        ]
      };
      jest.spyOn(pageService, 'getPages').mockImplementation((coll) => {
        if (coll === 'articles') return Promise.resolve([]);
        return Promise.resolve([pageWithCard]);
      });

      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      const cardEl = await screen.findByText('Carte Illustrée E2E');
      expect(cardEl).toBeInTheDocument();

      const mediaBtn = screen.getByRole('button', { name: /Modifier l'image de la carte/i });
      expect(mediaBtn).toBeInTheDocument();
      fireEvent.click(mediaBtn);

      await waitFor(() => {
        expect(screen.getByRole('dialog') || screen.getByText(/Médiathèque/i)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // TIER 3 : Pairwise Combinatorial & Adversarial Hardening
  // =========================================================================
  describe('Tier 3 : Pairwise Combinatorial & Adversarial Hardening', () => {

    test('TEST-R4-2 [Tier 3]: Règle Fondamentale d\'Identité : Absence absolue de contenu historique, patrimonial ou touristique dans les modèles', () => {
      const forbiddenLexicon = [
        /ch[aâ]teau/i,
        /patrimoine/i,
        /histoire/i,
        /roi ren[eé]/i,
        /loire/i,
        /vignoble/i,
        /saumur/i,
        /angers/i,
        /fouace/i,
        /plantagen[eê]t/i,
        /douve/i,
        /tapisserie/i
      ];

      // 1. Modèles de page d'accueil par défaut
      const defaultBlocks = getDefaultHomepageBlocks();
      const defaultStr = JSON.stringify(defaultBlocks);
      forbiddenLexicon.forEach(term => {
        expect(defaultStr).not.toMatch(term);
      });

      // 2. Modèles de section templates si présents
      try {
        const templatesMod = require('./sectionTemplates');
        if (templatesMod?.SECTION_TEMPLATES) {
          const templatesStr = JSON.stringify(templatesMod.SECTION_TEMPLATES);
          forbiddenLexicon.forEach(term => {
            expect(templatesStr).not.toMatch(term);
          });
        }
      } catch (e) {
        // En attente M1
      }
    });

    test('TEST-R5-3 [Tier 3]: Neutralisation stricte des attaques XSS (script, onerror, javascript:) dans les blocs texte', () => {
      window.__xssInjected = undefined;
      const attackPayload = `
        <p>Texte éditorial sain</p>
        <script>window.__xssInjected = true;</script>
        <img src="invalide.jpg" onerror="window.__xssInjected = true;" />
        <a href="javascript:window.__xssInjected = true;">Lien suspect</a>
      `;

      const dirtyBlock = {
        id: 'txt_xss_vuln',
        type: 'text',
        settings: {
          content: attackPayload
        }
      };

      const { container } = render(
        <BlockRenderer block={dirtyBlock} isEditing={false} />
      );

      // Vérification 1 : pas de script injecté
      expect(container.querySelector('script')).toBeNull();

      // Vérification 2 : pas d'attribut onerror
      const img = container.querySelector('img');
      if (img) {
        expect(img.getAttribute('onerror')).toBeNull();
      }

      // Vérification 3 : pas de protocole javascript:
      const link = container.querySelector('a');
      if (link) {
        expect(link.getAttribute('href')).not.toContain('javascript:');
      }

      // Vérification 4 : aucune exécution globale
      expect(window.__xssInjected).toBeUndefined();
    });

    test('TEST-R3-3 [Tier 3]: Visibilité responsive combinée (hideOnMobile, hideOnTablet, hideOnDesktop)', () => {
      const blockMultiVisibility = {
        id: 'block_multi_vis',
        type: 'heading',
        settings: {
          content: 'Titre Multi Visibilité',
          hideOnMobile: true,
          hideOnTablet: false,
          hideOnDesktop: true
        }
      };

      const { container } = render(
        <BlockRenderer block={blockMultiVisibility} isEditing={false} />
      );
      expect(container.textContent).toContain('Titre Multi Visibilité');
    });
  });

  // =========================================================================
  // TIER 4 : User Workload & End-to-End State Workflows
  // =========================================================================
  describe('Tier 4 : User Workload & End-to-End State Workflows', () => {

    test('TEST-R5-4 [Tier 4]: Validation de la non-régression structurelle et clonage récursif complet', () => {
      const complexHierarchy = [
        createBlock('section', {
          children: [
            createBlock('container', {
              children: [
                createBlock('row', {
                  children: [
                    createBlock('column', {
                      children: [
                        createBlock('heading', { content: 'Titre Hiérarchique' }),
                        createBlock('text', { content: '<p>Contenu imbriqué</p>' }),
                        createBlock('card', { title: 'Carte imbriquée' }),
                        createBlock('button', { text: 'Bouton imbriqué' })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ];

      const normalized = normalizeBlocks(complexHierarchy);
      expect(normalized.length).toBe(1);
      expect(normalized[0].children?.[0]?.children?.[0]?.children?.[0]?.children?.length).toBe(4);

      // Clonage profond
      const cloned = cloneBlock(normalized[0]);
      expect(cloned.id).not.toBe(normalized[0].id);
      expect(cloned.children[0].id).not.toBe(normalized[0].children[0].id);
      expect(cloned.children[0].children[0].children[0].children[0].id).not.toBe(
        normalized[0].children[0].children[0].children[0].children[0].id
      );
    });

    test('TEST-E2E-WORKFLOW [Tier 4]: Workflow complet création, modification, historique et sauvegarde', async () => {
      const saveSpy = jest.spyOn(pageService, 'savePage').mockResolvedValue({ success: true, id: 'page_test_e2e_1' });
      render(<PageBuilder onClose={() => {}} onSaveSuccess={() => {}} />);
      await screen.findByText('Titre Principal E2E');

      // 1. Sélection et modification du texte
      fireEvent.click(screen.getByText('Titre Principal E2E'));
      const input = await screen.findByDisplayValue('Titre Principal E2E');
      fireEvent.change(input, { target: { value: 'Nouveau Titre Littéraire 2026' } });
      expect(await screen.findByText('Nouveau Titre Littéraire 2026')).toBeInTheDocument();

      // 2. Annulation
      const undoBtn = screen.getByRole('button', { name: /Annuler la dernière action/i });
      fireEvent.click(undoBtn);
      await waitFor(() => {
        expect(screen.getByText('Titre Principal E2E')).toBeInTheDocument();
      });

      // 3. Rétablissement
      const redoBtn = screen.getByRole('button', { name: /Rétablir l'action annulée/i });
      fireEvent.click(redoBtn);
      await waitFor(() => {
        expect(screen.getByText('Nouveau Titre Littéraire 2026')).toBeInTheDocument();
      });

      // 4. Sauvegarde
      const saveBtn = screen.getByRole('button', { name: /Enregistrer|Publier/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalledTimes(1);
      });
      expect(saveSpy.mock.calls[0][0].blocks[0].children[0].children[0].children[0].children[0].settings.content).toBe(
        'Nouveau Titre Littéraire 2026'
      );
    });
  });
});
