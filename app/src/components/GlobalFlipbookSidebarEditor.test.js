import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalFlipbookSidebarEditor from './GlobalFlipbookSidebarEditor';
import { DEFAULT_GLOBAL_SIDEBAR } from '../services/flipbookSidebarService';

describe('GlobalFlipbookSidebarEditor Component Tests', () => {
  const mockFlipbooks = [
    {
      id: 'fb-1',
      title: 'Recueil de Poésies',
      category: 'Poésies',
      pdfFile: 'poesies.pdf',
      pages: [{ pageNum: 1, title: 'Page 1', content: 'Texte' }]
    },
    {
      id: 'fb-2',
      title: 'Nouvelles d’Anjou',
      category: 'Nouvelles',
      pdfFile: 'nouvelles.pdf',
      pages: [{ pageNum: 1, title: 'Page 1', content: 'Texte' }]
    }
  ];

  test('renders global editor header, title, badges, and tabs', () => {
    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
      />
    );

    expect(screen.getByText('Modèle global — Anjou Édition')).toBeInTheDocument();
    expect(screen.getByText('Modèle global actif')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enregistrer le modèle global/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Appliquer le modèle global à tous/i })).toBeInTheDocument();

    // Verify 3 tabs
    expect(screen.getByRole('tab', { name: /Contenu des barres/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Apparence, Styles & Visibilité/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Prévisualisation en direct/i })).toBeInTheDocument();
  });

  test('switches between Contenu, Apparence/Styles, and Prévisualisation tabs', () => {
    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
      />
    );

    // Initial tab is content
    expect(screen.getByTestId('admin-column-left')).toBeInTheDocument();
    expect(screen.getByTestId('admin-column-right')).toBeInTheDocument();

    // Switch to Styles & Apparence
    const stylesTab = screen.getByRole('tab', { name: /Apparence, Styles & Visibilité/i });
    fireEvent.click(stylesTab);

    expect(screen.getByText('Largeurs des barres latérales')).toBeInTheDocument();
    expect(screen.getByText('Couleurs et habillage des cartes')).toBeInTheDocument();
    expect(screen.getByText('Visibilité par palier responsive')).toBeInTheDocument();

    // Switch to Prévisualisation
    const previewTab = screen.getByRole('tab', { name: /Prévisualisation en direct/i });
    fireEvent.click(previewTab);

    expect(screen.getByRole('button', { name: /Format XL/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Format L/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Format M/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Format S/i })).toBeInTheDocument();
    expect(screen.getByTestId('flipbook-layout-wrapper')).toBeInTheDocument();
  });

  test('updates style settings and marks state as dirty (modifications non enregistrées)', () => {
    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
      />
    );

    // Initially, clean state (no dirty badge)
    expect(screen.queryByText('Modifications non enregistrées')).not.toBeInTheDocument();

    // Go to styles tab
    fireEvent.click(screen.getByRole('tab', { name: /Apparence, Styles & Visibilité/i }));

    // Change left width
    const leftRange = screen.getByLabelText(/Largeur barre gauche en pourcentage/i);
    fireEvent.change(leftRange, { target: { value: '26' } });

    // Dirty badge should now appear
    expect(screen.getByText('Modifications non enregistrées')).toBeInTheDocument();
  });

  test('switches responsive viewports in preview tab (XL, L, M, S)', () => {
    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /Prévisualisation en direct/i }));

    const btnS = screen.getByRole('button', { name: /Format S/i });
    fireEvent.click(btnS);
    expect(btnS).toHaveClass('active');

    const btnM = screen.getByRole('button', { name: /Format M/i });
    fireEvent.click(btnM);
    expect(btnM).toHaveClass('active');
  });

  test('calls onSaveSuccess and shows confirmation when saving', async () => {
    const handleSaveSuccess = jest.fn();
    const setNotification = jest.fn();

    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={handleSaveSuccess}
        onApplyToAll={jest.fn()}
        setNotification={setNotification}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Enregistrer le modèle global/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSaveSuccess).toHaveBeenCalledTimes(1);
    });
    expect(setNotification).toHaveBeenCalledWith(expect.stringContaining("enregistré avec succès"));
  });

  test('opens confirmation modal when clicking Appliquer à tous les Flipbooks', () => {
    const handleApplyAll = jest.fn();

    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={handleApplyAll}
      />
    );

    const applyBtn = screen.getByRole('button', { name: /Appliquer le modèle global à tous/i });
    fireEvent.click(applyBtn);

    expect(screen.getByText(/Appliquer le modèle global à tous les Flipbooks \?/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirmer et appliquer/i });
    fireEvent.click(confirmBtn);

    expect(handleApplyAll).toHaveBeenCalledTimes(1);
  });

  test('handles safe back button with confirmation if modifications are unsaved', () => {
    const handleBack = jest.fn();
    window.confirm = jest.fn(() => false); // Refuse to leave

    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={handleBack}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
      />
    );

    // Modify a field to become dirty
    fireEvent.click(screen.getByRole('tab', { name: /Apparence, Styles & Visibilité/i }));
    const leftRange = screen.getByLabelText(/Largeur barre gauche en pourcentage/i);
    fireEvent.change(leftRange, { target: { value: '28' } });

    // Click back
    const backBtn = screen.getByRole('button', { name: /Retour à la gestion des Flipbooks/i });
    fireEvent.click(backBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(handleBack).not.toHaveBeenCalled();

    // Now accept to leave
    window.confirm = jest.fn(() => true);
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  test('supports independent left and right sidebar customization and cancels unsaved modifications', () => {
    window.confirm = jest.fn(() => true);

    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
      />
    );

    // Switch to styles tab
    fireEvent.click(screen.getByRole('tab', { name: /Apparence, Styles & Visibilité/i }));

    // Verify both left and right independent customization panels are rendered
    expect(screen.getByTestId('style-config-left')).toBeInTheDocument();
    expect(screen.getByTestId('style-config-right')).toBeInTheDocument();

    // Change alignment for left sidebar to Centré
    const alignCenterLeftBtn = screen.getByRole('button', { name: /Alignement Centré pour Barre gauche/i });
    fireEvent.click(alignCenterLeftBtn);
    expect(screen.getByText('Modifications non enregistrées')).toBeInTheDocument();

    // Click "Annuler les modifications"
    const cancelBtn = screen.getByRole('button', { name: /Annuler les modifications/i });
    fireEvent.click(cancelBtn);

    // Dirty badge should disappear
    expect(screen.queryByText('Modifications non enregistrées')).not.toBeInTheDocument();
  });

  test('displays detailed report after applying global model to all Flipbooks', async () => {
    const handleApplyAll = jest.fn().mockResolvedValue({
      success: true,
      totalCount: 2,
      alreadyGlobalCount: 1,
      replacedCustomCount: 1,
      backedUpCount: 1,
      verifiedCount: 2,
      errorCount: 0,
      errors: []
    });

    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={[
          ...mockFlipbooks,
          { id: 'fb-custom', title: 'Livre Perso', sidebarMode: 'custom', leftSidebar: [{ id: 'b1', text: 'Perso' }] }
        ]}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={handleApplyAll}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Appliquer le modèle global à tous/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmer et appliquer/i }));

    await waitFor(() => {
      expect(screen.getByTestId('apply-all-report')).toBeInTheDocument();
    });
    expect(screen.getByText(/Bilan de l'application du modèle global/i)).toBeInTheDocument();
  });

  test('allows custom border width, radius, style, color and synchronizes sliders and numeric inputs', () => {
    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
      />
    );

    // 1. Épaisseur du contour slider
    const borderSlider = screen.getByRole('slider', { name: /Épaisseur du contour/i });
    expect(borderSlider).toBeInTheDocument();
    fireEvent.change(borderSlider, { target: { value: '4' } });

    // Champ numérique synchronisé
    const borderNumberInput = screen.getByRole('spinbutton', { name: /Épaisseur du contour en pixels/i });
    expect(borderNumberInput).toHaveValue(4);

    // 2. Arrondi des angles slider & number
    const radiusSlider = screen.getByRole('slider', { name: /Arrondi des angles/i });
    fireEvent.change(radiusSlider, { target: { value: '18' } });
    const radiusNumberInput = screen.getByRole('spinbutton', { name: /Arrondi des angles en pixels/i });
    expect(radiusNumberInput).toHaveValue(18);

    // 3. Style du contour
    const styleSelect = screen.getByLabelText(/Style du contour/i);
    fireEvent.change(styleSelect, { target: { value: 'dashed' } });
    expect(styleSelect).toHaveValue('dashed');

    // 4. Couleur du contour
    const colorPicker = screen.getByLabelText(/Couleur du contour/i);
    fireEvent.change(colorPicker, { target: { value: '#1e3a8a' } });
    expect(colorPicker).toHaveValue('#1e3a8a');
  });

  test('allows customizing shadow properties and toggles shadow', () => {
    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
      />
    );

    // Vérification des préréglages d'ombre
    const btnLégère = screen.getByRole('button', { name: /Légère/i });
    const btnPrononcée = screen.getByRole('button', { name: /Prononcée/i });
    expect(btnLégère).toBeInTheDocument();
    expect(btnPrononcée).toBeInTheDocument();

    fireEvent.click(btnPrononcée);
    expect(btnPrononcée).toHaveClass('active');

    // Test de la bascule intérieure / extérieure
    const insetBtn = screen.getByRole('button', { name: /Intérieure/i });
    fireEvent.click(insetBtn);
    expect(insetBtn).toHaveClass('active');
  });

  test('applies border and shadow style to all blocks across left and right sidebars when clicking Appliquer ce style à tous les blocs', () => {
    const setNotification = jest.fn();
    const templateWithBlocks = {
      ...DEFAULT_GLOBAL_SIDEBAR,
      leftSidebar: [
        { id: 'lb1', type: 'text', title: 'Bloc Gauche 1', style: { borderWidth: 1 } }
      ],
      rightSidebar: [
        { id: 'rb1', type: 'image', title: 'Bloc Droite 1', style: { borderWidth: 0 } }
      ]
    };

    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={templateWithBlocks}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
        setNotification={setNotification}
      />
    );

    // Changer l'épaisseur globale
    const borderSlider = screen.getByRole('slider', { name: /Épaisseur du contour/i });
    fireEvent.change(borderSlider, { target: { value: '6' } });

    // Cliquer sur « Appliquer ce style à tous les blocs »
    const applyAllBtn = screen.getByRole('button', { name: /Appliquer ce style à tous les blocs/i });
    expect(applyAllBtn).toBeInTheDocument();
    fireEvent.click(applyAllBtn);

    expect(setNotification).toHaveBeenCalledWith(
      expect.stringContaining("appliqué à tous les blocs des deux barres")
    );
  });

  test('displays live central preview with BARRE GAUCHE, FLIPBOOK and BARRE DROITE updating immediately', () => {
    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
      />
    );

    expect(screen.getByText(/\[ BARRE GAUCHE \] \[ FLIPBOOK \] \[ BARRE DROITE \]/i)).toBeInTheDocument();
    expect(screen.getByTestId('flipbook-layout-wrapper')).toBeInTheDocument();
  });

  test('supports automatic sidebar width symmetry and media ratio selection for identical dimensions', () => {
    render(
      <GlobalFlipbookSidebarEditor
        initialTemplate={DEFAULT_GLOBAL_SIDEBAR}
        flipbooks={mockFlipbooks}
        onBack={jest.fn()}
        onSaveSuccess={jest.fn()}
        onApplyToAll={jest.fn()}
      />
    );

    // Switch to styles tab
    fireEvent.click(screen.getByRole('tab', { name: /Apparence, Styles & Visibilité/i }));

    // Check symmetry checkbox is present and checked by default
    const symmetryCheckbox = screen.getByLabelText(/Symétrie automatique : lier les dimensions de la barre gauche et droite/i);
    expect(symmetryCheckbox).toBeInTheDocument();
    expect(symmetryCheckbox).toBeChecked();

    // Check media ratio selector is present
    const ratioSelect = screen.getByLabelText(/Format et ratio des blocs images et vidéos/i);
    expect(ratioSelect).toBeInTheDocument();
    expect(ratioSelect).toHaveValue('16 / 9');

    // Change ratio to 4:3
    fireEvent.change(ratioSelect, { target: { value: '4 / 3' } });
    expect(ratioSelect).toHaveValue('4 / 3');
    expect(screen.getByText('Modifications non enregistrées')).toBeInTheDocument();
  });
});


