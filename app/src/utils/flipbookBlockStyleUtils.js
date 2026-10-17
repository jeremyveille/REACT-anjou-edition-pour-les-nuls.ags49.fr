/**
 * Utilitaires pour le calcul, la validation et l'application des contours et des ombres
 * des blocs de barres latérales de Flipbook (Anjou Édition).
 * 
 * 100% Vanilla CSS pur et propriétés CSS natives :
 * border, border-width, border-style, border-color, border-radius, box-shadow.
 */

/**
 * Préréglages d'ombre standard
 */
export const SHADOW_PRESETS = {
  none: {
    id: 'none',
    label: 'Aucune',
    shadowEnabled: false,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowSpread: 0,
    shadowOpacity: 0,
    shadowColor: '#0f172a',
    shadowInset: false
  },
  subtle: {
    id: 'subtle',
    label: 'Légère',
    shadowEnabled: true,
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    shadowBlur: 4,
    shadowSpread: 0,
    shadowOpacity: 6,
    shadowColor: '#0f172a',
    shadowInset: false
  },
  medium: {
    id: 'medium',
    label: 'Moyenne',
    shadowEnabled: true,
    shadowOffsetX: 0,
    shadowOffsetY: 4,
    shadowBlur: 12,
    shadowSpread: -2,
    shadowOpacity: 10,
    shadowColor: '#0f172a',
    shadowInset: false
  },
  elevated: {
    id: 'elevated',
    label: 'Prononcée',
    shadowEnabled: true,
    shadowOffsetX: 0,
    shadowOffsetY: 12,
    shadowBlur: 24,
    shadowSpread: -4,
    shadowOpacity: 18,
    shadowColor: '#0f172a',
    shadowInset: false
  }
};

/**
 * Styles de contour CSS supportés avec leurs libellés français
 */
export const BORDER_STYLES = [
  { value: 'solid', label: 'Continu' },
  { value: 'dotted', label: 'Pointillé' },
  { value: 'dashed', label: 'Tirets' },
  { value: 'none', label: 'Aucun' }
];

/**
 * Borne une valeur numérique entre min et max
 */
export function clamp(value, min, max, defaultValue = min) {
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  return Math.max(min, Math.min(max, num));
}

/**
 * Convertit une couleur Hex (#ffffff, #fff, etc.) et une opacité en pourcentage (0-100) en chaîne rgba(...)
 */
export function hexToRgba(hex = '#0f172a', opacityPercent = 10) {
  if (!hex || typeof hex !== 'string') {
    return `rgba(15, 23, 42, ${(clamp(opacityPercent, 0, 100, 10) / 100).toFixed(2)})`;
  }
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) {
    return `rgba(15, 23, 42, ${(clamp(opacityPercent, 0, 100, 10) / 100).toFixed(2)})`;
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const alpha = (clamp(opacityPercent, 0, 100, 10) / 100);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

/**
 * Extrait un entier en pixels depuis une valeur potentiellement formatée ('14px', 14, 'normal', etc.)
 */
export function parseRadiusNumber(raw, fallback = 14) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw === 'number') return clamp(raw, 0, 40, fallback);
  if (raw === 'none') return 0;
  if (raw === 'rounded') return 8;
  if (raw === 'normal') return 14;
  if (raw === 'pill') return 20;
  const parsed = parseInt(String(raw).replace('px', '').trim(), 10);
  if (isNaN(parsed)) return fallback;
  return clamp(parsed, 0, 40, fallback);
}

/**
 * Normalise l'objet style d'un bloc avec des valeurs par défaut cohérentes et sécurisées
 */
