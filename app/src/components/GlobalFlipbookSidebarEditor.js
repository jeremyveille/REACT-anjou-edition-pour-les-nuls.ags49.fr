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
  CheckCircle2
} from 'lucide-react';
import FlipbookSidebarEditor from './FlipbookSidebarEditor';
import FlipbookLayout from './FlipbookLayout';
import PdfFlipbookReader from './PdfFlipbookReader';
import { 
  DEFAULT_GLOBAL_SIDEBAR, 
  getLocalGlobalSidebar, 
  saveGlobalSidebarTemplate 
} from '../services/flipbookSidebarService';

/**
 * Éditeur visuel et complet du « Modèle global — Anjou Édition » de barres latérales.
 * Permet de modifier le contenu des deux colonnes, leur style, leurs largeurs,
 * leurs couleurs, leur typographie, leur espacement, leur disposition et leur visibilité responsive.
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
    return initialTemplate || getLocalGlobalSidebar();
  });

  const [savedBaseline, setSavedBaseline] = useState(() => {
    return JSON.stringify(initialTemplate || getLocalGlobalSidebar());
  });

  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'styles' | 'preview'
  const [previewViewport, setPreviewViewport] = useState('xl'); // 'xl' | 'l' | 'm' | 's'
  const [previewBookId, setPreviewBookId] = useState(() => {
    return flipbooks.length > 0 ? flipbooks[0].id : '';
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showApplyAllConfirm, setShowApplyAllConfirm] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Détection de modifications non enregistrées
  const isDirty = useMemo(() => {
    return JSON.stringify(template) !== savedBaseline;
  }, [template, savedBaseline]);

  // Synchronisation si initialTemplate change
  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate);
      setSavedBaseline(JSON.stringify(initialTemplate));
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

  // Gestion des modifications de styles
  const handleStyleChange = (key, value) => {
    setTemplate(prev => ({
      ...prev,
      styles: {
        ...(prev.styles || {}),
        [key]: value
      }
    }));
  };

  // Gestion de la visibilité responsive
  const handleVisibilityChange = (side, device, checked) => {
    setTemplate(prev => {
      const currentStyles = prev.styles || {};
      const currentVis = currentStyles.visibility || {};
      const currentSide = currentVis[side] || { desktop: true, tablet: true, mobile: true };
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
      setSavedBaseline(JSON.stringify(res.data));
      setIsSaving(false);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3000);
      setNotification("Modèle global — Anjou Édition enregistré avec succès !");
      onSaveSuccess(res.data);
    } catch (err) {
      console.error("Erreur enregistrement modèle global:", err);
      setIsSaving(false);
      alert("Une erreur est survenue lors de l'enregistrement du modèle global.");
    }
  };

  // Réinitialisation aux valeurs par défaut
  const handleResetToDefault = () => {
    if (window.confirm("Voulez-vous vraiment réinitialiser le modèle global aux valeurs par défaut d'Anjou Édition ? Vos personnalisations non enregistrées seront perdues.")) {
      setTemplate(JSON.parse(JSON.stringify(DEFAULT_GLOBAL_SIDEBAR)));
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

  // Application du modèle global à tous les Flipbooks
  const handleConfirmApplyToAll = () => {
    onApplyToAll();
    setShowApplyAllConfirm(false);
    setNotification("Le modèle global a été appliqué à tous les Flipbooks !");
  };

  const styles = template.styles || {};
  const leftVis = styles.visibility?.left || { desktop: true, tablet: true, mobile: true };
  const rightVis = styles.visibility?.right || { desktop: true, tablet: true, mobile: true };

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

      {/* 2. EN-TÊTE PRINCIPAL DE L'ÉDITEUR AVEC ACTIONS CLAIRES */}
      <div className="ae-global-editor-header">
        <div className="ae-global-header-info">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="ae-flipbook-title">Modèle global — Anjou Édition</h2>
            
            {/* Badges d'état ergonomiques */}
            <span className="ae-badge-global-active" title="Ce modèle est automatiquement appliqué aux nouveaux Flipbooks">
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
            Centralisez les barres latérales gauche et droite. Toute modification enregistrée est immédiatement répercutée sur l'ensemble des Flipbooks utilisant ce modèle.
          </p>
        </div>

        {/* Boutons d'actions principaux */}
        <div className="ae-global-header-actions">
          <button
            type="button"
            onClick={() => setShowApplyAllConfirm(true)}
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
                <span>Enregistrer le modèle global</span>
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
              <strong>Souveraineté éditoriale :</strong> Vous gérez directement les blocs textuels, visuels et multimédias. Aucun contenu mocké ou historique n'est généré automatiquement. Chaque bloc peut être activé, désactivé, réorganisé ou supprimé.
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

      {/* 5. CONTENU DE L'ONGLET 2 : STYLES, COULEURS, TYPOGRAPHIE & VISIBILITÉ RESPONSIVE */}
      {activeTab === 'styles' && (
        <section 
          id="panel-styles" 
          role="tabpanel" 
          aria-labelledby="tab-btn-styles"
          className="ae-global-editor-panel"
        >
          <div className="ae-styles-settings-grid">
            
            {/* SECTION A : LARGEURS & PROPORTIONS */}
            <div className="ae-settings-group-card">
              <h3 className="ae-settings-group-title">
                <Sliders size={17} className="text-blue-600" aria-hidden="true" />
                <span>Largeurs des barres latérales</span>
              </h3>
              <p className="ae-settings-group-desc">
                Définissez la proportion occupée par chaque colonne sur grand écran.
              </p>

              <div className="space-y-4 mt-3">
                {/* Largeur barre gauche */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <label htmlFor="input-left-width">Largeur Barre gauche (sur grand écran)</label>
                    <span className="text-blue-600 font-mono">{styles.leftWidth || 20}%</span>
                  </div>
                  <input
                    id="input-left-width"
                    type="range"
                    min="15"
                    max="30"
                    step="1"
                    value={styles.leftWidth || 20}
                    onChange={(e) => handleStyleChange('leftWidth', Number(e.target.value))}
                    className="ae-range-input"
                    aria-label="Largeur barre gauche en pourcentage"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>15% (Étroite)</span>
                    <span>20% (Standard)</span>
                    <span>30% (Large)</span>
                  </div>
                </div>

                {/* Largeur barre droite */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <label htmlFor="input-right-width">Largeur Barre droite (sur grand écran)</label>
                    <span className="text-blue-600 font-mono">{styles.rightWidth || 20}%</span>
                  </div>
                  <input
                    id="input-right-width"
                    type="range"
                    min="15"
                    max="30"
                    step="1"
                    value={styles.rightWidth || 20}
                    onChange={(e) => handleStyleChange('rightWidth', Number(e.target.value))}
                    className="ae-range-input"
                    aria-label="Largeur barre droite en pourcentage"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>15% (Étroite)</span>
                    <span>20% (Standard)</span>
                    <span>30% (Large)</span>
                  </div>
                </div>

                {/* Largeur maximale du conteneur */}
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
              </div>
            </div>

            {/* SECTION B : COULEURS & APPARENCE DES CARTES */}
            <div className="ae-settings-group-card">
              <h3 className="ae-settings-group-title">
                <Sparkles size={17} className="text-blue-600" aria-hidden="true" />
                <span>Couleurs et habillage des cartes</span>
              </h3>
              <p className="ae-settings-group-desc">
                Personnalisez la couleur d'accentuation, le fond des cartes et leurs bordures.
              </p>

              <div className="space-y-4 mt-3">
                {/* Couleur primaire d'accentuation */}
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

                {/* Couleur de fond des cartes */}
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

                {/* Ombre des cartes */}
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

            {/* SECTION C : TYPOGRAPHIE & ESPACEMENTS */}
            <div className="ae-settings-group-card">
              <h3 className="ae-settings-group-title">
                <BookOpen size={17} className="text-blue-600" aria-hidden="true" />
                <span>Typographie & Espacements</span>
              </h3>
              <p className="ae-settings-group-desc">
                Ajustez le rythme visuel et le style d'écriture des barres.
              </p>

              <div className="space-y-4 mt-3">
                {/* Police de caractères */}
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

                {/* Espacement vertical */}
                <div>
                  <label htmlFor="input-gap" className="ae-modal-label text-xs">
                    Espacement entre les blocs
                  </label>
                  <select
                    id="input-gap"
                    value={styles.gap || 'normal'}
                    onChange={(e) => handleStyleChange('gap', e.target.value)}
                    className="ae-flipbook-select w-full"
                  >
                    <option value="compact">Compact (0.75rem / ~12px)</option>
                    <option value="normal">Normal (1.25rem / ~20px — Recommandé)</option>
                    <option value="relaxed">Aéré (1.75rem / ~28px)</option>
                  </select>
                </div>

                {/* Arrondi des cartes */}
                <div>
                  <label htmlFor="input-radius" className="ae-modal-label text-xs">
                    Arrondi des coins des cartes
                  </label>
                  <select
                    id="input-radius"
                    value={styles.borderRadius || 'normal'}
                    onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                    className="ae-flipbook-select w-full"
                  >
                    <option value="rounded">Modéré (8px)</option>
                    <option value="normal">Élégant (14px — Standard)</option>
                    <option value="pill">Prononcé (20px)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION D : VISIBILITÉ RESPONSIVE (ORDINATEUR / TABLETTE / MOBILE) */}
            <div className="ae-settings-group-card">
              <h3 className="ae-settings-group-title">
                <Monitor size={17} className="text-blue-600" aria-hidden="true" />
                <span>Visibilité par palier responsive</span>
              </h3>
              <p className="ae-settings-group-desc">
                Contrôlez précisément l'affichage de chaque barre selon l'appareil du lecteur.
              </p>

              <div className="space-y-4 mt-3">
                {/* Barre Gauche */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2">
                    Barre latérale gauche :
                  </div>
                  <div className="space-y-1.5">
                    <label className="ae-checkbox-row">
                      <input
                        type="checkbox"
                        checked={leftVis.desktop !== false}
                        onChange={(e) => handleVisibilityChange('left', 'desktop', e.target.checked)}
                      />
                      <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Monitor size={14} /> Ordinateur (Desktop &gt;= 900px)
                      </span>
                    </label>

                    <label className="ae-checkbox-row">
                      <input
                        type="checkbox"
                        checked={leftVis.tablet !== false}
                        onChange={(e) => handleVisibilityChange('left', 'tablet', e.target.checked)}
                      />
                      <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Tablet size={14} /> Tablette (600px à 899px)
                      </span>
                    </label>

                    <label className="ae-checkbox-row">
                      <input
                        type="checkbox"
                        checked={leftVis.mobile !== false}
                        onChange={(e) => handleVisibilityChange('left', 'mobile', e.target.checked)}
                      />
                      <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Smartphone size={14} /> Smartphone / Mobile (&lt; 600px)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Barre Droite */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2">
                    Barre latérale droite :
                  </div>
                  <div className="space-y-1.5">
                    <label className="ae-checkbox-row">
                      <input
                        type="checkbox"
                        checked={rightVis.desktop !== false}
                        onChange={(e) => handleVisibilityChange('right', 'desktop', e.target.checked)}
                      />
                      <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Monitor size={14} /> Ordinateur (Desktop &gt;= 900px)
                      </span>
                    </label>

                    <label className="ae-checkbox-row">
                      <input
                        type="checkbox"
                        checked={rightVis.tablet !== false}
                        onChange={(e) => handleVisibilityChange('right', 'tablet', e.target.checked)}
                      />
                      <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Tablet size={14} /> Tablette (600px à 899px)
                      </span>
                    </label>

                    <label className="ae-checkbox-row">
                      <input
                        type="checkbox"
                        checked={rightVis.mobile !== false}
                        onChange={(e) => handleVisibilityChange('right', 'mobile', e.target.checked)}
                      />
                      <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Smartphone size={14} /> Smartphone / Mobile (&lt; 600px)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* 6. CONTENU DE L'ONGLET 3 : PRÉVISUALISATION EN DIRECT (S, M, L, XL) */}
      {activeTab === 'preview' && (
        <section 
          id="panel-preview" 
          role="tabpanel" 
          aria-labelledby="tab-btn-preview"
          className="ae-global-editor-panel"
        >
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

      {/* 7. MODALE DE CONFIRMATION : APPLIQUER À TOUS LES FLIPBOOKS */}
      {showApplyAllConfirm && (
        <div className="ae-modal-overlay" onClick={() => setShowApplyAllConfirm(false)} role="presentation">
          <div 
            className="ae-modal-container max-w-md p-6" 
            onClick={(e) => e.stopPropagation()} 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="apply-all-modal-title"
          >
            <div className="flex items-center gap-3 mb-3 text-blue-600">
              <Sparkles size={24} aria-hidden="true" />
              <h3 id="apply-all-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 mb-0">
                Appliquer le modèle global à tous les Flipbooks ?
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Cette action va configurer l'ensemble de vos <strong>{flipbooks.length} flipbooks</strong> pour utiliser automatiquement le <strong>« Modèle global — Anjou Édition »</strong>.
              <br /><br />
              Les configurations individuelles spécifiques existantes seront remplacées par le modèle commun. Vous pourrez toujours repasser un flipbook en personnalisation individuelle à tout moment.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApplyAllConfirm(false)}
                className="ae-flipbook-btn-secondary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmApplyToAll}
                className="ae-flipbook-btn-primary"
              >
                <Check size={16} aria-hidden="true" />
                <span>Confirmer et appliquer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
