import { useState, useRef } from 'react';
import {
  Save, Download, Upload, Code, RotateCcw,
  RotateCw, Trash2, Copy, Check, Eye, LayoutTemplate, X, Layers, Sliders
} from 'lucide-react';
import { useBuilder } from '../store/builderStore';
import DevicePreview from './DevicePreview';
import TemplatesModal from './TemplatesModal';
import PreviewModal from './PreviewModal';
import renderHtml from '../utils/renderHtml';
import exportJson from '../utils/exportJson';
import importJson from '../utils/importJson';

export default function Toolbar() {
  const {
    elements,
    canUndo,
    canRedo,
    undo,
    redo,
    resetCanvas,
    importLayout,
    saveToLocalStorage,
    isNavigatorOpen,
    setIsNavigatorOpen,
    isGlobalSettingsOpen,
    setIsGlobalSettingsOpen
  } = useBuilder();

  const [showHtmlModal, setShowHtmlModal]         = useState(false);
  const [showTemplates, setShowTemplates]         = useState(false);
  const [showPreview, setShowPreview]             = useState(false);
  const [copied, setCopied]                       = useState(false);
  const [saveSuccess, setSaveSuccess]             = useState(false);
  const fileInputRef                              = useRef(null);

  const generatedHtml = renderHtml(elements);

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHtml = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page construite avec Anjou Page Builder</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    img { max-width: 100%; }
    section { position: relative; }
  </style>
</head>
<body>
${generatedHtml}
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSave = () => {
    saveToLocalStorage();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2200);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const sanitized = await importJson(file);
      if (confirm('Voulez-vous écraser le contenu actuel par ce fichier importé ?')) {
        importLayout(sanitized);
      }
    } catch (err) {
      alert(err.message || 'Erreur lors de l\'import');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    if (confirm('Réinitialiser entièrement le canvas ? Toutes les modifications non exportées seront perdues.')) {
      resetCanvas();
    }
  };

  return (
    <>
      <header className="builder-toolbar">
        {/* ── Brand ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexShrink: 0 }}>
          <div className="pb-brand-badge" aria-hidden="true">AE</div>
          <span className="pb-brand-name">Anjou Page Builder</span>
          <span className="pb-brand-badge-version">v2</span>
        </div>

        <div className="pb-toolbar-sep" />

        {/* ── Center: Device preview ── */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <DevicePreview />
        </div>

        <div className="pb-toolbar-sep" />

        {/* ── Actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.375rem', flexShrink: 0 }}>

          {/* Navigateur */}
          <button
            type="button"
            className={`pb-btn ${isNavigatorOpen ? 'active' : ''}`}
            onClick={() => setIsNavigatorOpen(!isNavigatorOpen)}
            title="Ouvrir le navigateur (Arborescence)"
          >
            <Layers size={14} />
          </button>

          {/* Réglages globaux */}
          <button
            type="button"
            className={`pb-btn ${isGlobalSettingsOpen ? 'active' : ''}`}
            onClick={() => setIsGlobalSettingsOpen(!isGlobalSettingsOpen)}
            title="Réglages globaux du site"
          >
            <Sliders size={14} />
          </button>
          
          <div className="pb-toolbar-sep" />

          {/* Templates */}
          <button
            type="button"
            className="pb-btn"
            onClick={() => setShowTemplates(true)}
            title="Bibliothèque de templates"
          >
            <LayoutTemplate size={14} />
            <span className="pb-toolbar-label">Templates</span>
          </button>

          <div className="pb-toolbar-sep" />

          {/* Undo / Redo */}
          <div className="pb-undo-redo" role="group" aria-label="Historique">
            <button
              type="button"
              className="pb-btn"
              disabled={!canUndo}
              onClick={undo}
              title="Annuler (Ctrl+Z)"
              aria-label="Annuler"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              className="pb-btn"
              disabled={!canRedo}
              onClick={redo}
              title="Rétablir (Ctrl+Y)"
              aria-label="Rétablir"
            >
              <RotateCw size={15} />
            </button>
          </div>

          <div className="pb-toolbar-sep" />

          {/* Save */}
          <button
            type="button"
            className={`pb-btn ${saveSuccess ? 'pb-btn-success' : ''}`}
            onClick={handleSave}
            title="Enregistrer dans le navigateur"
          >
            {saveSuccess ? <Check size={14} /> : <Save size={14} />}
            <span>{saveSuccess ? 'Enregistré !' : 'Enregistrer'}</span>
          </button>

          {/* Import JSON */}
          <button type="button" className="pb-btn" onClick={handleImportClick} title="Importer un fichier JSON">
            <Upload size={14} />
            <span className="pb-toolbar-label">Importer</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
            aria-hidden="true"
          />

          {/* Export JSON */}
          <button type="button" className="pb-btn" onClick={() => exportJson(elements)} title="Exporter en JSON">
            <Download size={14} />
            <span className="pb-toolbar-label">Exporter</span>
          </button>

          <div className="pb-toolbar-sep" />

          {/* Preview */}
          <button
            type="button"
            className="pb-btn"
            onClick={() => setShowPreview(true)}
            title="Aperçu plein écran"
          >
            <Eye size={14} />
            <span>Aperçu</span>
          </button>

          {/* Export HTML (primary CTA) */}
          <button
            type="button"
            className="pb-btn pb-btn-primary"
            onClick={() => setShowHtmlModal(true)}
            title="Générer le code HTML Bootstrap 5"
          >
            <Code size={14} />
            <span>HTML</span>
          </button>

          <div className="pb-toolbar-sep" />

          {/* Reset */}
          <button
            type="button"
            className="pb-btn pb-btn-danger pb-btn-icon-only"
            onClick={handleReset}
            title="Réinitialiser le canvas"
            aria-label="Réinitialiser"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      {/* ── Templates Modal ── */}
      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}

      {/* ── Full-screen Preview Modal ── */}
      {showPreview && <PreviewModal onClose={() => setShowPreview(false)} />}

      {/* ── HTML Export Modal ── */}
      {showHtmlModal && (
        <div
          className="pb-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Export HTML"
          onClick={e => { if (e.target === e.currentTarget) setShowHtmlModal(false); }}
        >
          <div className="pb-modal">
            {/* Header */}
            <div className="pb-modal-header">
              <h2 className="pb-modal-title">
                <Code size={18} style={{ color: 'var(--pb-primary)' }} />
                Code HTML exportable — Bootstrap 5
              </h2>
              <button type="button" className="pb-btn pb-btn-icon-only" onClick={() => setShowHtmlModal(false)} aria-label="Fermer">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="pb-modal-body">
              <p style={{ fontSize: '.82rem', color: 'var(--pb-text-3)', marginBottom: '1rem' }}>
                Ce code HTML est compatible Bootstrap 5. Copiez-le ou téléchargez-le comme page autonome.
              </p>
              <div className="pb-code-area">
                <textarea
                  className="pb-code-textarea"
                  readOnly
                  value={generatedHtml}
                  aria-label="Code HTML généré"
                />
                <div className="pb-copy-btn">
                  <button
                    type="button"
                    className={`pb-btn ${copied ? 'pb-btn-success' : 'pb-btn-primary'}`}
                    onClick={handleCopyHtml}
                    style={{ fontSize: '.75rem' }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copié !' : 'Copier'}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pb-modal-footer">
              <button type="button" className="pb-btn" onClick={() => setShowHtmlModal(false)}>
                Fermer
              </button>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button type="button" className="pb-btn" onClick={handleCopyHtml}>
                  <Copy size={15} />
                  <span>Copier le HTML</span>
                </button>
                <button type="button" className="pb-btn pb-btn-primary" onClick={handleDownloadHtml}>
                  <Download size={15} />
                  <span>Télécharger index.html</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
