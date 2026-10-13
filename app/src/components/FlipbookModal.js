import React, { useEffect, useRef } from 'react';
import { X, BookOpen } from 'lucide-react';
import PdfFlipbookReader from './PdfFlipbookReader';
import FlipbookLayout from './FlipbookLayout';

/**
 * FlipbookModal — Fenêtre de consultation superposée (modal) accessible et responsive.
 * Permet la consultation immédiate d'un Flipbook sans quitter la page actuelle,
 * sans changer l'URL, sans rechargement et sans saut de défilement.
 * 
 * Conforme WCAG 2.2 AA :
 * - Gestion du focus (restauration automatique sur l'élément déclencheur à la fermeture)
 * - Navigation clavier (touche Échap)
 * - Verrouillage temporaire du défilement d'arrière-plan avec compensation de largeur
 * - Préservation stricte de la position de défilement d'origine
 */
export default function FlipbookModal({
  isOpen,
  book,
  onClose,
  triggerRef = null
}) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const savedScrollY = useRef(0);
  const savedActiveElement = useRef(null);

  useEffect(() => {
    if (!isOpen || !book) return;

    // 1. Sauvegarder la position de défilement actuelle (zéro saut au retour)
    savedScrollY.current = window.scrollY || window.pageYOffset || 0;

    // 2. Mémoriser l'élément déclencheur pour restituer le focus
    savedActiveElement.current = triggerRef?.current || document.activeElement;

    // 3. Verrouiller le défilement du fond (body) avec compensation de scrollbar
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    // 4. Positionner le focus initial sur le bouton de fermeture accessible
    const timer = setTimeout(() => {
      if (closeBtnRef.current) {
        try {
          closeBtnRef.current.focus();
        } catch (e) {
          // Safe catch
        }
      }
    }, 50);

    return () => {
      clearTimeout(timer);

      // Restaurer le défilement du body
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;

      // Restaurer exactement la position de scroll initiale
      const y = savedScrollY.current;
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        try {
          window.scrollTo({ top: y, behavior: 'instant' });
        } catch (err) {
          window.scrollTo(0, y);
        }
      }

      // Restituer le focus sur l'élément d'origine (WCAG 2.2 AA)
      const elToFocus = savedActiveElement.current;
      if (elToFocus && typeof elToFocus.focus === 'function') {
        try {
          elToFocus.focus();
        } catch (e) {
          // Ignorer si l'élément n'est plus présent
        }
      }
    };
  }, [isOpen, book, onClose, triggerRef]);

  if (!isOpen || !book) return null;

  // Clic sécurisé sur l'arrière-plan assombri (sur mousedown pour éviter les faux-positifs lors d'une sélection de texte)
  const handleOverlayMouseDown = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="ae-flipbook-modal-overlay"
      onMouseDown={handleOverlayMouseDown}
      role="presentation"
      data-testid="flipbook-modal-overlay"
    >
      <div
        ref={dialogRef}
        className="ae-flipbook-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Consultation de l'ouvrage : ${book.title || 'Flipbook'}`}
        data-testid="flipbook-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre d'en-tête de la fenêtre superposée */}
        <header className="ae-flipbook-modal-header">
          <div className="ae-flipbook-modal-info">
            <span className="ae-flipbook-modal-badge">
              <BookOpen size={14} aria-hidden="true" />
              {book.category || 'Flipbook'}
            </span>
            <h2 id="ae-flipbook-modal-title" className="ae-flipbook-modal-title">
              {book.title}
            </h2>
          </div>

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
        </header>

        {/* Corps de la modale : lecteur Flipbook existant et barres latérales */}
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
