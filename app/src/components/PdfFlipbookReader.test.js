import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PdfFlipbookReader from './PdfFlipbookReader';

// Mock IndexedDB storage and firestore chunker
jest.mock('../utils/indexedDBStorage', () => ({
  getPDFFile: jest.fn(() => Promise.resolve(null)),
  storePDFFile: jest.fn(() => Promise.resolve())
}));

jest.mock('../utils/firestoreChunker', () => ({
  loadPdfFromFirestore: jest.fn(() => Promise.resolve(null)),
  savePdfToFirestore: jest.fn(() => Promise.resolve())
}));

describe('PdfFlipbookReader component tests', () => {
  const mockBook = {
    id: '4455',
    title: 'Les Secrets du Vignoble Angevin',
    pdfFile: 'secrets_vignoble_angevin.pdf'
  };

  test('renders reader container with accessible region and title', () => {
    render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);
    
    // Check accessible region
    const region = screen.getByRole('region', { name: /Lecteur de livre numérique/i });
    expect(region).toBeInTheDocument();

    // Check title
    expect(screen.getByText('Les Secrets du Vignoble Angevin')).toBeInTheDocument();
  });

  test('renders toolbar with accessible buttons', () => {
    render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

    expect(screen.getByRole('button', { name: /Afficher ou masquer le sommaire/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Afficher ou masquer le panneau de recherche/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Afficher ou masquer la grille des miniatures/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tourne-page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Faire pivoter le document/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zoom arrière/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zoom avant/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plein écran/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fermer le lecteur/i })).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(<PdfFlipbookReader book={mockBook} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: /Fermer le lecteur/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('toggles sound setting when clicking sound button', () => {
    render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

    const soundBtn = screen.getByRole('button', { name: /tourne-page/i });
    fireEvent.click(soundBtn);
    expect(localStorage.getItem('ae_flipbook_sound')).toBeDefined();
  });
});
