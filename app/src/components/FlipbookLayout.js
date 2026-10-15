import React from 'react';
import FlipbookSidebar from './FlipbookSidebar';
import { resolveFlipbookSidebar } from '../services/flipbookSidebarService';

/**
 * Mise en page 3 colonnes autour du lecteur Flipbook.
 * [ BARRE GAUCHE ] [ FLIPBOOK ] [ BARRE DROITE ]
 * 
 * Supporte le modèle global et les configurations personnalisées avec :
 * - Largeurs dynamiques (gauche & droite)
 * - Typographie et couleurs personnalisables
 * - Espacements et arrondis ajustables
 * - Visibilité responsive par palier (Desktop, Tablette, Mobile)
 * - Priorité absolue au lecteur sur petit écran (order: 1)
 */
export default function FlipbookLayout({ book, children, globalSidebar = null }) {
  const resolved = resolveFlipbookSidebar(book, globalSidebar);
  const leftBlocks = Array.isArray(resolved.leftSidebar) ? resolved.leftSidebar : [];
  const rightBlocks = Array.isArray(resolved.rightSidebar) ? resolved.rightSidebar : [];
  const styles = resolved.styles || {};

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

  // Classes de visibilité responsive par palier
  const leftVisibility = styles?.visibility?.left || {};
  const rightVisibility = styles?.visibility?.right || {};

  const leftColumnClasses = [
    'flipbook-sidebar-column',
    'flipbook-sidebar-left-wrapper',
    leftVisibility.desktop === false ? 'ae-hide-desktop' : '',
    leftVisibility.tablet === false ? 'ae-hide-tablet' : '',
    leftVisibility.mobile === false ? 'ae-hide-mobile' : ''
  ].filter(Boolean).join(' ');

  const rightColumnClasses = [
    'flipbook-sidebar-column',
    'flipbook-sidebar-right-wrapper',
    rightVisibility.desktop === false ? 'ae-hide-desktop' : '',
    rightVisibility.tablet === false ? 'ae-hide-tablet' : '',
    rightVisibility.mobile === false ? 'ae-hide-mobile' : ''
  ].filter(Boolean).join(' ');

  // Propriétés CSS inline pour le style personnalisé
  const containerStyle = {};
  if (styles.leftWidth) containerStyle['--sidebar-left-width'] = `${styles.leftWidth}%`;
  if (styles.rightWidth) containerStyle['--sidebar-right-width'] = `${styles.rightWidth}%`;
  if (styles.maxWidth) containerStyle.maxWidth = `${styles.maxWidth}px`;
  if (styles.backgroundColor) containerStyle.backgroundColor = styles.backgroundColor;
  if (styles.primaryColor) containerStyle['--primary'] = styles.primaryColor;
  if (styles.cardBackground) containerStyle['--bg-card'] = styles.cardBackground;
  if (styles.cardBorderColor) containerStyle['--border'] = styles.cardBorderColor;
  if (styles.textColor) containerStyle['--text-main'] = styles.textColor;

  if (styles.gap === 'compact') containerStyle['--flipbook-sidebar-gap'] = '0.75rem';
  else if (styles.gap === 'relaxed') containerStyle['--flipbook-sidebar-gap'] = '1.75rem';

  if (styles.borderRadius === 'rounded') containerStyle['--flipbook-card-radius'] = '8px';
  else if (styles.borderRadius === 'pill') containerStyle['--flipbook-card-radius'] = '20px';

  if (styles.fontFamily === 'serif') containerStyle.fontFamily = 'Georgia, "Times New Roman", serif';
  else if (styles.fontFamily === 'sans-serif') containerStyle.fontFamily = 'system-ui, -apple-system, sans-serif';

  return (
    <div 
      className={`flipbook-layout-wrapper ${layoutClass}`} 
      style={containerStyle}
      data-testid="flipbook-layout-wrapper"
      data-sidebar-mode={resolved.mode}
    >
      {hasActiveLeft && (
        <div className={leftColumnClasses} data-testid="flipbook-left-sidebar-col">
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
        <div className={rightColumnClasses} data-testid="flipbook-right-sidebar-col">
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
