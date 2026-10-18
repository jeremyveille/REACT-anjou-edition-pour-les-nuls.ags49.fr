import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Layers, 
  Sliders, 
  Film, 
  Upload, 
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import { pageService } from '../services/pageService';
import { getYoutubeEmbedUrl } from '../utils/youtubeUtils';
import FlipbookBlockStyleEditor from './FlipbookBlockStyleEditor';

/**
 * Modale d'édition spacieuse et ergonomique pour un bloc individuel de barre latérale Flipbook.
 * Offre un confort maximal d'édition sans étirer la page ni compresser les champs.
 * Comprend :
 * - Volet 1 : Contenu & Paramètres (titre, fichiers, URLs, textes alternatifs, boutons)
 * - Volet 2 : Styles individuels (contours, bordures, ombres, couleurs avec aperçu temps réel)
 */
export default function FlipbookBlockModalEditor({
  isOpen,
  block,
  position = 'left',
  index = 0,
  onSave,
  onClose,
  onOpenMediaLibrary
}) {
  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'styles'
  const [formData, setFormData] = useState(() => ({ ...block }));
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);
  const videoFileInputRef = useRef(null);
  const pdfFileInputRef = useRef(null);
  const modalRef = useRef(null);

  // Synchronisation lors de l'ouverture ou du changement de bloc
  useEffect(() => {
    if (block) {
      setFormData({ ...block });
      setActiveTab('content');
      setErrorMsg('');
    }
  }, [block, isOpen]);

  // Fermeture via la touche Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        // Ne pas fermer si une modale enfant (ex: Médiathèque) est ouverte au-dessus
        if (typeof document !== 'undefined' && document.querySelector('.ae-media-modal-backdrop')) {
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !block) return null;

  const blockType = formData.type || 'text';

  const handleChangeField = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Téléversement d'image avec fallback local Base64
  const handleImageUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      try {
        const url = await pageService.uploadMedia(file);
        if (url) {
          setFormData(prev => ({
            ...prev,
            imageUrl: url,
            imageAlt: prev.imageAlt || file.name.replace(/\.[^/.]+$/, "")
          }));
          setIsUploading(false);
          return;
        }
      } catch (uploadErr) {
        console.warn("Échec du téléversement Firebase Storage, utilisation du Data URL local:", uploadErr);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          imageUrl: e.target.result,
          imageAlt: prev.imageAlt || file.name.replace(/\.[^/.]+$/, "")
        }));
        setIsUploading(false);
      };
      reader.onerror = () => {
        setErrorMsg("Erreur lors de la lecture du fichier image local.");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erreur téléversement image:", err);
      setErrorMsg("Impossible de charger l'image.");
      setIsUploading(false);
    }
  };

  // Téléversement de fichier vidéo avec fallback local Base64
  const handleVideoUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      try {
        const url = await pageService.uploadMedia(file);
        if (url) {
          setFormData(prev => ({
            ...prev,
            videoUrl: url,
            videoSourceType: 'local'
          }));
          setIsUploading(false);
          return;
        }
      } catch (uploadErr) {
        console.warn("Échec du téléversement vidéo Firebase Storage, utilisation du Data URL local:", uploadErr);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          videoUrl: e.target.result,
          videoSourceType: 'local'
        }));
        setIsUploading(false);
      };
      reader.onerror = () => {
        setErrorMsg("Erreur lors de la lecture du fichier vidéo local.");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erreur téléversement vidéo:", err);
      setErrorMsg("Impossible de charger le fichier vidéo.");
      setIsUploading(false);
    }
  };

  // Téléversement de document PDF
  const handlePdfUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      try {
        const url = await pageService.uploadMedia(file);
        if (url) {
          setFormData(prev => ({
            ...prev,
            pdfUrl: url,
            pdfTitle: prev.pdfTitle || file.name.replace(/\.[^/.]+$/, "")
          }));
          setIsUploading(false);
          return;
        }
      } catch (uploadErr) {
        console.warn("Échec du téléversement PDF:", uploadErr);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          pdfUrl: e.target.result,
          pdfTitle: prev.pdfTitle || file.name.replace(/\.[^/.]+$/, "")
        }));
        setIsUploading(false);
      };
      reader.onerror = () => {
        setErrorMsg("Erreur lors de la lecture du document PDF local.");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erreur téléversement PDF:", err);
      setErrorMsg("Impossible de charger le document PDF.");
      setIsUploading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (blockType === 'image' && !formData.imageAlt && (formData.imageUrl || formData.url)) {
      setErrorMsg("Le texte alternatif (Alt) de l'image est obligatoire pour respecter l'accessibilité WCAG.");
      return;
    }
    onSave(formData);
    onClose();
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

  return (
    <div 
      className="ae-modal-overlay ae-block-modal-backdrop" 
      onClick={onClose} 
      role="presentation"
      data-testid="block-modal-editor-overlay"
    >
      <div 
        ref={modalRef}
        className="ae-modal-container ae-block-modal-dialog max-w-3xl w-full p-0 overflow-hidden" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="block-modal-title"
        data-testid="block-modal-editor-dialog"
      >
        {/* EN-TÊTE DE LA MODALE */}
        <div className="ae-modal-header bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="ae-admin-pill-global text-xs">
              Barre {position === 'left' ? 'gauche' : 'droite'} • Bloc #{index + 1}
            </span>
            <h3 id="block-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 mb-0">
              Paramètres du bloc : {formData.title || formData.text || getBlockTypeLabel(blockType)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Fermer la fenêtre d'édition"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* ONGLETS INTERNES DE LA MODALE */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" aria-label="Paramètres du bloc">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'content'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Layers size={15} aria-hidden="true" />
            <span>1. Contenu & Paramètres</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('styles')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'styles'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Sliders size={15} aria-hidden="true" />
            <span>2. Styles individuels (Contours & Ombres)</span>
          </button>
        </div>

        {/* CORPS DU FORMULAIRE AVEC DÉFILEMENT INTERNE CONFINÉ (R1) */}
        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="ae-block-modal-body space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-600" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* VOLET 1 : CONTENU & PARAMÈTRES */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                {/* 1. SÉLECTION DU TYPE DE BLOC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modal-block-type-select" className="ae-modal-label text-xs font-bold block mb-1">
                      Type de contenu
                    </label>
                    <select
                      id="modal-block-type-select"
                      value={blockType}
                      onChange={(e) => handleChangeField('type', e.target.value)}
                      className="ae-flipbook-select w-full"
                    >
                      <option value="image">Image (Médiathèque ou Téléversement)</option>
                      <option value="video">Vidéo (Locale, YouTube ou URL)</option>
                      <option value="text">Texte / Contenu HTML sécurisé</option>
                      <option value="heading">Titre / En-tête</option>
                      <option value="button">Bouton / Lien d'action</option>
                      <option value="pdf">Document PDF téléchargeable</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="modal-block-title-input" className="ae-modal-label text-xs font-bold block mb-1">
                      Titre du bloc (optionnel)
                    </label>
                    <input
                      id="modal-block-title-input"
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => handleChangeField('title', e.target.value)}
                      placeholder="ex: Carnet de poésies"
                      className="ae-flipbook-input text-xs w-full"
                    />
                  </div>
                </div>

                {/* 2. CONFIGURATION SPÉCIFIQUE PAR TYPE */}
                
                {/* TYPE : IMAGE */}
                {blockType === 'image' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Aperçu et source de l'image
                    </span>

                    {/* Aperçu d'image dédié sans déformation (R1) */}
                    {(formData.imageUrl || formData.url) ? (
                      <div className="ae-modal-image-preview-container">
                        <img
                          src={formData.imageUrl || formData.url}
                          alt={formData.imageAlt || "Aperçu de l'image du bloc"}
                          className="ae-modal-image-preview-img"
                        />
                      </div>
                    ) : (
                      <div className="ae-modal-image-preview-container text-slate-400 text-xs italic">
                        Aucune image sélectionnée pour ce bloc
                      </div>
                    )}

                    {/* Actions de sélection de média */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenMediaLibrary) {
                            onOpenMediaLibrary((selectedMedia) => {
                              if (selectedMedia) {
                                setFormData(prev => ({
                                  ...prev,
                                  imageUrl: selectedMedia.url || selectedMedia.downloadUrl || '',
                                  imageAlt: prev.imageAlt || selectedMedia.name || selectedMedia.title || ''
                                }));
                              }
                            }, 'image');
                          }
                        }}
                        className="ae-flipbook-btn-secondary text-xs"
                      >
                        <FolderOpen size={14} aria-hidden="true" />
                        <span>Choisir dans la médiathèque ▼</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="ae-flipbook-btn-secondary text-xs"
                      >
                        <Upload size={14} aria-hidden="true" />
                        <span>{isUploading ? "Téléversement..." : "Téléverser une image"}</span>
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

                      {(formData.imageUrl || formData.url) && (
                        <span className="ae-modal-source-badge">
                          ✓ Image prête pour l'affichage
                        </span>
                      )}
                    </div>

                    <div>
                      <label htmlFor="modal-img-url-input" className="ae-modal-label text-xs">
                        URL directe ou référence du média
                      </label>
                      <input
                        id="modal-img-url-input"
                        type="text"
                        value={
                          (formData.imageUrl || formData.url || '').startsWith('data:image/')
                            ? '[Image locale téléversée (données Base64 prêtes)]'
                            : (formData.imageUrl || formData.url || '')
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val.startsWith('[')) {
                            handleChangeField('imageUrl', val);
                          }
                        }}
                        placeholder="https://... ou chemin local /images/..."
                        className="ae-flipbook-input ae-fluid-input text-xs w-full font-mono"
                      />
                    </div>

                    <div>
                      <label htmlFor="modal-img-alt-input" className="ae-modal-label text-xs">
                        Texte alternatif (Alt - Obligatoire WCAG) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="modal-img-alt-input"
                        type="text"
                        value={formData.imageAlt || ''}
                        onChange={(e) => handleChangeField('imageAlt', e.target.value)}
                        placeholder="Description textuelle détaillée pour les lecteurs d'écran"
                        className="ae-flipbook-input text-xs w-full"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="modal-img-caption-input" className="ae-modal-label text-xs">
                          Légende sous l'image
                        </label>
                        <input
                          id="modal-img-caption-input"
                          type="text"
                          value={formData.caption || ''}
                          onChange={(e) => handleChangeField('caption', e.target.value)}
                          placeholder="Légende en italique"
                          className="ae-flipbook-input text-xs w-full"
                        />
                      </div>

                      <div>
                        <label htmlFor="modal-img-link-input" className="ae-modal-label text-xs">
                          Lien au clic sur l'image (optionnel)
                        </label>
                        <input
                          id="modal-img-link-input"
                          type="text"
                          value={formData.linkUrl || ''}
                          onChange={(e) => handleChangeField('linkUrl', e.target.value)}
                          placeholder="https://... ou /catalogue"
                          className="ae-flipbook-input text-xs w-full"
                        />
                      </div>
                    </div>

                    <label className="ae-checkbox-row cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={formData.openNewTab || false}
                        onChange={(e) => handleChangeField('openNewTab', e.target.checked)}
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        Ouvrir le lien dans un nouvel onglet
                      </span>
                    </label>
                  </div>
                )}

                {/* TYPE : VIDÉO */}
                {blockType === 'video' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Source vidéo
                    </span>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenMediaLibrary) {
                            onOpenMediaLibrary((selectedMedia) => {
                              if (selectedMedia) {
                                setFormData(prev => ({
                                  ...prev,
                                  videoUrl: selectedMedia.url || selectedMedia.downloadUrl || '',
                                  videoSourceType: 'local'
                                }));
                              }
                            }, 'video');
                          }
                        }}
                        className="ae-flipbook-btn-secondary text-xs"
                      >
                        <Film size={14} aria-hidden="true" />
                        <span>Médiathèque vidéo ▼</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => videoFileInputRef.current?.click()}
                        disabled={isUploading}
                        className="ae-flipbook-btn-secondary text-xs"
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

                    <div>
                      <label htmlFor="modal-video-url-input" className="ae-modal-label text-xs">
                        URL YouTube ou fichier vidéo direct
                      </label>
                      <input
                        id="modal-video-url-input"
                        type="text"
                        value={formData.videoUrl || ''}
                        onChange={(e) => handleChangeField('videoUrl', e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=... ou .mp4"
                        className="ae-flipbook-input text-xs w-full font-mono"
                      />
                    </div>

                    {formData.videoUrl && (
                      <div className="aspect-video w-full max-w-sm rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                        {formData.videoUrl.includes('youtube.com') || formData.videoUrl.includes('youtu.be') ? (
                          <iframe
                            src={getYoutubeEmbedUrl(formData.videoUrl)}
                            title="Aperçu YouTube"
                            className="w-full h-full border-0"
                            allowFullScreen
                          />
                        ) : (
                          <video src={formData.videoUrl} controls className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TYPE : TEXTE / HTML */}
                {blockType === 'text' && (
                  <div className="space-y-3">
                    <label htmlFor="modal-text-content-input" className="ae-modal-label text-xs font-bold block">
                      Contenu texte ou HTML sécurisé
                    </label>
                    <textarea
                      id="modal-text-content-input"
                      rows="6"
                      value={formData.content || ''}
                      onChange={(e) => handleChangeField('content', e.target.value)}
                      placeholder="Rédigez votre texte ou collez du code HTML épuré (paragraphes, liens, listes)..."
                      className="ae-flipbook-textarea text-xs w-full font-sans"
                    />
                    <p className="text-[11px] text-slate-400 mb-0">
                      Les balises sécurisées (`&lt;p&gt;`, `&lt;strong&gt;`, `&lt;em&gt;`, `&lt;a&gt;`) sont automatiquement assainies contre les attaques XSS.
                    </p>
                  </div>
                )}

                {/* TYPE : TITRE / HEADING */}
                {blockType === 'heading' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label htmlFor="modal-heading-text-input" className="ae-modal-label text-xs font-bold block mb-1">
                          Intitulé du titre
                        </label>
                        <input
                          id="modal-heading-text-input"
                          type="text"
                          value={formData.text || ''}
                          onChange={(e) => handleChangeField('text', e.target.value)}
                          placeholder="ex: Présentation de l'ouvrage"
                          className="ae-flipbook-input text-xs w-full"
                        />
                      </div>

                      <div>
                        <label htmlFor="modal-heading-level-select" className="ae-modal-label text-xs font-bold block mb-1">
                          Niveau hiérarchique
                        </label>
                        <select
                          id="modal-heading-level-select"
                          value={formData.level || 'h3'}
                          onChange={(e) => handleChangeField('level', e.target.value)}
                          className="ae-flipbook-select w-full"
                        >
                          <option value="h2">H2 — Grand titre</option>
                          <option value="h3">H3 — Sous-titre standard</option>
                          <option value="h4">H4 — Titre de paragraphe</option>
                          <option value="h5">H5 — Petit intitulé</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TYPE : BOUTON / LIEN D'ACTION */}
                {blockType === 'button' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="modal-btn-text-input" className="ae-modal-label text-xs font-bold block mb-1">
                          Texte du bouton
                        </label>
                        <input
                          id="modal-btn-text-input"
                          type="text"
                          value={formData.buttonText || ''}
                          onChange={(e) => handleChangeField('buttonText', e.target.value)}
                          placeholder="ex: Découvrir le livre"
                          className="ae-flipbook-input text-xs w-full"
                        />
                      </div>

                      <div>
                        <label htmlFor="modal-btn-url-input" className="ae-modal-label text-xs font-bold block mb-1">
                          Lien de destination (URL)
                        </label>
                        <input
                          id="modal-btn-url-input"
                          type="text"
                          value={formData.buttonUrl || ''}
                          onChange={(e) => handleChangeField('buttonUrl', e.target.value)}
                          placeholder="https://... ou /contact"
                          className="ae-flipbook-input text-xs w-full font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="modal-btn-style-select" className="ae-modal-label text-xs font-bold block mb-1">
                          Style d'apparence
                        </label>
                        <select
                          id="modal-btn-style-select"
                          value={formData.buttonStyle || 'primary'}
                          onChange={(e) => handleChangeField('buttonStyle', e.target.value)}
                          className="ae-flipbook-select w-full"
                        >
                          <option value="primary">Primaire (Bleu Anjou plein)</option>
                          <option value="secondary">Secondaire (Contour bleu épuré)</option>
                          <option value="accent">Accent (Or chaleureux)</option>
                        </select>
                      </div>

                      <div className="flex items-end pb-2">
                        <label className="ae-checkbox-row cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.openNewTab || false}
                            onChange={(e) => handleChangeField('openNewTab', e.target.checked)}
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            Ouvrir dans un nouvel onglet
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* TYPE : DOCUMENT PDF */}
                {blockType === 'pdf' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Fichier PDF associé
                    </span>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => pdfFileInputRef.current?.click()}
                        disabled={isUploading}
                        className="ae-flipbook-btn-secondary text-xs"
                      >
                        <Upload size={14} aria-hidden="true" />
                        <span>{isUploading ? "Téléversement..." : "Téléverser le PDF"}</span>
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

                    <div>
                      <label htmlFor="modal-pdf-title-input" className="ae-modal-label text-xs">
                        Intitulé du document
                      </label>
                      <input
                        id="modal-pdf-title-input"
                        type="text"
                        value={formData.pdfTitle || ''}
                        onChange={(e) => handleChangeField('pdfTitle', e.target.value)}
                        placeholder="ex: Extrait du manuscrit en PDF"
                        className="ae-flipbook-input text-xs w-full"
                      />
                    </div>

                    <div>
                      <label htmlFor="modal-pdf-url-input" className="ae-modal-label text-xs">
                        URL ou chemin du document PDF
                      </label>
                      <input
                        id="modal-pdf-url-input"
                        type="text"
                        value={formData.pdfUrl || ''}
                        onChange={(e) => handleChangeField('pdfUrl', e.target.value)}
                        placeholder="https://...fichier.pdf"
                        className="ae-flipbook-input text-xs w-full font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VOLET 2 : STYLES INDIVIDUELS (CONTOURS & OMBRES) */}
            {activeTab === 'styles' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                  Personnalisez l'épaisseur du contour, l'arrondi, les ombres portées et les couleurs spécifiques à ce bloc.
                </div>

                <FlipbookBlockStyleEditor
                  block={formData}
                  position={position}
                  index={index}
                  onChange={(updatedBlock) => setFormData(updatedBlock)}
                />
              </div>
            )}
          </div>

          {/* PIED DE MODALE : ACTIONS */}
          <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="ae-flipbook-btn-secondary"
            >
              <span>Annuler</span>
            </button>

            <button
              type="submit"
              className="ae-flipbook-btn-primary"
            >
              <Save size={16} aria-hidden="true" />
              <span>Enregistrer le bloc</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
