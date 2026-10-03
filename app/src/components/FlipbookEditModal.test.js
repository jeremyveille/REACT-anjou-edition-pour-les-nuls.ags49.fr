import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FlipbookEditModal from './FlipbookEditModal';

describe('FlipbookEditModal Component Tests', () => {
  const mockFlipbook = {
    id: 'fb-edit-1',
    title: 'Les Vignes d’Anjou',
    category: 'Poésies',
    description: 'Une ode aux terroirs de la Loire.',
    pdfFile: 'vignes.pdf',
    pdfUrl: 'https://example.com/vignes.pdf',
    pages: [
      { pageNum: 1, title: 'Introduction', content: 'Bienvenue en Anjou.' },
      { pageNum: 2, title: 'Cépages', content: 'Le chenin et le cabernet.' }
    ],
    leftSidebar: [
      { id: 'b_left_1', type: 'text', title: 'Titre Gauche', content: 'Contenu Gauche', enabled: true }
    ],
    rightSidebar: [
      { id: 'b_right_1', type: 'button', buttonText: 'En savoir plus', buttonUrl: '/contact', enabled: true }
    ]
  };

  test('renders modal with general information, integration snippet, pages accordion, and sidebars', () => {
    render(
      <FlipbookEditModal
        isOpen={true}
        flipbook={mockFlipbook}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    // Modal role and title
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Modifier le Flipbook :/i)).toBeInTheDocument();

    // General information fields
    expect(screen.getByLabelText(/Titre du Flipbook/i)).toHaveValue('Les Vignes d’Anjou');
    expect(screen.getByLabelText(/Catégorie littéraire/i)).toHaveValue('Poésies');
    expect(screen.getByLabelText(/Description de l'ouvrage/i)).toHaveValue('Une ode aux terroirs de la Loire.');
    expect(screen.getByText('vignes.pdf')).toBeInTheDocument();

    // React snippet is present in edit modal
    expect(screen.getByText(/<PdfFlipbookReader book={flipbooks.find/i)).toBeInTheDocument();

    // Pages accordion
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Cépages')).toBeInTheDocument();

    // Sidebars section
    expect(screen.getByText('Barres latérales du Flipbook')).toBeInTheDocument();
    expect(screen.getByText('Barre gauche')).toBeInTheDocument();
    expect(screen.getByText('Barre droite')).toBeInTheDocument();
  });

  test('handles page accordion expansion and adding new page', () => {
    render(
      <FlipbookEditModal
        isOpen={true}
        flipbook={mockFlipbook}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    // First page is expanded by default: its content field should be visible
    expect(screen.getByDisplayValue('Bienvenue en Anjou.')).toBeInTheDocument();

    // Add a new page
    const addPageBtn = screen.getByRole('button', { name: /Ajouter une nouvelle page au flipbook/i });
    fireEvent.click(addPageBtn);

    // Page 3 should now be created and expanded
    expect(screen.getByDisplayValue('Page 3')).toBeInTheDocument();
  });

  test('calls onSave with updated data when form is submitted', () => {
    const handleSave = jest.fn();
    render(
      <FlipbookEditModal
        isOpen={true}
        flipbook={mockFlipbook}
        onClose={jest.fn()}
        onSave={handleSave}
      />
    );

    // Change title
    const titleInput = screen.getByLabelText(/Titre du Flipbook/i);
    fireEvent.change(titleInput, { target: { value: 'Les Grands Vins d’Anjou' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Enregistrer les modifications/i });
    fireEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledTimes(1);
    const savedData = handleSave.mock.calls[0][0];
    expect(savedData.title).toBe('Les Grands Vins d’Anjou');
  });

  test('closes modal when Escape key is pressed or close button is clicked', () => {
    const handleClose = jest.fn();
    render(
      <FlipbookEditModal
        isOpen={true}
        flipbook={mockFlipbook}
        onClose={handleClose}
        onSave={jest.fn()}
      />
    );

    // Click close button with aria-label="Fermer"
    const closeBtn = screen.getByRole('button', { name: /^Fermer$/i });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
