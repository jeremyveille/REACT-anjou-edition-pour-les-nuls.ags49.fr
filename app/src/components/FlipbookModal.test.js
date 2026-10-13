import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('FlipbookModal Component Tests (WCAG 2.2 AA & Consultation superposée)', () => {
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
    // Reset body style
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    window.scrollTo = jest.fn();
  });

  test('SCÉNARIO 1 & 2 : Affiche la modale superposée avec le bon document et les attributs ARIA conformes', () => {
    render(<FlipbookModal isOpen={true} book={mockBook1} onClose={jest.fn()} />);

    // Rôle dialog et aria-modal
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', expect.stringContaining('Les Secrets du Vignoble Angevin'));

    // Titre et catégorie du flipbook
    expect(screen.getByRole('heading', { level: 2, name: 'Les Secrets du Vignoble Angevin' })).toBeInTheDocument();
    expect(screen.getByText('Vins & Terroirs')).toBeInTheDocument();

    // Bouton Fermer accessible
    const closeBtn = screen.getByRole('button', { name: /Fermer la consultation de Les Secrets du Vignoble Angevin/i });
    expect(closeBtn).toBeInTheDocument();
  });

  test('SCÉNARIO 3 : Fermeture avec le bouton Fermer et appel de onClose', () => {
    const handleClose = jest.fn();
    render(<FlipbookModal isOpen={true} book={mockBook1} onClose={handleClose} />);

    const closeBtn = screen.getByTestId('flipbook-modal-close-btn');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('SCÉNARIO 4 : Ouvrir plusieurs Flipbooks successivement avec correspondance exacte', () => {
    const { rerender } = render(<FlipbookModal isOpen={true} book={mockBook1} onClose={jest.fn()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Les Secrets du Vignoble Angevin' })).toBeInTheDocument();

    // Réouverture avec un 2e livre différent
    rerender(<FlipbookModal isOpen={true} book={mockBook2} onClose={jest.fn()} />);
    expect(screen.getByRole('heading', { level: 2, name: "Poésies et Ballades d'Anjou" })).toBeInTheDocument();
    expect(screen.getByText('Poésies')).toBeInTheDocument();
  });

  test('SCÉNARIO 5 : Clic sur l\'arrière-plan assombri (overlay) ferme la fenêtre', () => {
    const handleClose = jest.fn();
    render(<FlipbookModal isOpen={true} book={mockBook1} onClose={handleClose} />);

    const overlay = screen.getByTestId('flipbook-modal-overlay');
    // Déclenchement sur mousedown
    fireEvent.mouseDown(overlay);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('SCÉNARIO 6 : Clic à l\'intérieur de la boîte de dialogue ne ferme pas la fenêtre', () => {
    const handleClose = jest.fn();
    render(<FlipbookModal isOpen={true} book={mockBook1} onClose={handleClose} />);

    const dialog = screen.getByTestId('flipbook-modal-dialog');
    fireEvent.mouseDown(dialog);

    expect(handleClose).not.toHaveBeenCalled();
  });

  test('SCÉNARIO 8 : Fermeture via la touche Échap (Escape)', () => {
    const handleClose = jest.fn();
    render(<FlipbookModal isOpen={true} book={mockBook1} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('SCÉNARIO 9 : Verrouillage du scroll du body et restauration exacte sans à-coup', () => {
    window.scrollY = 350;
    const { unmount } = render(<FlipbookModal isOpen={true} book={mockBook1} onClose={jest.fn()} />);

    // Le body doit être verrouillé
    expect(document.body.style.overflow).toBe('hidden');

    // Démonter (fermeture de la modale)
    unmount();

    // Le body doit être déverrouillé
    expect(document.body.style.overflow).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 350 }));
  });

  test('SCÉNARIO 10 : Restauration du focus clavier sur l\'élément déclencheur (WCAG 2.2 AA)', () => {
    const triggerButton = document.createElement('button');
    triggerButton.id = 'mon-declencheur';
    document.body.appendChild(triggerButton);
    triggerButton.focus();

    const triggerRef = { current: triggerButton };
    const { unmount } = render(
      <FlipbookModal 
        isOpen={true} 
        book={mockBook1} 
        onClose={jest.fn()} 
        triggerRef={triggerRef} 
      />
    );

    unmount();

    expect(document.activeElement).toBe(triggerButton);
    document.body.removeChild(triggerButton);
  });

  test('Retourne null si isOpen est faux ou aucun livre n\'est fourni', () => {
    const { container, rerender } = render(<FlipbookModal isOpen={false} book={mockBook1} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();

    rerender(<FlipbookModal isOpen={true} book={null} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
