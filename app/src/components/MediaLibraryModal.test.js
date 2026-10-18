import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MediaLibraryModal } from './MediaLibraryModal';
import { pageService } from '../services/pageService';

jest.mock('../services/pageService', () => ({
  pageService: {
    getMediaList: jest.fn(),
    uploadMedia: jest.fn(),
    deleteMediaItem: jest.fn()
  }
}));

describe('MediaLibraryModal component tests', () => {
  const mockMediaList = [
    {
      id: 'media_1',
      name: 'chateau_angers.jpg',
      type: 'image',
      mimeType: 'image/jpeg',
      url: 'https://example.com/chateau.jpg',
      alt: 'Château d Angers'
    },
    {
      id: 'media_2',
      name: 'presentation_anjou.mp4',
      type: 'video',
      mimeType: 'video/mp4',
      url: 'https://example.com/video.mp4',
      alt: 'Vidéo présentation'
    },
    {
      id: 'media_3',
      name: 'guide_lecture.pdf',
      type: 'document',
      mimeType: 'application/pdf',
      url: 'https://example.com/guide.pdf',
      alt: 'Guide de lecture'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    pageService.getMediaList.mockResolvedValue(mockMediaList);
  });

  test('does not render when isOpen is false', () => {
    const { container } = render(
      <MediaLibraryModal
        isOpen={false}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders modal with title, tabs, search and media cards when isOpen is true', async () => {
    render(
      <MediaLibraryModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        title="Sélectionner une illustration"
      />
    );

    // Vérifie le titre
    expect(await screen.findByText('Sélectionner une illustration')).toBeInTheDocument();
    expect(screen.getByText(/Sélectionnez, organisez ou téléversez des médias/i)).toBeInTheDocument();

    // Attend la fin du chargement asynchrone des médias
    expect(await screen.findByText('chateau_angers.jpg')).toBeInTheDocument();
    expect(screen.getByText('presentation_anjou.mp4')).toBeInTheDocument();

    // Vérifie les onglets avec compteurs à jour
    expect(screen.getByRole('tab', { name: /Tous \(3\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Images \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Vidéos \(1\)/i })).toBeInTheDocument();

    // Vérifie le bouton de validation désactivé par défaut
    const confirmBtn = screen.getByRole('button', { name: /Utiliser ce média/i });
    expect(confirmBtn).toBeDisabled();
  });

  test('filters media when clicking category tabs', async () => {
    render(
      <MediaLibraryModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    await screen.findByText('chateau_angers.jpg');

    // Clic sur l'onglet Images
    const imagesTab = screen.getByRole('tab', { name: /Images \(1\)/i });
    fireEvent.click(imagesTab);

    expect(screen.getByText('chateau_angers.jpg')).toBeInTheDocument();
    expect(screen.queryByText('presentation_anjou.mp4')).not.toBeInTheDocument();
    expect(screen.queryByText('guide_lecture.pdf')).not.toBeInTheDocument();

    // Clic sur l'onglet Vidéos
    const videosTab = screen.getByRole('tab', { name: /Vidéos \(1\)/i });
    fireEvent.click(videosTab);

    expect(screen.queryByText('chateau_angers.jpg')).not.toBeInTheDocument();
    expect(screen.getByText('presentation_anjou.mp4')).toBeInTheDocument();
  });

  test('filters media dynamically via search query', async () => {
    render(
      <MediaLibraryModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    await screen.findByText('chateau_angers.jpg');

    const searchInput = screen.getByLabelText(/Rechercher un média/i);
    fireEvent.change(searchInput, { target: { value: 'chateau' } });

    expect(screen.getByText('chateau_angers.jpg')).toBeInTheDocument();
    expect(screen.queryByText('presentation_anjou.mp4')).not.toBeInTheDocument();
  });

  test('selects an image on click, displays details panel, and enables confirm button', async () => {
    const handleSelect = jest.fn();
    const handleClose = jest.fn();

    render(
      <MediaLibraryModal
        isOpen={true}
        onClose={handleClose}
        onSelect={handleSelect}
      />
    );

    await screen.findByText('chateau_angers.jpg');

    const mediaCard = screen.getByTestId('media-card-media_1');
    fireEvent.click(mediaCard);

    // Panneau de détails visible
    expect(screen.getByText('Détails du média')).toBeInTheDocument();
    expect(screen.getByText('image/jpeg')).toBeInTheDocument();

    // Le bouton Utiliser ce média est maintenant actif
    const confirmBtn = screen.getByRole('button', { name: /Utiliser ce média/i });
    expect(confirmBtn).not.toBeDisabled();

    // Clic sur Utiliser ce média
    fireEvent.click(confirmBtn);
    expect(handleSelect).toHaveBeenCalledWith(mockMediaList[0]);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('selects and confirms immediately on double click', async () => {
    const handleSelect = jest.fn();
    const handleClose = jest.fn();

    render(
      <MediaLibraryModal
        isOpen={true}
        onClose={handleClose}
        onSelect={handleSelect}
      />
    );

    await screen.findByText('chateau_angers.jpg');

    const mediaCard = screen.getByTestId('media-card-media_1');
    fireEvent.doubleClick(mediaCard);

    expect(handleSelect).toHaveBeenCalledWith(mockMediaList[0]);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('closes when clicking close button or cancel button or pressing Escape', async () => {
    const handleClose = jest.fn();

    const { rerender } = render(
      <MediaLibraryModal
        isOpen={true}
        onClose={handleClose}
        onSelect={jest.fn()}
      />
    );

    await screen.findByText('chateau_angers.jpg');

    // Clic sur la croix
    const closeBtn = screen.getByLabelText('Fermer la médiathèque');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Clic sur Annuler
    const cancelBtn = screen.getByRole('button', { name: /Annuler/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Touche Échap
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(3);
  });

  test('allows uploading a new file via input change', async () => {
    pageService.uploadMedia.mockResolvedValue('https://example.com/nouvelle_image.jpg');

    render(
      <MediaLibraryModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    await screen.findByText('chateau_angers.jpg');

    const fileInput = screen.getByTestId('media-file-input');
    const fakeFile = new File(['content'], 'nouvelle_image.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(pageService.uploadMedia).toHaveBeenCalledWith(fakeFile);
      expect(pageService.getMediaList).toHaveBeenCalledTimes(2);
    });
  });

  test('deletes media after confirmation in details sidebar', async () => {
    window.confirm = jest.fn(() => true);
    pageService.deleteMediaItem.mockResolvedValue(true);

    render(
      <MediaLibraryModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    await screen.findByText('chateau_angers.jpg');

    // Sélectionner l'image
    fireEvent.click(screen.getByTestId('media-card-media_1'));

    // Clic sur Supprimer dans le panneau latéral
    const deleteBtn = screen.getByRole('button', { name: /Supprimer de la bibliothèque/i });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(pageService.deleteMediaItem).toHaveBeenCalledWith('media_1');
    });
  });

  test('renders empty state when media list is empty', async () => {
    pageService.getMediaList.mockResolvedValue([]);

    render(
      <MediaLibraryModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    expect(await screen.findByText('Aucun média trouvé')).toBeInTheDocument();
  });
});
