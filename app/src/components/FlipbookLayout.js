import React, { useState, useEffect } from 'react';
import FlipbookSidebar from './FlipbookSidebar';
import {
  resolveFlipbookSidebar,
  getLocalGlobalSidebar,
  GLOBAL_SIDEBAR_EVENT
} from '../services/flipbookSidebarService';

const mapGapValue = (gap) => {
  if (gap === 'compact') return '0.75rem';
  if (gap === 'relaxed') return '1.75rem';
  if (gap === 'normal') return '1.25rem';
  return null;
};

const mapPaddingValue = (padding) => {
  if (padding === 'compact') return '0.75rem';
  if (padding === 'relaxed') return '1.5rem';
  if (padding === 'normal') return '1.15rem';
  return null;
};

const mapRadiusValue = (radius) => {
  if (radius === 'none') return '0px';
  if (radius === 'rounded') return '8px';
  if (radius === 'pill') return '20px';
  if (radius === 'normal') return '14px';
  return null;
};

const mapShadowValue = (shadow) => {
  if (shadow === 'none') return 'none';
  if (shadow === 'subtle') return '0 1px 3px rgba(15, 23, 42, 0.05)';
  if (shadow === 'elevated') return '0 12px 24px -4px rgba(15, 23, 42, 0.14)';
  if (shadow === 'default') return '0 4px 12px -2px rgba(15, 23, 42, 0.05)';
  return null;
};

const buildSideSpecificStyle = (sideCfg = {}) => {
  const st = {};
  if (!sideCfg || typeof sideCfg !== 'object') return st;

  if (sideCfg.backgroundColor) {
    st.backgroundColor = sideCfg.backgroundColor;
    st.padding = '0.75rem';
    st.borderRadius = '12px';
  }
  if (sideCfg.cardBackground) st['--bg-card'] = sideCfg.cardBackground;
  if (sideCfg.cardBorderColor) st['--border'] = sideCfg.cardBorderColor;
  if (sideCfg.primaryColor) st['--primary'] = sideCfg.primaryColor;
  if (sideCfg.textColor) st['--text-main'] = sideCfg.textColor;
  if (sideCfg.textAlign && ['left', 'center', 'right'].includes(sideCfg.textAlign)) {
    st['--flipbook-text-align'] = sideCfg.textAlign;
  }

  if (sideCfg.gap && sideCfg.gap !== 'inherit') {
    const g = mapGapValue(sideCfg.gap);
    if (g) st['--flipbook-sidebar-gap'] = g;
  }
  if (sideCfg.cardPadding && sideCfg.cardPadding !== 'inherit') {
    const p = mapPaddingValue(sideCfg.cardPadding);
    if (p) st['--flipbook-card-padding'] = p;
  }
  if (sideCfg.borderRadius && sideCfg.borderRadius !== 'inherit') {
    const r = mapRadiusValue(sideCfg.borderRadius);
    if (r) st['--flipbook-card-radius'] = r;
  }
  if (sideCfg.cardShadow && sideCfg.cardShadow !== 'inherit') {
    const sh = mapShadowValue(sideCfg.cardShadow);
    if (sh !== null) st['--card-shadow'] = sh;
  }

  return st;
};

/**
 * Mise en page 3 colonnes autour du lecteur Flipbook.
 * [ BARRE GAUCHE ] [ FLIPBOOK ] [ BARRE DROITE ]
 * 
 * Supporte le modèle global et les configurations personnalisées avec :
 * - Largeurs dynamiques (gauche & droite)
 * - Typographie, alignement et couleurs personnalisables globalement et par barre
 * - Espacements, bordures, ombres et arrondis ajustables
 * - Visibilité responsive par palier (XL, Desktop L, Tablette M, Mobile S)
 * - Priorité absolue au lecteur sur petit écran (order: 1)
 */
