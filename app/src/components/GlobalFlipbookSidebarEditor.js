import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Sliders, 
  Layers, 
  Check, 
  RotateCcw, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Tv, 
  Sparkles,
  History,
  Info,
  CheckCircle2,
  Undo2,
  PanelLeft,
  PanelRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Box,
  Palette,
  Maximize2,
  ChevronsUpDown,
  ChevronsDownUp
} from 'lucide-react';
import FlipbookSidebarEditor from './FlipbookSidebarEditor';
import FlipbookLayout from './FlipbookLayout';
import PdfFlipbookReader from './PdfFlipbookReader';
import { 
  DEFAULT_GLOBAL_SIDEBAR, 
  getLocalGlobalSidebar, 
  saveGlobalSidebarTemplate,
  fetchGlobalSidebarTemplate,
  getPreviousSavedGlobalSidebar,
  restoreLastSavedGlobalSidebar,
  analyzeFlipbooksSidebarStatus,
  normalizeSidebarTemplate
} from '../services/flipbookSidebarService';
import { 
  applyStyleToAllBlocks, 
  SHADOW_PRESETS 
} from '../utils/flipbookBlockStyleUtils';
import { BRAND_NAME } from '../constants/brand';

/**
 * Éditeur visuel moderne et ergonomique du « Modèle global — Anjou Édition » :
 * - Disposition en 2 panneaux sur grand écran :
 *   • Panneau gauche (~55%) : Paramètres, accordéons intelligents et gestion des blocs
 *   • Panneau droit (~45% sticky) : Aperçu interactif du Flipbook sous le header
 * - 5 sections d'accordéons exclusifs intelligents :
 *   1. Dimensions et visibilité
 *   2. Contours et ombres
 *   3. Couleurs et habillage
 *   4. Espacements et disposition
 *   5. Contenu des blocs gauche et droit
 * - Contrôles enrichis avec sliders synchronisés, unités explicites (% et px) et boutons de réinitialisation
 * - Barre d'actions inférieure fixe sticky conforme WCAG 2.2 AA
 */
