import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FlipbookModal from './FlipbookModal';

// Mock des services de chargement PDF
jest.mock('../utils/indexedDBStorage', () => ({
  getPDFFile: jest.fn(() => Promise.resolve(null)),
  storePDFFile: jest.fn(() => Promise.resolve())
}));

jest.mock('../utils/firestoreChunker', () => ({
  loadPdfFromFirestore: jest.fn(() => Promise.resolve(null)),
  savePdfToFirestore: jest.fn(() => Promise.resolve())
}));

describe('FlipbookModal Component Tests (Intégration directe & Accessibilité)', () => {
  const mockBook1 = {
    id: '4455',
    title: 'Les Secrets du Vignoble Angevin',
    category: 'Vins & Terroirs',
    description: 'Guide complet sur les terroirs.',
    pdfFile: 'secrets_vignoble_angevin.pdf'
  };

  const mockBook2 = {
    id: '5566',
    title: 'Poésies et Ballades d\'Anjou',
    category: 'Poésies',
    description: 'Recueil poétique complet.',
    pdfFile: 'poesies_anjou.pdf'
  };

  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  test('SCÉNARIO 1 & 2 : Affiche le lecteur intégré avec le bon document et les attributs ARIA conformes', () => {
    render(<FlipbookModal isOpen={true} book={mockBook1} onClose={jest.fn()} />);

    // Conteneur de consultation
    const dialog = screen.getByTestId('flipbook-modal-dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-label', expect.stringContaining('Les Secrets du Vignoble Angevin'));

    // Titre de l'ouvrage affiché dans la barre d'outils intégrée du lecteur
    expect(screen.getByRole('heading', { level: 3, name: 'Les Secrets du Vignoble Angevin' })).toBeInTheDocument();

    // Bouton Fermer accessible de la barre d'outils
    const closeBtn = screen.getByTestId('flipbook-modal-close-btn');
    expect(closeBtn).toBeInTheDocument();
  });

  test('SCÉNARIO 3 : Fermeture avec le bouton Fermer du lecteur et appel de onClose', () => {
    const handleClose = jest.fn();
    render(<FlipbookModal isOpen={true} book={mockBook1} onClose={handleClose} />);

    const closeBtn = screen.getByTestId('flipbook-modal-close-btn');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('SCÉNARIO 4 : Ouvrir plusieurs Flipbooks successivement avec correspondance exacte', () => {
    const { rerender } = render(<FlipbookModal isOpen={true} book={mockBook1} onClose={jest.fn()} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Les Secrets du Vignoble Angevin' })).toBeInTheDocument();

    // Réouverture avec un 2e livre différent
    rerender(<FlipbookModal isOpen={true} book={mockBook2} onClose={jest.fn()} />);
    expect(screen.getByRole('heading', { level: 3, name: "Poésies et Ballades d'Anjou" })).toBeInTheDocument();
  });

  test('SCÉNARIO 8 : Fermeture via la touche Échap (Escape)', () => {
    const handleClose = jest.fn();
    render(<FlipbookModal isOpen={true} book={mockBook1} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('Retourne null si isOpen est faux ou aucun livre n\'est fourni', () => {
    const { container, rerender } = render(<FlipbookModal isOpen={false} book={mockBook1} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();

    rerender(<FlipbookModal isOpen={true} book={null} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
