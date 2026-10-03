import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FlipbookManager from './FlipbookManager';

describe('FlipbookManager Component Tests', () => {
  const mockFlipbooks = [
    {
      id: 'fb-1',
      title: 'Moment',
      category: 'Poésies',
      pdfFile: 'Moment.pdf',
      date: '22/09/2026',
      description: 'Un recueil poétique intense.'
    },
    {
      id: 'fb-2',
      title: 'Rose',
      category: 'Poésies',
      pdfFile: 'ROSE.pdf',
      date: '20/09/2026',
      description: 'Poésie dédiée aux fleurs du Val de Loire.'
    },
    {
      id: 'fb-3',
      title: 'Acidulé ou Amer',
      category: 'Poésies',
      pdfFile: 'Acidule.pdf',
      date: '24/09/2026',
      description: 'Textes percutants.'
    },
    {
      id: 'fb-4',
      title: 'Guide du Terroir',
      category: 'Outils',
      pdfFile: 'Terroir.pdf',
      date: '10/05/2026',
      description: 'Fiches pratiques viticoles.'
    }
  ];

  test('renders compact flipbooks list with titles and categories', () => {
    render(
      <FlipbookManager
        flipbooks={mockFlipbooks}
        onAddFlipbook={jest.fn()}
        onViewFlipbook={jest.fn()}
        onEditFlipbook={jest.fn()}
        onDeleteFlipbook={jest.fn()}
        onBulkDelete={jest.fn()}
        onBackToMain={jest.fn()}
      />
    );

    // Breadcrumb and headers
    expect(screen.getByRole('button', { name: /Retour au tableau de bord principal/i })).toBeInTheDocument();
    expect(screen.getByText('Bibliothèque de Flipbooks interactifs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ajouter un nouveau Flipbook/i })).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText('Flipbook / Titre')).toBeInTheDocument();
    expect(screen.getByText('Fichier PDF')).toBeInTheDocument();
    expect(screen.getByText('Date de publication')).toBeInTheDocument();

    // Check items displayed (desktop table + mobile card)
    expect(screen.getAllByText('Moment').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rose').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Acidulé ou Amer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Guide du Terroir').length).toBeGreaterThanOrEqual(1);

    // Long description should NOT be displayed directly in table row to avoid vertical bloat
    expect(screen.queryByText('Un recueil poétique intense.')).not.toBeInTheDocument();
  });

  test('filters flipbooks by search query (title, category, or PDF name)', () => {
    render(
      <FlipbookManager
        flipbooks={mockFlipbooks}
        onAddFlipbook={jest.fn()}
        onViewFlipbook={jest.fn()}
        onEditFlipbook={jest.fn()}
        onDeleteFlipbook={jest.fn()}
        onBulkDelete={jest.fn()}
        onBackToMain={jest.fn()}
      />
    );

    const searchInput = screen.getByLabelText(/Rechercher par titre/i);
    fireEvent.change(searchInput, { target: { value: 'Acidulé' } });

    expect(screen.getAllByText('Acidulé ou Amer').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Moment')).not.toBeInTheDocument();
    expect(screen.queryByText('Rose')).not.toBeInTheDocument();

    // Search by PDF file name
    fireEvent.change(searchInput, { target: { value: 'ROSE.pdf' } });
    expect(screen.getAllByText('Rose').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Acidulé ou Amer')).not.toBeInTheDocument();
  });

  test('filters flipbooks by category', () => {
    render(
      <FlipbookManager
        flipbooks={mockFlipbooks}
        onAddFlipbook={jest.fn()}
        onViewFlipbook={jest.fn()}
        onEditFlipbook={jest.fn()}
        onDeleteFlipbook={jest.fn()}
        onBulkDelete={jest.fn()}
        onBackToMain={jest.fn()}
      />
    );

    const categorySelect = screen.getByLabelText(/Filtrer les flipbooks par catégorie/i);
    fireEvent.change(categorySelect, { target: { value: 'Outils' } });

    expect(screen.getAllByText('Guide du Terroir').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Moment')).not.toBeInTheDocument();
    expect(screen.queryByText('Rose')).not.toBeInTheDocument();
  });

  test('sorts flipbooks by date and title', () => {
    render(
      <FlipbookManager
        flipbooks={mockFlipbooks}
        onAddFlipbook={jest.fn()}
        onViewFlipbook={jest.fn()}
        onEditFlipbook={jest.fn()}
        onDeleteFlipbook={jest.fn()}
        onBulkDelete={jest.fn()}
        onBackToMain={jest.fn()}
      />
    );

    const sortSelect = screen.getByLabelText(/Trier la liste des flipbooks/i);

    // Sort Titre A -> Z
    fireEvent.change(sortSelect, { target: { value: 'title_asc' } });
    const rows = screen.getAllByRole('row');
    // First data row should be "Acidulé ou Amer"
    expect(rows[1]).toHaveTextContent('Acidulé ou Amer');

    // Sort Titre Z -> A
    fireEvent.change(sortSelect, { target: { value: 'title_desc' } });
    const descRows = screen.getAllByRole('row');
    expect(descRows[1]).toHaveTextContent('Rose');
  });

  test('shows bulk actions bar at the top as soon as an item is checked', () => {
    const handleBulkDelete = jest.fn();
    render(
      <FlipbookManager
        flipbooks={mockFlipbooks}
        onAddFlipbook={jest.fn()}
        onViewFlipbook={jest.fn()}
        onEditFlipbook={jest.fn()}
        onDeleteFlipbook={jest.fn()}
        onBulkDelete={handleBulkDelete}
        onBackToMain={jest.fn()}
      />
    );

    // Initially bulk actions bar is not shown
    expect(screen.queryByRole('region', { name: /Actions groupées sélectionnées/i })).not.toBeInTheDocument();

    // Check one item
    const checkboxMoment = screen.getByLabelText(/Sélectionner le flipbook Moment/i);
    fireEvent.click(checkboxMoment);

    // Bulk bar must now be visible near the top
    expect(screen.getByRole('region', { name: /Actions groupées sélectionnées/i })).toBeInTheDocument();
    expect(screen.getByText(/1 élément sélectionné/i)).toBeInTheDocument();

    // Apply trash bulk action
    const bulkSelect = screen.getByLabelText(/Sélectionner l'action groupée/i);
    fireEvent.change(bulkSelect, { target: { value: 'trash' } });

    const applyBtn = screen.getByRole('button', { name: /Appliquer l'action groupée/i });
    fireEvent.click(applyBtn);

    expect(handleBulkDelete).toHaveBeenCalledWith(['fb-1']);
  });

  test('calls action handlers for Voir, Modifier, Supprimer, and copies snippet', () => {
    const handleView = jest.fn();
    const handleEdit = jest.fn();
    const handleDelete = jest.fn();
    const setNotification = jest.fn();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve())
      }
    });

    render(
      <FlipbookManager
        flipbooks={mockFlipbooks}
        onAddFlipbook={jest.fn()}
        onViewFlipbook={handleView}
        onEditFlipbook={handleEdit}
        onDeleteFlipbook={handleDelete}
        onBulkDelete={jest.fn()}
        onBackToMain={jest.fn()}
        setNotification={setNotification}
      />
    );

    // View button
    const viewBtn = screen.getByRole('button', { name: /Voir le flipbook interactif : Moment/i });
    fireEvent.click(viewBtn);
    expect(handleView).toHaveBeenCalledWith(mockFlipbooks[0]);

    // Edit button
    const editBtn = screen.getByRole('button', { name: /Modifier le flipbook : Moment/i });
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockFlipbooks[0]);

    // Copy snippet button
    const copyBtn = screen.getByRole('button', { name: /Copier le code React pour : Moment/i });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('<PdfFlipbookReader book={flipbooks.find(f => f.id === "fb-1")}')
    );

    // Delete button
    const deleteBtn = screen.getByRole('button', { name: /Supprimer le flipbook : Moment/i });
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith('fb-1', 'Moment');
  });

  test('handles pagination properly and resets page on filter change', () => {
    // Generate 15 flipbooks
    const manyFlipbooks = Array.from({ length: 15 }, (_, i) => ({
      id: `fb-many-${i}`,
      title: `Livre Test ${i + 1}`,
      category: 'Poésies',
      pdfFile: `file-${i + 1}.pdf`,
      date: '20/09/2026'
    }));

    render(
      <FlipbookManager
        flipbooks={manyFlipbooks}
        onAddFlipbook={jest.fn()}
        onViewFlipbook={jest.fn()}
        onEditFlipbook={jest.fn()}
        onDeleteFlipbook={jest.fn()}
        onBulkDelete={jest.fn()}
        onBackToMain={jest.fn()}
      />
    );

    // Default per page is 10, so Livre Test 1 to 10 are visible, Livre Test 11 is on page 2
    expect(screen.getAllByText('Livre Test 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Livre Test 10').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Livre Test 11')).not.toBeInTheDocument();

    // Click next page
    const nextBtn = screen.getByRole('button', { name: /Aller à la page suivante/i });
    fireEvent.click(nextBtn);

    expect(screen.getAllByText('Livre Test 11').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Livre Test 1')).not.toBeInTheDocument();

    // Filter by search: should automatically reset to page 1
    const searchInput = screen.getByLabelText(/Rechercher par titre/i);
    fireEvent.change(searchInput, { target: { value: 'Livre Test 1' } });
    expect(screen.getAllByText('Livre Test 1').length).toBeGreaterThanOrEqual(1);
  });
});