export function normalizeBlockStyle(style = {}) {
  const s = style || {};

  // Arrondi
  const borderRadius = parseRadiusNumber(s.borderRadius, 14);

  // Contours
  const borderSidesUniform = s.borderSidesUniform !== false; // true par défaut
  const borderWidth = s.borderWidth !== undefined ? clamp(s.borderWidth, 0, 12, 1) : 1;
  const borderTopWidth = s.borderTopWidth !== undefined ? clamp(s.borderTopWidth, 0, 12, 1) : borderWidth;
  const borderRightWidth = s.borderRightWidth !== undefined ? clamp(s.borderRightWidth, 0, 12, 1) : borderWidth;
  const borderBottomWidth = s.borderBottomWidth !== undefined ? clamp(s.borderBottomWidth, 0, 12, 1) : borderWidth;
  const borderLeftWidth = s.borderLeftWidth !== undefined ? clamp(s.borderLeftWidth, 0, 12, 1) : borderWidth;
  const borderStyle = s.borderStyle || (s.borderWidth === 0 ? 'none' : 'solid');
  const borderColor = s.borderColor || '#e2e8f0';

  // Ombres
  let shadowEnabled = s.shadowEnabled;
  if (shadowEnabled === undefined) {
    if (s.shadow === 'none') {
      shadowEnabled = false;
    } else if (s.shadow === 'subtle' || s.shadow === 'elevated') {
      shadowEnabled = true;
    } else {
      shadowEnabled = true; // par défaut activé avec ombre moyenne
    }
  } else {
    shadowEnabled = Boolean(shadowEnabled);
  }

  // Si ombre legacy définie
  let defaultX = 0;
  let defaultY = 4;
  let defaultBlur = 12;
  let defaultSpread = -2;
  let defaultOpacity = 10;
  if (s.shadow === 'subtle') {
    defaultY = 2;
    defaultBlur = 4;
    defaultSpread = 0;
    defaultOpacity = 6;
  } else if (s.shadow === 'elevated') {
    defaultY = 12;
    defaultBlur = 24;
    defaultSpread = -4;
    defaultOpacity = 18;
  }

  const shadowOffsetX = s.shadowOffsetX !== undefined ? clamp(s.shadowOffsetX, -30, 30, 0) : defaultX;
  const shadowOffsetY = s.shadowOffsetY !== undefined ? clamp(s.shadowOffsetY, -30, 30, 4) : defaultY;
  const shadowBlur = s.shadowBlur !== undefined ? clamp(s.shadowBlur, 0, 60, 12) : defaultBlur;
  const shadowSpread = s.shadowSpread !== undefined ? clamp(s.shadowSpread, -20, 30, -2) : defaultSpread;
  const shadowOpacity = s.shadowOpacity !== undefined ? clamp(s.shadowOpacity, 0, 100, 10) : defaultOpacity;
  const shadowColor = s.shadowColor || '#0f172a';
  const shadowInset = Boolean(s.shadowInset);

  return {
    ...s,
    borderRadius,
    borderSidesUniform,
    borderWidth,
    borderTopWidth,
    borderRightWidth,
    borderBottomWidth,
    borderLeftWidth,
    borderStyle,
    borderColor,
    shadowEnabled,
    shadowOffsetX,
    shadowOffsetY,
    shadowBlur,
    shadowSpread,
    shadowOpacity,
    shadowColor,
    shadowInset
  };
}

/**
 * Calcule la chaîne CSS native pour la propriété box-shadow
 */
export function computeBoxShadowCss(style = {}) {
  const norm = normalizeBlockStyle(style);
  if (!norm.shadowEnabled) {
    return 'none';
  }

  const colorRgba = hexToRgba(norm.shadowColor, norm.shadowOpacity);
  const insetValue = norm.shadowInset ? 'inset ' : '';
  return `${insetValue}${norm.shadowOffsetX}px ${norm.shadowOffsetY}px ${norm.shadowBlur}px ${norm.shadowSpread}px ${colorRgba}`;
}

/**
 * Calcule les propriétés CSS de contour pour un bloc
 */
export function computeBorderCssProperties(style = {}) {
  const norm = normalizeBlockStyle(style);
  const result = {};

  // Arrondi des angles (0 à 40 px)
  result.borderRadius = `${norm.borderRadius}px`;

  // Si le style de bordure est explicitement 'none'
  if (norm.borderStyle === 'none') {
    result.border = 'none';
    result.borderWidth = '0px';
    result.borderStyle = 'none';
    return result;
  }

  // Côtés uniformes ou indépendants
  if (norm.borderSidesUniform) {
    if (norm.borderWidth === 0) {
      result.border = 'none';
      result.borderWidth = '0px';
      result.borderStyle = 'none';
    } else {
      result.borderWidth = `${norm.borderWidth}px`;
      result.borderStyle = norm.borderStyle;
      result.borderColor = norm.borderColor;
    }
  } else {
    // 4 côtés séparés
    const top = norm.borderTopWidth;
    const right = norm.borderRightWidth;
    const bottom = norm.borderBottomWidth;
    const left = norm.borderLeftWidth;

    if (top === 0 && right === 0 && bottom === 0 && left === 0) {
      result.border = 'none';
      result.borderWidth = '0px';
      result.borderStyle = 'none';
    } else {
      result.borderTopWidth = `${top}px`;
      result.borderRightWidth = `${right}px`;
      result.borderBottomWidth = `${bottom}px`;
      result.borderLeftWidth = `${left}px`;
      result.borderStyle = norm.borderStyle;
      result.borderColor = norm.borderColor;
    }
  }

  return result;
}

/**
 * Calcule l'intégralité du style inline appliqué à une carte de bloc Flipbook
 * (compatible rétroactivement avec les blocs legacy)
 */
