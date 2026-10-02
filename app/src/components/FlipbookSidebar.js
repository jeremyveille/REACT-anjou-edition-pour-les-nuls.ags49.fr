import React from 'react';
import FlipbookSidebarBlock from './FlipbookSidebarBlock';

/**
 * Composant de barre latérale pour Flipbook (gauche ou droite).
 * Filtre les blocs désactivés et gère la sémantique accessible.
 */
export default function FlipbookSidebar({ position = 'left', blocks = [], bookTitle = '' }) {
  const activeBlocks = (blocks || []).filter(block => block && block.enabled !== false);

  if (activeBlocks.length === 0) {
    return null;
  }

  const label = position === 'left' 
    ? `Barre latérale gauche d'informations : ${bookTitle || 'Ouvrage'}`
    : `Barre latérale droite d'informations : ${bookTitle || 'Ouvrage'}`;

  return (
    <aside 
      className={`flipbook-sidebar flipbook-sidebar-${position}`}
      aria-label={label}
    >
      <div className="flipbook-sidebar-inner">
        {activeBlocks.map((block, idx) => (
          <FlipbookSidebarBlock 
            key={block.id || `${position}-block-${idx}`} 
            block={block} 
          />
        ))}
      </div>
    </aside>
  );
}
