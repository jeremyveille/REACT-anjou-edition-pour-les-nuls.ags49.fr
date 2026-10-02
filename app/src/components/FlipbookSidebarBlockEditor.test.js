import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FlipbookSidebarBlockEditor from './FlipbookSidebarBlockEditor';

describe('FlipbookSidebarBlockEditor component', () => {
  const mockBlock = {
    id: 'block_test',
    type: 'text',
    title: 'Mon Titre',
    content: 'Mon contenu',
    enabled: true
  };

  test('renders header with block index, summary and action buttons', () => {
    render(
      <FlipbookSidebarBlockEditor
        block={mockBlock}
        index={0}
        totalBlocks={2}
        position="left"
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onOpenMediaLibrary={jest.fn()}
      />
    );

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Mon Titre')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Déplacer le bloc 1 de la barre gauche vers le haut/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Déplacer le bloc 1 de la barre gauche vers le bas/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Désactiver le bloc 1 de la barre gauche/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Supprimer le bloc 1 de la barre gauche/i })).toBeInTheDocument();
  });

  test('calls onUpdate when editing text content', () => {
    const handleUpdate = jest.fn();
    render(
      <FlipbookSidebarBlockEditor
        block={mockBlock}
        index={0}
        totalBlocks={1}
        position="left"
        onUpdate={handleUpdate}
        onDelete={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onOpenMediaLibrary={jest.fn()}
      />
    );

    const textarea = screen.getByLabelText(/Contenu texte ou HTML sécurisé/i);
    fireEvent.change(textarea, { target: { value: 'Nouveau contenu littéraire' } });

    expect(handleUpdate).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Nouveau contenu littéraire'
    }));
  });

  test('renders specific fields for image block including media library button and alt input', () => {
    const imgBlock = {
      id: 'b_img',
      type: 'image',
      title: 'Illustration',
      imageUrl: 'https://site.fr/img.png',
      imageAlt: 'Description alt',
      enabled: true
    };
    const handleOpenMedia = jest.fn();

    render(
      <FlipbookSidebarBlockEditor
        block={imgBlock}
        index={1}
        totalBlocks={3}
        position="right"
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onOpenMediaLibrary={handleOpenMedia}
      />
    );

    const mediaBtn = screen.getByRole('button', { name: /Choisir dans la médiathèque/i });
    expect(mediaBtn).toBeInTheDocument();
    fireEvent.click(mediaBtn);
    expect(handleOpenMedia).toHaveBeenCalled();

    expect(screen.getByLabelText(/Texte alternatif/i)).toHaveValue('Description alt');
  });

  test('renders video options for YouTube URL and local file choice', () => {
    const videoBlock = {
      id: 'b_vid',
      type: 'video',
      title: 'Vidéo du fleuve',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoSourceType: 'youtube',
      enabled: true
    };

    render(
      <FlipbookSidebarBlockEditor
        block={videoBlock}
        index={0}
        totalBlocks={1}
        position="left"
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onOpenMediaLibrary={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Choisir un fichier vidéo/i })).toBeInTheDocument();
    expect(screen.getByText('— OU —')).toBeInTheDocument();
    expect(screen.getByLabelText(/URL YouTube \/ vidéo/i)).toHaveValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(screen.getByTitle('Aperçu YouTube')).toBeInTheDocument();
  });
});
