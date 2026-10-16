import React, { useEffect, useRef } from 'react';
import PdfFlipbookReader from './PdfFlipbookReader';
import FlipbookLayout from './FlipbookLayout';

/**
 * FlipbookModal — Lecteur de Flipbook intégré en place (in-page reader).
 * S'affiche directement sous le header et le menu de navigation de la page principale
 * sans barre supérieure redondante (suppression complète de l'en-tête et du cadre blanc supérieur).
 * 
 * Conforme WCAG 2.2 AA :
 * - Navigation fluide sans barre d'en-tête externe superflue
 * - Header et menu principal restent 100% accessibles et interactifs
 * - Changement instantané du PDF lors du clic sur un nouveau titre
 * - Fermeture possible via le bouton Fermer de la barre d'outils du lecteur ou via la touche Échap
 */
export default function FlipbookModal({
  isOpen,
  book,
  onClose,
  triggerRef = null,
  globalSidebar = null
}) {
  const dialogRef = useRef(null);

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
  }, [isOpen, book]);


  if (!isOpen || !book) return null;

  return (
    <div
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
        {/* Corps du lecteur : barres latérales configurables et lecteur de PDF */}
        <div className="ae-flipbook-modal-body" data-testid="flipbook-modal-body">
          <FlipbookLayout book={book} globalSidebar={globalSidebar}>
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
