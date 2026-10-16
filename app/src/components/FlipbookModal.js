import React, { useEffect, useRef } from 'react';
import { X, BookOpen, ArrowLeft } from 'lucide-react';
import PdfFlipbookReader from './PdfFlipbookReader';
import FlipbookLayout from './FlipbookLayout';

/**
 * FlipbookModal — Lecteur de Flipbook en place (in-page reader).
 * S'affiche directement sous le header et le menu de navigation de la page principale
 * sans modifier la mise en page générale du site.
 * 
 * Conforme WCAG 2.2 AA :
 * - Navigation fluide sans verrouillage invasif du scrollbar
 * - Header et menu principal restent 100% accessibles et interactifs
 * - Changement instantané du PDF lors du clic sur un nouveau titre
 * - Bouton explicite pour revenir à la page d'accueil à tout moment
 * - Fermeture possible via la touche Échap
 */
export default function FlipbookModal({
  isOpen,
  book,
  onClose,
  onBackToHome = null,
  triggerRef = null
}) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Défilement doux vers le lecteur lors de l'ouverture ou du changement d'ouvrage
  useEffect(() => {
    if (!isOpen || !book) return;

    const timer = setTimeout(() => {
      if (dialogRef.current && typeof dialogRef.current.scrollIntoView === 'function') {
        try {
          dialogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          // Fallback
        }
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen, book?.id]);

  // Écoute de la touche Échap pour fermer le lecteur
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !book) return null;

  const handleReturnHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="ae-flipbook-inpage-wrapper"
      role="presentation"
      data-testid="flipbook-modal-overlay"
    >
      <div
        ref={dialogRef}
        className="ae-flipbook-modal-dialog ae-flipbook-inpage-dialog"
        role="region"
        aria-label={`Consultation de l'ouvrage : ${book.title || 'Flipbook'}`}
        data-testid="flipbook-modal-dialog"
      >
        {/* Barre d'en-tête de la consultation intégrée */}
        <header className="ae-flipbook-modal-header ae-flipbook-inpage-header">
          <div className="ae-flipbook-modal-info">
            <span className="ae-flipbook-modal-badge">
              <BookOpen size={14} aria-hidden="true" />
              {book.category || 'Flipbook'}
            </span>
            <h2 id="ae-flipbook-modal-title" className="ae-flipbook-modal-title">
              {book.title}
            </h2>
            {book.author && (
              <span className="ae-flipbook-author-tag">
                • Par {book.author}
              </span>
            )}
            {book.date && (
              <span className="ae-flipbook-date-tag">
                ({book.date})
              </span>
            )}
          </div>

          <div className="ae-flipbook-inpage-actions">
            {/* Bouton pour revenir à la page d'accueil */}
            <button
              type="button"
              onClick={handleReturnHome}
              className="ae-flipbook-back-home-btn"
              aria-label="Revenir à la page d'accueil"
              title="Fermer le lecteur et revenir à l'accueil"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Retour à l'accueil</span>
            </button>

            {/* Bouton Fermer accessible */}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="ae-flipbook-modal-close-btn"
              aria-label={`Fermer la consultation de ${book.title}`}
              title="Fermer le lecteur (Échap)"
              data-testid="flipbook-modal-close-btn"
            >
              <X size={18} aria-hidden="true" />
              <span className="ae-flipbook-modal-close-text">Fermer</span>
            </button>
          </div>
        </header>

        {/* Corps du lecteur : barres latérales configurables et lecteur de PDF */}
        <div className="ae-flipbook-modal-body" data-testid="flipbook-modal-body">
          <FlipbookLayout book={book}>
            <PdfFlipbookReader 
              book={book} 
              onClose={onClose} 
            />
          </FlipbookLayout>
        </div>
      </div>
    </div>
  );
}
