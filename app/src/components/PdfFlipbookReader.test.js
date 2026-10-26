import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Helper to create mock pdf.js document
const createMockPdfDoc = (numPages = 3) => ({
  numPages,
  getPage: jest.fn((pageNum) => Promise.resolve({
    getViewport: jest.fn(() => ({ width: 400, height: 600 })),
    render: jest.fn(() => ({ promise: Promise.resolve(), cancel: jest.fn() })),
    getTextContent: jest.fn(() => Promise.resolve({ items: [] }))
  })),
  getOutline: jest.fn(() => Promise.resolve([]))
});

describe('PdfFlipbookReader component tests', () => {
  const mockBook = {
    id: '4455',
    title: 'Les Secrets du Vignoble Angevin',
    pdfFile: 'secrets_vignoble_angevin.pdf'
  };

  beforeEach(() => {
    // Setup mock pdfjsLib
    window.pdfjsLib = {
      GlobalWorkerOptions: {},
      getDocument: jest.fn(() => ({
        promise: Promise.resolve(createMockPdfDoc(3))
      }))
    };
  });

  afterEach(() => {
    delete window.pdfjsLib;
  });

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

  test('gère l\'état plein écran : affiche le bouton d\'entrée en mode normal et la commande de sortie en mode plein écran', () => {
    render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

    expect(screen.getByTestId('enter-fullscreen-btn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activer le mode plein écran/i })).toBeInTheDocument();
    expect(screen.queryByTestId('exit-fullscreen-btn')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quitter le mode plein écran/i })).not.toBeInTheDocument();

    Object.defineProperty(document, 'fullscreenElement', {
      value: document.body,
      configurable: true
    });
    fireEvent(document, new Event('fullscreenchange'));

    expect(screen.queryByTestId('enter-fullscreen-btn')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Activer le mode plein écran/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('exit-fullscreen-btn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quitter le mode plein écran/i })).toBeInTheDocument();

    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true
    });
    fireEvent(document, new Event('fullscreenchange'));

    expect(screen.getByTestId('enter-fullscreen-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('exit-fullscreen-btn')).not.toBeInTheDocument();
  });

  test('affiche une pagination claire sans informations redondantes : Page [1] sur 3', async () => {
    render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

    // Attendre que le PDF soit chargé et que la pagination s'affiche
    await waitFor(() => {
      expect(screen.getByTestId('first-page-btn')).toBeInTheDocument();
    });

    // 1. Libellé unique "Page"
    expect(screen.getByText('Page')).toBeInTheDocument();

    // 2. Champ modifiable avec la page actuelle
    const pageInput = screen.getByRole('textbox', { name: /Numéro de page/i });
    expect(pageInput).toBeInTheDocument();
    expect(pageInput).toHaveValue('1');

    // 3. Total des pages calculé
    expect(screen.getByText('sur 3')).toBeInTheDocument();

    // 4. Aucun doublon ni texte redondant visible
    expect(screen.queryByText(/Numéro de page actuelle/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Numro de page/i)).not.toBeInTheDocument();
    const pageIndications = screen.queryAllByText(/Page 1 sur 3/i);
    expect(pageIndications.length).toBe(0);

    // 5. Boutons de navigation présents et accessibles
    const firstBtn = screen.getByTestId('first-page-btn');
    const prevBtn = screen.getByTestId('prev-page-btn');
    const nextBtn = screen.getByTestId('next-page-btn');
    const lastBtn = screen.getByTestId('last-page-btn');

    // En page 1, première et précédente sont désactivées
    expect(firstBtn).toBeDisabled();
    expect(prevBtn).toBeDisabled();
    // Suivante et dernière sont actives
    expect(nextBtn).not.toBeDisabled();
    expect(lastBtn).not.toBeDisabled();
  });

  test('permet la navigation vers la page suivante et dernière, puis met à jour l\'input et les états', async () => {
    render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('next-page-btn')).toBeInTheDocument();
    });

    const pageInput = screen.getByRole('textbox', { name: /Numéro de page/i });
    const nextBtn = screen.getByTestId('next-page-btn');
    const lastBtn = screen.getByTestId('last-page-btn');
    const firstBtn = screen.getByTestId('first-page-btn');
    const prevBtn = screen.getByTestId('prev-page-btn');

    // Aller à la page suivante (page 2)
    fireEvent.click(nextBtn);
    expect(pageInput).toHaveValue('2');
    expect(firstBtn).not.toBeDisabled();
    expect(prevBtn).not.toBeDisabled();

    // Aller à la dernière page (page 3)
    fireEvent.click(lastBtn);
    expect(pageInput).toHaveValue('3');
    // En dernière page, suivante et dernière sont désactivées
    expect(nextBtn).toBeDisabled();
    expect(lastBtn).toBeDisabled();
    expect(firstBtn).not.toBeDisabled();
    expect(prevBtn).not.toBeDisabled();

    // Revenir à la première page
    fireEvent.click(firstBtn);
    expect(pageInput).toHaveValue('1');
    expect(firstBtn).toBeDisabled();
    expect(prevBtn).toBeDisabled();
  });

  test('autorise la saisie directe, valide avec Entrée ou blur, et refuse/corrige les valeurs hors limites', async () => {
    render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /Numéro de page/i })).toBeInTheDocument();
    });

    const pageInput = screen.getByRole('textbox', { name: /Numéro de page/i });

    // Saisie directe de "2" et validation avec Entrée
    fireEvent.change(pageInput, { target: { value: '2' } });
    fireEvent.keyDown(pageInput, { key: 'Enter', code: 'Enter' });
    expect(pageInput).toHaveValue('2');

    // Saisie directe d'un numéro supérieur au total ("99") : borné à 3
    fireEvent.change(pageInput, { target: { value: '99' } });
    fireEvent.keyDown(pageInput, { key: 'Enter', code: 'Enter' });
    expect(pageInput).toHaveValue('3');

    // Saisie d'une valeur invalide ("0") : restaurée à la page actuelle ("3")
    fireEvent.change(pageInput, { target: { value: '0' } });
    fireEvent.blur(pageInput);
    expect(pageInput).toHaveValue('3');

    // Saisie de caractères non numériques : ignorés
    fireEvent.change(pageInput, { target: { value: 'abc' } });
    expect(pageInput).toHaveValue('');
    fireEvent.blur(pageInput);
    expect(pageInput).toHaveValue('3');
  });

  test('gère correctement un Flipbook à 1 seule page en désactivant toutes les flèches', async () => {
    // Configurer un mock avec 1 seule page
    window.pdfjsLib.getDocument = jest.fn(() => ({
      promise: Promise.resolve(createMockPdfDoc(1))
    }));

    render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('first-page-btn')).toBeInTheDocument();
    });

    const pageInput = screen.getByRole('textbox', { name: /Numéro de page/i });
    expect(pageInput).toHaveValue('1');
    expect(screen.getByText('sur 1')).toBeInTheDocument();

    // Les 4 boutons doivent être désactivés pour 1 page
    expect(screen.getByTestId('first-page-btn')).toBeDisabled();
    expect(screen.getByTestId('prev-page-btn')).toBeDisabled();
    expect(screen.getByTestId('next-page-btn')).toBeDisabled();
    expect(screen.getByTestId('last-page-btn')).toBeDisabled();
  });
});
