import { useEffect, useRef } from 'react';
import { X, Monitor, Tablet, Smartphone, ExternalLink } from 'lucide-react';
import { useBuilder } from '../store/builderStore';
import renderHtml from '../utils/renderHtml';

const DEVICE_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};

const DEVICE_LABELS = {
  desktop: 'Bureau',
  tablet: 'Tablette',
  mobile: 'Mobile',
};

const DEVICE_ICONS = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

export default function PreviewModal({ onClose }) {
  const { elements, previewMode, setPreviewMode } = useBuilder();
  const iframeRef = useRef(null);

  const pageHtml = renderHtml(elements);

  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aperçu de la page</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; }
    img { max-width: 100%; }
    section { position: relative; }
  </style>
</head>
<body>
${pageHtml}
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;

  /* Write HTML into iframe using srcdoc — no blob URL needed */
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.srcdoc = fullHtml;
  }, [fullHtml]);

  /* Close on Escape */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleOpenInTab = () => {
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const iframeWidth = DEVICE_WIDTHS[previewMode] || '100%';

  return (
    <div
      className="pb-preview-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu plein écran"
    >
      {/* Top bar */}
      <div className="pb-preview-bar">
        <div className="pb-preview-bar-left">
          <span className="pb-preview-bar-title">Aperçu de la page</span>
        </div>

        {/* Device switcher */}
        <div className="pb-device-group">
          {Object.entries(DEVICE_LABELS).map(([key, label]) => {
            const Icon = DEVICE_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                className={`pb-device-btn${previewMode === key ? ' active' : ''}`}
                onClick={() => setPreviewMode(key)}
                title={label}
                aria-label={label}
                aria-pressed={previewMode === key}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>

        <div className="pb-preview-bar-right">
          <button
            type="button"
            className="pb-btn"
            onClick={handleOpenInTab}
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink size={14} />
            <span>Ouvrir</span>
          </button>
          <button
            type="button"
            className="pb-btn pb-btn-danger pb-btn-icon-only"
            onClick={onClose}
            title="Fermer l'aperçu (Échap)"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="pb-preview-stage">
        {elements.length === 0 ? (
          <div className="pb-preview-empty">
            <span style={{ fontSize: '3rem' }}>🖼️</span>
            <p>Le canvas est vide. Ajoutez des blocs pour voir l&apos;aperçu.</p>
          </div>
        ) : (
          <div
            className={`pb-preview-frame-wrapper ${previewMode}`}
            style={{ width: iframeWidth }}
          >
            {previewMode === 'mobile' && (
              <div className="pb-phone-chrome">
                <div className="pb-phone-notch" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              className="pb-preview-iframe"
              title="Aperçu de la page"
              sandbox="allow-scripts allow-same-origin"
            />
            {previewMode === 'mobile' && (
              <div className="pb-phone-chrome pb-phone-chrome-bottom">
                <div className="pb-phone-home" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
