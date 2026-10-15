import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FlipbookSidebarAssignment from './FlipbookSidebarAssignment';

describe('FlipbookSidebarAssignment Component Tests', () => {
  const mockFlipbooks = [
    {
      id: 'fb-1',
      title: 'Guide Littéraire',
      category: 'Outils',
      sidebarMode: 'global',
      leftSidebar: [],
      rightSidebar: []
    },
    {
      id: 'fb-2',
      title: 'Chants d’Anjou',
      category: 'Poésies',
      sidebarMode: 'custom',
      leftSidebar: [{ id: 'l1', type: 'text', title: 'Bloc A' }],
      rightSidebar: [{ id: 'r1', type: 'video', title: 'Vidéo B' }]
    },
    {
      id: 'fb-3',
      title: 'Contes Angevins',
      category: 'Contes et légendes',
      // No explicit sidebarMode, but has blocks: should compute as custom
      leftSidebar: [{ id: 'l2', type: 'heading', text: 'Titre' }],
      rightSidebar: []
    }
  ];

  test('renders assignment dashboard with KPIs, table, and badges', () => {
    render(
      <FlipbookSidebarAssignment
        flipbooks={mockFlipbooks}
        onUpdateFlipbookMode={jest.fn()}
        onEditFlipbook={jest.fn()}
        onApplyGlobalToAll={jest.fn()}
        onBackToMain={jest.fn()}
      />
    );

    expect(screen.getByText('Paramètres individuels & Attribution des modèles')).toBeInTheDocument();

    // Check KPIs
    expect(screen.getByText('Total Flipbooks')).toBeInTheDocument();
    expect(screen.getAllByText('Modèle global actif').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Configurations personnalisées')).toBeInTheDocument();

    // Check rows
    expect(screen.getByText('Guide Littéraire')).toBeInTheDocument();
    expect(screen.getByText('Chants d’Anjou')).toBeInTheDocument();
    expect(screen.getByText('Contes Angevins')).toBeInTheDocument();

    // Check mode badges
    expect(screen.getAllByText('Modèle global actif').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Personnalisé').length).toBeGreaterThanOrEqual(2);
  });

  test('filters flipbooks by search query and mode filter select', () => {
    render(
      <FlipbookSidebarAssignment
        flipbooks={mockFlipbooks}
        onUpdateFlipbookMode={jest.fn()}
        onEditFlipbook={jest.fn()}
        onApplyGlobalToAll={jest.fn()}
        onBackToMain={jest.fn()}
      />
    );

    // Search query
    const searchInput = screen.getByLabelText(/Filtrer les flipbooks/i);
    fireEvent.change(searchInput, { target: { value: 'Chants' } });

    expect(screen.getByText('Chants d’Anjou')).toBeInTheDocument();
    expect(screen.queryByText('Guide Littéraire')).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    // Filter by mode
    const modeSelect = screen.getByLabelText(/Filtrer par mode de barre latérale/i);
    fireEvent.change(modeSelect, { target: { value: 'global' } });

    expect(screen.getByText('Guide Littéraire')).toBeInTheDocument();
    expect(screen.queryByText('Chants d’Anjou')).not.toBeInTheDocument();
  });

  test('handles switching from global to custom directly', () => {
    const handleUpdateMode = jest.fn();

    render(
      <FlipbookSidebarAssignment
        flipbooks={mockFlipbooks}
        onUpdateFlipbookMode={handleUpdateMode}
        onEditFlipbook={jest.fn()}
        onApplyGlobalToAll={jest.fn()}
        onBackToMain={jest.fn()}
      />
    );

    // Guide Littéraire is currently global
    const switchBtn = screen.getByLabelText(/Basculer Guide Littéraire en mode personnalisé/i);
    fireEvent.click(switchBtn);

    expect(handleUpdateMode).toHaveBeenCalledWith('fb-1', 'custom');
  });

  test('requires confirmation when switching from custom to global to avoid accidental override', () => {
    const handleUpdateMode = jest.fn();

    render(
      <FlipbookSidebarAssignment
        flipbooks={mockFlipbooks}
        onUpdateFlipbookMode={handleUpdateMode}
        onEditFlipbook={jest.fn()}
        onApplyGlobalToAll={jest.fn()}
        onBackToMain={jest.fn()}
      />
    );

    // Chants d'Anjou is currently custom
    const switchBtn = screen.getByLabelText(/Basculer Chants d’Anjou en mode modèle global/i);
    fireEvent.click(switchBtn);

    // Confirmation modal should open
    expect(screen.getByText(/Basculer « Chants d’Anjou » sur le modèle global \?/i)).toBeInTheDocument();

    // Click confirm
    const confirmBtn = screen.getByRole('button', { name: /Confirmer/i });
    fireEvent.click(confirmBtn);

    expect(handleUpdateMode).toHaveBeenCalledWith('fb-2', 'global');
  });

  test('calls onApplyGlobalToAll when clicking top button', () => {
    const handleApplyAll = jest.fn();

    render(
      <FlipbookSidebarAssignment
        flipbooks={mockFlipbooks}
        onUpdateFlipbookMode={jest.fn()}
        onEditFlipbook={jest.fn()}
        onApplyGlobalToAll={handleApplyAll}
        onBackToMain={jest.fn()}
      />
    );

    const applyAllBtn = screen.getByRole('button', { name: /Appliquer le modèle global à tous/i });
    fireEvent.click(applyAllBtn);

    expect(handleApplyAll).toHaveBeenCalledTimes(1);
  });
});
