import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  BookOpen, 
  FileText, 
  Copy, 
  Check, 
  PanelLeft, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Layers,
  Sparkles,
  Sliders,
  AlertTriangle,
  Eye,
  RotateCcw
} from 'lucide-react';
import FlipbookSidebarEditor from './FlipbookSidebarEditor';
import FlipbookLayout from './FlipbookLayout';
import { 
  getLocalGlobalSidebar, 
  createCustomSidebarBackup 
} from '../services/flipbookSidebarService';
import { BRAND_NAME } from '../constants/brand';

/**
 * Grande Modale d'Édition Responsive d'un Flipbook
 * Conforme WCAG 2.1 AA : Accessible au clavier (Échap), focus préservé, 
 * largeur plein écran ergonomique min(1100px, 94vw), un seul scroll interne.
 */
export default function FlipbookEditModal({
  isOpen,
  flipbook,
  onClose,
  onSave,
  isSaving = false,
  saveProgressMsg = ''
}) {
  const [editingData, setEditingData] = useState(null);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [newPdfFile, setNewPdfFile] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [expandedPageIdx, setExpandedPageIdx] = useState(0); // Première page ouverte par défaut
  const [showLocalPreview, setShowLocalPreview] = useState(false);
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (flipbook && isOpen) {
      const copy = JSON.parse(JSON.stringify(flipbook));
      if (!Array.isArray(copy.pages)) copy.pages = [];
      if (!Array.isArray(copy.leftSidebar)) copy.leftSidebar = [];
      if (!Array.isArray(copy.rightSidebar)) copy.rightSidebar = [];
      
      // Initialisation du mode de barre latérale (préservation de l'existant)
      if (!copy.sidebarMode) {
        const hasCustomBlocks = copy.leftSidebar.length > 0 || copy.rightSidebar.length > 0;
        copy.sidebarMode = hasCustomBlocks ? 'custom' : 'global';
      }

      setEditingData(copy);
      setInitialSnapshot(JSON.stringify(copy));
      setNewPdfFile(null);
      setCopiedSnippet(false);
      setShowLocalPreview(false);
      setExpandedPageIdx(copy.pages.length > 0 ? 0 : null);
    }
  }, [flipbook, isOpen]);

  // Détection des modifications non enregistrées
  const isDirty = useMemo(() => {
    if (!editingData || !initialSnapshot) return false;
    if (newPdfFile) return true;
    return JSON.stringify(editingData) !== initialSnapshot;
  }, [editingData, initialSnapshot, newPdfFile]);

  // État pour confirmation avant de remplacer une personnalisation par le modèle global
  const [showSwitchModeConfirm, setShowSwitchModeConfirm] = useState(false);

  // Fermeture sécurisée avec avertissement en cas de modifications non enregistrées
  const handleSafeClose = () => {
    if (isSaving) return;
    if (isDirty) {
      if (!window.confirm("Attention : vous avez des modifications non enregistrées sur ce Flipbook. Voulez-vous vraiment fermer sans enregistrer ?")) {
        return;
      }
    }
    onClose();
  };

  // Fermeture par touche Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        if (isDirty) {
          if (!window.confirm("Attention : vous avez des modifications non enregistrées sur ce Flipbook. Voulez-vous vraiment fermer sans enregistrer ?")) {
            return;
          }
        }
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, isDirty, onClose]);

  if (!isOpen || !editingData) return null;

  // Gestion des champs généraux
  const handleFieldChange = (field, value) => {
    setEditingData(prev => ({ ...prev, [field]: value }));
  };

  // Gestion des pages
  const handleAddPage = () => {
    const nextNum = editingData.pages.length + 1;
    const newPage = { pageNum: nextNum, title: `Page ${nextNum}`, content: '' };
    const updatedPages = [...editingData.pages, newPage];
    setEditingData(prev => ({ ...prev, pages: updatedPages }));
    setExpandedPageIdx(updatedPages.length - 1); // Développe la nouvelle page créée
  };

  const handleUpdatePage = (idx, field, value) => {
    const updatedPages = [...editingData.pages];
    updatedPages[idx] = { ...updatedPages[idx], [field]: value };
    setEditingData(prev => ({ ...prev, pages: updatedPages }));
  };

  const handleDeletePage = (idx) => {
    const pageToDelete = editingData.pages[idx];
    const pageTitle = pageToDelete?.title || `Page ${idx + 1}`;
    if (window.confirm(`Confirmez-vous la suppression de la page "${pageTitle}" ?`)) {
      const filtered = editingData.pages
        .filter((_, pIdx) => pIdx !== idx)
        .map((p, pIdx) => ({ ...p, pageNum: pIdx + 1 }));
      setEditingData(prev => ({ ...prev, pages: filtered }));
      if (expandedPageIdx === idx) {
        setExpandedPageIdx(filtered.length > 0 ? Math.max(0, idx - 1) : null);
      } else if (expandedPageIdx > idx) {
        setExpandedPageIdx(expandedPageIdx - 1);
      }
    }
  };

  // Copie du code d'intégration technique
  const snippetCode = `<PdfFlipbookReader book={flipbooks.find(f => f.id === "${editingData.id}")} onClose={handleClose} />`;
  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(snippetCode);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2500);
    }
  };

  // Copier le modèle global comme base de personnalisation individuelle
  const handleCopyFromGlobalTemplate = () => {
    const globalData = getLocalGlobalSidebar();
    const backup = createCustomSidebarBackup(editingData) || editingData.customSidebarBackup;
    setEditingData(prev => ({
      ...prev,
      sidebarMode: 'custom',
      leftSidebar: JSON.parse(JSON.stringify(globalData.leftSidebar || [])),
      rightSidebar: JSON.parse(JSON.stringify(globalData.rightSidebar || [])),
      ...(backup ? { customSidebarBackup: backup } : {})
    }));
  };

  // Restaurer la dernière configuration individuelle sauvegardée
  const handleRestoreCustomBackup = () => {
    const backup = editingData.customSidebarBackup;
    if (!backup) return;
    setEditingData(prev => ({
      ...prev,
      sidebarMode: 'custom',
      leftSidebar: JSON.parse(JSON.stringify(backup.leftSidebar || [])),
      rightSidebar: JSON.parse(JSON.stringify(backup.rightSidebar || [])),
      ...(backup.sidebarStyles ? { sidebarStyles: JSON.parse(JSON.stringify(backup.sidebarStyles)) } : {})
    }));
  };

  // Validation et soumission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!editingData.title?.trim() || !editingData.description?.trim()) {
      alert("Le titre et la description ne peuvent pas être vides.");
      return;
    }
    onSave(editingData, newPdfFile);
  };

  return (
    <div 
      className="ae-modal-overlay" 
      onClick={!isSaving ? handleSafeClose : undefined}
      role="presentation"
    >
      <div 
        ref={modalRef}
        className="ae-flipbook-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-flipbook-modal-title"
      >
        {/* EN-TÊTE FIXE (Sticky top: 0) */}
        <header className="ae-flipbook-modal-header">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 id="edit-flipbook-modal-title" className="ae-flipbook-modal-title">
              <BookOpen className="ae-flipbook-modal-title-icon" size={22} aria-hidden="true" />
              <span className="ae-flipbook-modal-title-text">
                Modifier le Flipbook : <strong>{editingData.title}</strong>
              </span>
            </h3>
            {isDirty && (
              <span className="ae-badge-dirty" role="status" aria-live="polite">
                <AlertTriangle size={12} aria-hidden="true" />
                <span>Modifications non enregistrées</span>
              </span>
            )}
          </div>
          <button 
            type="button"
            onClick={handleSafeClose} 
            className="ae-flipbook-modal-close-btn"
            aria-label="Fermer"
            disabled={isSaving}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {/* CORPS PRINCIPAL AVEC DÉFILEMENT UNIQUE */}
        <form onSubmit={handleSubmit} id="flipbook-edit-form" className="ae-flipbook-modal-body">
          {/* SECTION 1 : INFORMATIONS GÉNÉRALES */}
          <section className="ae-flipbook-section-card" aria-label="Informations générales du Flipbook">
            <div className="ae-flipbook-section-header-row">
              <h4 className="ae-flipbook-section-heading">
                <BookOpen size={17} aria-hidden="true" />
                Informations générales
              </h4>
            </div>

            <div className="ae-flipbook-form-grid-2">
              <div>
                <label htmlFor="fb-edit-title" className="ae-modal-label">
                  Titre du Flipbook <span className="ae-text-danger">*</span>
                </label>
                <input 
                  id="fb-edit-title"
                  type="text" 
                  required 
                  value={editingData.title || ''} 
                  onChange={(e) => handleFieldChange('title', e.target.value)} 
                  className="db-input"
                  placeholder="ex: Les Secrets du Vignoble"
                />
              </div>

              <div>
                <label htmlFor="fb-edit-category" className="ae-modal-label">
                  Catégorie littéraire <span className="ae-text-danger">*</span>
                </label>
                <select 
                  id="fb-edit-category"
                  value={editingData.category || "Outils"} 
                  onChange={(e) => handleFieldChange('category', e.target.value)} 
                  className="db-input w-full"
                >
                  <option value="Outils">Outils</option>
                  <option value="Poésies">Poésies</option>
                  <option value="Nouvelles">Nouvelles</option>
                  <option value="Romans">Romans</option>
                  <option value="Contes et légendes">Contes et légendes</option>
                  <option value="Essais">Essais</option>
                  <option value="Sciences">Sciences</option>
                  <option value="Cursus scolaire">Cursus scolaire</option>
                  <option value="Art">Art</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="fb-edit-description" className="ae-modal-label">
                Description de l'ouvrage <span className="ae-text-danger">*</span>
              </label>
              <textarea 
                id="fb-edit-description"
                required 
                rows={3} 
                value={editingData.description || ''} 
                onChange={(e) => handleFieldChange('description', e.target.value)} 
                className="db-textarea"
                placeholder="Brève synthèse ou présentation littéraire du flipbook..."
              />
            </div>

            {/* Fichier PDF */}
            <div className="mt-3">
              <label className="ae-modal-label">Fichier PDF associé</label>
              <div className="ae-list-item-card-row">
                <div className="ae-danger-icon-badge">
                  <FileText size={18} aria-hidden="true" />
                </div>
                <span className="ae-truncated-nav-label font-mono text-xs">
                  {editingData.pdfFile || "Aucun fichier PDF rattaché"}
                </span>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shrink-0"
                >
                  Modifier / remplacer le PDF
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".pdf" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                        setNewPdfFile(file);
                      } else {
                        alert("Veuillez sélectionner un fichier PDF valide (.pdf).");
                      }
                    }
                  }}
                />
              </div>

              {newPdfFile && (
                <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg flex items-center justify-between transition-all">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="text-blue-600 shrink-0" size={16} />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      Nouveau PDF prêt : <strong>{newPdfFile.name}</strong> ({(newPdfFile.size / (1024 * 1024)).toFixed(2)} Mo)
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setNewPdfFile(null)}
                    className="text-xs text-red-600 hover:text-red-700 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 px-2 py-1 rounded cursor-pointer shrink-0 ml-2"
                  >
                    Annuler
                  </button>
                </div>
              )}

              <details className="mt-2">
                <summary className="ae-action-link-muted-xs cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                  Options avancées (URL externe directe)
                </summary>
                <div className="mt-2">
                  <label htmlFor="fb-edit-pdfurl" className="ae-modal-label text-xs">URL absolue du PDF</label>
                  <input 
                    id="fb-edit-pdfurl"
                    type="text" 
                    value={editingData.pdfUrl || ""} 
                    onChange={(e) => handleFieldChange('pdfUrl', e.target.value)} 
                    className="db-input text-xs"
                    placeholder="https://..."
                  />
                </div>
              </details>
            </div>

            {/* Code d'intégration React masqué de la table et disponible ici */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <label className="ae-modal-label text-xs">
                Code d'intégration React.js du composant
              </label>
              <div className="ae-flipbook-code-box">
                <code className="ae-flipbook-code-text">{snippetCode}</code>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="ae-flipbook-code-copy-btn"
                  title="Copier le code d'intégration React dans le presse-papier"
                >
                  {copiedSnippet ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copier le code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 2 : GESTION DES PAGES DU FLIPBOOK (Accordéon ergonomique) */}
          <section className="ae-flipbook-section-card" aria-label="Gestion des pages du Flipbook">
            <div className="ae-flipbook-section-header-row">
              <h4 className="ae-flipbook-section-heading">
                <Layers size={17} aria-hidden="true" />
                Pages du Flipbook ({editingData.pages?.length || 0})
              </h4>
              <button 
                type="button" 
                onClick={handleAddPage}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer border border-blue-200 dark:border-blue-900/30 inline-flex items-center gap-1"
                aria-label="Ajouter une nouvelle page au flipbook"
              >
                <Plus size={14} aria-hidden="true" />
                <span>+ Ajouter une page</span>
              </button>
            </div>

            <div className="ae-flipbook-pages-list">
              {editingData.pages?.map((page, idx) => {
                const isExpanded = expandedPageIdx === idx;
                return (
                  <div key={idx} className="ae-flipbook-page-accordion">
                    <button
                      type="button"
                      onClick={() => setExpandedPageIdx(isExpanded ? null : idx)}
                      className="ae-flipbook-page-header-btn"
                      aria-expanded={isExpanded}
                      aria-controls={`page-content-${idx}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-blue-600 shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-400 shrink-0" aria-hidden="true" />
                        )}
                        <span className="ae-flipbook-page-badge">Page {page.pageNum || idx + 1}</span>
                        <span className="ae-flipbook-page-title-preview">
                          {page.title ? page.title : "(Sans titre)"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {page.content ? `${page.content.length} caractères` : 'Vide'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div id={`page-content-${idx}`} className="ae-flipbook-page-content-box">
                        <div className="flex justify-between items-center gap-2">
                          <label htmlFor={`page-title-${idx}`} className="ae-modal-label text-xs mb-0">
                            Titre de la page {page.pageNum || idx + 1}
                          </label>
                          <button 
                            type="button" 
                            onClick={() => handleDeletePage(idx)}
                            className="text-xs text-red-600 hover:text-red-700 bg-transparent border-none cursor-pointer inline-flex items-center gap-1 font-semibold"
                            aria-label={`Supprimer la page ${page.pageNum || idx + 1}`}
                          >
                            <Trash2 size={13} aria-hidden="true" /> Supprimer cette page
                          </button>
                        </div>
                        <input 
                          id={`page-title-${idx}`}
                          type="text" 
                          value={page.title || ""} 
                          onChange={(e) => handleUpdatePage(idx, 'title', e.target.value)} 
                          className="db-input text-xs"
                          placeholder="ex: Chapitre 1 — Les coteaux"
                        />
                        <div>
                          <label htmlFor={`page-content-text-${idx}`} className="ae-modal-label text-xs mb-1">
                            Contenu textuel de la page
                          </label>
                          <textarea 
                            id={`page-content-text-${idx}`}
                            value={page.content || ""} 
                            onChange={(e) => handleUpdatePage(idx, 'content', e.target.value)} 
                            className="db-textarea text-xs"
                            rows={3}
                            placeholder="Contenu littéraire ou historique de la page..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {(!editingData.pages || editingData.pages.length === 0) && (
                <div className="text-center py-4 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 italic">
                  Aucune page configurée dans ce flipbook. Cliquez sur « + Ajouter une page » pour commencer.
                </div>
              )}
            </div>
          </section>

          {/* SECTION 3 : BARRES LATÉRALES GAUCHE / DROITE DU FLIPBOOK (Pleine largeur) */}
          <section className="ae-flipbook-section-card" aria-label="Barres latérales du Flipbook">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                <PanelLeft className="text-blue-600 dark:text-blue-400" size={18} aria-hidden="true" />
                <h4 className="ae-flipbook-section-heading mb-0">Barres latérales du Flipbook</h4>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowLocalPreview(prev => !prev)}
                  className="ae-flipbook-btn-secondary text-xs py-1 px-2.5"
                  aria-label="Prévisualiser les barres latérales de ce Flipbook"
                >
                  <Eye size={14} aria-hidden="true" />
                  <span>{showLocalPreview ? "Masquer l'aperçu" : "Prévisualiser le résultat"}</span>
                </button>

                {/* Badge d'indication visuelle claire */}
                {editingData.sidebarMode === 'global' ? (
                  <span className="ae-badge-global-active">
                    <Sparkles size={13} aria-hidden="true" />
                    <span>Modèle global — {BRAND_NAME}</span>
                  </span>
                ) : (
                  <span className="ae-badge-custom-active">
                    <Sliders size={13} aria-hidden="true" />
                    <span>Configuration personnalisée</span>
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Choisissez entre le <strong>Modèle global — {BRAND_NAME}</strong> (recommandé pour une cohérence éditoriale) ou une <strong>Configuration personnalisée</strong> propre à cet ouvrage.
            </p>

            {/* Sélecteur direct : Mode de barres latérales */}
            <div className="mb-3">
              <label htmlFor="select-flipbook-sidebar-mode" className="ae-modal-label text-xs">
                Mode de barres latérales :
              </label>
              <select
                id="select-flipbook-sidebar-mode"
                value={editingData.sidebarMode || 'global'}
                onChange={(e) => {
                  const nextMode = e.target.value;
                  if (nextMode === 'global' && editingData.sidebarMode !== 'global') {
                    const hasCustom = (editingData.leftSidebar && editingData.leftSidebar.length > 0) || 
                                      (editingData.rightSidebar && editingData.rightSidebar.length > 0);
                    if (hasCustom) {
                      setShowSwitchModeConfirm(true);
                    } else {
                      handleFieldChange('sidebarMode', 'global');
                    }
                  } else if (nextMode === 'custom' && editingData.sidebarMode !== 'custom') {
                    handleFieldChange('sidebarMode', 'custom');
                  }
                }}
                className="db-input w-full text-xs font-semibold"
                aria-label="Mode de barres latérales"
              >
                <option value="global">Modèle global — {BRAND_NAME}</option>
                <option value="custom">Configuration personnalisée</option>
              </select>
            </div>

            {/* SÉLECTEUR VISUEL DE MODE A / MODE B */}
            <div className="ae-sidebar-mode-selector mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Option Mode A : Modèle global */}
                <div 
                  className={`ae-mode-option-card ${editingData.sidebarMode === 'global' ? 'selected' : ''}`}
                  onClick={() => {
                    if (editingData.sidebarMode !== 'global') {
                      const hasCustom = (editingData.leftSidebar && editingData.leftSidebar.length > 0) || 
                                        (editingData.rightSidebar && editingData.rightSidebar.length > 0);
                      if (hasCustom) {
                        setShowSwitchModeConfirm(true);
                      } else {
                        handleFieldChange('sidebarMode', 'global');
                      }
                    }
                  }}
                  role="radio"
                  aria-checked={editingData.sidebarMode === 'global'}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleFieldChange('sidebarMode', 'global');
                    }
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="fb-sidebar-mode"
                      id="mode-choice-global"
                      checked={editingData.sidebarMode === 'global'}
                      onChange={() => {}}
                      className="mt-1"
                      aria-label="Mode A Utiliser le modèle global"
                    />
                    <div>
                      <label htmlFor="mode-choice-global" className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer">
                        <Sparkles size={14} className="text-blue-600" />
                        <span>Modèle global — {BRAND_NAME} (Recommandé)</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Ce Flipbook hérite par référence dynamique du « Modèle global — {BRAND_NAME} ». Les modifications globales y sont immédiatement répercutées.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option Mode B : Personnalisation individuelle */}
                <div 
                  className={`ae-mode-option-card ${editingData.sidebarMode === 'custom' ? 'selected' : ''}`}
                  onClick={() => {
                    if (editingData.sidebarMode !== 'custom') {
                      handleFieldChange('sidebarMode', 'custom');
                    }
                  }}
                  role="radio"
                  aria-checked={editingData.sidebarMode === 'custom'}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleFieldChange('sidebarMode', 'custom');
                    }
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="fb-sidebar-mode"
                      id="mode-choice-custom"
                      checked={editingData.sidebarMode === 'custom'}
                      onChange={() => {}}
                      className="mt-1"
                      aria-label="Mode B Personnaliser ce Flipbook"
                    />
                    <div>
                      <label htmlFor="mode-choice-custom" className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer">
                        <Sliders size={14} className="text-indigo-600" />
                        <span>Configuration personnalisée</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Configurez des barres latérales spécifiques pour cet ouvrage. Elles ne seront pas écrasées lors des modifications du modèle global.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CAS 1 : MODE GLOBAL ACTIF */}
            {editingData.sidebarMode === 'global' ? (
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-blue-600" size={17} />
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      Synchronisé avec le « Modèle global — {BRAND_NAME} »
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {editingData.customSidebarBackup && (
                      <button
                        type="button"
                        onClick={handleRestoreCustomBackup}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 px-3 py-1.5 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                      >
                        <RotateCcw size={13} aria-hidden="true" />
                        <span>Restaurer la dernière configuration individuelle</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const globalData = getLocalGlobalSidebar();
                        const currentHasBlocks = (editingData.leftSidebar?.length || 0) + (editingData.rightSidebar?.length || 0) > 0;
                        setEditingData(prev => ({
                          ...prev,
                          sidebarMode: 'custom',
                          leftSidebar: currentHasBlocks ? prev.leftSidebar : JSON.parse(JSON.stringify(globalData.leftSidebar || [])),
                          rightSidebar: currentHasBlocks ? prev.rightSidebar : JSON.parse(JSON.stringify(globalData.rightSidebar || []))
                        }));
                      }}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Personnaliser uniquement ce Flipbook (Partir d'une copie du modèle global)
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-0">
                  Ce flipbook affiche les barres latérales communes partagées. Pour modifier le contenu ou le design commun pour l'ensemble des flipbooks, utilisez la section <strong>« Modèle global des barres latérales »</strong> dans la bibliothèque.
                </p>
              </div>
            ) : (
              /* CAS 2 : MODE PERSONNALISÉ ACTIF */
              <div>
                <div className="flex items-center justify-between flex-wrap gap-2 p-2.5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-lg mb-3">
                  <span className="text-xs font-medium text-indigo-900 dark:text-indigo-200">
                    Configuration personnalisée active pour cet ouvrage.
                  </span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCopyFromGlobalTemplate}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline bg-transparent border-none cursor-pointer"
                    >
                      Copier le modèle global comme base
                    </button>

                    {editingData.customSidebarBackup && (
                      <button
                        type="button"
                        onClick={handleRestoreCustomBackup}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline bg-transparent border-none cursor-pointer"
                      >
                        Restaurer ma sauvegarde individuelle
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowSwitchModeConfirm(true)}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline bg-transparent border-none cursor-pointer"
                    >
                      Revenir au modèle global
                    </button>
                  </div>
                </div>

                {/* Réglage des largeurs individuelles des barres latérales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 mb-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <label htmlFor="custom-left-width">Largeur Barre gauche (%)</label>
                      <span className="text-blue-600 font-mono">
                        {editingData.sidebarStyles?.leftWidth || 20}%
                      </span>
                    </div>
                    <input
                      id="custom-left-width"
                      type="range"
                      min="15"
                      max="30"
                      step="1"
                      value={editingData.sidebarStyles?.leftWidth || 20}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditingData(prev => ({
                          ...prev,
                          sidebarStyles: {
                            ...(prev.sidebarStyles || {}),
                            leftWidth: val
                          }
                        }));
                      }}
                      className="ae-range-input"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <label htmlFor="custom-right-width">Largeur Barre droite (%)</label>
                      <span className="text-blue-600 font-mono">
                        {editingData.sidebarStyles?.rightWidth || 20}%
                      </span>
                    </div>
                    <input
                      id="custom-right-width"
                      type="range"
                      min="15"
                      max="30"
                      step="1"
                      value={editingData.sidebarStyles?.rightWidth || 20}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditingData(prev => ({
                          ...prev,
                          sidebarStyles: {
                            ...(prev.sidebarStyles || {}),
                            rightWidth: val
                          }
                        }));
                      }}
                      className="ae-range-input"
                    />
                  </div>
                </div>

                {/* Éditeur complet des barres exploitant toute la largeur min(1100px, 94vw) */}
                <FlipbookSidebarEditor 
                  flipbook={editingData}
                  onChange={(updated) => setEditingData(updated)}
                />
              </div>
            )}

            {/* Aperçu local immédiat du Flipbook et de ses barres */}
            {showLocalPreview && (
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700" data-testid="modal-local-preview">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center justify-between">
                  <span>Aperçu local en direct ({editingData.sidebarMode === 'global' ? `Modèle global — ${BRAND_NAME}` : 'Configuration personnalisée'})</span>
                  <span className="text-[11px] text-slate-500">Non publié tant que non enregistré</span>
                </div>
                <FlipbookLayout
                  book={editingData}
                  globalSidebar={getLocalGlobalSidebar()}
                >
                  <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                    <BookOpen size={28} className="mx-auto mb-2 text-blue-600" />
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{editingData.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{editingData.pdfFile || 'Document PDF'}</div>
                  </div>
                </FlipbookLayout>
              </div>
            )}
          </section>

          {/* Modale de confirmation : Revenir au modèle global */}
          {showSwitchModeConfirm && (
            <div className="ae-modal-overlay" onClick={() => setShowSwitchModeConfirm(false)} role="presentation">
              <div 
                className="ae-modal-container max-w-md p-6" 
                onClick={(e) => e.stopPropagation()} 
                role="dialog" 
                aria-modal="true"
                aria-labelledby="confirm-modal-switch-mode"
              >
                <div className="flex items-center gap-3 mb-3 text-amber-600">
                  <AlertTriangle size={24} aria-hidden="true" />
                  <h3 id="confirm-modal-switch-mode" className="text-base font-bold text-slate-900 dark:text-slate-100 mb-0">
                    Remplacer par le modèle global ?
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                  Ce Flipbook utilise actuellement une configuration individuelle. En basculant sur le <strong>« Modèle global — {BRAND_NAME} »</strong>, l'affichage utilisera désormais le modèle commun partagé.
                  <br /><br />
                  Votre dernière configuration individuelle sera automatiquement <strong>conservée en sauvegarde</strong> afin de permettre un retour ultérieur sans perte de données.
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSwitchModeConfirm(false)}
                    className="ae-flipbook-btn-secondary"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const backup = createCustomSidebarBackup(editingData) || editingData.customSidebarBackup;
                      setEditingData(prev => ({
                        ...prev,
                        sidebarMode: 'global',
                        ...(backup ? { customSidebarBackup: backup } : {})
                      }));
                      setShowSwitchModeConfirm(false);
                    }}
                    className="ae-flipbook-btn-primary"
                  >
                    <Check size={16} aria-hidden="true" />
                    <span>Confirmer et utiliser le modèle global</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* PIED FIXE (Sticky bottom: 0) */}
        <footer className="ae-flipbook-modal-footer">
          <button 
            type="button" 
            onClick={handleSafeClose} 
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm border-none min-h-[40px]"
            disabled={isSaving}
          >
            Annuler
          </button>
          <button 
            type="submit" 
            form="flipbook-edit-form"
            disabled={isSaving}
            className={`font-bold px-5 py-2 rounded-lg cursor-pointer transition-colors text-sm border-none flex items-center gap-2 min-h-[40px] ${
              isSaving 
                ? 'bg-blue-600/50 text-white cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            {isSaving ? (
              <>
                <div className="ae-spinner-btn-white" aria-hidden="true" />
                <span>{saveProgressMsg || "Enregistrement..."}</span>
              </>
            ) : (
              <span>Enregistrer les modifications</span>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
