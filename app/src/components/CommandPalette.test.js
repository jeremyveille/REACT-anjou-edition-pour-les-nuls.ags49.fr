import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CommandPalette from './CommandPalette';

describe('CommandPalette Component', () => {
  const mockArticles = [
    { id: 'art-1', title: 'Le Silence des Arbres', category: 'Poésie', status: 'Publié' },
    { id: 'art-2', title: 'Contes des Berges', category: 'Contes', status: 'Brouillon' }
  ];

  const mockFlipbooks = [
    { id: 'fb-1', title: 'Recueil Poétique 2026', category: 'Recueils', pdfUrl: '/pdf/recueil.pdf' }
  ];

  const mockPages = [
    { id: 'pg-1', title: 'La Maison d\'Édition', slug: 'maison-edition', status: 'Publié' }
  ];

  const mockMessages = [
    { id: 'msg-1', name: 'Claire Martin', subject: 'Manuscrit inédit', message: 'Bonjour, voici mon manuscrit...' }
  ];

  it('ne rend rien lorsque isOpen est faux', () => {
    const { container } = render(
      <CommandPalette
        isOpen={false}
        onClose={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('s\'affiche correctement avec le champ de recherche et les actions par défaut quand isOpen est vrai', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={jest.fn()}
        articles={mockArticles}
        flipbooks={mockFlipbooks}
        pages={mockPages}
        messages={mockMessages}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Rechercher un écrit/i)).toBeInTheDocument();
    expect(screen.getByText('Rédiger un nouvel écrit / article')).toBeInTheDocument();
    expect(screen.getByText('Publier un nouveau Flipbook')).toBeInTheDocument();
  });

  it('filtre les résultats lorsque l\'utilisateur tape une requête', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={jest.fn()}
        articles={mockArticles}
        flipbooks={mockFlipbooks}
        pages={mockPages}
        messages={mockMessages}
      />
    );

    const input = screen.getByPlaceholderText(/Rechercher un écrit/i);
    fireEvent.change(input, { target: { value: 'Silence' } });

    expect(screen.getByText('Le Silence des Arbres')).toBeInTheDocument();
    expect(screen.queryByText('Contes des Berges')).not.toBeInTheDocument();
  });

  it('exécute l\'action sélectionnée et appelle onClose lors d\'un clic', () => {
    const handleAction = jest.fn();
    const handleClose = jest.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={handleClose}
        onAction={handleAction}
        articles={mockArticles}
        flipbooks={mockFlipbooks}
      />
    );

    const newArticleBtn = screen.getByText('Rédiger un nouvel écrit / article');
    fireEvent.click(newArticleBtn);

    expect(handleAction).toHaveBeenCalledWith('new-article');
    expect(handleClose).toHaveBeenCalled();
  });

  it('gère la touche Échap pour fermer la palette', () => {
    const handleClose = jest.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={handleClose}
      />
    );

    const modal = screen.getByRole('dialog').firstChild;
    fireEvent.keyDown(modal, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalled();
  });

  it('gère la navigation par flèches et la touche Entrée', () => {
    const handleAction = jest.fn();
    const handleClose = jest.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={handleClose}
        onAction={handleAction}
      />
    );

    const modal = screen.getByRole('dialog').firstChild;
    // Déplacement vers le bas
    fireEvent.keyDown(modal, { key: 'ArrowDown' });
    // Validation avec Entrée
    fireEvent.keyDown(modal, { key: 'Enter' });

    expect(handleAction).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });

  it('affiche un message lorsqu\'aucun résultat ne correspond', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={jest.fn()}
        articles={mockArticles}
      />
    );

    const input = screen.getByPlaceholderText(/Rechercher un écrit/i);
    fireEvent.change(input, { target: { value: 'TermeInexistant12345' } });

    expect(screen.getByText(/Aucun résultat trouvé pour « TermeInexistant12345 »/i)).toBeInTheDocument();
  });
});
