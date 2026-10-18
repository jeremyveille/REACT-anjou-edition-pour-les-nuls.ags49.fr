import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FlipbookSidebarEditor from './FlipbookSidebarEditor';

describe('FlipbookSidebarEditor component in Dashboard', () => {
  const initialFlipbook = {
    id: 'fb-test',
    title: 'Livre Test Anjou',
    leftSidebar: [
      { id: 'b_left_1', type: 'heading', text: 'Titre Gauche', enabled: true },
      { id: 'b_left_2', type: 'text', title: 'Texte Gauche', content: 'Contenu 1', enabled: true }
    ],
    rightSidebar: [
      { id: 'b_right_1', type: 'image', title: 'Image Droite', imageUrl: '/img.jpg', imageAlt: 'Alt', enabled: true }
    ]
  };

  test('renders left and right administration columns with correct counts', () => {
    render(<FlipbookSidebarEditor flipbook={initialFlipbook} onChange={jest.fn()} />);

    expect(screen.getByText('Barre gauche')).toBeInTheDocument();
    expect(screen.getByText('Barre droite')).toBeInTheDocument();

    expect(screen.getByText('2 blocs')).toBeInTheDocument();
    expect(screen.getByText('1 bloc')).toBeInTheDocument();

    expect(screen.getByText('Titre Gauche')).toBeInTheDocument();
    expect(screen.getByText('Texte Gauche')).toBeInTheDocument();
    expect(screen.getByText('Image Droite')).toBeInTheDocument();
  });

  test('adds a new block to left sidebar when clicking + Ajouter un bloc and selecting a type', () => {
    const handleChange = jest.fn();
    render(<FlipbookSidebarEditor flipbook={initialFlipbook} onChange={handleChange} />);

    const addBtnLeft = screen.getByRole('button', { name: /Ajouter un bloc à la barre gauche/i });
    fireEvent.click(addBtnLeft);

    // Select 'Vidéo' type
    const videoTypeBtn = screen.getByRole('button', { name: /Vidéo/i });
    fireEvent.click(videoTypeBtn);

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.leftSidebar.length).toBe(3);
    expect(updated.leftSidebar[2].type).toBe('video');
  });

  test('toggles active/inactive status of a block', () => {
    const handleChange = jest.fn();
    render(<FlipbookSidebarEditor flipbook={initialFlipbook} onChange={handleChange} />);

    // Toggle first block in left sidebar (currently enabled: true)
    const toggleBtn = screen.getByRole('button', { name: /Désactiver le bloc 1 de la barre gauche/i });
    fireEvent.click(toggleBtn);

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.leftSidebar[0].enabled).toBe(false);
  });

  test('moves block up and down', () => {
    const handleChange = jest.fn();
    render(<FlipbookSidebarEditor flipbook={initialFlipbook} onChange={handleChange} />);

    // Move second block up in left sidebar
    const moveUpBtn = screen.getByRole('button', { name: /Déplacer le bloc 2 de la barre gauche vers le haut/i });
    fireEvent.click(moveUpBtn);

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.leftSidebar[0].id).toBe('b_left_2');
    expect(updated.leftSidebar[1].id).toBe('b_left_1');
  });

  test('deletes a block after confirmation', () => {
    window.confirm = jest.fn(() => true);
    const handleChange = jest.fn();
    render(<FlipbookSidebarEditor flipbook={initialFlipbook} onChange={handleChange} />);

    const deleteBtn = screen.getByRole('button', { name: /Supprimer le bloc 1 de la barre gauche/i });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.leftSidebar.length).toBe(1);
    expect(updated.leftSidebar[0].id).toBe('b_left_2');
  });

  test('duplicates a block when clicking the duplicate button', () => {
    const handleChange = jest.fn();
    render(<FlipbookSidebarEditor flipbook={initialFlipbook} onChange={handleChange} />);

    const dupBtn = screen.getByRole('button', { name: /Dupliquer le bloc 1 de la barre gauche/i });
    fireEvent.click(dupBtn);

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.leftSidebar.length).toBe(3);
    expect(updated.leftSidebar[1].title).toBe('Titre Gauche (Copie)');
  });

  test('opens spacious modal editor when clicking Edit button on a block card', () => {
    render(<FlipbookSidebarEditor flipbook={initialFlipbook} onChange={jest.fn()} />);

    const editBtn = screen.getByRole('button', { name: /Modifier la configuration du bloc 1 de la barre gauche/i });
    fireEvent.click(editBtn);

    expect(screen.getByTestId('block-modal-editor-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Paramètres du bloc : Titre Gauche/i)).toBeInTheDocument();
  });

  test('collapses and expands left and right panels independently via accordion headers', () => {
    render(<FlipbookSidebarEditor flipbook={initialFlipbook} onChange={jest.fn()} />);

    // Initially, both panels are open
    expect(screen.getByText('Titre Gauche')).toBeInTheDocument();
    expect(screen.getByText('Image Droite')).toBeInTheDocument();

    const leftHeaderBtn = screen.getByRole('button', { name: /Barre gauche, 2 blocs/i });
    expect(leftHeaderBtn).toHaveAttribute('aria-expanded', 'true');

    // Collapse left panel
    fireEvent.click(leftHeaderBtn);
    expect(leftHeaderBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Titre Gauche')).not.toBeInTheDocument();
    // Right panel is still open
    expect(screen.getByText('Image Droite')).toBeInTheDocument();

    // Re-expand left panel
    fireEvent.click(leftHeaderBtn);
    expect(leftHeaderBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Titre Gauche')).toBeInTheDocument();
  });

  test('collapses and expands all panels simultaneously via global helper buttons', () => {
    render(<FlipbookSidebarEditor flipbook={initialFlipbook} onChange={jest.fn()} />);

    const collapseAllBtn = screen.getByRole('button', { name: /Tout replier/i });
    const expandAllBtn = screen.getByRole('button', { name: /Tout déplier/i });

    // Collapse all
    fireEvent.click(collapseAllBtn);
    expect(screen.queryByText('Titre Gauche')).not.toBeInTheDocument();
    expect(screen.queryByText('Image Droite')).not.toBeInTheDocument();

    // Expand all
    fireEvent.click(expandAllBtn);
    expect(screen.getByText('Titre Gauche')).toBeInTheDocument();
    expect(screen.getByText('Image Droite')).toBeInTheDocument();
  });
});

