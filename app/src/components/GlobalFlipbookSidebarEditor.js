import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Sliders, 
  Layers, 
  Check, 
  AlertTriangle, 
  RotateCcw, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Tv, 
  Sparkles,
  BookOpen,
  Info,
  CheckCircle2,
  Undo2,
  History,
  PanelLeft,
  PanelRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ShieldCheck
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

/**
 * Éditeur visuel et complet du « Modèle global — Anjou Édition » de barres latérales.
 * Permet de modifier indépendamment la barre gauche et la barre droite (contenu, styles,
 * largeurs, couleurs, alignement, bordures, ombres, visibilité S/M/L/XL) avec aperçu local immédiat.
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

  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'styles' | 'preview'
  const [previewViewport, setPreviewViewport] = useState('xl'); // 'xl' | 'l' | 'm' | 's'
  const [showLiveInlinePreview, setShowLiveInlinePreview] = useState(true);
  const [previewBookId, setPreviewBookId] = useState(() => {
    return flipbooks.length > 0 ? flipbooks[0].id : '';
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [showApplyAllConfirm, setShowApplyAllConfirm] = useState(false);
  const [applyAllReport, setApplyAllReport] = useState(null);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Détection de modifications non enregistrées
  const isDirty = useMemo(() => {
    return JSON.stringify(template) !== savedBaseline;
  }, [template, savedBaseline]);

  // Analyse en temps réel des Flipbooks enregistrés (global vs personnalisé)
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

  // Avertissement de fermeture de fenêtre si modifications non enregistrées
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
        { pageNum: 1, title: "Couverture", content: "Anjou Édition\n\nModèle global interactif" }
      ],
      pdfFile: "secrets_vignoble_angevin.pdf"
    };
  }, [flipbooks, previewBookId]);

  // Gestion des modifications de styles globaux
  const handleStyleChange = (key, value) => {
    setTemplate(prev => ({
      ...prev,
      styles: {
        ...(prev.styles || {}),
        [key]: value
      }
    }));
  };

  // Gestion des modifications de styles indépendants par barre ('left' ou 'right')
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

  // Gestion de la visibilité responsive par barre ('left' ou 'right')
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
      setNotification("Modèle global — Anjou Édition enregistré avec succès !");
      onSaveSuccess(savedData);
    } catch (err) {
      console.error("Erreur enregistrement modèle global:", err);
      setIsSaving(false);
      alert("Une erreur est survenue lors de l'enregistrement du modèle global.");
    }
  };

  // Annuler les modifications en cours (revient à l'état de référence sans publier)
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

  // Restaurer la dernière version enregistrée (depuis Firebase / LocalStorage ou sauvegarde précédente)
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

  // Réinitialisation aux valeurs par défaut d'usine
  const handleResetToDefault = () => {
    if (window.confirm("Voulez-vous vraiment réinitialiser le modèle global aux valeurs par défaut d'Anjou Édition ? Vos personnalisations non enregistrées seront perdues.")) {
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

  // Application du modèle global à tous les Flipbooks avec bilan détaillé
  const handleConfirmApplyToAll = async () => {
    setIsApplyingAll(true);
    try {
      // Si le modèle a des modifications locales non enregistrées, on l'enregistre d'abord
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

  // Composant de personnalisation dédiée à une barre (Gauche ou Droite)
  const renderSideStyleControls = (side, label, sideStyle, vis, widthKey, defaultWidth) => {
    const isLeft = side === 'left';
    return (
      <div
        className="ae-settings-group-card"
        data-testid={`style-config-${side}`}
      >
        <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="ae-settings-group-title mb-0">
            {isLeft ? (
              <PanelLeft size={18} className="text-blue-600" aria-hidden="true" />
            ) : (
              <PanelRight size={18} className="text-blue-600" aria-hidden="true" />
            )}
            <span>Personnalisation : {label}</span>
          </h3>
          <span className="ae-admin-pill-global">
            {(isLeft ? template.leftSidebar?.length : template.rightSidebar?.length) || 0} bloc(s)
          </span>
        </div>

        <div className="space-y-4">
          {/* 1. Largeur et espacement */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <label htmlFor={`input-${side}-width`}>Largeur {label} (sur grand écran)</label>
              <span className="text-blue-600 font-mono">{styles[widthKey] || defaultWidth}%</span>
            </div>
            <input
              id={`input-${side}-width`}
              type="range"
              min="15"
              max="30"
              step="1"
              value={styles[widthKey] || defaultWidth}
              onChange={(e) => handleStyleChange(widthKey, Number(e.target.value))}
              className="ae-range-input"
              aria-label={`Largeur ${label.toLowerCase()} en pourcentage`}
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>15% (Étroite)</span>
              <span>20% (Standard)</span>
              <span>30% (Large)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`select-${side}-gap`} className="ae-modal-label text-xs">
                Espacement entre les blocs
              </label>
              <select
                id={`select-${side}-gap`}
                value={sideStyle.gap || 'inherit'}
                onChange={(e) => handleSideStyleChange(side, 'gap', e.target.value)}
                className="ae-flipbook-select w-full"
              >
                <option value="inherit">Identique au modèle global ({styles.gap || 'normal'})</option>
                <option value="compact">Compact (12px)</option>
                <option value="normal">Normal (20px)</option>
                <option value="relaxed">Aéré (28px)</option>
              </select>
            </div>

            <div>
              <label htmlFor={`select-${side}-padding`} className="ae-modal-label text-xs">
                Espacement interne des cartes
              </label>
              <select
                id={`select-${side}-padding`}
                value={sideStyle.cardPadding || 'inherit'}
                onChange={(e) => handleSideStyleChange(side, 'cardPadding', e.target.value)}
                className="ae-flipbook-select w-full"
              >
                <option value="inherit">Standard (18px)</option>
                <option value="compact">Compact (12px)</option>
                <option value="normal">Normal (18px)</option>
                <option value="spacious">Spacieux (24px)</option>
              </select>
            </div>
          </div>

          {/* 2. Alignement des éléments */}
          <div>
            <span className="ae-modal-label text-xs block mb-1.5">
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

          {/* 3. Couleurs et arrière-plan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label htmlFor={`select-${side}-col-bg`} className="ae-modal-label text-xs">
                Arrière-plan de la colonne
              </label>
              <select
                id={`select-${side}-col-bg`}
                value={sideStyle.backgroundColor || ''}
                onChange={(e) => handleSideStyleChange(side, 'backgroundColor', e.target.value)}
                className="ae-flipbook-select w-full"
              >
                <option value="">Transparent (Par défaut)</option>
                <option value="#f8fafc">Ardoise claire (#f8fafc)</option>
                <option value="#fdfbf7">Papier crème (#fdfbf7)</option>
                <option value="#f0f9ff">Bleu Anjou doux (#f0f9ff)</option>
                <option value="#f1f5f9">Gris perle (#f1f5f9)</option>
              </select>
            </div>

            <div>
              <label htmlFor={`select-${side}-card-bg`} className="ae-modal-label text-xs">
                Fond des cartes ({label})
              </label>
              <select
                id={`select-${side}-card-bg`}
                value={sideStyle.cardBackground || ''}
                onChange={(e) => handleSideStyleChange(side, 'cardBackground', e.target.value)}
                className="ae-flipbook-select w-full"
              >
                <option value="">Identique au global</option>
                <option value="#ffffff">Blanc pur (#ffffff)</option>
                <option value="#f8fafc">Gris ardoise doux (#f8fafc)</option>
                <option value="#fdfbf7">Crème littéraire (#fdfbf7)</option>
                <option value="#f0f9ff">Ciel subtil (#f0f9ff)</option>
              </select>
            </div>

            <div>
              <label htmlFor={`color-${side}-primary`} className="ae-modal-label text-xs">
                Couleur titres & boutons
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`color-${side}-primary`}
                  type="color"
                  value={sideStyle.primaryColor || styles.primaryColor || '#1e3a8a'}
                  onChange={(e) => handleSideStyleChange(side, 'primaryColor', e.target.value)}
                  className="ae-color-picker-square"
                  aria-label={`Couleur principale ${label}`}
                />
                <input
                  type="text"
                  value={sideStyle.primaryColor || ''}
                  onChange={(e) => handleSideStyleChange(side, 'primaryColor', e.target.value)}
                  placeholder={styles.primaryColor || '#1e3a8a'}
                  className="ae-flipbook-input text-xs flex-1"
                />
              </div>
            </div>

            <div>
              <label htmlFor={`color-${side}-text`} className="ae-modal-label text-xs">
                Couleur du texte
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`color-${side}-text`}
                  type="color"
                  value={sideStyle.textColor || styles.textColor || '#334155'}
                  onChange={(e) => handleSideStyleChange(side, 'textColor', e.target.value)}
                  className="ae-color-picker-square"
                  aria-label={`Couleur du texte ${label}`}
                />
                <input
                  type="text"
                  value={sideStyle.textColor || ''}
                  onChange={(e) => handleSideStyleChange(side, 'textColor', e.target.value)}
                  placeholder={styles.textColor || '#334155'}
                  className="ae-flipbook-input text-xs flex-1"
                />
              </div>
            </div>
          </div>

          {/* 4. Bordures, arrondis et ombres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label htmlFor={`color-${side}-border`} className="ae-modal-label text-xs">
                Bordure des cartes
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id={`color-${side}-border`}
                  type="color"
                  value={sideStyle.cardBorderColor || styles.cardBorderColor || '#e2e8f0'}
                  onChange={(e) => handleSideStyleChange(side, 'cardBorderColor', e.target.value)}
                  className="ae-color-picker-square"
                  aria-label={`Couleur de bordure ${label}`}
                />
                <input
                  type="text"
                  value={sideStyle.cardBorderColor || ''}
                  onChange={(e) => handleSideStyleChange(side, 'cardBorderColor', e.target.value)}
                  placeholder="#e2e8f0"
                  className="ae-flipbook-input text-xs flex-1"
                />
              </div>
            </div>

            <div>
              <label htmlFor={`select-${side}-radius`} className="ae-modal-label text-xs">
                Arrondis des cartes
              </label>
              <select
                id={`select-${side}-radius`}
                value={sideStyle.borderRadius || 'inherit'}
                onChange={(e) => handleSideStyleChange(side, 'borderRadius', e.target.value)}
                className="ae-flipbook-select w-full"
              >
                <option value="inherit">Identique au global</option>
                <option value="rounded">Modéré (8px)</option>
                <option value="normal">Élégant (14px)</option>
                <option value="pill">Prononcé (20px)</option>
              </select>
            </div>

            <div>
              <label htmlFor={`select-${side}-shadow`} className="ae-modal-label text-xs">
                Ombres des cartes
              </label>
              <select
                id={`select-${side}-shadow`}
                value={sideStyle.cardShadow || 'inherit'}
                onChange={(e) => handleSideStyleChange(side, 'cardShadow', e.target.value)}
                className="ae-flipbook-select w-full"
              >
                <option value="inherit">Identique au global</option>
                <option value="none">Aucune ombre</option>
                <option value="subtle">Discrète</option>
                <option value="default">Standard</option>
                <option value="elevated">Prononcée</option>
              </select>
            </div>
          </div>

          {/* 5. Visibilité suivant la taille d'écran (S, M, L, XL) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 mt-2">
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2">
              Visibilité suivant la taille d'écran ({label}) :
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="ae-checkbox-row">
                <input
                  type="checkbox"
                  checked={vis.xl !== false}
                  onChange={(e) => handleVisibilityChange(side, 'xl', e.target.checked)}
                />
                <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <Tv size={14} /> XL — Grands écrans (&gt;= 1200px)
                </span>
              </label>

              <label className="ae-checkbox-row">
                <input
                  type="checkbox"
                  checked={vis.desktop !== false}
                  onChange={(e) => handleVisibilityChange(side, 'desktop', e.target.checked)}
                />
                <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <Monitor size={14} /> L — Ordinateur (&gt;= 900px)
                </span>
              </label>

              <label className="ae-checkbox-row">
                <input
                  type="checkbox"
                  checked={vis.tablet !== false}
                  onChange={(e) => handleVisibilityChange(side, 'tablet', e.target.checked)}
                />
                <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <Tablet size={14} /> M — Tablette (600px à 899px)
                </span>
              </label>

              <label className="ae-checkbox-row">
                <input
                  type="checkbox"
                  checked={vis.mobile !== false}
                  onChange={(e) => handleVisibilityChange(side, 'mobile', e.target.checked)}
                />
                <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <Smartphone size={14} /> S — Smartphone (&lt; 600px)
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ae-global-sidebar-editor space-y-4 animate-fade-in" data-testid="global-sidebar-editor">
      {/* 1. BARRE DE NAVIGATION HAUTE & FIL D'ARIANE */}
      <nav className="ae-flipbook-nav-breadcrumb" aria-label="Navigation du modèle global">
        <button
          type="button"
          onClick={handleSafeBack}
          className="ae-flipbook-back-btn"
          aria-label="Retour à la gestion des Flipbooks"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Retour à mes Flipbooks</span>
        </button>
        <span className="ae-flipbook-breadcrumb-sep" aria-hidden="true">/</span>
        <span className="ae-flipbook-breadcrumb-current">Modèle global des barres latérales</span>
      </nav>

      {/* 2. EN-TÊTE PRINCIPAL DE L'ÉDITEUR AVEC TOUS LES BOUTONS REQUIS */}
      <div className="ae-global-editor-header ae-sticky-editor-bar">
        <div className="ae-global-header-info">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="ae-flipbook-title">Modèle global — Anjou Édition</h2>
            
            {/* Badges d'état ergonomiques */}
            <span className="ae-badge-global-active" title="Ce modèle est automatiquement appliqué aux Flipbooks en mode global">
              <Sparkles size={13} aria-hidden="true" />
              <span>Modèle global actif</span>
            </span>

            {isDirty ? (
              <span className="ae-badge-dirty" role="status" aria-live="polite">
                <AlertTriangle size={13} aria-hidden="true" />
                <span>Modifications non enregistrées</span>
              </span>
            ) : showSavedFeedback ? (
              <span className="ae-badge-saved" role="status" aria-live="polite">
                <CheckCircle2 size={13} aria-hidden="true" />
                <span>Enregistré</span>
              </span>
            ) : null}
          </div>
          <p className="ae-flipbook-subtitle">
            Modèle global des barres latérales : administrez indépendamment la barre latérale gauche et la barre latérale droite. Chaque modification est immédiatement visible dans l'aperçu local, sans être publiée tant que vous n'avez pas enregistré.
          </p>
        </div>

        {/* Boutons d'actions principaux requis */}
        <div className="ae-global-header-actions">
          <button
            type="button"
            onClick={() => {
              setActiveTab('preview');
              setShowLiveInlinePreview(true);
            }}
            className="ae-flipbook-btn-secondary"
            title="Prévisualiser le rendu complet du modèle global"
            aria-label="Prévisualiser le modèle global"
          >
            <Eye size={16} aria-hidden="true" />
            <span>Prévisualiser</span>
          </button>

          <button
            type="button"
            onClick={handleCancelModifications}
            disabled={!isDirty}
            className="ae-flipbook-btn-secondary"
            title="Annuler les modifications locales non enregistrées"
            aria-label="Annuler les modifications"
          >
            <Undo2 size={15} aria-hidden="true" />
            <span>Annuler les modifications</span>
          </button>

          <button
            type="button"
            onClick={handleRestoreLastSavedVersion}
            className="ae-flipbook-btn-secondary"
            title="Recharger ou restaurer la dernière version enregistrée"
            aria-label="Restaurer la dernière version enregistrée"
          >
            <History size={15} aria-hidden="true" />
            <span>Restaurer la dernière version enregistrée</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setApplyAllReport(null);
              setShowApplyAllConfirm(true);
            }}
            className="ae-btn-outline-primary"
            title="Appliquer ce modèle à tous les Flipbooks existants de la bibliothèque"
            aria-label="Appliquer le modèle global à tous les Flipbooks"
          >
            <BookOpen size={16} aria-hidden="true" />
            <span>Appliquer à tous les Flipbooks</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="ae-btn-ghost-danger"
            title="Rétablir les réglages initiaux par défaut"
            aria-label="Réinitialiser le modèle aux valeurs par défaut"
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>Réinitialiser</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="ae-flipbook-btn-primary ae-btn-save-global"
            aria-label="Enregistrer le modèle global des barres latérales"
          >
            {isSaving ? (
              <>
                <div className="ae-spinner-btn-white" aria-hidden="true"></div>
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save size={17} aria-hidden="true" />
                <span>Enregistrer le modèle</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. NAVIGATION PAR ONGLETS ERGONOMIQUES (Contenu / Styles & Apparence / Prévisualisation) */}
      <div className="ae-global-tabs-bar" role="tablist" aria-label="Espaces d'édition du modèle global">
        <button
          type="button"
          role="tab"
          id="tab-btn-content"
          aria-selected={activeTab === 'content'}
          aria-controls="panel-content"
          onClick={() => setActiveTab('content')}
          className={`ae-global-tab-btn ${activeTab === 'content' ? 'active' : ''}`}
        >
          <Layers size={16} aria-hidden="true" />
          <span>1. Contenu des barres (Gauche & Droite)</span>
          <span className="ae-tab-count">
            {(template.leftSidebar?.length || 0) + (template.rightSidebar?.length || 0)} blocs
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-btn-styles"
          aria-selected={activeTab === 'styles'}
          aria-controls="panel-styles"
          onClick={() => setActiveTab('styles')}
          className={`ae-global-tab-btn ${activeTab === 'styles' ? 'active' : ''}`}
        >
          <Sliders size={16} aria-hidden="true" />
          <span>2. Apparence, Styles & Visibilité responsive</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-btn-preview"
          aria-selected={activeTab === 'preview'}
          aria-controls="panel-preview"
          onClick={() => setActiveTab('preview')}
          className={`ae-global-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
        >
          <Eye size={16} aria-hidden="true" />
          <span>3. Prévisualisation en direct (S, M, L, XL)</span>
        </button>
      </div>

      {/* 4. CONTENU DE L'ONGLET 1 : BLOCS ET CONTENU (GAUCHE & DROITE) */}
      {activeTab === 'content' && (
        <section 
          id="panel-content" 
          role="tabpanel" 
          aria-labelledby="tab-btn-content"
          className="ae-global-editor-panel"
        >
          <div className="ae-notice-banner mb-3">
            <Info size={17} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <strong>Souveraineté éditoriale :</strong> Gérez indépendamment le contenu de la <strong>Barre latérale gauche</strong> et de la <strong>Barre latérale droite</strong> (images, vidéos, textes, titres, boutons, PDF). Aucun contenu fictif n'est généré automatiquement.
            </div>
          </div>

          {/* Éditeur réutilisant le système complet de barres existant */}
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
        </section>
      )}

      {/* 5. CONTENU DE L'ONGLET 2 : STYLES INDÉPENDANTS GAUCHE / DROITE & HARMONISATION GLOBALE */}
      {activeTab === 'styles' && (
        <section 
          id="panel-styles" 
          role="tabpanel" 
          aria-labelledby="tab-btn-styles"
          className="ae-global-editor-panel space-y-5"
        >
          {/* En-têtes de repères sémantiques */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 px-1">
            <span>Largeurs des barres latérales</span>
            <span>Visibilité par palier responsive</span>
          </div>

          {/* Personnalisation indépendante BARRE GAUCHE & BARRE DROITE */}
          <div className="ae-styles-settings-grid">
            {renderSideStyleControls('left', 'Barre gauche', leftSideStyle, leftVis, 'leftWidth', 20)}
            {renderSideStyleControls('right', 'Barre droite', rightSideStyle, rightVis, 'rightWidth', 20)}
          </div>

          {/* Réglages communs et valeurs par défaut du modèle global */}
          <div className="ae-styles-settings-grid">
            {/* COULEURS & APPARENCE GLOBALES PAR DÉFAUT */}
            <div className="ae-settings-group-card">
              <h3 className="ae-settings-group-title">
                <Sparkles size={17} className="text-blue-600" aria-hidden="true" />
                <span>Couleurs et habillage des cartes</span>
              </h3>
              <p className="ae-settings-group-desc">
                Ces valeurs s'appliquent aux deux barres sauf si une personnalisation spécifique gauche/droite est définie ci-dessus.
              </p>

              <div className="space-y-4 mt-3">
                <div>
                  <label htmlFor="input-primary-color" className="ae-modal-label text-xs">
                    Couleur d'accentuation des titres et boutons
                  </label>
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

                <div>
                  <label htmlFor="input-card-bg" className="ae-modal-label text-xs">
                    Couleur de fond des cartes de blocs
                  </label>
                  <select
                    id="input-card-bg"
                    value={styles.cardBackground || ''}
                    onChange={(e) => handleStyleChange('cardBackground', e.target.value)}
                    className="ae-flipbook-select w-full"
                  >
                    <option value="">Blanc pur (#ffffff) — Par défaut</option>
                    <option value="#f8fafc">Gris ardoise très doux (#f8fafc)</option>
                    <option value="#fdfbf7">Crème littéraire papier (#fdfbf7)</option>
                    <option value="#f0f9ff">Ciel subtil d'Anjou (#f0f9ff)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="input-card-shadow" className="ae-modal-label text-xs">
                    Ombre portée des cartes
                  </label>
                  <select
                    id="input-card-shadow"
                    value={styles.cardShadow || 'default'}
                    onChange={(e) => handleStyleChange('cardShadow', e.target.value)}
                    className="ae-flipbook-select w-full"
                  >
                    <option value="none">Aucune ombre (Design épuré plat)</option>
                    <option value="subtle">Discrète (Effet léger)</option>
                    <option value="default">Standard (Recommandée Anjou Édition)</option>
                    <option value="elevated">Prononcée (Relief marqué)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TYPOGRAPHIE, CONTENEUR & ESPACEMENTS GLOBAUX */}
            <div className="ae-settings-group-card">
              <h3 className="ae-settings-group-title">
                <BookOpen size={17} className="text-blue-600" aria-hidden="true" />
                <span>Typographie, Conteneur & Espacements globaux</span>
              </h3>
              <p className="ae-settings-group-desc">
                Ajustez le rythme visuel global et la largeur maximale du lecteur 3 colonnes.
              </p>

              <div className="space-y-4 mt-3">
                <div>
                  <label htmlFor="input-max-width" className="ae-modal-label text-xs">
                    Largeur maximale totale (px)
                  </label>
                  <select
                    id="input-max-width"
                    value={styles.maxWidth || 1680}
                    onChange={(e) => handleStyleChange('maxWidth', Number(e.target.value))}
                    className="ae-flipbook-select w-full"
                  >
                    <option value="1400">1400 px — Modérée</option>
                    <option value="1680">1680 px — Recommandée (Standard Anjou Édition)</option>
                    <option value="1920">1920 px — Pleine largeur écran</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="input-font-family" className="ae-modal-label text-xs">
                    Famille de police
                  </label>
                  <select
                    id="input-font-family"
                    value={styles.fontFamily || 'inherit'}
                    onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                    className="ae-flipbook-select w-full"
                  >
                    <option value="inherit">Police du portail Anjou Édition (Outfit / sans-serif)</option>
                    <option value="serif">Sérif classique littéraire (Georgia, élégant)</option>
                    <option value="sans-serif">Sans-serif moderne et épuré</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="input-gap" className="ae-modal-label text-xs">
                      Espacement global entre blocs
                    </label>
                    <select
                      id="input-gap"
                      value={styles.gap || 'normal'}
                      onChange={(e) => handleStyleChange('gap', e.target.value)}
                      className="ae-flipbook-select w-full"
                    >
                      <option value="compact">Compact (12px)</option>
                      <option value="normal">Normal (20px)</option>
                      <option value="relaxed">Aéré (28px)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="input-radius" className="ae-modal-label text-xs">
                      Arrondi global des cartes
                    </label>
                    <select
                      id="input-radius"
                      value={styles.borderRadius || 'normal'}
                      onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                      className="ae-flipbook-select w-full"
                    >
                      <option value="rounded">Modéré (8px)</option>
                      <option value="normal">Élégant (14px)</option>
                      <option value="pill">Prononcé (20px)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. APERÇU LOCAL EN DIRECT (Sur l'onglet Prévisualisation OU en bas des onglets Contenu / Styles) */}
      {(activeTab === 'preview' || showLiveInlinePreview) && (
        <section 
          id="panel-preview" 
          role={activeTab === 'preview' ? 'tabpanel' : 'region'} 
          aria-labelledby={activeTab === 'preview' ? 'tab-btn-preview' : undefined}
          aria-label="Aperçu local en direct du modèle global"
          className="ae-global-editor-panel"
          data-testid="live-preview-section"
        >
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Eye size={17} className="text-blue-600" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 m-0">
                Aperçu local immédiat (non publié tant que non enregistré)
              </h3>
            </div>
            {activeTab !== 'preview' && (
              <button
                type="button"
                onClick={() => setShowLiveInlinePreview(false)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer bg-transparent border-none"
              >
                Masquer l'aperçu sous l'éditeur
              </button>
            )}
          </div>

          {/* Barre de contrôle de la prévisualisation */}
          <div className="ae-preview-controls-bar">
            {/* Choix du format responsive (S, M, L, XL) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">
                Format d'écran :
              </span>
              <button
                type="button"
                onClick={() => setPreviewViewport('xl')}
                className={`ae-viewport-btn ${previewViewport === 'xl' ? 'active' : ''}`}
                title="Format XL — Grands écrans (>= 1200px)"
                aria-label="Format XL Grands écrans"
              >
                <Tv size={15} aria-hidden="true" />
                <span>XL (Grand écran)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewViewport('l')}
                className={`ae-viewport-btn ${previewViewport === 'l' ? 'active' : ''}`}
                title="Format L — Ordinateur portable (1024px)"
                aria-label="Format L Ordinateur portable"
              >
                <Monitor size={15} aria-hidden="true" />
                <span>L (Desktop)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewViewport('m')}
                className={`ae-viewport-btn ${previewViewport === 'm' ? 'active' : ''}`}
                title="Format M — Tablette (768px, disposition ordonnée)"
                aria-label="Format M Tablette"
              >
                <Tablet size={15} aria-hidden="true" />
                <span>M (Tablette)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewViewport('s')}
                className={`ae-viewport-btn ${previewViewport === 's' ? 'active' : ''}`}
                title="Format S — Smartphone (390px, Flipbook prioritaire en haut)"
                aria-label="Format S Smartphone"
              >
                <Smartphone size={15} aria-hidden="true" />
                <span>S (Mobile)</span>
              </button>
            </div>

            {/* Sélecteur de Flipbook pour le test */}
            {flipbooks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                  Flipbook test :
                </span>
                <select
                  value={previewBookId}
                  onChange={(e) => setPreviewBookId(e.target.value)}
                  className="ae-flipbook-select text-xs"
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

          {/* Cadre de prévisualisation avec contrainte de largeur selon le viewport */}
          <div className="ae-preview-stage-wrapper">
            <div 
              className={`ae-preview-viewport-frame viewport-${previewViewport}`}
              style={{
                maxWidth: previewViewport === 'xl' ? '100%' : previewViewport === 'l' ? '1024px' : previewViewport === 'm' ? '768px' : '390px'
              }}
            >
              <div className="ae-preview-frame-header">
                <span className="ae-preview-tag">
                  Rendu public fidèle : [ BARRE GAUCHE ] [ LECTEUR FLIPBOOK ] [ BARRE DROITE ]
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {previewViewport === 'xl' && 'Plein écran (>1200px)'}
                  {previewViewport === 'l' && '1024px Desktop'}
                  {previewViewport === 'm' && '768px Tablette (Flipbook prioritaire)'}
                  {previewViewport === 's' && '390px Smartphone (Défilement vertical)'}
                </span>
              </div>

              {/* Rendu public exact avec le composant FlipbookLayout */}
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
        </section>
      )}

      {activeTab !== 'preview' && !showLiveInlinePreview && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowLiveInlinePreview(true)}
            className="ae-flipbook-btn-secondary text-xs"
          >
            <Eye size={14} aria-hidden="true" />
            <span>Afficher l'aperçu local en direct sous l'éditeur</span>
          </button>
        </div>
      )}

      {/* 7. MODALE DE CONFIRMATION & BILAN : APPLIQUER À TOUS LES FLIPBOOKS */}
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
                  Cette action va configurer l'ensemble de vos <strong>{flipbooksAnalysis.totalCount} flipbooks</strong> pour utiliser la référence dynamique au <strong>« Modèle global — Anjou Édition »</strong>.
                </p>

                {/* Détail analytique des Flipbooks concernés */}
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
              /* Bilan de l'opération */
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

