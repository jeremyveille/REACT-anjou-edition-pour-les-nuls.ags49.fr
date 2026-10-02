import React from 'react';
import FlipbookSidebar from './FlipbookSidebar';

/**
 * Mise en page 3 colonnes autour du lecteur Flipbook.
 * [ BARRE GAUCHE ] [ FLIPBOOK ] [ BARRE DROITE ]
 * 
 * Les largeurs s'adaptent automatiquement :
 * - Desktop : ~20% / ~60% / ~20%
 * - Mobile / Tablette : Disposition verticale responsive avec Flipbook prioritaire tout en haut.
 */
export default function FlipbookLayout({ book, children }) {
  const leftBlocks = Array.isArray(book?.leftSidebar) ? book.leftSidebar : [];
  const rightBlocks = Array.isArray(book?.rightSidebar) ? book.rightSidebar : [];

  const hasActiveLeft = leftBlocks.some(b => b && b.enabled !== false);
  const hasActiveRight = rightBlocks.some(b => b && b.enabled !== false);

  let layoutClass = 'has-both-sidebars';
  if (hasActiveLeft && !hasActiveRight) {
    layoutClass = 'has-left-only';
  } else if (!hasActiveLeft && hasActiveRight) {
    layoutClass = 'has-right-only';
  } else if (!hasActiveLeft && !hasActiveRight) {
    layoutClass = 'has-no-sidebars';
  }

  return (
    <div className={`flipbook-layout-wrapper ${layoutClass}`} data-testid="flipbook-layout-wrapper">
      {hasActiveLeft && (
        <div className="flipbook-sidebar-column flipbook-sidebar-left-wrapper" data-testid="flipbook-left-sidebar-col">
          <FlipbookSidebar 
            position="left" 
            blocks={leftBlocks} 
            bookTitle={book?.title || ''} 
          />
        </div>
      )}

      <div className="flipbook-main-stage" data-testid="flipbook-main-stage">
        {children}
      </div>

      {hasActiveRight && (
        <div className="flipbook-sidebar-column flipbook-sidebar-right-wrapper" data-testid="flipbook-right-sidebar-col">
          <FlipbookSidebar 
            position="right" 
            blocks={rightBlocks} 
            bookTitle={book?.title || ''} 
          />
        </div>
      )}
    </div>
  );
}
