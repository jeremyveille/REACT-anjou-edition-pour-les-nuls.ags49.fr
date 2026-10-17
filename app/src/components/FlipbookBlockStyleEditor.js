import React, { useState } from 'react';
import { 
  Square, 
  Sun, 
  Sparkles, 
  Eye
} from 'lucide-react';
import { 
  BORDER_STYLES, 
  SHADOW_PRESETS, 
  normalizeBlockStyle, 
  computeBoxShadowCss, 
  computeBorderCssProperties,
  clamp
} from '../utils/flipbookBlockStyleUtils';
import FlipbookSidebarBlock from './FlipbookSidebarBlock';

/**
 * Éditeur dédié à la personnalisation précise des contours et des ombres pour chaque bloc.
 * Comprend :
 * 1. Section Contour (épaisseur 0-12px, couleur, style solid/dotted/dashed/none, arrondi 0-40px, côtés séparés)
 * 2. Section Ombre (activer/désactiver, décalages X/Y -30 à +30px, flou 0-60px, étendue -20 à +30px, opacité 0-100%, couleur, extérieure/intérieure, 4 préréglages)
 * 3. Aperçu immédiat en temps réel du bloc
 */
export default function FlipbookBlockStyleEditor({
  block,
  position = 'left',
  index = 0,
  onChange
}) {
  const [showLivePreview, setShowLivePreview] = useState(true);

  const style = normalizeBlockStyle(block?.style || {});

  const handleUpdate = (key, value) => {
    const updatedStyle = {
      ...(block?.style || {}),
      [key]: value
    };
    onChange({
      ...block,
      style: updatedStyle
    });
  };

  const handleBatchUpdate = (updates) => {
    const updatedStyle = {
      ...(block?.style || {}),
      ...updates
    };
    onChange({
      ...block,
      style: updatedStyle
    });
  };

  // Application d'un préréglage d'ombre
  const handleApplyShadowPreset = (presetKey) => {
    const preset = SHADOW_PRESETS[presetKey];
    if (!preset) return;

    if (presetKey === 'none') {
      handleBatchUpdate({
        shadowEnabled: false,
        shadow: 'none'
      });
    } else {
      handleBatchUpdate({
        shadowEnabled: true,
        shadow: presetKey,
        shadowOffsetX: preset.shadowOffsetX,
        shadowOffsetY: preset.shadowOffsetY,
        shadowBlur: preset.shadowBlur,
        shadowSpread: preset.shadowSpread,
        shadowOpacity: preset.shadowOpacity,
        shadowColor: preset.shadowColor,
        shadowInset: preset.shadowInset
      });
    }
  };

  // Palette de couleurs de bordure rapides
  const quickBorderColors = [
    { label: 'Gris ardoise', color: '#cbd5e1' },
    { label: 'Bordure claire', color: '#e2e8f0' },
    { label: 'Bleu Anjou', color: '#1e3a8a' },
    { label: 'Ciel doux', color: '#38bdf8' },
    { label: 'Or angevin', color: '#d97706' },
    { label: 'Sauge', color: '#059669' },
    { label: 'Ardoise sombre', color: '#0f172a' },
    { label: 'Blanc', color: '#ffffff' }
  ];

  // Palette de couleurs d'ombre rapides
  const quickShadowColors = [
    { label: 'Ombre ardoise (défaut)', color: '#0f172a' },
    { label: 'Noir pur', color: '#000000' },
    { label: 'Bleu nuit', color: '#1e3a8a' },
    { label: 'Doré chaleureux', color: '#78350f' },
    { label: 'Indigo', color: '#312e81' }
  ];

  const currentBoxShadowCss = computeBoxShadowCss(style);
  const currentBorderCss = computeBorderCssProperties(style);

  return (
    <div 
      className="ae-block-style-editor space-y-4" 
      data-testid={`block-style-editor-${position}-${index}`}
    >
      {/* ------------------------------------------------------------------ */}
      {/* 1. SECTION CONTOUR                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="ae-style-editor-card" data-testid="section-border">
        <div className="ae-style-editor-card-header">
          <div className="flex items-center gap-2">
            <Square size={16} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h4 className="ae-style-editor-title">Contour du bloc</h4>
          </div>
          <span className="ae-badge-style-info">
            {style.borderStyle === 'none' || (style.borderSidesUniform && style.borderWidth === 0)
              ? 'Sans contour'
              : `${style.borderSidesUniform ? `${style.borderWidth}px` : 'Personnalisé'} • ${style.borderStyle}`}
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {/* Bascule côtés uniformes vs 4 côtés séparés */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Définition des côtés :
            </span>
            <div className="flex items-center gap-1.5" role="group" aria-label="Mode de définition des côtés">
              <button
                type="button"
                onClick={() => handleUpdate('borderSidesUniform', true)}
                className={`ae-btn-pill-choice ${style.borderSidesUniform ? 'active' : ''}`}
                aria-pressed={style.borderSidesUniform}
                aria-label="Contour uniforme sur les 4 côtés"
              >
                Côtés uniformes
              </button>
              <button
                type="button"
                onClick={() => handleUpdate('borderSidesUniform', false)}
                className={`ae-btn-pill-choice ${!style.borderSidesUniform ? 'active' : ''}`}
                aria-pressed={!style.borderSidesUniform}
                aria-label="Définir séparément les quatre côtés du contour"
              >
                4 côtés séparés
              </button>
            </div>
          </div>

          {/* ÉPAISSEUR DU CONTOUR : CAS UNIFORME */}
          {style.borderSidesUniform ? (
            <div className="flipbook-editor-field-row">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <label htmlFor={`border-width-range-${position}-${index}`}>
                  Épaisseur du contour (0 à 12 px)
                </label>
                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                  {style.borderWidth} px {style.borderWidth === 0 && '(supprimé)'}
                </span>
              </div>
              <div className="ae-range-number-group">
                <input
                  id={`border-width-range-${position}-${index}`}
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={style.borderWidth}
                  onChange={(e) => handleUpdate('borderWidth', Number(e.target.value))}
                  className="ae-range-input flex-1"
                  aria-label="Épaisseur du contour en pixels"
                />
                <input
                  id={`border-width-num-${position}-${index}`}
                  type="number"
                  min="0"
                  max="12"
                  step="1"
                  value={style.borderWidth}
                  onChange={(e) => handleUpdate('borderWidth', clamp(e.target.value, 0, 12, 0))}
                  className="ae-number-input"
                  aria-label="Valeur numérique de l'épaisseur du contour"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Une valeur de 0 px supprime visuellement le contour.
              </p>
            </div>
          ) : (
            /* ÉPAISSEUR DU CONTOUR : 4 CÔTÉS SÉPARÉS */
            <div className="space-y-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Épaisseur détaillée des 4 côtés (0 à 12 px) :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Haut */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <label htmlFor={`border-top-${position}-${index}`}>Haut (Top)</label>
                    <span className="text-blue-600 font-mono">{style.borderTopWidth} px</span>
                  </div>
                  <div className="ae-range-number-group">
                    <input
                      id={`border-top-${position}-${index}`}
                      type="range"
                      min="0"
                      max="12"
                      step="1"
                      value={style.borderTopWidth}
                      onChange={(e) => handleUpdate('borderTopWidth', Number(e.target.value))}
                      className="ae-range-input flex-1"
                      aria-label="Épaisseur contour haut"
                    />
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={style.borderTopWidth}
                      onChange={(e) => handleUpdate('borderTopWidth', clamp(e.target.value, 0, 12, 0))}
                      className="ae-number-input"
                      aria-label="Épaisseur numérique haut"
                    />
                  </div>
                </div>

                {/* Droite */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <label htmlFor={`border-right-${position}-${index}`}>Droite (Right)</label>
                    <span className="text-blue-600 font-mono">{style.borderRightWidth} px</span>
                  </div>
                  <div className="ae-range-number-group">
                    <input
                      id={`border-right-${position}-${index}`}
                      type="range"
                      min="0"
                      max="12"
                      step="1"
                      value={style.borderRightWidth}
                      onChange={(e) => handleUpdate('borderRightWidth', Number(e.target.value))}
                      className="ae-range-input flex-1"
                      aria-label="Épaisseur contour droite"
                    />
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={style.borderRightWidth}
                      onChange={(e) => handleUpdate('borderRightWidth', clamp(e.target.value, 0, 12, 0))}
                      className="ae-number-input"
                      aria-label="Épaisseur numérique droite"
                    />
                  </div>
                </div>

                {/* Bas */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <label htmlFor={`border-bottom-${position}-${index}`}>Bas (Bottom)</label>
                    <span className="text-blue-600 font-mono">{style.borderBottomWidth} px</span>
                  </div>
                  <div className="ae-range-number-group">
                    <input
                      id={`border-bottom-${position}-${index}`}
                      type="range"
                      min="0"
                      max="12"
                      step="1"
                      value={style.borderBottomWidth}
                      onChange={(e) => handleUpdate('borderBottomWidth', Number(e.target.value))}
                      className="ae-range-input flex-1"
                      aria-label="Épaisseur contour bas"
                    />
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={style.borderBottomWidth}
                      onChange={(e) => handleUpdate('borderBottomWidth', clamp(e.target.value, 0, 12, 0))}
                      className="ae-number-input"
                      aria-label="Épaisseur numérique bas"
                    />
                  </div>
                </div>

                {/* Gauche */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <label htmlFor={`border-left-${position}-${index}`}>Gauche (Left)</label>
                    <span className="text-blue-600 font-mono">{style.borderLeftWidth} px</span>
                  </div>
                  <div className="ae-range-number-group">
                    <input
                      id={`border-left-${position}-${index}`}
                      type="range"
                      min="0"
                      max="12"
                      step="1"
                      value={style.borderLeftWidth}
                      onChange={(e) => handleUpdate('borderLeftWidth', Number(e.target.value))}
                      className="ae-range-input flex-1"
                      aria-label="Épaisseur contour gauche"
                    />
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={style.borderLeftWidth}
                      onChange={(e) => handleUpdate('borderLeftWidth', clamp(e.target.value, 0, 12, 0))}
                      className="ae-number-input"
                      aria-label="Épaisseur numérique gauche"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STYLE DU CONTOUR & COULEUR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Style : continu, pointillé, tirets ou aucun */}
            <div className="flipbook-editor-field-row">
              <label className="flipbook-editor-label" htmlFor={`border-style-select-${position}-${index}`}>
                Style du contour
              </label>
              <select
                id={`border-style-select-${position}-${index}`}
                value={style.borderStyle}
                onChange={(e) => handleUpdate('borderStyle', e.target.value)}
                className="db-select text-xs w-full"
                aria-label="Style du contour"
              >
                {BORDER_STYLES.map(bs => (
                  <option key={bs.value} value={bs.value}>
                    {bs.label} ({bs.value})
                  </option>
                ))}
              </select>
            </div>

            {/* Couleur du contour */}
            <div className="flipbook-editor-field-row">
              <label className="flipbook-editor-label" htmlFor={`border-color-input-${position}-${index}`}>
                Couleur du contour
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`border-color-input-${position}-${index}`}
                  type="color"
                  value={style.borderColor || '#cbd5e1'}
                  onChange={(e) => handleUpdate('borderColor', e.target.value)}
                  className="ae-color-picker-square"
                  aria-label="Palette de couleur de contour"
                />
                <input
                  type="text"
                  value={style.borderColor || ''}
                  onChange={(e) => handleUpdate('borderColor', e.target.value)}
                  placeholder="#cbd5e1"
                  className="ae-flipbook-input text-xs flex-1"
                  aria-label="Code hexadécimal de couleur de contour"
                />
              </div>
            </div>
          </div>

          {/* Pastilles d'échantillons de couleur de contour */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] text-slate-400">Échantillons :</span>
            {quickBorderColors.map(c => (
              <button
                key={c.color}
                type="button"
                onClick={() => handleUpdate('borderColor', c.color)}
                style={{ backgroundColor: c.color }}
                className={`w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer transition-transform ${style.borderColor === c.color ? 'scale-125 ring-2 ring-blue-500' : 'hover:scale-110'}`}
                title={`${c.label} (${c.color})`}
                aria-label={`Appliquer la couleur de contour ${c.label}`}
              />
            ))}
          </div>

          {/* ARRONDI DES ANGLES : 0 à 40 px */}
          <div className="flipbook-editor-field-row pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-semibold mb-1">
              <label htmlFor={`border-radius-range-${position}-${index}`}>
                Arrondi des angles (0 à 40 px)
              </label>
              <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                {style.borderRadius} px
              </span>
            </div>
            <div className="ae-range-number-group">
              <input
                id={`border-radius-range-${position}-${index}`}
                type="range"
                min="0"
                max="40"
                step="1"
                value={style.borderRadius}
                onChange={(e) => handleUpdate('borderRadius', Number(e.target.value))}
                className="ae-range-input flex-1"
                aria-label="Curseur d'arrondi des angles en pixels"
              />
              <input
                id={`border-radius-num-${position}-${index}`}
                type="number"
                min="0"
                max="40"
                step="1"
                value={style.borderRadius}
                onChange={(e) => handleUpdate('borderRadius', clamp(e.target.value, 0, 40, 14))}
                className="ae-number-input"
                aria-label="Champ numérique d'arrondi des angles"
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>0 px (Carré)</span>
              <span>8 px (Léger)</span>
              <span>14 px (Standard)</span>
              <span>24 px (Arrondi)</span>
              <span>40 px (Pilule)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. SECTION OMBRE                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="ae-style-editor-card" data-testid="section-shadow">
        <div className="ae-style-editor-card-header">
          <div className="flex items-center gap-2">
            <Sun size={16} className="text-amber-500" aria-hidden="true" />
            <h4 className="ae-style-editor-title">Ombre du bloc</h4>
          </div>

          {/* Interrupteur Activer / Désactiver l'ombre */}
          <label className="ae-toggle-switch-label cursor-pointer flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {style.shadowEnabled ? "Ombre activée" : "Ombre désactivée"}
            </span>
            <input
              type="checkbox"
              checked={style.shadowEnabled}
              onChange={(e) => handleUpdate('shadowEnabled', e.target.checked)}
              className="ae-form-checkbox"
              aria-label="Activer ou désactiver l'ombre du bloc"
            />
          </label>
        </div>

        {/* PRÉRÉGLAGES RAPIDES (Aucune, Légère, Moyenne, Prononcée) */}
        <div className="pt-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Préréglages d'ombre :
          </span>
          <div className="ae-shadow-presets-grid" role="group" aria-label="Préréglages d'ombre">
            {Object.values(SHADOW_PRESETS).map(pr => {
              const isSelected = pr.id === 'none' 
                ? !style.shadowEnabled 
                : (style.shadowEnabled && style.shadow === pr.id);
              return (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => handleApplyShadowPreset(pr.id)}
                  className={`ae-btn-shadow-preset ${isSelected ? 'active' : ''}`}
                  aria-pressed={isSelected}
                  aria-label={`Préréglage d'ombre : ${pr.label}`}
                >
                  <Sparkles size={13} aria-hidden="true" />
                  <span>{pr.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PARAMÈTRES PRÉCIS D'OMBRE (affichés si ombre activée) */}
        {style.shadowEnabled && (
          <div className="space-y-3 pt-3 mt-2 border-t border-slate-200 dark:border-slate-800">
            {/* Ombre extérieure vs intérieure */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Type d'ombre :
              </span>
              <div className="flex items-center gap-1.5" role="group" aria-label="Type d'ombre">
                <button
                  type="button"
                  onClick={() => handleUpdate('shadowInset', false)}
                  className={`ae-btn-pill-choice ${!style.shadowInset ? 'active' : ''}`}
                  aria-pressed={!style.shadowInset}
                  aria-label="Ombre extérieure"
                >
                  Extérieure
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate('shadowInset', true)}
                  className={`ae-btn-pill-choice ${style.shadowInset ? 'active' : ''}`}
                  aria-pressed={style.shadowInset}
                  aria-label="Ombre intérieure"
                >
                  Intérieure (inset)
                </button>
              </div>
            </div>

            {/* DÉCALAGE HORIZONTAL (-30 à +30 px) */}
            <div className="flipbook-editor-field-row">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <label htmlFor={`shadow-offset-x-${position}-${index}`}>
                  Décalage horizontal (X : -30 à +30 px)
                </label>
                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                  {style.shadowOffsetX} px
                </span>
              </div>
              <div className="ae-range-number-group">
                <input
                  id={`shadow-offset-x-${position}-${index}`}
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={style.shadowOffsetX}
                  onChange={(e) => handleUpdate('shadowOffsetX', Number(e.target.value))}
                  className="ae-range-input flex-1"
                  aria-label="Décalage horizontal de l'ombre en pixels"
                />
                <input
                  type="number"
                  min="-30"
                  max="30"
                  step="1"
                  value={style.shadowOffsetX}
                  onChange={(e) => handleUpdate('shadowOffsetX', clamp(e.target.value, -30, 30, 0))}
                  className="ae-number-input"
                  aria-label="Décalage horizontal numérique"
                />
              </div>
            </div>

            {/* DÉCALAGE VERTICAL (-30 à +30 px) */}
            <div className="flipbook-editor-field-row">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <label htmlFor={`shadow-offset-y-${position}-${index}`}>
                  Décalage vertical (Y : -30 à +30 px)
                </label>
                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                  {style.shadowOffsetY} px
                </span>
              </div>
              <div className="ae-range-number-group">
                <input
                  id={`shadow-offset-y-${position}-${index}`}
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={style.shadowOffsetY}
                  onChange={(e) => handleUpdate('shadowOffsetY', Number(e.target.value))}
                  className="ae-range-input flex-1"
                  aria-label="Décalage vertical de l'ombre en pixels"
                />
                <input
                  type="number"
                  min="-30"
                  max="30"
                  step="1"
                  value={style.shadowOffsetY}
                  onChange={(e) => handleUpdate('shadowOffsetY', clamp(e.target.value, -30, 30, 4))}
                  className="ae-number-input"
                  aria-label="Décalage vertical numérique"
                />
              </div>
            </div>

            {/* FLOU (0 à 60 px) */}
            <div className="flipbook-editor-field-row">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <label htmlFor={`shadow-blur-${position}-${index}`}>
                  Flou de l'ombre (0 à 60 px)
                </label>
                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                  {style.shadowBlur} px
                </span>
              </div>
              <div className="ae-range-number-group">
                <input
                  id={`shadow-blur-${position}-${index}`}
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={style.shadowBlur}
                  onChange={(e) => handleUpdate('shadowBlur', Number(e.target.value))}
                  className="ae-range-input flex-1"
                  aria-label="Flou de l'ombre en pixels"
                />
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="1"
                  value={style.shadowBlur}
                  onChange={(e) => handleUpdate('shadowBlur', clamp(e.target.value, 0, 60, 12))}
                  className="ae-number-input"
                  aria-label="Flou numérique"
                />
              </div>
            </div>

            {/* ÉTENDUE (-20 à +30 px) */}
            <div className="flipbook-editor-field-row">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <label htmlFor={`shadow-spread-${position}-${index}`}>
                  Étendue de l'ombre (-20 à +30 px)
                </label>
                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                  {style.shadowSpread} px
                </span>
              </div>
              <div className="ae-range-number-group">
                <input
                  id={`shadow-spread-${position}-${index}`}
                  type="range"
                  min="-20"
                  max="30"
                  step="1"
                  value={style.shadowSpread}
                  onChange={(e) => handleUpdate('shadowSpread', Number(e.target.value))}
                  className="ae-range-input flex-1"
                  aria-label="Étendue de l'ombre en pixels"
                />
                <input
                  type="number"
                  min="-20"
                  max="30"
                  step="1"
                  value={style.shadowSpread}
                  onChange={(e) => handleUpdate('shadowSpread', clamp(e.target.value, -20, 30, -2))}
                  className="ae-number-input"
                  aria-label="Étendue numérique"
                />
              </div>
            </div>

            {/* OPACITÉ (0 à 100 %) */}
            <div className="flipbook-editor-field-row">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <label htmlFor={`shadow-opacity-${position}-${index}`}>
                  Opacité de l'ombre (0 à 100 %)
                </label>
                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                  {style.shadowOpacity} %
                </span>
              </div>
              <div className="ae-range-number-group">
                <input
                  id={`shadow-opacity-${position}-${index}`}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={style.shadowOpacity}
                  onChange={(e) => handleUpdate('shadowOpacity', Number(e.target.value))}
                  className="ae-range-input flex-1"
                  aria-label="Opacité de l'ombre en pourcentage"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={style.shadowOpacity}
                  onChange={(e) => handleUpdate('shadowOpacity', clamp(e.target.value, 0, 100, 10))}
                  className="ae-number-input"
                  aria-label="Opacité numérique"
                />
              </div>
            </div>

            {/* COULEUR DE L'OMBRE */}
            <div className="flipbook-editor-field-row">
              <label className="flipbook-editor-label" htmlFor={`shadow-color-${position}-${index}`}>
                Couleur de l'ombre
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`shadow-color-${position}-${index}`}
                  type="color"
                  value={style.shadowColor || '#0f172a'}
                  onChange={(e) => handleUpdate('shadowColor', e.target.value)}
                  className="ae-color-picker-square"
                  aria-label="Palette de couleur de l'ombre"
                />
                <input
                  type="text"
                  value={style.shadowColor || ''}
                  onChange={(e) => handleUpdate('shadowColor', e.target.value)}
                  placeholder="#0f172a"
                  className="ae-flipbook-input text-xs flex-1"
                  aria-label="Code hexadécimal de l'ombre"
                />
              </div>

              {/* Pastilles d'échantillons rapides d'ombre */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400">Échantillons :</span>
                {quickShadowColors.map(sc => (
                  <button
                    key={sc.color}
                    type="button"
                    onClick={() => handleUpdate('shadowColor', sc.color)}
                    style={{ backgroundColor: sc.color }}
                    className={`w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer transition-transform ${style.shadowColor === sc.color ? 'scale-125 ring-2 ring-blue-500' : 'hover:scale-110'}`}
                    title={`${sc.label} (${sc.color})`}
                    aria-label={`Couleur d'ombre ${sc.label}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. APERÇU IMMÉDIAT EN DIRECT DU BLOC                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="ae-style-editor-card ae-live-preview-box" data-testid="section-preview">
        <div className="ae-style-editor-card-header">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-emerald-600" aria-hidden="true" />
            <h4 className="ae-style-editor-title">Aperçu immédiat du bloc</h4>
          </div>
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="ae-btn-link-action"
            aria-expanded={showLivePreview}
          >
            {showLivePreview ? "Masquer l'aperçu" : "Afficher l'aperçu"}
          </button>
        </div>

        {showLivePreview && (
          <div className="pt-2">
            <div className="p-4 bg-slate-100 dark:bg-slate-900/70 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center">
              <div className="w-full max-w-sm">
                <FlipbookSidebarBlock block={block} />
              </div>
            </div>

            {/* Propriétés CSS calculées en temps réel */}
            <div className="mt-2 text-[11px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-2 rounded border border-slate-200 dark:border-slate-800 space-y-0.5 break-all">
              <div><strong>border:</strong> {currentBorderCss.border || `${currentBorderCss.borderWidth || `${style.borderWidth}px`} ${currentBorderCss.borderStyle || style.borderStyle} ${currentBorderCss.borderColor || style.borderColor}`};</div>
              <div><strong>border-radius:</strong> {currentBorderCss.borderRadius};</div>
              <div><strong>box-shadow:</strong> {currentBoxShadowCss};</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
