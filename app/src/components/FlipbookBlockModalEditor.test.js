import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FlipbookBlockModalEditor from './FlipbookBlockModalEditor';

describe('FlipbookBlockModalEditor component tests', () => {
  const mockBlock = {
    id: 'block_test_1',
    type: 'text',
    title: 'Mon Extrait Littéraire',
    content: 'Un beau texte poétique angevin',
    enabled: true
  };

  test('does not render when isOpen is false', () => {
    const { container } = render(
      <FlipbookBlockModalEditor
        isOpen={false}
        block={mockBlock}
        position="left"
        index={0}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders modal header, tabs, and content fields when isOpen is true', () => {
    render(
      <FlipbookBlockModalEditor
        isOpen={true}
        block={mockBlock}
        position="left"
        index={0}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText(/Paramètres du bloc : Mon Extrait Littéraire/i)).toBeInTheDocument();
    expect(screen.getByText(/Barre gauche • Bloc #1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1\. Contenu & Paramètres/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2\. Styles individuels/i })).toBeInTheDocument();

    const textarea = screen.getByLabelText(/Contenu texte ou HTML sécurisé/i);
    expect(textarea).toHaveValue('Un beau texte poétique angevin');
  });

  test('switches between content and styles tabs', () => {
    render(
      <FlipbookBlockModalEditor
        isOpen={true}
        block={mockBlock}
        position="right"
        index={2}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />
    );

    const stylesTabBtn = screen.getByRole('button', { name: /2\. Styles individuels/i });
    fireEvent.click(stylesTabBtn);

    expect(screen.getByText('Contour du bloc')).toBeInTheDocument();
    expect(screen.getByText('Ombre du bloc')).toBeInTheDocument();
  });

  test('submits updated block data on save', () => {
    const handleSave = jest.fn();
    const handleClose = jest.fn();

    render(
      <FlipbookBlockModalEditor
        isOpen={true}
        block={mockBlock}
        position="left"
        index={0}
        onSave={handleSave}
        onClose={handleClose}
      />
    );

    const titleInput = screen.getByLabelText(/Titre du bloc \(optionnel\)/i);
    fireEvent.change(titleInput, { target: { value: 'Nouveau Titre Modifié' } });

    const submitBtn = screen.getByRole('button', { name: /Enregistrer le bloc/i });
    fireEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Nouveau Titre Modifié'
    }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('closes on cancel button click', () => {
    const handleClose = jest.fn();

    render(
      <FlipbookBlockModalEditor
        isOpen={true}
        block={mockBlock}
        position="left"
        index={0}
        onSave={jest.fn()}
        onClose={handleClose}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Annuler/i });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('closes on Escape key press', () => {
    const handleClose = jest.fn();

    render(
      <FlipbookBlockModalEditor
        isOpen={true}
        block={mockBlock}
        position="left"
        index={0}
        onSave={jest.fn()}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('renders image block with dedicated preview container and clean base64 label', () => {
    const mockImageBlock = {
      id: 'block_img_1',
      type: 'image',
      title: 'Illustration de couverture',
      imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      imageAlt: 'Vignette du livre',
      enabled: true
    };

    const { container } = render(
      <FlipbookBlockModalEditor
        isOpen={true}
        block={mockImageBlock}
        position="right"
        index={1}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // Vérifie le conteneur défilable interne
    expect(container.querySelector('.ae-block-modal-body')).toBeInTheDocument();

    // Vérifie le conteneur dédié d'aperçu d'image
    const previewContainer = container.querySelector('.ae-modal-image-preview-container');
    expect(previewContainer).toBeInTheDocument();
    const previewImg = previewContainer.querySelector('img');
    expect(previewImg).toBeInTheDocument();
    expect(previewImg).toHaveAttribute('alt', 'Vignette du livre');

    // Vérifie le masquage propre de la chaîne Base64 dans le champ texte
    const urlInput = screen.getByLabelText(/URL directe ou référence du média/i);
    expect(urlInput.value).toContain('[Image locale téléversée');

    // Vérifie le badge de statut
    expect(screen.getByText(/Image prête pour l'affichage/i)).toBeInTheDocument();
  });
});