export default function GlobalFlipbookSidebarEditor({
  initialTemplate = null,
  flipbooks = [],
  onBack,
  onSaveSuccess = () => {},
  onApplyToAll = () => {},
  setNotification = () => {}
}) {
  const [template, setTemplate] = useState(() => {
    return normalizeSidebarTemplate(initialTemplate || getLocalGlobalSidebar());
  });

  const [savedBaseline, setSavedBaseline] = useState(() => {
    return JSON.stringify(normalizeSidebarTemplate(initialTemplate || getLocalGlobalSidebar()));
  });

  // Navigation haute ('content' | 'styles' | 'preview')
  const [activeTab, setActiveTab] = useState('content');
  // Mode d'affichage mobile/tablette ('config' | 'preview')
  const [mobileViewMode, setMobileViewMode] = useState('config');
  const [previewViewport, setPreviewViewport] = useState('xl'); // 'xl' | 'l' | 'm' | 's'
  const [previewBookId, setPreviewBookId] = useState(() => {
    return flipbooks.length > 0 ? flipbooks[0].id : '';
  });

  // Mise à l'échelle virtuelle uniforme pour l'aperçu XL et L (R2)
  const previewStageWrapperRef = useRef(null);
  const previewContentRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState('auto');

  useEffect(() => {
    const updatePreviewScale = () => {
      if (!previewStageWrapperRef.current) return;
      const availableWidth = previewStageWrapperRef.current.clientWidth;
      let virtualTarget = 1240;
      if (previewViewport === 'l') virtualTarget = 1024;
      else if (previewViewport === 'm') virtualTarget = 768;
      else if (previewViewport === 's') virtualTarget = 390;

      if (availableWidth > 0 && availableWidth < virtualTarget) {
        const s = availableWidth / virtualTarget;
        setPreviewScale(s);
        if (previewContentRef.current) {
          const h = previewContentRef.current.offsetHeight;
          setScaledHeight(h > 0 ? `${Math.ceil(h * s)}px` : 'auto');
        }
      } else {
        setPreviewScale(1);
        setScaledHeight('auto');
      }
    };

    updatePreviewScale();
    const timer = setTimeout(updatePreviewScale, 150);
    window.addEventListener('resize', updatePreviewScale);
    let observer = null;
    if (typeof ResizeObserver !== 'undefined' && previewStageWrapperRef.current) {
      observer = new ResizeObserver(updatePreviewScale);
      observer.observe(previewStageWrapperRef.current);
      if (previewContentRef.current) observer.observe(previewContentRef.current);
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePreviewScale);
      if (observer) observer.disconnect();
    };
  }, [previewViewport, template]);

  // Gestion des 5 accordéons : dépliables et repliables à volonté avec bouton Tout replier
  const [openAccordions, setOpenAccordions] = useState({
    dimensions: true,
    borders: true,
    colors: true,
    spacings: true,
    content: true
  });

  // Bascule d'un accordéon au clic
  const toggleAccordion = (key) => {
    setOpenAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Option Tout déplier / Tout replier
  const areAllAccordionsOpen = useMemo(() => {
    return Object.values(openAccordions).every(Boolean);
  }, [openAccordions]);

  const toggleAllAccordions = () => {
    if (areAllAccordionsOpen) {
      setOpenAccordions({
        dimensions: false,
        borders: false,
        colors: false,
        spacings: false,
        content: false
      });
    } else {
      setOpenAccordions({
        dimensions: true,
        borders: true,
        colors: true,
        spacings: true,
        content: true
      });
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [showApplyAllConfirm, setShowApplyAllConfirm] = useState(false);
  const [applyAllReport, setApplyAllReport] = useState(null);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Détection de modifications non enregistrées
  const isDirty = useMemo(() => {
    return JSON.stringify(template) !== savedBaseline;
  }, [template, savedBaseline]);

  // Analyse en temps réel des Flipbooks enregistrés
  const flipbooksAnalysis = useMemo(() => {
    return analyzeFlipbooksSidebarStatus(flipbooks, template);
  }, [flipbooks, template]);

  // Synchronisation si initialTemplate change
  useEffect(() => {
    if (initialTemplate) {
      const normalized = normalizeSidebarTemplate(initialTemplate);
      setTemplate(normalized);
      setSavedBaseline(JSON.stringify(normalized));
    }
  }, [initialTemplate]);

  // Avertissement avant fermeture de fenêtre
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Flipbook résolu pour la prévisualisation
  const previewBook = useMemo(() => {
    const found = flipbooks.find(f => String(f.id) === String(previewBookId));
    if (found) return found;
    if (flipbooks.length > 0) return flipbooks[0];
    return {
      id: "preview-mock",
      title: "Ouvrage de démonstration",
      description: "Aperçu en direct du modèle global des barres latérales.",
      pages: [
        { pageNum: 1, title: "Couverture", content: `${BRAND_NAME}\n\nModèle global interactif` }
      ],
      pdfFile: "secrets_vignoble_angevin.pdf"
    };
  }, [flipbooks, previewBookId]);

  // Modifications de styles globaux
  const handleStyleChange = (key, value) => {
    setTemplate(prev => ({
      ...prev,
      styles: {
        ...(prev.styles || {}),
        [key]: value
      }
    }));
  };

  // Modification de largeur avec support de synchronisation symétrique gauche / droite
  const handleWidthChange = (widthKey, value) => {
    const isSync = (template.styles || {}).syncSidebarsWidth !== false;
    setTemplate(prev => {
      const currentStyles = prev.styles || {};
      if (isSync) {
        return {
          ...prev,
          styles: {
            ...currentStyles,
            leftWidth: value,
            rightWidth: value
          }
        };
      }
      return {
        ...prev,
        styles: {
          ...currentStyles,
          [widthKey]: value
        }
      };
    });
  };

  // Modifications de styles indépendants gauche / droite
  const handleSideStyleChange = (side, key, value) => {
    setTemplate(prev => {
      const currentStyles = prev.styles || {};
      const currentSideStyle = currentStyles[side] || {};
      return {
        ...prev,
        styles: {
          ...currentStyles,
          [side]: {
            ...currentSideStyle,
            [key]: value
          }
        }
      };
    });
  };

  // Visibilité responsive par barre
  const handleVisibilityChange = (side, device, checked) => {
    setTemplate(prev => {
      const currentStyles = prev.styles || {};
      const currentVis = currentStyles.visibility || {};
      const currentSide = currentVis[side] || { xl: true, desktop: true, tablet: true, mobile: true };
      return {
        ...prev,
        styles: {
          ...currentStyles,
          visibility: {
            ...currentVis,
            [side]: {
              ...currentSide,
              [device]: checked
            }
          }
        }
      };
    });
  };

  // Harmonisation : « Appliquer ce style à tous les blocs »
  const handleApplyStyleToAllBlocks = () => {
    const s = template.styles || {};
    const targetStyle = {
      borderWidth: s.borderWidth !== undefined ? Number(s.borderWidth) : 1,
      borderColor: s.borderColor || '#cbd5e1',
      borderStyle: s.borderStyle || 'solid',
      borderRadius: typeof s.borderRadius === 'number' 
        ? s.borderRadius 
        : (s.borderRadius === 'pill' ? 20 : s.borderRadius === 'normal' ? 14 : 8),
      borderSidesUniform: s.borderSidesUniform !== false,
      borderWidthTop: s.borderWidthTop !== undefined ? Number(s.borderWidthTop) : undefined,
      borderWidthRight: s.borderWidthRight !== undefined ? Number(s.borderWidthRight) : undefined,
      borderWidthBottom: s.borderWidthBottom !== undefined ? Number(s.borderWidthBottom) : undefined,
      borderWidthLeft: s.borderWidthLeft !== undefined ? Number(s.borderWidthLeft) : undefined,
      backgroundColor: s.cardBackground || '#ffffff',
      textColor: s.textColor || '#1e293b',
      shadowEnabled: s.shadowEnabled !== false && s.cardShadow !== 'none',
      shadow: s.cardShadow || 'default',
      shadowOffsetX: s.shadowOffsetX !== undefined ? Number(s.shadowOffsetX) : 0,
      shadowOffsetY: s.shadowOffsetY !== undefined ? Number(s.shadowOffsetY) : 3,
      shadowBlur: s.shadowBlur !== undefined ? Number(s.shadowBlur) : 10,
      shadowSpread: s.shadowSpread !== undefined ? Number(s.shadowSpread) : 0,
      shadowOpacity: s.shadowOpacity !== undefined ? Number(s.shadowOpacity) : 12,
      shadowColor: s.shadowColor || '#000000',
      shadowInset: Boolean(s.shadowInset)
    };

    const updatedLeft = applyStyleToAllBlocks(template.leftSidebar || [], targetStyle);
    const updatedRight = applyStyleToAllBlocks(template.rightSidebar || [], targetStyle);

    setTemplate(prev => ({
      ...prev,
      leftSidebar: updatedLeft,
      rightSidebar: updatedRight
    }));

    setNotification("Style (contours, arrondis, couleurs et ombres) appliqué à tous les blocs des deux barres !");
  };

  // Enregistrement du modèle global
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await saveGlobalSidebarTemplate(template);
      const savedData = normalizeSidebarTemplate(res.data);
      setTemplate(savedData);
      setSavedBaseline(JSON.stringify(savedData));
      setIsSaving(false);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3000);
      setNotification(`Modèle global — ${BRAND_NAME} enregistré avec succès !`);
      onSaveSuccess(savedData);
    } catch (err) {
      console.error("Erreur enregistrement modèle global:", err);
      setIsSaving(false);
      alert("Une erreur est survenue lors de l'enregistrement du modèle global.");
    }
  };

  // Annuler les modifications en cours
  const handleCancelModifications = () => {
    if (!isDirty) {
      setNotification("Aucune modification non enregistrée à annuler.");
      return;
    }
    if (window.confirm("Voulez-vous annuler les modifications non enregistrées en cours ?")) {
      try {
        const baselineObj = JSON.parse(savedBaseline);
        setTemplate(normalizeSidebarTemplate(baselineObj));
        setNotification("Modifications annulées. Retour à l'état enregistré.");
      } catch (e) {
        setTemplate(normalizeSidebarTemplate(getLocalGlobalSidebar()));
      }
    }
  };

  // Restaurer la dernière version enregistrée
  const handleRestoreLastSavedVersion = async () => {
    const previousSaved = getPreviousSavedGlobalSidebar();
    const confirmMsg = isDirty
      ? "Voulez-vous restaurer la dernière version enregistrée du modèle global ? Vos modifications non enregistrées seront remplacées."
      : previousSaved
      ? "Voulez-vous restaurer la version précédemment enregistrée du modèle global ?"
      : "Voulez-vous recharger la dernière version enregistrée du modèle global ?";

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isDirty) {
        const latest = await fetchGlobalSidebarTemplate();
        const normalized = normalizeSidebarTemplate(latest);
        setTemplate(normalized);
        setSavedBaseline(JSON.stringify(normalized));
        setNotification("Dernière version enregistrée restaurée avec succès !");
        onSaveSuccess(normalized);
      } else if (previousSaved) {
        const res = await restoreLastSavedGlobalSidebar();
        if (res.success && res.data) {
          const normalized = normalizeSidebarTemplate(res.data);
          setTemplate(normalized);
          setSavedBaseline(JSON.stringify(normalized));
          setNotification("Dernière version enregistrée restaurée avec succès !");
          onSaveSuccess(normalized);
        }
      } else {
        const latest = await fetchGlobalSidebarTemplate();
        const normalized = normalizeSidebarTemplate(latest);
        setTemplate(normalized);
        setSavedBaseline(JSON.stringify(normalized));
        setNotification("Dernière version enregistrée chargée avec succès !");
      }
    } catch (err) {
      console.error("Erreur lors de la restauration:", err);
      const local = normalizeSidebarTemplate(getLocalGlobalSidebar());
      setTemplate(local);
      setSavedBaseline(JSON.stringify(local));
      setNotification("Version locale enregistrée restaurée.");
    }
  };

  // Réinitialisation aux valeurs par défaut
  const handleResetToDefault = () => {
    if (window.confirm(`Voulez-vous vraiment réinitialiser le modèle global aux valeurs par défaut d'${BRAND_NAME} ? Vos personnalisations non enregistrées seront perdues.`)) {
      setTemplate(normalizeSidebarTemplate(JSON.parse(JSON.stringify(DEFAULT_GLOBAL_SIDEBAR))));
    }
  };

  // Retour avec confirmation si dirty
  const handleSafeBack = () => {
    if (isDirty) {
      if (!window.confirm("Attention : vous avez des modifications non enregistrées sur le modèle global. Voulez-vous vraiment quitter sans enregistrer ?")) {
        return;
      }
    }
    onBack();
  };

  // Application du modèle global à tous les Flipbooks avec bilan
  const handleConfirmApplyToAll = async () => {
    setIsApplyingAll(true);
    try {
      let activeGlobal = template;
      if (isDirty) {
        const res = await saveGlobalSidebarTemplate(template);
        activeGlobal = normalizeSidebarTemplate(res.data);
        setTemplate(activeGlobal);
        setSavedBaseline(JSON.stringify(activeGlobal));
        onSaveSuccess(activeGlobal);
      }

      const maybeReport = await onApplyToAll(activeGlobal);
      setNotification("Le modèle global a été appliqué à tous les Flipbooks !");

      if (maybeReport && typeof maybeReport === 'object' && typeof maybeReport.totalCount === 'number') {
        setApplyAllReport(maybeReport);
      } else {
        setShowApplyAllConfirm(false);
      }
    } catch (err) {
      console.error("Erreur lors de l'application globale:", err);
      setApplyAllReport({
        success: false,
        totalCount: flipbooks.length,
        alreadyGlobalCount: flipbooksAnalysis.globalCount,
        replacedCustomCount: 0,
        backedUpCount: 0,
        verifiedCount: 0,
        errorCount: 1,
        errors: [{ title: "Général", error: err?.message || "Erreur inattendue" }]
      });
    } finally {
      setIsApplyingAll(false);
    }
  };

  const styles = template.styles || {};
  const leftSideStyle = styles.left || {};
  const rightSideStyle = styles.right || {};
  const leftVis = styles.visibility?.left || { xl: true, desktop: true, tablet: true, mobile: true };
  const rightVis = styles.visibility?.right || { xl: true, desktop: true, tablet: true, mobile: true };

  // Valeurs de bordure et ombres
  const currentBorderWidth = styles.borderWidth !== undefined ? Number(styles.borderWidth) : 1;
  const currentBorderRadius = typeof styles.borderRadius === 'number' 
    ? styles.borderRadius 
    : (styles.borderRadius === 'pill' ? 20 : styles.borderRadius === 'normal' ? 14 : 8);
  const currentBorderStyle = styles.borderStyle || 'solid';
  const currentBorderColor = styles.borderColor || '#cbd5e1';
  const isBorderSidesUniform = styles.borderSidesUniform !== false;

  const isShadowEnabled = styles.shadowEnabled !== false && styles.cardShadow !== 'none';
  const currentShadowPreset = styles.cardShadow || 'default';
  const currentShadowOffsetX = styles.shadowOffsetX !== undefined ? Number(styles.shadowOffsetX) : 0;
  const currentShadowOffsetY = styles.shadowOffsetY !== undefined ? Number(styles.shadowOffsetY) : 3;
  const currentShadowBlur = styles.shadowBlur !== undefined ? Number(styles.shadowBlur) : 10;
  const currentShadowSpread = styles.shadowSpread !== undefined ? Number(styles.shadowSpread) : 0;
  const currentShadowOpacity = styles.shadowOpacity !== undefined ? Number(styles.shadowOpacity) : 12;
  const currentShadowColor = styles.shadowColor || '#000000';
  const isShadowInset = Boolean(styles.shadowInset);

  // Application d'un préréglage d'ombre
  const handleApplyShadowPreset = (presetKey) => {
    const preset = SHADOW_PRESETS[presetKey];
    if (!preset) return;
    setTemplate(prev => ({
      ...prev,
      styles: {
        ...(prev.styles || {}),
        cardShadow: presetKey,
        shadowEnabled: preset.shadowEnabled,
        shadowOffsetX: preset.shadowOffsetX,
        shadowOffsetY: preset.shadowOffsetY,
        shadowBlur: preset.shadowBlur,
        shadowSpread: preset.shadowSpread,
        shadowOpacity: preset.shadowOpacity,
        shadowColor: preset.shadowColor,
        shadowInset: preset.shadowInset
      }
    }));
  };

  // Panneaux de réglages indépendants par barre (Gauche / Droite)
  const renderSideStyleControls = (side, label, sideStyle, vis, widthKey, defaultWidth) => {
    const isLeft = side === 'left';
    const currentWidth = styles[widthKey] || defaultWidth;
    return (
      <div
        className="ae-settings-group-card p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
        data-testid={`style-config-${side}`}
      >
        <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
          <h4 className="ae-settings-group-title text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-0">
            {isLeft ? (
              <PanelLeft size={16} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
            ) : (
              <PanelRight size={16} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
            )}
            <span>Personnalisation : {label}</span>
          </h4>
          <span className="ae-admin-pill-global text-[11px]">
            {(isLeft ? template.leftSidebar?.length : template.rightSidebar?.length) || 0} bloc(s)
          </span>
        </div>

        <div className="space-y-3.5">
          {/* Largeur avec Slider + Input numérique synchronisé */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <label htmlFor={`input-${side}-width`}>Largeur {label} (sur grand écran)</label>
              <div className="flex items-center gap-1">
                <span className="text-blue-600 font-mono text-xs">{currentWidth}%</span>
              </div>
            </div>
            <div className="ae-range-number-group flex items-center gap-2">
              <input
                id={`input-${side}-width`}
                type="range"
                min="15"
                max="30"
                step="1"
                value={currentWidth}
                onChange={(e) => handleWidthChange(widthKey, Number(e.target.value))}
                className="ae-range-input flex-1"
                aria-label={`Largeur ${label.toLowerCase()} en pourcentage`}
              />
              <input
                type="number"
                min="15"
                max="30"
                value={currentWidth}
                onChange={(e) => handleWidthChange(widthKey, Math.max(15, Math.min(30, Number(e.target.value) || 20)))}
                className="ae-number-input w-14 text-center font-mono text-xs"
                aria-label={`Largeur ${label.toLowerCase()} valeur numérique`}
              />
              <span className="text-xs text-slate-400 font-bold">%</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>15% (Étroite)</span>
              <span>20% (Standard)</span>
              <span>30% (Large)</span>
            </div>
          </div>

          {/* Alignement des éléments */}
          <div>
            <span className="ae-modal-label text-xs font-semibold block mb-1.5">
              Alignement des éléments ({label})
            </span>
            <div className="flex items-center gap-2">
              {[
                { id: 'left', label: 'Gauche', icon: AlignLeft },
                { id: 'center', label: 'Centré', icon: AlignCenter },
                { id: 'right', label: 'Droite', icon: AlignRight }
              ].map((alignOpt) => {
                const IconComp = alignOpt.icon;
                const currentAlign = sideStyle.textAlign || 'left';
                const isSelected = currentAlign === alignOpt.id;
                return (
                  <button
                    key={alignOpt.id}
                    type="button"
                    onClick={() => handleSideStyleChange(side, 'textAlign', alignOpt.id)}
                    className={`ae-flipbook-btn-secondary flex-1 justify-center py-1.5 text-xs ${isSelected ? 'ring-2 ring-blue-600 bg-blue-50 dark:bg-blue-900/30 font-bold text-blue-700 dark:text-blue-300' : ''}`}
                    aria-pressed={isSelected}
                    aria-label={`Alignement ${alignOpt.label} pour ${label}`}
                  >
                    <IconComp size={14} aria-hidden="true" />
                    <span>{alignOpt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visibilité par palier responsive */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2">
              Visibilité par palier responsive ({label}) :
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="ae-checkbox-row cursor-pointer">
                <input
                  type="checkbox"
                  checked={vis.xl !== false}
                  onChange={(e) => handleVisibilityChange(side, 'xl', e.target.checked)}
                />
                <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <Tv size={14} /> XL — Grands écrans (&gt;= 1200px)
                </span>
              </label>

              <label className="ae-checkbox-row cursor-pointer">
                <input
                  type="checkbox"
                  checked={vis.desktop !== false}
                  onChange={(e) => handleVisibilityChange(side, 'desktop', e.target.checked)}
                />
                <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <Monitor size={14} /> L — Desktop (1024px)
                </span>
              </label>

              <label className="ae-checkbox-row cursor-pointer">
                <input
                  type="checkbox"
                  checked={vis.tablet !== false}
                  onChange={(e) => handleVisibilityChange(side, 'tablet', e.target.checked)}
                />
                <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <Tablet size={14} /> M — Tablettes (768px)
                </span>
              </label>

              <label className="ae-checkbox-row cursor-pointer">
                <input
                  type="checkbox"
                  checked={vis.mobile !== false}
                  onChange={(e) => handleVisibilityChange(side, 'mobile', e.target.checked)}
                />
                <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <Smartphone size={14} /> S — Smartphones (&lt; 600px)
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ae-global-sidebar-editor-container" data-testid="global-sidebar-editor">
      {/* 1. EN-TÊTE DE NAVIGATION & INFORMATIONS */}
      <div className="ae-global-editor-header p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSafeBack}
            className="ae-back-button flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer bg-transparent border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg"
            aria-label="Retour à la gestion des Flipbooks"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Retour à la gestion des Flipbooks</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="ae-admin-pill-global">
              <Sparkles size={13} aria-hidden="true" />
              <span>Modèle global actif</span>
            </span>

            {isDirty && (
              <span className="ae-admin-pill-dirty" role="status">
                <span className="ae-dirty-dot" />
                <span>Modifications non enregistrées</span>
              </span>
            )}

            {showSavedFeedback && (
              <span className="ae-admin-pill-success" role="status">
                <Check size={14} aria-hidden="true" />
                <span>Enregistré !</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">
            Modèle global — {BRAND_NAME}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0 leading-relaxed">
            Éditeur visuel des barres latérales du Flipbook. Personnalisez les dimensions, contours, ombres et contenus.
            L'aperçu en direct à droite reflète vos choix instantanément.
          </p>
        </div>
      </div>

      {/* 2. ONGLETS DE FOCUS / NAVIGATION HAUTE */}
      <div className="ae-global-tabs-bar flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 mb-4 pb-1" role="tablist" aria-label="Sections du modèle global">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            role="tab"
            id="tab-btn-content"
            aria-selected={activeTab === 'content'}
            aria-controls="panel-content"
            onClick={() => {
              setActiveTab('content');
              setOpenAccordions(prev => ({ ...prev, content: true }));
            }}
            className={`ae-global-tab-btn flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'content'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
            }`}
          >
            <Layers size={15} aria-hidden="true" />
            <span>1. Contenu des barres</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-btn-styles"
            aria-selected={activeTab === 'styles'}
            aria-controls="panel-styles"
            onClick={() => {
              setActiveTab('styles');
              setOpenAccordions({ dimensions: true, borders: false, colors: false, spacings: false, content: false });
            }}
            className={`ae-global-tab-btn flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'styles'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
            }`}
          >
            <Sliders size={15} aria-hidden="true" />
            <span>2. Apparence, Styles & Visibilité</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-btn-preview"
            aria-selected={activeTab === 'preview'}
            aria-controls="panel-preview"
            onClick={() => {
              setActiveTab('preview');
              setMobileViewMode('preview');
            }}
            className={`ae-global-tab-btn flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
            }`}
          >
            <Eye size={15} aria-hidden="true" />
            <span>3. Prévisualisation en direct (S, M, L, XL)</span>
          </button>
        </div>

        {/* Bouton pour tout déplier ou tout replier */}
        <button
          type="button"
          onClick={toggleAllAccordions}
          className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer border-none"
          title={areAllAccordionsOpen ? "Tout replier pour un gain de place maximal" : "Tout déplier pour voir toutes les sections"}
        >
          {areAllAccordionsOpen ? (
            <>
              <ChevronsDownUp size={14} aria-hidden="true" />
              <span>Tout replier</span>
            </>
          ) : (
            <>
              <ChevronsUpDown size={14} aria-hidden="true" />
              <span>Tout déplier</span>
            </>
          )}
        </button>
      </div>

      {/* BASCULE RESPONSIVE MOBILE / TABLETTE (< 900px) */}
      <div className="ae-mobile-view-toggle block lg:hidden mb-4 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMobileViewMode('config')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mobileViewMode === 'config'
              ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Sliders size={14} aria-hidden="true" />
          <span>Paramètres & Blocs</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileViewMode('preview')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mobileViewMode === 'preview'
              ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Eye size={14} aria-hidden="true" />
          <span>Aperçu en direct ({previewViewport.toUpperCase()})</span>
        </button>
      </div>

      {/* =========================================================================
          3. DISPOSITION EN DEUX PANNEAUX (55% / 45%)
          Panneau gauche : Configuration, accordéons et blocs (~55%)
          Panneau droit  : Aperçu interactif sticky sous le header (~45%)
          ========================================================================= */}
      <div className="ae-global-editor-unified-layout">
        
        {/* =====================================================================
            PANNEAU GAUCHE (~55%) - 5 SECTIONS D'ACCORDÉONS INTELLIGENTS
            ===================================================================== */}
        <aside 
          className={`ae-editor-left-panel ${mobileViewMode === 'preview' ? 'ae-mobile-panel-hidden' : ''}`} 
          aria-label="Panneau de personnalisation"
        >
          {/* ACCORDÉON 1 : DIMENSIONS & VISIBILITÉ */}
          <div className={`ae-editor-accordion ${openAccordions.dimensions ? 'is-open' : ''}`}>
            <button
              type="button"
              className="ae-accordion-header"
              onClick={() => toggleAccordion('dimensions')}
              aria-expanded={openAccordions.dimensions}
            >
              <h3 className="ae-accordion-title">
                <span className="ae-accordion-num-badge">1</span>
                <Maximize2 size={16} className="text-blue-600" aria-hidden="true" />
                <span>Dimensions & Visibilité des barres</span>
              </h3>
              {openAccordions.dimensions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openAccordions.dimensions && (
              <div className="ae-accordion-content space-y-4">
                {/* Activation/Désactivation des barres */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="ae-checkbox-row cursor-pointer">
                    <input
                      type="checkbox"
                      checked={styles.showLeftSidebar !== false}
                      onChange={(e) => handleStyleChange('showLeftSidebar', e.target.checked)}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Afficher la barre latérale gauche
                    </span>
                  </label>

                  <label className="ae-checkbox-row cursor-pointer">
                    <input
                      type="checkbox"
                      checked={styles.showRightSidebar !== false}
                      onChange={(e) => handleStyleChange('showRightSidebar', e.target.checked)}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Afficher la barre latérale droite
                    </span>
                  </label>

                  <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-700">
                    <label className="ae-checkbox-row cursor-pointer">
                      <input
                        type="checkbox"
                        checked={styles.syncSidebarsWidth !== false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked) {
                            const syncedVal = styles.leftWidth || styles.rightWidth || 20;
                            setTemplate(prev => ({
                              ...prev,
                              styles: {
                                ...(prev.styles || {}),
                                syncSidebarsWidth: true,
                                leftWidth: syncedVal,
                                rightWidth: syncedVal
                              }
                            }));
                          } else {
                            handleStyleChange('syncSidebarsWidth', false);
                          }
                        }}
                      />
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        Symétrie automatique : lier les dimensions de la barre gauche et droite
                      </span>
                    </label>
                  </div>
                </div>

                {/* En-têtes sémantiques et contrôles indépendants gauche / droite */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 px-1 pt-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Largeurs des barres latérales</span>
                  <span>Visibilité par palier responsive</span>
                </div>

                <div className="ae-styles-settings-grid space-y-3">
                  {renderSideStyleControls('left', 'Barre gauche', leftSideStyle, leftVis, 'leftWidth', 20)}
                  {renderSideStyleControls('right', 'Barre droite', rightSideStyle, rightVis, 'rightWidth', 20)}
                </div>

                {/* Format & Ratio unifié des Médias (Images & Vidéos) */}
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="select-media-ratio" className="ae-modal-label text-xs font-bold block mb-0 text-blue-900 dark:text-blue-300">
                      Dimensions des médias : Ratio unifié Images & Vidéos
                    </label>
                    <span className="ae-admin-pill-global text-[10px]">
                      Mêmes dimensions G/D
                    </span>
                  </div>
                  <select
                    id="select-media-ratio"
                    value={styles.mediaRatio || '16 / 9'}
                    onChange={(e) => handleStyleChange('mediaRatio', e.target.value)}
                    className="ae-flipbook-select w-full text-xs font-semibold"
                    aria-label="Format et ratio des blocs images et vidéos"
                  >
                    <option value="16 / 9">16:9 Panoramique vidéo (Standard {BRAND_NAME} — Recommandé)</option>
                    <option value="4 / 3">4:3 Classique photo</option>
                    <option value="1 / 1">1:1 Format carré</option>
                  </select>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-0">
                    Garantit que tous les blocs images et vidéos adoptent rigoureusement les mêmes dimensions dans la barre gauche et la barre droite.
                  </p>
                </div>

                {/* Largeur maximale du conteneur */}
                <div>
                  <label htmlFor="input-max-width" className="ae-modal-label text-xs font-bold block mb-1">
                    Largeur maximale totale (px)
                  </label>
                  <select
                    id="input-max-width"
                    value={styles.maxWidth || 1680}
                    onChange={(e) => handleStyleChange('maxWidth', Number(e.target.value))}
                    className="ae-flipbook-select w-full text-xs"
                  >
                    <option value="1400">1400 px — Modérée</option>
                    <option value="1680">1680 px — Recommandée (Standard {BRAND_NAME})</option>
                    <option value="1920">1920 px — Pleine largeur écran</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDÉON 2 : CONTOURS ET OMBRES DES BLOCS */}
          <div className={`ae-editor-accordion ${openAccordions.borders ? 'is-open' : ''}`}>
            <button
              type="button"
              className="ae-accordion-header"
              onClick={() => toggleAccordion('borders')}
              aria-expanded={openAccordions.borders}
            >
              <h3 className="ae-accordion-title">
                <span className="ae-accordion-num-badge">2</span>
                <Box size={16} className="text-blue-600" aria-hidden="true" />
                <span>Contours & Ombres des blocs</span>
              </h3>
              {openAccordions.borders ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openAccordions.borders && (
              <div className="ae-accordion-content space-y-4">
                {/* 1. ÉPAISSEUR DU CONTOUR (0 à 12 px) */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <label htmlFor="input-border-width">Épaisseur du contour</label>
                    <span className="text-blue-600 font-mono">
                      {currentBorderWidth === 0 ? '0 px (Supprimé)' : `${currentBorderWidth} px`}
                    </span>
                  </div>
                  <div className="ae-range-number-group flex items-center gap-2">
                    <input
                      id="input-border-width"
                      type="range"
                      min="0"
                      max="12"
                      step="1"
                      value={currentBorderWidth}
                      onChange={(e) => handleStyleChange('borderWidth', Number(e.target.value))}
                      className="ae-range-input flex-1"
                      aria-label="Épaisseur du contour"
                    />
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={currentBorderWidth}
                      onChange={(e) => handleStyleChange('borderWidth', Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
                      className="ae-number-input w-14 text-center font-mono text-xs"
                      aria-label="Épaisseur du contour en pixels"
                    />
                    <span className="text-xs text-slate-400 font-bold">px</span>
                  </div>
                </div>

                {/* 2. STYLE ET COULEUR DU CONTOUR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="select-border-style" className="ae-modal-label text-xs font-bold block mb-1">
                      Style du contour
                    </label>
                    <select
                      id="select-border-style"
                      value={currentBorderStyle}
                      onChange={(e) => handleStyleChange('borderStyle', e.target.value)}
                      className="ae-flipbook-select w-full text-xs"
                    >
                      <option value="solid">Continu</option>
                      <option value="dotted">Pointillé</option>
                      <option value="dashed">Tirets</option>
                      <option value="none">Aucun</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="color-border-color" className="ae-modal-label text-xs font-bold block mb-1">
                      Couleur du contour
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="color-border-color"
                        type="color"
                        value={currentBorderColor}
                        onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                        className="ae-color-picker-square"
                        aria-label="Couleur du contour"
                      />
                      <input
                        type="text"
                        value={currentBorderColor}
                        onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                        className="ae-flipbook-input text-xs flex-1 font-mono"
                        placeholder="#cbd5e1"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. ARRONDI DES ANGLES (0 à 40 px) */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <label htmlFor="input-border-radius">Arrondi des angles</label>
                    <span className="text-blue-600 font-mono">{currentBorderRadius} px</span>
                  </div>
                  <div className="ae-range-number-group flex items-center gap-2">
                    <input
                      id="input-border-radius"
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={currentBorderRadius}
                      onChange={(e) => handleStyleChange('borderRadius', Number(e.target.value))}
                      className="ae-range-input flex-1"
                      aria-label="Arrondi des angles"
                    />
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={currentBorderRadius}
                      onChange={(e) => handleStyleChange('borderRadius', Math.max(0, Math.min(40, Number(e.target.value) || 0)))}
                      className="ae-number-input w-14 text-center font-mono text-xs"
                      aria-label="Arrondi des angles en pixels"
                    />
                    <span className="text-xs text-slate-400 font-bold">px</span>
                  </div>
                </div>

                {/* 4. CONTOURS SÉPARÉS DES 4 CÔTÉS */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Définition des 4 côtés :
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStyleChange('borderSidesUniform', true)}
                        className={`ae-btn-pill-choice ${isBorderSidesUniform ? 'active' : ''}`}
                      >
                        Uniforme
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStyleChange('borderSidesUniform', false)}
                        className={`ae-btn-pill-choice ${!isBorderSidesUniform ? 'active' : ''}`}
                      >
                        Séparés
                      </button>
                    </div>
                  </div>

                  {!isBorderSidesUniform && (
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <label htmlFor="border-top-val" className="text-[11px] block text-slate-500 font-semibold mb-0.5">Haut</label>
                        <input
                          id="border-top-val"
                          type="number"
                          min="0"
                          max="12"
                          value={styles.borderWidthTop !== undefined ? styles.borderWidthTop : currentBorderWidth}
                          onChange={(e) => handleStyleChange('borderWidthTop', Number(e.target.value))}
                          className="ae-number-input w-full"
                          aria-label="Bordure haut en px"
                        />
                      </div>
                      <div>
                        <label htmlFor="border-right-val" className="text-[11px] block text-slate-500 font-semibold mb-0.5">Droite</label>
                        <input
                          id="border-right-val"
                          type="number"
                          min="0"
                          max="12"
                          value={styles.borderWidthRight !== undefined ? styles.borderWidthRight : currentBorderWidth}
                          onChange={(e) => handleStyleChange('borderWidthRight', Number(e.target.value))}
                          className="ae-number-input w-full"
                          aria-label="Bordure droite en px"
                        />
                      </div>
                      <div>
                        <label htmlFor="border-bottom-val" className="text-[11px] block text-slate-500 font-semibold mb-0.5">Bas</label>
                        <input
                          id="border-bottom-val"
                          type="number"
                          min="0"
                          max="12"
                          value={styles.borderWidthBottom !== undefined ? styles.borderWidthBottom : currentBorderWidth}
                          onChange={(e) => handleStyleChange('borderWidthBottom', Number(e.target.value))}
                          className="ae-number-input w-full"
                          aria-label="Bordure bas en px"
                        />
                      </div>
                      <div>
                        <label htmlFor="border-left-val" className="text-[11px] block text-slate-500 font-semibold mb-0.5">Gauche</label>
                        <input
                          id="border-left-val"
                          type="number"
                          min="0"
                          max="12"
                          value={styles.borderWidthLeft !== undefined ? styles.borderWidthLeft : currentBorderWidth}
                          onChange={(e) => handleStyleChange('borderWidthLeft', Number(e.target.value))}
                          className="ae-number-input w-full"
                          aria-label="Bordure gauche en px"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. SECTION OMBRE */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Ombre portée des blocs
                    </span>
                    <label className="ae-checkbox-row cursor-pointer mb-0">
                      <input
                        type="checkbox"
                        checked={isShadowEnabled}
                        onChange={(e) => handleStyleChange('shadowEnabled', e.target.checked)}
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-300">Activer</span>
                    </label>
                  </div>

                  {/* 4 Préréglages */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Préréglages d'ombre :
                    </span>
                    <div className="ae-shadow-presets-grid">
                      {['none', 'subtle', 'medium', 'elevated'].map((key) => {
                        const preset = SHADOW_PRESETS[key];
                        const isSelected = currentShadowPreset === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleApplyShadowPreset(key)}
                            className={`ae-btn-shadow-preset ${isSelected ? 'active' : ''}`}
                          >
                            <span>{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {isShadowEnabled && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                      {/* Flou et Opacité */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold mb-0.5">
                            <label htmlFor="input-shadow-blur">Flou (0-60 px)</label>
                            <span className="font-mono">{currentShadowBlur}px</span>
                          </div>
                          <input
                            id="input-shadow-blur"
                            type="range"
                            min="0"
                            max="60"
                            step="1"
                            value={currentShadowBlur}
                            onChange={(e) => handleStyleChange('shadowBlur', Number(e.target.value))}
                            className="ae-range-input w-full"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold mb-0.5">
                            <label htmlFor="input-shadow-opacity">Opacité (0-100%)</label>
                            <span className="font-mono">{currentShadowOpacity}%</span>
                          </div>
                          <input
                            id="input-shadow-opacity"
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={currentShadowOpacity}
                            onChange={(e) => handleStyleChange('shadowOpacity', Number(e.target.value))}
                            className="ae-range-input w-full"
                          />
                        </div>
                      </div>

                      {/* Décalages X / Y */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold mb-0.5">
                            <label htmlFor="input-shadow-x">Décalage X</label>
                            <span className="font-mono">{currentShadowOffsetX}px</span>
                          </div>
                          <input
                            id="input-shadow-x"
                            type="range"
                            min="-30"
                            max="30"
                            step="1"
                            value={currentShadowOffsetX}
                            onChange={(e) => handleStyleChange('shadowOffsetX', Number(e.target.value))}
                            className="ae-range-input w-full"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold mb-0.5">
                            <label htmlFor="input-shadow-y">Décalage Y</label>
                            <span className="font-mono">{currentShadowOffsetY}px</span>
                          </div>
                          <input
                            id="input-shadow-y"
                            type="range"
                            min="-30"
                            max="30"
                            step="1"
                            value={currentShadowOffsetY}
                            onChange={(e) => handleStyleChange('shadowOffsetY', Number(e.target.value))}
                            className="ae-range-input w-full"
                          />
                        </div>
                      </div>

                      {/* Étendue de l'ombre (-20 à +30 px) */}
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold mb-0.5">
                          <label htmlFor="input-shadow-spread">Étendue (-20 à +30 px)</label>
                          <span className="font-mono">{currentShadowSpread}px</span>
                        </div>
                        <input
                          id="input-shadow-spread"
                          type="range"
                          min="-20"
                          max="30"
                          step="1"
                          value={currentShadowSpread}
                          onChange={(e) => handleStyleChange('shadowSpread', Number(e.target.value))}
                          className="ae-range-input w-full"
                          aria-label="Étendue de l'ombre en pixels"
                        />
                      </div>

                      {/* Couleur et Type (Intérieure / Extérieure) */}
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <div>
                          <label htmlFor="color-shadow-col" className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold block mb-0.5">
                            Couleur de l'ombre
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              id="color-shadow-col"
                              type="color"
                              value={currentShadowColor}
                              onChange={(e) => handleStyleChange('shadowColor', e.target.value)}
                              className="ae-color-picker-square"
                            />
                            <span className="text-[11px] font-mono text-slate-500">{currentShadowColor}</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold block mb-0.5">
                            Disposition
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStyleChange('shadowInset', false)}
                              className={`ae-btn-pill-choice flex-1 ${!isShadowInset ? 'active' : ''}`}
                            >
                              Extérieure
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStyleChange('shadowInset', true)}
                              className={`ae-btn-pill-choice flex-1 ${isShadowInset ? 'active' : ''}`}
                            >
                              Intérieure
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* BOUTON D'HARMONISATION : APPLIQUER CE STYLE À TOUS LES BLOCS */}
                <button
                  type="button"
                  onClick={handleApplyStyleToAllBlocks}
                  className="ae-btn-apply-all-blocks w-full"
                  aria-label="Appliquer ce style à tous les blocs"
                >
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Appliquer ce style à tous les blocs</span>
                </button>
              </div>
            )}
          </div>

          {/* ACCORDÉON 3 : COULEURS ET HABILLAGE */}
          <div className={`ae-editor-accordion ${openAccordions.colors ? 'is-open' : ''}`}>
            <button
              type="button"
              className="ae-accordion-header"
              onClick={() => toggleAccordion('colors')}
              aria-expanded={openAccordions.colors}
            >
              <h3 className="ae-accordion-title">
                <span className="ae-accordion-num-badge">3</span>
                <Palette size={16} className="text-blue-600" aria-hidden="true" />
                <span>Couleurs et habillage des cartes</span>
              </h3>
              {openAccordions.colors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openAccordions.colors && (
              <div className="ae-accordion-content space-y-4">
                {/* Couleur d'accentuation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="input-primary-color" className="ae-modal-label text-xs font-bold block mb-0">
                      Couleur d'accentuation des titres et boutons
                    </label>
                    <button
                      type="button"
                      onClick={() => handleStyleChange('primaryColor', '#1e3a8a')}
                      className="text-[10px] text-blue-600 hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Défaut (#1e3a8a)
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-primary-color"
                      type="color"
                      value={styles.primaryColor || '#1e3a8a'}
                      onChange={(e) => handleStyleChange('primaryColor', e.target.value)}
                      className="ae-color-picker-square"
                      aria-label="Palette de couleur primaire"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['#1e3a8a', '#d97706', '#059669', '#881337', '#0f172a', '#2563eb'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleStyleChange('primaryColor', c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer transition-transform ${styles.primaryColor === c ? 'scale-125 ring-2 ring-offset-1 ring-blue-500' : 'hover:scale-110'}`}
                          title={`Choisir ${c}`}
                          aria-label={`Couleur ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Couleur de fond des cartes */}
                <div>
                  <label htmlFor="input-card-bg" className="ae-modal-label text-xs font-bold block mb-1">
                    Fond des cartes de blocs
                  </label>
                  <select
                    id="input-card-bg"
                    value={styles.cardBackground || ''}
                    onChange={(e) => handleStyleChange('cardBackground', e.target.value)}
                    className="ae-flipbook-select w-full text-xs"
                  >
                    <option value="">Blanc pur (#ffffff) — Par défaut</option>
                    <option value="#f8fafc">Gris ardoise très doux (#f8fafc)</option>
                    <option value="#fdfbf7">Crème littéraire papier (#fdfbf7)</option>
                    <option value="#f0f9ff">Ciel subtil d'Anjou (#f0f9ff)</option>
                  </select>
                </div>

                {/* Couleur d'arrière-plan des colonnes */}
                <div>
                  <label htmlFor="input-col-bg" className="ae-modal-label text-xs font-bold block mb-1">
                    Arrière-plan des barres latérales
                  </label>
                  <select
                    id="input-col-bg"
                    value={styles.backgroundColor || ''}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="ae-flipbook-select w-full text-xs"
                  >
                    <option value="">Transparent (Par défaut)</option>
                    <option value="#f8fafc">Ardoise claire (#f8fafc)</option>
                    <option value="#fdfbf7">Papier crème (#fdfbf7)</option>
                    <option value="#f0f9ff">Bleu doux (#f0f9ff)</option>
                  </select>
                </div>

                {/* Couleur du texte */}
                <div>
                  <label htmlFor="input-text-color" className="ae-modal-label text-xs font-bold block mb-1">
                    Couleur du texte
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-text-color"
                      type="color"
                      value={styles.textColor || '#334155'}
                      onChange={(e) => handleStyleChange('textColor', e.target.value)}
                      className="ae-color-picker-square"
                      aria-label="Couleur du texte"
                    />
                    <input
                      type="text"
                      value={styles.textColor || ''}
                      onChange={(e) => handleStyleChange('textColor', e.target.value)}
                      placeholder="#334155"
                      className="ae-flipbook-input text-xs flex-1 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDÉON 4 : ESPACEMENTS & DISPOSITION */}
          <div className={`ae-editor-accordion ${openAccordions.spacings ? 'is-open' : ''}`}>
            <button
              type="button"
              className="ae-accordion-header"
              onClick={() => toggleAccordion('spacings')}
              aria-expanded={openAccordions.spacings}
            >
              <h3 className="ae-accordion-title">
                <span className="ae-accordion-num-badge">4</span>
                <Sliders size={16} className="text-blue-600" aria-hidden="true" />
                <span>Espacements & Disposition</span>
              </h3>
              {openAccordions.spacings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openAccordions.spacings && (
              <div className="ae-accordion-content space-y-4">
                {/* Espacement intérieur des cartes */}
                <div>
                  <label htmlFor="input-card-padding" className="ae-modal-label text-xs font-bold block mb-1">
                    Espacement intérieur des cartes (padding)
                  </label>
                  <select
                    id="input-card-padding"
                    value={styles.cardPadding || 'normal'}
                    onChange={(e) => handleStyleChange('cardPadding', e.target.value)}
                    className="ae-flipbook-select w-full text-xs"
                  >
                    <option value="compact">Compact (12px)</option>
                    <option value="normal">Normal (18px)</option>
                    <option value="spacious">Spacieux (24px)</option>
                  </select>
                </div>

                {/* Espacement entre les blocs */}
                <div>
                  <label htmlFor="input-gap" className="ae-modal-label text-xs font-bold block mb-1">
                    Espacement entre les blocs (gap)
                  </label>
                  <select
                    id="input-gap"
                    value={styles.gap || 'normal'}
                    onChange={(e) => handleStyleChange('gap', e.target.value)}
                    className="ae-flipbook-select w-full text-xs"
                  >
                    <option value="compact">Compact (12px)</option>
                    <option value="normal">Normal (20px)</option>
                    <option value="relaxed">Aéré (28px)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDÉON 5 : CONTENU DES BLOCS (GAUCHE & DROITE) */}
          <div className={`ae-editor-accordion ${openAccordions.content ? 'is-open' : ''}`}>
            <button
              type="button"
              className="ae-accordion-header"
              onClick={() => toggleAccordion('content')}
              aria-expanded={openAccordions.content}
            >
              <h3 className="ae-accordion-title">
                <span className="ae-accordion-num-badge">5</span>
                <Layers size={16} className="text-blue-600" aria-hidden="true" />
                <span>Contenu des blocs (Gauche & Droite)</span>
              </h3>
              {openAccordions.content ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openAccordions.content && (
              <div className="ae-accordion-content p-3 space-y-3">
                <div className="ae-notice-banner mb-3 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-xl">
                  <Info size={16} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>Souveraineté éditoriale :</strong> Modifiez, ajoutez, dupliquez ou réorganisez librement les blocs des deux barres. Vos modifications s'affichent instantanément dans l'aperçu sticky.
                  </div>
                </div>

                <FlipbookSidebarEditor
                  flipbook={template}
                  onChange={(updated) => {
                    setTemplate(prev => ({
                      ...prev,
                      leftSidebar: updated.leftSidebar || [],
                      rightSidebar: updated.rightSidebar || []
                    }));
                  }}
                />
              </div>
            )}
          </div>
        </aside>

        {/* =====================================================================
            PANNEAU DROIT (~45%) - APERÇU INTERACTIF STICKY DU FLIPBOOK
            [ BARRE GAUCHE ] [ FLIPBOOK ] [ BARRE DROITE ]
            ===================================================================== */}
        <main 
          className={`ae-editor-center-stage ${mobileViewMode === 'config' ? 'ae-mobile-panel-hidden' : ''}`} 
          aria-label="Aperçu en direct du modèle global"
        >
          <div className="ae-center-stage-card w-full p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Barre de contrôle du viewport (XL, L, M, S) & sélection du livre de test */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mr-1 flex items-center gap-1">
                  <Eye size={15} className="text-blue-600" aria-hidden="true" />
                  <span>Aperçu en direct :</span>
                </span>
                
                <button
                  type="button"
                  onClick={() => setPreviewViewport('xl')}
                  className={`ae-viewport-btn ${previewViewport === 'xl' ? 'active' : ''}`}
                  title="Format XL — Grands écrans (>= 1200px)"
                  aria-label="Format XL Grands écrans"
                >
                  <Tv size={14} aria-hidden="true" />
                  <span>XL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewViewport('l')}
                  className={`ae-viewport-btn ${previewViewport === 'l' ? 'active' : ''}`}
                  title="Format L — Ordinateur portable (1024px)"
                  aria-label="Format L Ordinateur portable"
                >
                  <Monitor size={14} aria-hidden="true" />
                  <span>L</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewViewport('m')}
                  className={`ae-viewport-btn ${previewViewport === 'm' ? 'active' : ''}`}
                  title="Format M — Tablette (768px)"
                  aria-label="Format M Tablette"
                >
                  <Tablet size={14} aria-hidden="true" />
                  <span>M</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewViewport('s')}
                  className={`ae-viewport-btn ${previewViewport === 's' ? 'active' : ''}`}
                  title="Format S — Smartphone (390px)"
                  aria-label="Format S Smartphone"
                >
                  <Smartphone size={14} aria-hidden="true" />
                  <span>S</span>
                </button>
              </div>

              {/* Sélecteur de Flipbook test */}
              {flipbooks.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 shrink-0">
                    Flipbook test :
                  </span>
                  <select
                    value={previewBookId}
                    onChange={(e) => setPreviewBookId(e.target.value)}
                    className="ae-flipbook-select text-xs py-1"
                    aria-label="Choisir le flipbook à utiliser pour la prévisualisation"
                  >
                    {flipbooks.map(fb => (
                      <option key={fb.id} value={fb.id}>
                        {fb.title} ({fb.category || 'Outils'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* En-tête de repère visuel */}
            <div className="ae-preview-frame-header mb-2.5 flex items-center justify-between text-xs text-slate-400">
              <span className="ae-preview-tag font-bold text-slate-700 dark:text-slate-300">
                [ BARRE GAUCHE ] [ FLIPBOOK ] [ BARRE DROITE ]
              </span>
              <span className="text-[11px] font-mono">
                {previewViewport === 'xl' && 'Plein écran (>1200px)'}
                {previewViewport === 'l' && '1024px Desktop'}
                {previewViewport === 'm' && '768px Tablette (Flipbook prioritaire)'}
                {previewViewport === 's' && '390px Smartphone (Défilement vertical)'}
              </span>
            </div>

            {/* Cadre de prévisualisation avec contrainte responsive et mise à l'échelle virtuelle (R2) */}
            <div className="ae-preview-stage-wrapper" ref={previewStageWrapperRef}>
              <div 
                className={`ae-preview-viewport-frame viewport-${previewViewport} ae-preview-scaler-outer`}
                style={{
                  height: previewScale < 1 && scaledHeight !== 'auto' ? scaledHeight : 'auto'
                }}
              >
                <div
                  ref={previewContentRef}
                  className="ae-preview-scaler-inner"
                  style={{
                    width: previewScale < 1 ? `${previewViewport === 'xl' ? 1240 : previewViewport === 'l' ? 1024 : previewViewport === 'm' ? 768 : 390}px` : '100%',
                    maxWidth: previewScale === 1 ? (previewViewport === 'xl' ? '100%' : previewViewport === 'l' ? '1024px' : previewViewport === 'm' ? '768px' : '390px') : 'none',
                    transform: previewScale < 1 ? `scale(${previewScale})` : 'none',
                    transformOrigin: 'top left',
                    margin: previewScale === 1 ? '0 auto' : '0'
                  }}
                >
                  <div className="ae-preview-stage-content p-3 bg-slate-100 dark:bg-slate-900 rounded-b-xl overflow-hidden">
                    <FlipbookLayout
                      book={{ ...previewBook, sidebarMode: 'global' }}
                      globalSidebar={template}
                    >
                      <PdfFlipbookReader
                        book={previewBook}
                        onClose={() => {}}
                      />
                    </FlipbookLayout>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* =========================================================================
          4. BARRE D'ACTIONS STICKY INFÉRIEURE FIXE
          ========================================================================= */}
      <footer className="ae-editor-bottom-bar" role="region" aria-label="Actions du modèle global">
        <div className="ae-bottom-bar-inner max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          {/* Statut à gauche */}
          <div className="ae-bottom-bar-status flex items-center gap-2">
            {isDirty ? (
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs">
                <span className="ae-dirty-dot" />
                <span>Modifications en attente d'enregistrement</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                <Check size={16} aria-hidden="true" />
                <span>Modèle global à jour et synchronisé</span>
              </span>
            )}
          </div>

          {/* Actions à droite */}
          <div className="ae-bottom-bar-actions flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCancelModifications}
              disabled={!isDirty || isSaving}
              className="ae-flipbook-btn-secondary"
              aria-label="Annuler les modifications"
            >
              <Undo2 size={15} aria-hidden="true" />
              <span>Annuler les modifications</span>
            </button>

            <button
              type="button"
              onClick={handleRestoreLastSavedVersion}
              disabled={isSaving}
              className="ae-flipbook-btn-secondary"
              aria-label="Restaurer la dernière version enregistrée"
              title="Restaurer la dernière version enregistrée"
            >
              <History size={15} aria-hidden="true" />
              <span>Restaurer version enregistrée</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={isSaving}
              className="ae-btn-reset-changes"
              aria-label="Réinitialiser les modifications"
            >
              <RotateCcw size={15} aria-hidden="true" />
              <span>Réinitialiser les modifications</span>
            </button>

            <button
              type="button"
              onClick={() => setShowApplyAllConfirm(true)}
              disabled={isSaving || isApplyingAll}
              className="ae-btn-outline-primary"
              aria-label="Appliquer le modèle global à tous"
            >
              <Sparkles size={15} aria-hidden="true" />
              <span>Appliquer à tous les Flipbooks</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="ae-flipbook-btn-primary"
              aria-label="Enregistrer le modèle global"
            >
              <Save size={16} aria-hidden="true" />
              <span>{isSaving ? "Enregistrement..." : "Enregistrer le modèle global"}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODALE DE CONFIRMATION & BILAN : APPLIQUER À TOUS LES FLIPBOOKS */}
      {showApplyAllConfirm && (
        <div className="ae-modal-overlay" onClick={() => setShowApplyAllConfirm(false)} role="presentation">
          <div 
            className="ae-modal-container max-w-lg p-6" 
            onClick={(e) => e.stopPropagation()} 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="apply-all-modal-title"
          >
            {!applyAllReport ? (
              <>
                <div className="flex items-center gap-3 mb-3 text-blue-600">
                  <Sparkles size={24} aria-hidden="true" />
                  <h3 id="apply-all-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 mb-0">
                    Appliquer le modèle global à tous les Flipbooks ?
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                  Cette action va configurer l'ensemble de vos <strong>{flipbooksAnalysis.totalCount} flipbooks</strong> pour utiliser la référence dynamique au <strong>« Modèle global — {BRAND_NAME} »</strong>.
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Flipbooks enregistrés au total :</span>
                    <strong className="text-slate-900 dark:text-white">{flipbooksAnalysis.totalCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Utilisant déjà le modèle global :</span>
                    <strong className="text-emerald-700 dark:text-emerald-400">{flipbooksAnalysis.globalCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">En configuration personnalisée :</span>
                    <strong className="text-amber-700 dark:text-amber-400">{flipbooksAnalysis.customCount}</strong>
                  </div>
                </div>

                {flipbooksAnalysis.customCount > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg mb-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <ShieldCheck size={16} className="shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
                    <div>
                      <strong>Protection des données :</strong> Les {flipbooksAnalysis.customCount} configuration(s) individuelle(s) existante(s) seront automatiquement sauvegardées en copie de secours avant le passage au modèle global, afin que vous puissiez les restaurer à tout moment dans la fiche de chaque Flipbook.
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyAllConfirm(false)}
                    className="ae-flipbook-btn-secondary"
                    disabled={isApplyingAll}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApplyToAll}
                    disabled={isApplyingAll}
                    className="ae-flipbook-btn-primary"
                  >
                    <Check size={16} aria-hidden="true" />
                    <span>{isApplyingAll ? 'Application en cours...' : 'Confirmer et appliquer'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div data-testid="apply-all-report">
                <div className="flex items-center gap-3 mb-3 text-emerald-600">
                  <CheckCircle2 size={24} aria-hidden="true" />
                  <h3 id="apply-all-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 mb-0">
                    Bilan de l'application du modèle global
                  </h3>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Flipbooks traités :</span>
                    <strong>{applyAllReport.totalCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Déjà sur le modèle global :</span>
                    <strong>{applyAllReport.alreadyGlobalCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Configurations personnalisées basculées :</span>
                    <strong className="text-blue-600">{applyAllReport.replacedCustomCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Configurations individuelles sauvegardées :</span>
                    <strong className="text-emerald-600">{applyAllReport.backedUpCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Flipbooks vérifiés et synchronisés :</span>
                    <strong className="text-emerald-600">{applyAllReport.verifiedCount} / {applyAllReport.totalCount}</strong>
                  </div>
                  {applyAllReport.errorCount > 0 && (
                    <div className="pt-2 border-t border-red-200 text-red-600">
                      <strong>Erreurs signalées ({applyAllReport.errorCount}) :</strong>
                      <ul className="list-disc pl-4 mt-1">
                        {(applyAllReport.errors || []).map((errItem, idx) => (
                          <li key={idx}>{errItem.title} : {errItem.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setApplyAllReport(null);
                      setShowApplyAllConfirm(false);
                    }}
                    className="ae-flipbook-btn-primary"
                  >
                    <span>Fermer le bilan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
