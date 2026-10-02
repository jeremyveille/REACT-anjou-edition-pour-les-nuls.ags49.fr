import React, { useState, useRef } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Film, 
  Upload, 
  FolderOpen,
  ChevronUp
} from 'lucide-react';
import { pageService } from '../services/pageService';
import { extractYoutubeVideoId, getYoutubeEmbedUrl } from '../utils/youtubeUtils';

/**
 * Éditeur pour un bloc individuel de la barre latérale du Flipbook.
 */
export default function FlipbookSidebarBlockEditor({
  block,
  index,
  totalBlocks,
  position,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onOpenMediaLibrary
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const videoFileInputRef = useRef(null);
  const pdfFileInputRef = useRef(null);

  const blockType = block.type || 'text';
  const isEnabled = block.enabled !== false;

  // Téléversement d'image avec fallback local sécurisé
  const handleImageUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      try {
        const url = await pageService.uploadMedia(file);
        if (url) {
          onUpdate({ ...block, imageUrl: url, imageAlt: block.imageAlt || file.name.replace(/\.[^/.]+$/, "") });
          setIsUploading(false);
          return;
        }
      } catch (uploadErr) {
        console.warn("Échec du téléversement Firebase Storage, utilisation du Data URL local:", uploadErr);
      }

      // Fallback base64 local
      const reader = new FileReader();
      reader.onload = (e) => {
        onUpdate({ 
          ...block, 
          imageUrl: e.target.result, 
          imageAlt: block.imageAlt || file.name.replace(/\.[^/.]+$/, "") 
        });
        setIsUploading(false);
      };
      reader.onerror = () => setIsUploading(false);
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erreur lors de la lecture du fichier image:", err);
      setIsUploading(false);
    }
  };

  // Téléversement de fichier vidéo avec fallback local
  const handleVideoUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      try {
        const url = await pageService.uploadMedia(file);
        if (url) {
          onUpdate({ ...block, videoUrl: url, videoSourceType: 'local' });
          setIsUploading(false);
          return;
        }
      } catch (uploadErr) {
        console.warn("Échec du téléversement vidéo Firebase Storage, utilisation du Data URL local:", uploadErr);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        onUpdate({ 
          ...block, 
          videoUrl: e.target.result, 
          videoSourceType: 'local' 
        });
        setIsUploading(false);
      };
      reader.onerror = () => setIsUploading(false);
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erreur lors de la lecture du fichier vidéo:", err);
      setIsUploading(false);
    }
  };

  // Téléversement de document PDF
  const handlePdfUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      try {
        const url = await pageService.uploadMedia(file);
        if (url) {
          onUpdate({ 
            ...block, 
            pdfUrl: url, 
            pdfTitle: block.pdfTitle || file.name.replace(/\.[^/.]+$/, "") 
          });
          setIsUploading(false);
          return;
        }
      } catch (uploadErr) {
        console.warn("Échec du téléversement PDF:", uploadErr);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        onUpdate({ 
          ...block, 
          pdfUrl: e.target.result, 
          pdfTitle: block.pdfTitle || file.name.replace(/\.[^/.]+$/, "") 
        });
        setIsUploading(false);
      };
      reader.onerror = () => setIsUploading(false);
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erreur lors du traitement du fichier PDF:", err);
      setIsUploading(false);
    }
  };

  const getBlockTypeLabel = (type) => {
    switch (type) {
      case 'image': return 'Image';
      case 'video': return 'Vidéo';
      case 'text': return 'Texte';
      case 'heading': return 'Titre';
      case 'button': return 'Bouton';
      case 'pdf': return 'Document PDF';
      default: return 'Bloc';
    }
  };

  const getBlockSummary = () => {
    if (block.title) return block.title;
    if (block.type === 'heading' && block.text) return block.text;
    if (block.type === 'button' && block.buttonText) return block.buttonText;
    if (block.type === 'image') return block.imageAlt || 'Image';
    if (block.type === 'video') return block.videoUrl ? 'Vidéo configurée' : 'Vidéo à configurer';
    if (block.type === 'pdf') return block.pdfTitle || 'Fichier PDF';
    return `${getBlockTypeLabel(block.type)} #${index + 1}`;
  };

  return (
    <div 
      className={`flipbook-editor-block-card ${!isEnabled ? 'is-disabled' : ''}`}
      data-testid={`block-editor-${position}-${index}`}
    >
      {/* En-tête du bloc avec contrôles d'action accessibles */}
      <div className="flipbook-editor-block-header">
        <div className="flipbook-editor-block-meta">
          <span className="flipbook-editor-block-num">#{index + 1}</span>
          <span className="flipbook-editor-block-summary" title={getBlockSummary()}>
            {getBlockSummary()}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            ({getBlockTypeLabel(blockType)})
          </span>
        </div>

        <div className="flipbook-editor-block-actions" role="toolbar" aria-label={`Actions pour le bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'}`}>
          {/* Monter */}
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="flipbook-btn-ctrl"
            title="Monter le bloc"
            aria-label={`Déplacer le bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'} vers le haut`}
          >
            <ArrowUp size={13} aria-hidden="true" />
          </button>

          {/* Descendre */}
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalBlocks - 1}
            className="flipbook-btn-ctrl"
            title="Descendre le bloc"
            aria-label={`Déplacer le bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'} vers le bas`}
          >
            <ArrowDown size={13} aria-hidden="true" />
          </button>

          {/* Activer / Désactiver */}
          <button
            type="button"
            onClick={() => onUpdate({ ...block, enabled: !isEnabled })}
            className={`flipbook-btn-ctrl ${isEnabled ? 'btn-toggle-active' : 'btn-toggle-inactive'}`}
            title={isEnabled ? "Désactiver ce bloc" : "Activer ce bloc"}
            aria-label={isEnabled ? `Désactiver le bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'}` : `Activer le bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'}`}
            aria-pressed={isEnabled}
          >
            {isEnabled ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
          </button>

          {/* Déplier / Replier */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flipbook-btn-ctrl"
            title={isExpanded ? "Replier la configuration" : "Modifier la configuration"}
            aria-label={isExpanded ? `Replier la configuration du bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'}` : `Modifier la configuration du bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'}`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp size={13} aria-hidden="true" /> : <Edit3 size={13} aria-hidden="true" />}
          </button>

          {/* Supprimer */}
          <button
            type="button"
            onClick={onDelete}
            className="flipbook-btn-ctrl btn-danger"
            title="Supprimer ce bloc"
            aria-label={`Supprimer le bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'}`}
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Corps du formulaire de configuration */}
      {isExpanded && (
        <div className="flipbook-editor-block-body">
          {/* Sélecteur de Type de contenu */}
          <div className="flipbook-editor-field-row">
            <label className="flipbook-editor-label" htmlFor={`block-type-select-${position}-${index}`}>
              Type de contenu
            </label>
            <select
              id={`block-type-select-${position}-${index}`}
              value={blockType}
              onChange={(e) => onUpdate({ ...block, type: e.target.value })}
              className="db-select text-xs w-full"
              aria-label="Sélectionner le type de contenu du bloc"
            >
              <option value="image">Image (Médiathèque ou Téléversement)</option>
              <option value="video">Vidéo (Locale, YouTube ou URL)</option>
              <option value="text">Texte / Contenu HTML sécurisé</option>
              <option value="heading">Titre / En-tête</option>
              <option value="button">Bouton / Lien d'action</option>
              <option value="pdf">Document PDF téléchargeable</option>
            </select>
          </div>

          {/* Titre optionnel (commun à plusieurs types) */}
          {blockType !== 'heading' && (
            <div className="flipbook-editor-field-row">
              <label className="flipbook-editor-label" htmlFor={`block-title-${position}-${index}`}>
                Titre du bloc (optionnel)
              </label>
              <input
                id={`block-title-${position}-${index}`}
                type="text"
                value={block.title || ''}
                onChange={(e) => onUpdate({ ...block, title: e.target.value })}
                placeholder="ex: Patrimoine d'Anjou"
                className="db-input text-xs"
              />
            </div>
          )}

          {/* CONFIGURATION SPÉCIFIQUE : IMAGE */}
          {blockType === 'image' && (
            <div className="space-y-3 pt-1">
              <label className="flipbook-editor-label">Source de l'image</label>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenMediaLibrary((selectedMedia) => {
                    if (selectedMedia) {
                      onUpdate({
                        ...block,
                        imageUrl: selectedMedia.url || selectedMedia.downloadUrl || '',
                        imageAlt: block.imageAlt || selectedMedia.name || selectedMedia.title || ''
                      });
                    }
                  }, 'image')}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-900/40 cursor-pointer"
                >
                  <FolderOpen size={13} aria-hidden="true" />
                  <span>Choisir dans la médiathèque ▼</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <Upload size={13} aria-hidden="true" />
                  <span>{isUploading ? "Téléversement..." : "Téléverser une nouvelle image"}</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-img-url-${position}-${index}`}>
                  URL de l'image
                </label>
                <input
                  id={`block-img-url-${position}-${index}`}
                  type="text"
                  value={block.imageUrl || block.url || ''}
                  onChange={(e) => onUpdate({ ...block, imageUrl: e.target.value })}
                  placeholder="https://... ou fichier local"
                  className="db-input text-xs"
                />
              </div>

              {(block.imageUrl || block.url) && (
                <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <img
                    src={block.imageUrl || block.url}
                    alt={block.imageAlt || "Aperçu miniature"}
                    className="flipbook-editor-preview-thumb"
                  />
                  <div className="text-[11px] text-slate-500 leading-snug">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">Aperçu direct</span>
                    <span>Image prête à l'affichage</span>
                  </div>
                </div>
              )}

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-img-alt-${position}-${index}`}>
                  Texte alternatif (Alt - Accessibilité WCAG) <span className="text-red-500">*</span>
                </label>
                <input
                  id={`block-img-alt-${position}-${index}`}
                  type="text"
                  value={block.imageAlt || ''}
                  onChange={(e) => onUpdate({ ...block, imageAlt: e.target.value })}
                  placeholder="Description détaillée de l'image pour les lecteurs d'écran"
                  className="db-input text-xs"
                  required
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-img-caption-${position}-${index}`}>
                  Légende sous l'image (optionnelle)
                </label>
                <input
                  id={`block-img-caption-${position}-${index}`}
                  type="text"
                  value={block.caption || ''}
                  onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
                  placeholder="ex: Vignobles de Savennières au coucher du soleil"
                  className="db-input text-xs"
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-img-link-${position}-${index}`}>
                  Lien au clic sur l'image (optionnel)
                </label>
                <input
                  id={`block-img-link-${position}-${index}`}
                  type="text"
                  value={block.linkUrl || ''}
                  onChange={(e) => onUpdate({ ...block, linkUrl: e.target.value })}
                  placeholder="https://... ou /contact"
                  className="db-input text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={block.openNewTab || false}
                  onChange={(e) => onUpdate({ ...block, openNewTab: e.target.checked })}
                  className="ae-form-checkbox"
                />
                <span>Ouvrir le lien dans un nouvel onglet</span>
              </label>
            </div>
          )}

          {/* CONFIGURATION SPÉCIFIQUE : VIDÉO */}
          {blockType === 'video' && (
            <div className="space-y-3 pt-1">
              <label className="flipbook-editor-label">Source de la vidéo</label>

              {/* Bouton Fichier Vidéo */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenMediaLibrary((selectedMedia) => {
                    if (selectedMedia) {
                      onUpdate({
                        ...block,
                        videoUrl: selectedMedia.url || selectedMedia.downloadUrl || '',
                        videoSourceType: 'local'
                      });
                    }
                  }, 'video')}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-900/40 cursor-pointer"
                >
                  <Film size={13} aria-hidden="true" />
                  <span>Choisir un fichier vidéo ▼</span>
                </button>

                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <Upload size={13} aria-hidden="true" />
                  <span>{isUploading ? "Téléversement..." : "Téléverser une vidéo (.mp4)"}</span>
                </button>

                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVideoUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="text-center my-1 text-slate-400 text-xs font-bold uppercase tracking-wider">
                — OU —
              </div>

              {/* URL YouTube / Vidéo */}
              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-video-url-${position}-${index}`}>
                  URL YouTube / vidéo
                </label>
                <input
                  id={`block-video-url-${position}-${index}`}
                  type="text"
                  value={block.videoUrl || block.url || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isYt = Boolean(extractYoutubeVideoId(val));
                    onUpdate({ 
                      ...block, 
                      videoUrl: val, 
                      videoSourceType: isYt ? 'youtube' : (block.videoSourceType || 'url') 
                    });
                  }}
                  placeholder="https://www.youtube.com/watch?v=... ou https://.../video.mp4"
                  className="db-input text-xs"
                />
              </div>

              {/* Aperçu vidéo */}
              {(block.videoUrl || block.url) && (
                <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Aperçu de la vidéo intégrée :
                  </span>
                  <div className="flipbook-video-ratio-container" style={{ maxHeight: '160px' }}>
                    {extractYoutubeVideoId(block.videoUrl || block.url) ? (
                      <iframe
                        src={getYoutubeEmbedUrl(block.videoUrl || block.url)}
                        title="Aperçu YouTube"
                        className="flipbook-video-iframe"
                        allowFullScreen
                      />
                    ) : (
                      <video controls className="flipbook-responsive-video">
                        <source src={block.videoUrl || block.url} />
                      </video>
                    )}
                  </div>
                </div>
              )}

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-video-caption-${position}-${index}`}>
                  Légende ou description de la vidéo
                </label>
                <input
                  id={`block-video-caption-${position}-${index}`}
                  type="text"
                  value={block.caption || ''}
                  onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
                  placeholder="ex: Survol historique du Val de Loire"
                  className="db-input text-xs"
                />
              </div>
            </div>
          )}

          {/* CONFIGURATION SPÉCIFIQUE : TEXTE / HTML SÉCURISÉ */}
          {blockType === 'text' && (
            <div className="space-y-3 pt-1">
              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-text-content-${position}-${index}`}>
                  Contenu texte ou HTML sécurisé
                </label>
                <textarea
                  id={`block-text-content-${position}-${index}`}
                  rows={4}
                  value={block.content || ''}
                  onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                  placeholder="Rédigez votre texte ici... Les balises HTML basiques (<p>, <strong>, <em>, <br>) sont acceptées et assainies."
                  className="db-textarea text-xs"
                />
                <span className="text-[10px] text-slate-400 italic">
                  Protégé par sanitizeHtml : les balises de script et attributs suspects sont automatiquement neutralisés.
                </span>
              </div>
            </div>
          )}

          {/* CONFIGURATION SPÉCIFIQUE : TITRE / HEADING */}
          {blockType === 'heading' && (
            <div className="space-y-3 pt-1">
              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-heading-text-${position}-${index}`}>
                  Texte du titre <span className="text-red-500">*</span>
                </label>
                <input
                  id={`block-heading-text-${position}-${index}`}
                  type="text"
                  value={block.text || block.title || ''}
                  onChange={(e) => onUpdate({ ...block, text: e.target.value, title: e.target.value })}
                  placeholder="ex: Informations complémentaires"
                  className="db-input text-xs"
                  required
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-heading-level-${position}-${index}`}>
                  Niveau hiérarchique
                </label>
                <select
                  id={`block-heading-level-${position}-${index}`}
                  value={block.level || 'h3'}
                  onChange={(e) => onUpdate({ ...block, level: e.target.value })}
                  className="db-select text-xs"
                >
                  <option value="h2">H2 — Titre principal</option>
                  <option value="h3">H3 — Sous-titre standard</option>
                  <option value="h4">H4 — Petit titre de section</option>
                  <option value="h5">H5 — En-tête compacte</option>
                </select>
              </div>
            </div>
          )}

          {/* CONFIGURATION SPÉCIFIQUE : BOUTON / LIEN */}
          {blockType === 'button' && (
            <div className="space-y-3 pt-1">
              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-btn-text-${position}-${index}`}>
                  Texte du bouton <span className="text-red-500">*</span>
                </label>
                <input
                  id={`block-btn-text-${position}-${index}`}
                  type="text"
                  value={block.buttonText || block.title || ''}
                  onChange={(e) => onUpdate({ ...block, buttonText: e.target.value, title: e.target.value })}
                  placeholder="ex: Contacter l'auteur"
                  className="db-input text-xs"
                  required
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-btn-url-${position}-${index}`}>
                  URL de redirection <span className="text-red-500">*</span>
                </label>
                <input
                  id={`block-btn-url-${position}-${index}`}
                  type="text"
                  value={block.buttonUrl || block.url || ''}
                  onChange={(e) => onUpdate({ ...block, buttonUrl: e.target.value })}
                  placeholder="ex: /contact ou https://..."
                  className="db-input text-xs"
                  required
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-btn-style-${position}-${index}`}>
                  Style visuel du bouton
                </label>
                <select
                  id={`block-btn-style-${position}-${index}`}
                  value={block.buttonStyle || 'primary'}
                  onChange={(e) => onUpdate({ ...block, buttonStyle: e.target.value })}
                  className="db-select text-xs"
                >
                  <option value="primary">Bleu Royal Anjou (Plein)</option>
                  <option value="secondary">Bleu Lumineux</option>
                  <option value="outline">Contour / Bordure fine</option>
                  <option value="gold">Doré Élégant</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={block.openNewTab || false}
                  onChange={(e) => onUpdate({ ...block, openNewTab: e.target.checked })}
                  className="ae-form-checkbox"
                />
                <span>Ouvrir dans un nouvel onglet</span>
              </label>
            </div>
          )}

          {/* CONFIGURATION SPÉCIFIQUE : DOCUMENT PDF */}
          {blockType === 'pdf' && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenMediaLibrary((selectedMedia) => {
                    if (selectedMedia) {
                      onUpdate({
                        ...block,
                        pdfUrl: selectedMedia.url || selectedMedia.downloadUrl || '',
                        pdfTitle: block.pdfTitle || selectedMedia.name || 'Document PDF'
                      });
                    }
                  }, 'document')}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-900/40 cursor-pointer"
                >
                  <FolderOpen size={13} aria-hidden="true" />
                  <span>Choisir dans la médiathèque ▼</span>
                </button>

                <button
                  type="button"
                  onClick={() => pdfFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <Upload size={13} aria-hidden="true" />
                  <span>{isUploading ? "Téléversement..." : "Téléverser un PDF"}</span>
                </button>

                <input
                  ref={pdfFileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-pdf-title-${position}-${index}`}>
                  Titre du document PDF
                </label>
                <input
                  id={`block-pdf-title-${position}-${index}`}
                  type="text"
                  value={block.pdfTitle || block.title || ''}
                  onChange={(e) => onUpdate({ ...block, pdfTitle: e.target.value })}
                  placeholder="ex: Fiche pédagogique"
                  className="db-input text-xs"
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-pdf-url-${position}-${index}`}>
                  URL ou nom du fichier PDF
                </label>
                <input
                  id={`block-pdf-url-${position}-${index}`}
                  type="text"
                  value={block.pdfUrl || block.pdfFile || ''}
                  onChange={(e) => onUpdate({ ...block, pdfUrl: e.target.value })}
                  placeholder="https://... ou mon-document.pdf"
                  className="db-input text-xs"
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label" htmlFor={`block-pdf-desc-${position}-${index}`}>
                  Courte description (optionnelle)
                </label>
                <input
                  id={`block-pdf-desc-${position}-${index}`}
                  type="text"
                  value={block.description || ''}
                  onChange={(e) => onUpdate({ ...block, description: e.target.value })}
                  placeholder="ex: Télécharger la fiche complète au format PDF"
                  className="db-input text-xs"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
