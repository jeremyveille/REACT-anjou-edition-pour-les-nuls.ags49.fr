import React, { useState, useEffect, useRef } from 'react';
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
  Layers 
} from 'lucide-react';
import FlipbookSidebarEditor from './FlipbookSidebarEditor';

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
  const [newPdfFile, setNewPdfFile] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [expandedPageIdx, setExpandedPageIdx] = useState(0); // Première page ouverte par défaut
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (flipbook && isOpen) {
      const copy = JSON.parse(JSON.stringify(flipbook));
      if (!Array.isArray(copy.pages)) copy.pages = [];
      if (!Array.isArray(copy.leftSidebar)) copy.leftSidebar = [];
      if (!Array.isArray(copy.rightSidebar)) copy.rightSidebar = [];
      setEditingData(copy);
      setNewPdfFile(null);
      setCopiedSnippet(false);
      setExpandedPageIdx(copy.pages.length > 0 ? 0 : null);
    }
  }, [flipbook, isOpen]);

  // Fermeture par touche Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

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
      onClick={!isSaving ? onClose : undefined}
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
          <h3 id="edit-flipbook-modal-title" className="ae-flipbook-modal-title">
            <BookOpen className="ae-flipbook-modal-title-icon" size={22} aria-hidden="true" />
            <span className="ae-flipbook-modal-title-text">
              Modifier le Flipbook : <strong>{editingData.title}</strong>
            </span>
          </h3>
          <button 
            type="button"
            onClick={onClose} 
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
            <div className="flex items-center gap-2 mb-1.5">
              <PanelLeft className="text-blue-600 dark:text-blue-400" size={18} aria-hidden="true" />
              <h4 className="ae-flipbook-section-heading">Barres latérales du Flipbook</h4>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Personnalisez les colonnes d'accompagnement affichées à gauche et à droite de ce flipbook sur le site public (illustrations, vidéos, lecteur YouTube, notices littéraires, boutons et documents PDF).
            </p>
            
            {/* Éditeur complet des barres exploitant toute la largeur min(1100px, 94vw) */}
            <FlipbookSidebarEditor 
              flipbook={editingData}
              onChange={(updated) => setEditingData(updated)}
            />
          </section>
        </form>

        {/* PIED FIXE (Sticky bottom: 0) */}
        <footer className="ae-flipbook-modal-footer">
          <button 
            type="button" 
            onClick={onClose} 
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
                <div className="ae-spinner-btn-white" aria-hidden="true"></div>
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