export default function FlipbookLayout({ book, children, globalSidebar = null }) {
  const [syncedGlobal, setSyncedGlobal] = useState(() => getLocalGlobalSidebar());

  useEffect(() => {
    const handleGlobalUpdate = (e) => {
      if (e && e.detail) {
        setSyncedGlobal(e.detail);
      } else {
        setSyncedGlobal(getLocalGlobalSidebar());
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(GLOBAL_SIDEBAR_EVENT, handleGlobalUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(GLOBAL_SIDEBAR_EVENT, handleGlobalUpdate);
      }
    };
  }, []);

  const effectiveGlobal = globalSidebar || syncedGlobal;
  const resolved = resolveFlipbookSidebar(book, effectiveGlobal);
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

  // Classes de visibilité responsive par palier (S, M, L, XL)
  const leftVisibility = styles?.visibility?.left || {};
  const rightVisibility = styles?.visibility?.right || {};

  const leftAlign = styles?.left?.textAlign || styles?.textAlign || 'left';
  const rightAlign = styles?.right?.textAlign || styles?.textAlign || 'left';

  const leftColumnClasses = [
    'flipbook-sidebar-column',
    'flipbook-sidebar-left-wrapper',
    `flipbook-align-${leftAlign}`,
    leftVisibility.xl === false ? 'ae-hide-xl' : '',
    leftVisibility.desktop === false ? 'ae-hide-desktop' : '',
    leftVisibility.tablet === false ? 'ae-hide-tablet' : '',
    leftVisibility.mobile === false ? 'ae-hide-mobile' : ''
  ].filter(Boolean).join(' ');

  const rightColumnClasses = [
    'flipbook-sidebar-column',
    'flipbook-sidebar-right-wrapper',
    `flipbook-align-${rightAlign}`,
    rightVisibility.xl === false ? 'ae-hide-xl' : '',
    rightVisibility.desktop === false ? 'ae-hide-desktop' : '',
    rightVisibility.tablet === false ? 'ae-hide-tablet' : '',
    rightVisibility.mobile === false ? 'ae-hide-mobile' : ''
  ].filter(Boolean).join(' ');

  // Propriétés CSS inline globales pour le conteneur
  const containerStyle = {};
  if (styles.leftWidth) containerStyle['--sidebar-left-width'] = `${styles.leftWidth}%`;
  if (styles.rightWidth) containerStyle['--sidebar-right-width'] = `${styles.rightWidth}%`;
  if (styles.maxWidth) containerStyle.maxWidth = `${styles.maxWidth}px`;
  if (styles.backgroundColor) containerStyle.backgroundColor = styles.backgroundColor;
  if (styles.primaryColor) containerStyle['--primary'] = styles.primaryColor;
  if (styles.cardBackground) containerStyle['--bg-card'] = styles.cardBackground;
  if (styles.cardBorderColor) containerStyle['--border'] = styles.cardBorderColor;
  if (styles.textColor) containerStyle['--text-main'] = styles.textColor;
  if (styles.textAlign) containerStyle['--flipbook-text-align'] = styles.textAlign;

  const globalGap = mapGapValue(styles.gap);
  if (globalGap) containerStyle['--flipbook-sidebar-gap'] = globalGap;

  const globalPadding = mapPaddingValue(styles.cardPadding);
  if (globalPadding) containerStyle['--flipbook-card-padding'] = globalPadding;

  const globalRadius = mapRadiusValue(styles.borderRadius);
  if (globalRadius) containerStyle['--flipbook-card-radius'] = globalRadius;

  const globalShadow = mapShadowValue(styles.cardShadow);
  if (globalShadow !== null) containerStyle['--card-shadow'] = globalShadow;

  if (styles.fontFamily === 'serif') containerStyle.fontFamily = 'Georgia, "Times New Roman", serif';
  else if (styles.fontFamily === 'sans-serif') containerStyle.fontFamily = 'system-ui, -apple-system, sans-serif';

  if (styles.fontSize === 'compact') containerStyle['--flipbook-font-scale'] = '0.92';
  else if (styles.fontSize === 'relaxed') containerStyle['--flipbook-font-scale'] = '1.08';

  // Styles indépendants par barre (Gauche vs Droite)
  const leftColStyle = buildSideSpecificStyle(styles.left);
  const rightColStyle = buildSideSpecificStyle(styles.right);

  return (
    <div 
      className={`flipbook-layout-wrapper ${layoutClass}`} 
      style={containerStyle}
      data-testid="flipbook-layout-wrapper"
      data-sidebar-mode={resolved.mode}
    >
      {hasActiveLeft && (
        <div 
          className={leftColumnClasses} 
          style={leftColStyle}
          data-testid="flipbook-left-sidebar-col"
        >
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
        <div 
          className={rightColumnClasses} 
          style={rightColStyle}
          data-testid="flipbook-right-sidebar-col"
        >
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