export function computeBlockCustomStyles(block) {
  if (!block) return {};

  const customStyle = {};
  const bStyle = block.style || {};

  // 1. Couleurs et alignement existants
  const bg = bStyle.backgroundColor || block.backgroundColor;
  const txtColor = bStyle.textColor || block.textColor;
  const align = bStyle.textAlign || block.textAlign;

  if (bg) customStyle.backgroundColor = bg;
  if (txtColor) {
    customStyle.color = txtColor;
    customStyle['--text-main'] = txtColor;
    customStyle['--text-muted'] = txtColor;
  }
  if (align && ['left', 'center', 'right'].includes(align)) {
    customStyle.textAlign = align;
  }

  // 2. Contours et arrondis (nouveaux paramètres + rétrocompatibilité)
  const hasModernBorder = (
    bStyle.borderWidth !== undefined ||
    bStyle.borderStyle !== undefined ||
    bStyle.borderTopWidth !== undefined ||
    bStyle.borderSidesUniform !== undefined ||
    (typeof bStyle.borderRadius === 'number' || (typeof bStyle.borderRadius === 'string' && /^\d+/.test(bStyle.borderRadius)))
  );

  if (hasModernBorder) {
    const borderProps = computeBorderCssProperties(bStyle);
    Object.assign(customStyle, borderProps);
  } else {
    // Rétrocompatibilité totale pour les anciens blocs
    const legacyBorderColor = bStyle.borderColor || block.borderColor;
    if (legacyBorderColor) customStyle.borderColor = legacyBorderColor;

    const legacyRadius = bStyle.borderRadius || block.borderRadius;
    if (legacyRadius === 'none') customStyle.borderRadius = '0px';
    else if (legacyRadius === 'rounded') customStyle.borderRadius = '8px';
    else if (legacyRadius === 'normal') customStyle.borderRadius = '14px';
    else if (legacyRadius === 'pill') customStyle.borderRadius = '20px';
    else if (legacyRadius) customStyle.borderRadius = `${parseRadiusNumber(legacyRadius, 14)}px`;
  }

  // 3. Ombres (nouveaux paramètres + rétrocompatibilité)
  const hasModernShadow = (
    bStyle.shadowEnabled !== undefined ||
    bStyle.shadowOffsetX !== undefined ||
    bStyle.shadowOffsetY !== undefined ||
    bStyle.shadowBlur !== undefined ||
    bStyle.shadowSpread !== undefined ||
    bStyle.shadowOpacity !== undefined ||
    bStyle.shadowColor !== undefined ||
    bStyle.shadowInset !== undefined
  );

  if (hasModernShadow) {
    customStyle.boxShadow = computeBoxShadowCss(bStyle);
  } else {
    // Rétrocompatibilité legacy
    const legacyShadow = bStyle.shadow || block.shadow;
    if (legacyShadow === 'none') customStyle.boxShadow = 'none';
    else if (legacyShadow === 'subtle') customStyle.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.05)';
    else if (legacyShadow === 'elevated') customStyle.boxShadow = '0 12px 24px -4px rgba(15, 23, 42, 0.14)';
    else if (legacyShadow === 'default') customStyle.boxShadow = '0 4px 12px -2px rgba(15, 23, 42, 0.05)';
  }

  return customStyle;
}

/**
 * Applique un style homogène (contours, arrondis, couleurs, ombres) à tous les blocs d'une liste
 */
export function applyStyleToAllBlocks(blocks = [], targetStyle = {}) {
  if (!Array.isArray(blocks)) return [];
  return blocks.map(block => {
    if (!block || typeof block !== 'object') return block;
    const currentStyle = block.style || {};
    return {
      ...block,
      style: {
        ...currentStyle,
        ...(targetStyle.borderWidth !== undefined ? { borderWidth: targetStyle.borderWidth } : {}),
        ...(targetStyle.borderStyle !== undefined ? { borderStyle: targetStyle.borderStyle } : {}),
        ...(targetStyle.borderColor !== undefined ? { borderColor: targetStyle.borderColor } : {}),
        ...(targetStyle.borderRadius !== undefined ? { borderRadius: targetStyle.borderRadius } : {}),
        ...(targetStyle.borderSidesUniform !== undefined ? { borderSidesUniform: targetStyle.borderSidesUniform } : {}),
        ...(targetStyle.backgroundColor !== undefined ? { backgroundColor: targetStyle.backgroundColor } : {}),
        ...(targetStyle.textColor !== undefined ? { textColor: targetStyle.textColor } : {}),
        ...(targetStyle.shadowEnabled !== undefined ? { shadowEnabled: targetStyle.shadowEnabled } : {}),
        ...(targetStyle.shadow !== undefined ? { shadow: targetStyle.shadow } : {}),
        ...(targetStyle.shadowOffsetX !== undefined ? { shadowOffsetX: targetStyle.shadowOffsetX } : {}),
        ...(targetStyle.shadowOffsetY !== undefined ? { shadowOffsetY: targetStyle.shadowOffsetY } : {}),
        ...(targetStyle.shadowBlur !== undefined ? { shadowBlur: targetStyle.shadowBlur } : {}),
        ...(targetStyle.shadowSpread !== undefined ? { shadowSpread: targetStyle.shadowSpread } : {}),
        ...(targetStyle.shadowOpacity !== undefined ? { shadowOpacity: targetStyle.shadowOpacity } : {}),
        ...(targetStyle.shadowColor !== undefined ? { shadowColor: targetStyle.shadowColor } : {}),
        ...(targetStyle.shadowInset !== undefined ? { shadowInset: targetStyle.shadowInset } : {})
      }
    };
  });
}
