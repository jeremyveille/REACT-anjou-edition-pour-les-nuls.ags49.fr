import React, { useState, useRef } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Copy,
  Trash2, 
  Eye, 
  EyeOff, 
  Film, 
  Upload, 
  FolderOpen,
  Image as ImageIcon,
  FileText,
  Type,
  Link as LinkIcon,
  FileCode
} from 'lucide-react';
import { pageService } from '../services/pageService';
import { getYoutubeEmbedUrl } from '../utils/youtubeUtils';
import FlipbookBlockStyleEditor from './FlipbookBlockStyleEditor';
import VideoFullscreenButton from './VideoFullscreenButton';

/**
 * Carte visuelle et éditeur pour un bloc individuel de barre latérale Flipbook.
 * Présentation moderne compacte avec miniature, titre, badge de type, statut et actions rapides :
 * Monter, Descendre, Modifier, Dupliquer, Activer/Désactiver, Supprimer.
 */
export default function FlipbookSidebarBlockEditor({
  block,
  index,
  totalBlocks,
  position = 'left',
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onEdit,
  onOpenMediaLibrary,
  defaultExpanded = true
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showBlockStyles, setShowBlockStyles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const editorVideoPreviewRef = useRef(null);
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

  const renderThumbnail = () => {
    switch (blockType) {
      case 'image':
        if (block.imageUrl || block.url) {
          return (
            <img 
              src={block.imageUrl || block.url} 
              alt={block.imageAlt || 'Aperçu'} 
              className="w-[54px] h-[54px] object-cover rounded-md border border-slate-200 dark:border-slate-700 shrink-0"
            />
          );
        }
        return (
          <div className="w-[54px] h-[54px] rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
            <ImageIcon size={22} aria-hidden="true" />
          </div>
        );
      case 'video':
        return (
          <div className="w-[54px] h-[54px] rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
            <Film size={22} aria-hidden="true" />
          </div>
        );
      case 'heading':
        return (
          <div className="w-[54px] h-[54px] rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 font-bold text-xs">
            <Type size={22} aria-hidden="true" />
          </div>
        );
      case 'button':
        return (
          <div className="w-[54px] h-[54px] rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
            <LinkIcon size={22} aria-hidden="true" />
          </div>
        );
      case 'pdf':
        return (
          <div className="w-[54px] h-[54px] rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
            <FileCode size={22} aria-hidden="true" />
          </div>
        );
      default:
        return (
          <div className="w-[54px] h-[54px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
            <FileText size={22} aria-hidden="true" />
          </div>
        );
    }
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div 
      className={`flipbook-editor-block-card ${!isEnabled ? 'is-disabled' : ''}`}
      data-testid={`block-editor-${position}-${index}`}
    >
      {/* En-tête du bloc avec miniature, titre, badge et boutons d'action ergonomiques */}
      <div className="flipbook-editor-block-header p-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {renderThumbnail()}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flipbook-editor-block-num text-[11px] font-bold">#{index + 1}</span>
              <span className="ae-badge-type-pill text-[10px] font-bold uppercase tracking-wider">
                {getBlockTypeLabel(blockType)}
              </span>
              {!isEnabled && (
                <span className="text-[10px] font-semibold text-slate-400 italic">
                  (Désactivé)
                </span>
              )}
            </div>
            <div 
              className="flipbook-editor-block-summary text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5" 
              title={getBlockSummary()}
            >
              {getBlockSummary()}
            </div>
          </div>
        </div>

        <div 
          className="flipbook-editor-block-actions flex items-center gap-1 shrink-0" 
          role="toolbar" 
          aria-label={`Actions pour le bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'}`}
        >
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

          {/* Modifier */}
          <button
            type="button"
            onClick={handleEditClick}
            className="flipbook-btn-ctrl btn-edit"
            title="Modifier la configuration du bloc"
            aria-label={`Modifier la configuration du bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'}`}
            aria-expanded={isExpanded}
          >
            <Edit3 size={13} aria-hidden="true" />
          </button>

          {/* Dupliquer */}
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="flipbook-btn-ctrl"
              title="Dupliquer ce bloc"
              aria-label={`Dupliquer le bloc ${index + 1} de la barre ${position === 'left' ? 'gauche' : 'droite'}`}
            >
              <Copy size={13} aria-hidden="true" />
            </button>
          )}

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

      {/* Corps du formulaire de configuration déployable inline (compatibilité tests & mode étendu) */}
      {isExpanded && !onEdit && (
        <div className="flipbook-editor-block-body p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {/* Sélecteur de Type de contenu */}
          <div className="flipbook-editor-field-row mb-2">
            <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-type-select-${position}-${index}`}>
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
            <div className="flipbook-editor-field-row mb-2">
              <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-title-${position}-${index}`}>
                Titre du bloc (optionnel)
              </label>
              <input
                id={`block-title-${position}-${index}`}
                type="text"
                value={block.title || ''}
                onChange={(e) => onUpdate({ ...block, title: e.target.value })}
                placeholder="ex: Patrimoine d'Anjou"
                className="db-input text-xs w-full"
              />
            </div>
          )}

          {/* CONFIGURATION SPÉCIFIQUE : IMAGE */}
          {blockType === 'image' && (
            <div className="space-y-3 pt-1">
              <label className="flipbook-editor-label text-xs font-semibold block">Source de l'image</label>
              
              <div className="ae-media-actions-row">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenMediaLibrary) {
                      onOpenMediaLibrary((selectedMedia) => {
                        if (selectedMedia) {
                          onUpdate({
                            ...block,
                            imageUrl: selectedMedia.url || selectedMedia.downloadUrl || '',
                            imageAlt: block.imageAlt || selectedMedia.name || selectedMedia.title || ''
                          });
                        }
                      }, 'image');
                    }
                  }}
                  className="ae-media-action-btn ae-media-btn-library"
                >
                  <FolderOpen size={14} aria-hidden="true" />
                  <span>Choisir dans la médiathèque ▼</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="ae-media-action-btn ae-media-btn-upload"
                  aria-label="Téléverser une nouvelle image"
                >
                  <Upload size={14} aria-hidden="true" />
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
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-img-url-${position}-${index}`}>
                  URL de l'image
                </label>
                <input
                  id={`block-img-url-${position}-${index}`}
                  type="text"
                  value={block.imageUrl || block.url || ''}
                  onChange={(e) => onUpdate({ ...block, imageUrl: e.target.value })}
                  placeholder="https://... ou fichier local"
                  className="db-input ae-fluid-input text-xs w-full font-mono"
                />
              </div>

              {(block.imageUrl || block.url) && (
                <div className="ae-image-preview-card">
                  <img
                    src={block.imageUrl || block.url}
                    alt={block.imageAlt || "Aperçu miniature"}
                    className="ae-image-preview-thumb"
                  />
                  <div className="ae-image-preview-meta">
                    <div className="ae-image-preview-status">
                      <span className="ae-status-dot" aria-hidden="true" />
                      <span className="ae-status-title">Image prête à l'affichage</span>
                    </div>
                    <span className="ae-image-preview-subtext">
                      {block.imageAlt ? `Alt: ${block.imageAlt}` : "Aperçu direct pour le Flipbook"}
                    </span>
                  </div>
                </div>
              )}

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-img-alt-${position}-${index}`}>
                  Texte alternatif (Alt - Accessibilité WCAG) <span className="text-red-500">*</span>
                </label>
                <input
                  id={`block-img-alt-${position}-${index}`}
                  type="text"
                  value={block.imageAlt || ''}
                  onChange={(e) => onUpdate({ ...block, imageAlt: e.target.value })}
                  placeholder="Description détaillée de l'image pour les lecteurs d'écran"
                  className="db-input text-xs w-full"
                  required
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-img-caption-${position}-${index}`}>
                  Légende sous l'image (optionnelle)
                </label>
                <input
                  id={`block-img-caption-${position}-${index}`}
                  type="text"
                  value={block.caption || ''}
                  onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
                  placeholder="ex: Vignobles de Savennières au coucher du soleil"
                  className="db-input text-xs w-full"
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-img-link-${position}-${index}`}>
                  Lien au clic sur l'image (optionnel)
                </label>
                <input
                  id={`block-img-link-${position}-${index}`}
                  type="text"
                  value={block.linkUrl || ''}
                  onChange={(e) => onUpdate({ ...block, linkUrl: e.target.value })}
                  placeholder="https://... ou /contact"
                  className="db-input text-xs w-full"
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
              <label className="flipbook-editor-label text-xs font-semibold block">Source de la vidéo</label>

              <div className="ae-media-actions-row">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenMediaLibrary) {
                      onOpenMediaLibrary((selectedMedia) => {
                        if (selectedMedia) {
                          onUpdate({
                            ...block,
                            videoUrl: selectedMedia.url || selectedMedia.downloadUrl || '',
                            videoSourceType: 'local'
                          });
                        }
                      }, 'video');
                    }
                  }}
                  className="ae-media-action-btn ae-media-btn-library"
                  aria-label="Choisir un fichier vidéo dans la médiathèque"
                >
                  <Film size={14} aria-hidden="true" />
                  <span>Choisir un fichier vidéo ▼</span>
                </button>

                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="ae-media-action-btn ae-media-btn-upload"
                  aria-label="Téléverser une vidéo MP4"
                >
                  <Upload size={14} aria-hidden="true" />
                  <span>{isUploading ? "Téléversement..." : "Téléverser vidéo MP4"}</span>
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

              <div className="text-[11px] text-slate-400 font-semibold text-center my-1">
                — OU —
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-vid-url-${position}-${index}`}>
                  URL YouTube / vidéo
                </label>
                <input
                  id={`block-vid-url-${position}-${index}`}
                  type="text"
                  value={block.videoUrl || ''}
                  onChange={(e) => onUpdate({ ...block, videoUrl: e.target.value })}
                  placeholder="ex: https://www.youtube.com/watch?v=..."
                  className="db-input text-xs w-full font-mono"
                />
              </div>

              {block.videoUrl && (
                <div ref={editorVideoPreviewRef} className="flipbook-video-ratio-container ae-media-container ae-media-container--video mt-2">
                  {block.videoUrl.includes('youtube.com') || block.videoUrl.includes('youtu.be') ? (
                    <iframe
                      src={getYoutubeEmbedUrl(block.videoUrl)}
                      title="Aperçu YouTube"
                      className="flipbook-video-iframe"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video src={block.videoUrl} controls playsInline className="flipbook-video-element flipbook-responsive-video" />
                  )}
                  <VideoFullscreenButton containerRef={editorVideoPreviewRef} videoTitle="Aperçu vidéo" />
                </div>
              )}
            </div>
          )}

          {/* CONFIGURATION SPÉCIFIQUE : TEXTE / HTML SÉCURISÉ */}
          {blockType === 'text' && (
            <div className="space-y-3 pt-1">
              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-text-content-${position}-${index}`}>
                  Contenu texte ou HTML sécurisé
                </label>
                <textarea
                  id={`block-text-content-${position}-${index}`}
                  value={block.content || ''}
                  onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                  placeholder="Rédigez votre texte..."
                  rows="4"
                  className="db-input text-xs font-sans leading-relaxed w-full"
                />
              </div>
            </div>
          )}

          {/* CONFIGURATION SPÉCIFIQUE : TITRE / HEADING */}
          {blockType === 'heading' && (
            <div className="space-y-3 pt-1">
              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-heading-text-${position}-${index}`}>
                  Texte du titre
                </label>
                <input
                  id={`block-heading-text-${position}-${index}`}
                  type="text"
                  value={block.text || ''}
                  onChange={(e) => onUpdate({ ...block, text: e.target.value })}
                  placeholder="Titre de section..."
                  className="db-input text-xs w-full"
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-heading-level-${position}-${index}`}>
                  Niveau hiérarchique
                </label>
                <select
                  id={`block-heading-level-${position}-${index}`}
                  value={block.level || 'h3'}
                  onChange={(e) => onUpdate({ ...block, level: e.target.value })}
                  className="db-select text-xs w-full"
                >
                  <option value="h2">H2 (Grand titre)</option>
                  <option value="h3">H3 (Titre moyen)</option>
                  <option value="h4">H4 (Sous-titre)</option>
                  <option value="h5">H5 (Petit titre majuscule)</option>
                </select>
              </div>
            </div>
          )}

          {/* CONFIGURATION SPÉCIFIQUE : BOUTON */}
          {blockType === 'button' && (
            <div className="space-y-3 pt-1">
              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-btn-text-${position}-${index}`}>
                  Libellé du bouton
                </label>
                <input
                  id={`block-btn-text-${position}-${index}`}
                  type="text"
                  value={block.buttonText || ''}
                  onChange={(e) => onUpdate({ ...block, buttonText: e.target.value })}
                  placeholder="ex: Découvrir le livre..."
                  className="db-input text-xs w-full"
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-btn-url-${position}-${index}`}>
                  Lien (URL)
                </label>
                <input
                  id={`block-btn-url-${position}-${index}`}
                  type="text"
                  value={block.buttonUrl || ''}
                  onChange={(e) => onUpdate({ ...block, buttonUrl: e.target.value })}
                  placeholder="https://... ou /contact"
                  className="db-input text-xs w-full font-mono"
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-btn-style-${position}-${index}`}>
                  Style d'apparence
                </label>
                <select
                  id={`block-btn-style-${position}-${index}`}
                  value={block.buttonStyle || 'primary'}
                  onChange={(e) => onUpdate({ ...block, buttonStyle: e.target.value })}
                  className="db-select text-xs w-full"
                >
                  <option value="primary">Primaire (Bleu Anjou)</option>
                  <option value="secondary">Secondaire (Contour bleu)</option>
                  <option value="accent">Accent (Or angevin)</option>
                </select>
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

          {/* CONFIGURATION SPÉCIFIQUE : DOCUMENT PDF */}
          {blockType === 'pdf' && (
            <div className="space-y-3 pt-1">
              <label className="flipbook-editor-label text-xs font-semibold block">Document PDF</label>

              <div className="ae-media-actions-row">
                <button
                  type="button"
                  onClick={() => pdfFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="ae-media-action-btn ae-media-btn-upload"
                  aria-label="Téléverser un document PDF"
                >
                  <Upload size={14} aria-hidden="true" />
                  <span>{isUploading ? "Téléversement..." : "Téléverser document PDF"}</span>
                </button>

                <input
                  ref={pdfFileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-pdf-title-${position}-${index}`}>
                  Titre du document
                </label>
                <input
                  id={`block-pdf-title-${position}-${index}`}
                  type="text"
                  value={block.pdfTitle || ''}
                  onChange={(e) => onUpdate({ ...block, pdfTitle: e.target.value })}
                  placeholder="ex: Extrait du livre..."
                  className="db-input text-xs w-full"
                />
              </div>

              <div className="flipbook-editor-field-row">
                <label className="flipbook-editor-label text-xs font-semibold block mb-1" htmlFor={`block-pdf-url-${position}-${index}`}>
                  URL du PDF
                </label>
                <input
                  id={`block-pdf-url-${position}-${index}`}
                  type="text"
                  value={block.pdfUrl || ''}
                  onChange={(e) => onUpdate({ ...block, pdfUrl: e.target.value })}
                  placeholder="https://...fichier.pdf"
                  className="db-input text-xs w-full font-mono"
                />
              </div>
            </div>
          )}

          {/* STYLES INDIVIDUELS DU BLOC (CONTOUR & OMBRE) */}
          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowBlockStyles(!showBlockStyles)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
            >
              <span>Styles individuels du bloc (Contours & Ombres)</span>
            </button>

            {showBlockStyles && (
              <div className="mt-2.5">
                <FlipbookBlockStyleEditor
                  block={block}
                  position={position}
                  index={index}
                  onChange={onUpdate}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
