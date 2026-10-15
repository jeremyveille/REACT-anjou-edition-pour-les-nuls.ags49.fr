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
});
