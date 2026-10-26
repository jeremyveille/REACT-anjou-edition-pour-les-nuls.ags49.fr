import React, { useState, useEffect } from 'react';
import { pageService, getLocalFlipbooksSync } from '../../services/pageService';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Settings,
  ExternalLink,
  Image as ImageIcon,
  Film,
  ChevronDown,
  ChevronUp,
  Palette,
  Maximize2,
  Square,
  Sparkles,
  Smartphone,
  Tablet,
  Monitor,


  RotateCcw,
  Check
} from 'lucide-react';
import { extractYoutubeVideoId } from '../../utils/youtubeUtils';
import { BLOCK_DEFINITIONS, ANJOU_EDITION_PALETTE } from './blockRegistry';
import { MediaLibraryModal } from '../MediaLibraryModal';
import { BRAND_NAME } from '../../constants/brand';

const COMMON_ICONS = [
  'ArrowRight', 'BookOpen', 'ExternalLink', 'Calendar', 'Heart', 
  'FileText', 'Phone', 'MapPin', 'Video', 'Info', 'User', 'HelpCircle', 'Settings',
  'PlayCircle', 'Play', 'Feather', 'Check', 'Search'
];

/**
 * Presets d'ombres portées certifiés Anjou Édition (R3)
 */
export const SHADOW_PRESETS = {
  none: 'none',
  light: '0 1px 3px rgba(0, 0, 0, 0.08)',
  medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  anjou: '0 10px 25px -5px rgba(30, 58, 138, 0.25)'
};

/**
 * Helper de résolution de la valeur active du sélecteur d'ombre portée
 */
export const resolveShadowValue = (currentCss) => {
  if (!currentCss || currentCss === 'none') return 'none';
  if (currentCss === SHADOW_PRESETS.light) return 'light';
  if (currentCss === SHADOW_PRESETS.medium || currentCss === 'medium') return 'medium';
  if (currentCss === SHADOW_PRESETS.large) return 'large';
  if (currentCss === SHADOW_PRESETS.anjou) return 'anjou';
  return 'custom';
};

/**
 * Composant d'Accordéon Réutilisable pour l'Inspecteur (R3)
 */
export const SettingsAccordionItem = ({ 
  id, 
  title, 
  icon: Icon, 
  isOpen, 
  onToggle, 
  badge = null, 
  children 
}) => {
  return (
    <div className={`ae-editor-accordion mb-2.5 ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        id={`acc-btn-${id}`}
        aria-expanded={isOpen}
        aria-controls={`acc-content-${id}`}
        onClick={onToggle}
        className="ae-accordion-header w-100 d-flex align-items-center justify-content-between p-2.5 border-0 cursor-pointer text-start"
      >
        <span className="d-flex align-items-center gap-2">
          {Icon && <Icon size={14} className="text-primary" />}
          <span>{title}</span>
        </span>
        <span className="d-flex align-items-center gap-2">
          {badge}
          {isOpen ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
        </span>
      </button>

      {isOpen && (
        <div id={`acc-content-${id}`} className="ae-accordion-content p-3 border-top">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Panneau de réglages pour le composant Vidéo (YouTube ou fichier direct).
 * Récupère automatiquement l'URL existante, supporte tous les formats YouTube
 * ainsi que les fichiers vidéo directs (.mp4, .webm) sans faux positifs.
 */
const VideoBlockSettings = ({ block, onChange, onOpenMediaPicker }) => {
  const { id, settings = {} } = block;

  // Récupérer l'URL actuelle sans écraser avec une valeur par défaut
  const currentUrl = settings.url || (settings.videoId ? `https://www.youtube.com/watch?v=${settings.videoId}` : (settings.src || ''));
  const [inputValue, setInputValue] = useState(currentUrl);

  // Synchronisation lors de la sélection d'un autre bloc ou modification externe
  useEffect(() => {
    const val = settings.url || (settings.videoId ? `https://www.youtube.com/watch?v=${settings.videoId}` : (settings.src || ''));
    setInputValue(val);
  }, [id, settings.url, settings.videoId, settings.src]);

  const isDirectVideoFile = Boolean(
    inputValue && (/(\.mp4|\.webm|\.ogg)(\?.*)?$/i.test(inputValue) || inputValue.startsWith('data:video/'))
  );
  const extractedId = extractYoutubeVideoId(inputValue);
  const isInputEmpty = !inputValue || inputValue.trim() === '';
  const isInvalid = !isInputEmpty && !extractedId && !isDirectVideoFile;

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    const isDirect = Boolean(
      val && (/(\.mp4|\.webm|\.ogg)(\?.*)?$/i.test(val) || val.startsWith('data:video/'))
    );
    const newVideoId = extractYoutubeVideoId(val);

    if (newVideoId) {
      onChange(id, {
        ...settings,
        url: val,
        videoId: newVideoId,
        embedUrl: `https://www.youtube.com/embed/${newVideoId}`,
        lastValidVideoId: newVideoId
      });
    } else if (isDirect) {
      onChange(id, {
        ...settings,
        url: val,
        videoId: '',
        embedUrl: ''
      });
    } else {
      // URL en cours de frappe : on conserve la saisie dans url et on maintient le dernier videoId valide pour ne pas casser le lecteur
      onChange(id, {
        ...settings,
        url: val,
        videoId: settings.videoId || settings.lastValidVideoId || 'dQw4w9WgXcQ'
      });
    }
  };

  const activeVideoId = extractedId || settings.videoId || settings.lastValidVideoId;
  const watchUrl = !isDirectVideoFile && activeVideoId ? `https://www.youtube.com/watch?v=${activeVideoId}` : null;
  const thumbnailUrl = !isDirectVideoFile && activeVideoId ? `https://img.youtube.com/vi/${activeVideoId}/hqdefault.jpg` : null;

  return (
    <div className="space-y-3">
      {isDirectVideoFile && (
        <div className="pb-media-preview-box mb-2 p-2 border rounded-lg bg-slate-900 text-center position-relative shadow-sm">
          <video 
            src={inputValue} 
            controls 
            className="w-100 rounded border border-slate-700" 
            style={{ maxHeight: '140px' }} 
          />
          <div className="d-flex align-items-center justify-content-between mt-1 text-slate-300" style={{ fontSize: '11px' }}>
            <span className="font-mono text-truncate">Vidéo locale</span>
            <span className="badge bg-success text-white font-normal" style={{ fontSize: '10px' }}>Fichier Direct</span>
          </div>
        </div>
      )}

      {!isDirectVideoFile && thumbnailUrl && (
        <div className="pb-media-preview-box mb-2 p-2 border rounded-lg bg-slate-900 text-center position-relative shadow-sm">
          <img 
            src={thumbnailUrl} 
            alt="Aperçu vidéo YouTube" 
            className="w-100 rounded border border-slate-700" 
            style={{ maxHeight: '140px', objectFit: 'cover' }} 
          />
          <div className="d-flex align-items-center justify-content-between mt-1 text-slate-300" style={{ fontSize: '11px' }}>
            <span className="font-mono text-truncate">ID: {activeVideoId}</span>
            <span className="badge bg-primary text-white font-normal" style={{ fontSize: '10px' }}>YouTube</span>
          </div>
        </div>
      )}

      <div>
        <label className="db-label font-bold text-xs" htmlFor="pb-video-url-input">
          Lien YouTube ou fichier vidéo direct
        </label>
        <input
          id="pb-video-url-input"
          type="text"
          value={inputValue}
          onChange={handleUrlChange}
          placeholder="https://www.youtube.com/watch?v=... ou https://.../video.mp4"
          className={`db-input text-xs w-100 ${isInvalid ? 'border-danger' : ''}`}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid ? 'pb-video-error' : undefined}
        />
        {isInvalid && (
          <p id="pb-video-error" className="text-danger mt-1 mb-0 font-medium" style={{ fontSize: '11px', color: '#dc3545' }}>
            Lien YouTube non valide (saisissez une URL YouTube ou un fichier vidéo direct .mp4, .webm)
          </p>
        )}
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-1">
        {onOpenMediaPicker && (
          <button
            type="button"
            onClick={onOpenMediaPicker}
            className="btn btn-outline-primary btn-xs py-1 px-2.5 d-inline-flex align-items-center gap-1.5 rounded"
            style={{ fontSize: '11px' }}
            aria-label="Choisir une vidéo dans la médiathèque"
          >
            <Film size={12} /> Choisir depuis la médiathèque
          </button>
        )}

        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary d-inline-flex align-items-center gap-1 text-decoration-none ms-auto"
            style={{ fontSize: '11px' }}
          >
            <ExternalLink size={12} />
            <span>Ouvrir sur YouTube</span>
          </a>
        )}
      </div>
    </div>
  );
};

export const BuilderSettings = ({ block, onChange }) => {
  const [mediaModal, setMediaModal] = useState({
    isOpen: false,
    filterType: null,
    title: '',
    onSelect: null
  });

  const [openSections, setOpenSections] = useState({
    palette: true,
    spacing: true,
    borders: true,
    shadows: true,
    visibility: true,
    advanced: false
  });
  const [colorTarget, setColorTarget] = useState('backgroundColor'); // 'backgroundColor' | 'color'

  const toggleSection = (sectionKey) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const setAllSections = (isOpen) => {
    setOpenSections({
      palette: isOpen,
      spacing: isOpen,
      borders: isOpen,
      shadows: isOpen,
      visibility: isOpen,
      advanced: isOpen
    });
  };

  if (!block) {
    return (
      <div className="text-center text-muted py-5 px-3">
        <Settings className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold">Aucun bloc sélectionné</p>
        <p className="text-xs text-slate-400">Cliquez sur un élément de la page sur le canevas pour modifier ses propriétés et contenus.</p>
      </div>
    );
  }

  const { id, type, settings = {} } = block;
  const blockDef = BLOCK_DEFINITIONS[type] || {};

  const updateSetting = (key, value) => {
    onChange(id, {
      ...settings,
      [key]: value
    });
  };

  const updateNestedStyle = (key, value) => {
    const currentStyle = settings.style || {};
    onChange(id, {
      ...settings,
      style: {
        ...currentStyle,
        [key]: value
      }
    });
  };

  const handleGeneralPaddingChange = (e) => {
    const val = e.target.value;
    const currentStyle = settings.style || {};
    onChange(id, {
      ...settings,
      style: {
        ...currentStyle,
        padding: val,
        paddingTop: val,
        paddingBottom: val,
        paddingLeft: val,
        paddingRight: val
      }
    });
  };

  const handleShadowSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      if (!settings.style?.boxShadow) {
        updateNestedStyle('boxShadow', '0 4px 6px rgba(0, 0, 0, 0.1)');
      }
    } else {
      const cssVal = SHADOW_PRESETS[val] || val;
      updateNestedStyle('boxShadow', cssVal);
    }
  };

  const handleResetSpacing = () => {
    const currentStyle = { ...(settings.style || {}) };
    delete currentStyle.padding;
    delete currentStyle.paddingTop;
    delete currentStyle.paddingBottom;
    delete currentStyle.paddingLeft;
    delete currentStyle.paddingRight;
    delete currentStyle.marginTop;
    delete currentStyle.marginBottom;
    onChange(id, {
      ...settings,
      style: currentStyle
    });
  };

  const handleResetBorders = () => {
    const currentStyle = { ...(settings.style || {}) };
    currentStyle.borderStyle = 'none';
    currentStyle.borderWidth = '';
    currentStyle.borderColor = '';
    onChange(id, {
      ...settings,
      style: currentStyle
    });
  };

  return (
    <div className="builder-settings space-y-4 p-3">
      {/* Header Info */}
      <div className="ae-subnav-border pb-2 mb-3 border-bottom">
        <span className="ae-label-uppercase-muted" style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
          Propriétés du composant
        </span>
        <h6 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 d-flex align-items-center justify-content-between">
          <span>{blockDef.label || type}</span>
          <span className="ae-mono-subtext text-xs text-muted font-normal" style={{ fontSize: '10px' }}>({id})</span>
        </h6>
      </div>

      {/* Visibilité & Publication du bloc */}
      <div className="p-2.5 mb-2 bg-slate-50 dark:bg-slate-800 rounded border d-flex align-items-center justify-content-between">
        <div className="d-flex flex-column">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Visibilité sur le site public</span>
          <span className="text-[11px] text-muted">{settings.hidden ? 'Masqué aux visiteurs' : 'Visible publiquement'}</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <input
            type="checkbox"
            id={`chk-vis-${id}`}
            checked={!settings.hidden}
            onChange={(e) => updateSetting('hidden', !e.target.checked)}
            className="cursor-pointer"
            style={{ width: '16px', height: '16px' }}
          />
          <label htmlFor={`chk-vis-${id}`} className="text-xs font-semibold cursor-pointer mb-0">
            {settings.hidden ? 'Masqué' : 'Actif'}
          </label>
        </div>
      </div>

      {/* Barre d'action rapide pour déplier/replier les accordéons */}
      <div className="d-flex justify-content-between align-items-center mb-2 px-1">
        <span className="text-muted" style={{ fontSize: '11px', fontWeight: 600 }}>Styles & Visibilité étendue</span>
        <div className="d-flex gap-1.5">
          <button
            type="button"
            onClick={() => setAllSections(true)}
            className="btn btn-link btn-xs p-0 text-decoration-none text-muted"
            style={{ fontSize: '11px' }}
          >
            Tout déplier
          </button>
          <span className="text-muted" style={{ fontSize: '11px' }}>•</span>
          <button
            type="button"
            onClick={() => setAllSections(false)}
            className="btn btn-link btn-xs p-0 text-decoration-none text-muted"
            style={{ fontSize: '11px' }}
          >
            Tout replier
          </button>
        </div>
      </div>

      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
        
        {/* =========================================================================
            1. RÉGLAGES SPÉCIFIQUES : VIDÉOS POPULAIRES
           ========================================================================= */}
        {type === 'popularVideos' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Titre de la section</label>
              <input
                type="text"
                value={settings.title || ''}
                onChange={(e) => updateSetting('title', e.target.value)}
                className="db-input text-xs w-100"
                placeholder="Vidéos Populaires"
              />
            </div>

            <div>
              <label className="db-label font-bold text-xs">Disposition (Layout)</label>
              <select
                value={settings.layout || 'list'}
                onChange={(e) => updateSetting('layout', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="list">Liste verticale (idéal pour barre latérale)</option>
                <option value="grid">Grille de cartes (idéal pour pleine largeur)</option>
              </select>
            </div>

            <div className="border-top pt-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="db-label font-bold text-xs mb-0">Liste des vidéos ({settings.videos?.length || 0})</label>
                <button
                  type="button"
                  onClick={() => {
                    const currentVideos = Array.isArray(settings.videos) ? [...settings.videos] : [];
                    currentVideos.push({
                      id: `vid_${Date.now()}`,
                      title: 'Nouvelle Vidéo',
                      duration: '10:00',
                      youtubeId: 'dQw4w9WgXcQ',
                      description: 'Description de la vidéo'
                    });
                    updateSetting('videos', currentVideos);
                  }}
                  className="btn btn-outline-primary btn-xs py-1 px-2 d-inline-flex align-items-center gap-1 rounded"
                  style={{ fontSize: '11px' }}
                >
                  <Plus size={12} /> Ajouter une vidéo
                </button>
              </div>

              {(settings.videos || []).map((vid, idx) => (
                <div key={vid.id || idx} className="card p-2 mb-2 bg-slate-50 dark:bg-slate-800 border">
                  <div className="d-flex justify-content-between align-items-center mb-1.5">
                    <span className="font-bold text-xs text-primary">Vidéo #{idx + 1}</span>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const vids = [...settings.videos];
                          const temp = vids[idx];
                          vids[idx] = vids[idx - 1];
                          vids[idx - 1] = temp;
                          updateSetting('videos', vids);
                        }}
                        className="btn btn-light btn-xs p-1 text-muted"
                        title="Monter"
                        aria-label="Monter la vidéo"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === settings.videos.length - 1}
                        onClick={() => {
                          const vids = [...settings.videos];
                          const temp = vids[idx];
                          vids[idx] = vids[idx + 1];
                          vids[idx + 1] = temp;
                          updateSetting('videos', vids);
                        }}
                        className="btn btn-light btn-xs p-1 text-muted"
                        title="Descendre"
                        aria-label="Descendre la vidéo"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const vids = settings.videos.filter((_, i) => i !== idx);
                          updateSetting('videos', vids);
                        }}
                        className="btn btn-light btn-xs p-1 text-danger"
                        title="Supprimer"
                        aria-label="Supprimer la vidéo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-1.5">
                    <label className="text-[10px] text-muted d-block mb-0.5">Titre</label>
                    <input
                      type="text"
                      value={vid.title || ''}
                      onChange={(e) => {
                        const vids = [...settings.videos];
                        vids[idx] = { ...vids[idx], title: e.target.value };
                        updateSetting('videos', vids);
                      }}
                      className="db-input text-xs py-1 w-100"
                    />
                  </div>

                  <div className="row g-1 mb-1.5">
                    <div className="col-6">
                      <label className="text-[10px] text-muted d-block mb-0.5">Durée (ex: 14:20)</label>
                      <input
                        type="text"
                        value={vid.duration || ''}
                        onChange={(e) => {
                          const vids = [...settings.videos];
                          vids[idx] = { ...vids[idx], duration: e.target.value };
                          updateSetting('videos', vids);
                        }}
                        className="db-input text-xs py-1 w-100"
                      />
                    </div>
                    <div className="col-6">
                      <label className="text-[10px] text-muted d-block mb-0.5">ID YouTube</label>
                      <input
                        type="text"
                        value={vid.youtubeId || ''}
                        onChange={(e) => {
                          const vids = [...settings.videos];
                          vids[idx] = { ...vids[idx], youtubeId: e.target.value };
                          updateSetting('videos', vids);
                        }}
                        className="db-input text-xs py-1 w-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted d-block mb-0.5">Description courte</label>
                    <input
                      type="text"
                      value={vid.description || ''}
                      onChange={(e) => {
                        const vids = [...settings.videos];
                        vids[idx] = { ...vids[idx], description: e.target.value };
                        updateSetting('videos', vids);
                      }}
                      className="db-input text-xs py-1 w-100"
                    />
                  </div>
                </div>
              ))}

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const currentVideos = Array.isArray(settings.videos) ? [...settings.videos] : [];
                    currentVideos.push({
                      id: `vid_${Date.now()}`,
                      title: 'Nouvelle Vidéo',
                      duration: '10:00',
                      youtubeId: 'dQw4w9WgXcQ',
                      description: 'Description de la vidéo'
                    });
                    updateSetting('videos', currentVideos);
                  }}
                  className="btn btn-outline-primary btn-xs py-1 px-3 d-inline-flex align-items-center gap-1.5 rounded w-100 justify-content-center"
                  style={{ fontSize: '11px' }}
                >
                  <Plus size={12} /> Ajouter une vidéo à la suite
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            2. RÉGLAGES SPÉCIFIQUES : ACTUALITÉS (NEWSLIST)
           ========================================================================= */}
        {type === 'newsList' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Titre du bloc</label>
              <input
                type="text"
                value={settings.title || ''}
                onChange={(e) => updateSetting('title', e.target.value)}
                className="db-input text-xs w-100"
                placeholder="Actualités 2026"
              />
            </div>

            <div className="border-top pt-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="db-label font-bold text-xs mb-0">Articles / Brèves ({settings.news?.length || 0})</label>
                <button
                  type="button"
                  onClick={() => {
                    const currentNews = Array.isArray(settings.news) ? [...settings.news] : [];
                    currentNews.push({
                      id: `news_${Date.now()}`,
                      title: 'Nouvelle actualité',
                      description: 'Description de la brève...'
                    });
                    updateSetting('news', currentNews);
                  }}
                  className="btn btn-outline-primary btn-xs py-1 px-2 d-inline-flex align-items-center gap-1 rounded"
                  style={{ fontSize: '11px' }}
                >
                  <Plus size={12} /> Ajouter une actualité
                </button>
              </div>

              {(settings.news || []).map((item, idx) => (
                <div key={item.id || idx} className="card p-2 mb-2 bg-slate-50 dark:bg-slate-800 border">
                  <div className="d-flex justify-content-between align-items-center mb-1.5">
                    <span className="font-bold text-xs text-primary">Info #{idx + 1}</span>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const nw = [...settings.news];
                          const temp = nw[idx];
                          nw[idx] = nw[idx - 1];
                          nw[idx - 1] = temp;
                          updateSetting('news', nw);
                        }}
                        className="btn btn-light btn-xs p-1 text-muted"
                        title="Monter"
                        aria-label="Monter l'actualité"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === settings.news.length - 1}
                        onClick={() => {
                          const nw = [...settings.news];
                          const temp = nw[idx];
                          nw[idx] = nw[idx + 1];
                          nw[idx + 1] = temp;
                          updateSetting('news', nw);
                        }}
                        className="btn btn-light btn-xs p-1 text-muted"
                        title="Descendre"
                        aria-label="Descendre l'actualité"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nw = settings.news.filter((_, i) => i !== idx);
                          updateSetting('news', nw);
                        }}
                        className="btn btn-light btn-xs p-1 text-danger"
                        title="Supprimer"
                        aria-label="Supprimer l'actualité"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-1.5">
                    <label className="text-[10px] text-muted d-block mb-0.5">Titre de l'info</label>
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(e) => {
                        const nw = [...settings.news];
                        nw[idx] = { ...nw[idx], title: e.target.value };
                        updateSetting('news', nw);
                      }}
                      className="db-input text-xs py-1 w-100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted d-block mb-0.5">Contenu / Description</label>
                    <textarea
                      rows={2}
                      value={item.description || ''}
                      onChange={(e) => {
                        const nw = [...settings.news];
                        nw[idx] = { ...nw[idx], description: e.target.value };
                        updateSetting('news', nw);
                      }}
                      className="db-input text-xs py-1 w-100"
                    />
                  </div>
                </div>
              ))}

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const currentNews = Array.isArray(settings.news) ? [...settings.news] : [];
                    currentNews.push({
                      id: `news_${Date.now()}`,
                      title: 'Nouvelle actualité',
                      description: 'Description de la brève...'
                    });
                    updateSetting('news', currentNews);
                  }}
                  className="btn btn-outline-primary btn-xs py-1 px-3 d-inline-flex align-items-center gap-1.5 rounded w-100 justify-content-center"
                  style={{ fontSize: '11px' }}
                >
                  <Plus size={12} /> Ajouter une actualité à la suite
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            3. RÉGLAGES SPÉCIFIQUES : POÉSIES & FABLES PHARES
           ========================================================================= */}
        {type === 'featuredPoems' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Titre de la section</label>
              <input
                type="text"
                value={settings.title || ''}
                onChange={(e) => updateSetting('title', e.target.value)}
                className="db-input text-xs w-100"
                placeholder="Poésies et Fables Phares"
              />
            </div>

            <div className="border-top pt-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="db-label font-bold text-xs mb-0">Liste des poésies / fables</label>
                <button
                  type="button"
                  onClick={() => {
                    const cur = Array.isArray(settings.poems) ? [...settings.poems] : [];
                    cur.push({
                      id: `poem_${Date.now()}`,
                      tag: 'POÉSIE',
                      title: 'Nouveau Poème',
                      excerpt: 'Extrait des premiers vers...',
                      readMoreText: 'Lire la poésie'
                    });
                    updateSetting('poems', cur);
                  }}
                  className="btn btn-outline-primary btn-xs py-1 px-2 d-inline-flex align-items-center gap-1 rounded"
                  style={{ fontSize: '11px' }}
                >
                  <Plus size={12} /> Ajouter un texte
                </button>
              </div>

              {(settings.poems || []).map((poem, idx) => (
                <div key={poem.id || idx} className="card p-2 mb-2 bg-slate-50 dark:bg-slate-800 border">
                  <div className="d-flex justify-content-between align-items-center mb-1.5">
                    <span className="font-bold text-xs text-primary">Texte #{idx + 1}</span>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const pms = [...settings.poems];
                          const temp = pms[idx];
                          pms[idx] = pms[idx - 1];
                          pms[idx - 1] = temp;
                          updateSetting('poems', pms);
                        }}
                        className="btn btn-light btn-xs p-1 text-muted"
                        title="Monter"
                        aria-label="Monter le poème"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === settings.poems.length - 1}
                        onClick={() => {
                          const pms = [...settings.poems];
                          const temp = pms[idx];
                          pms[idx] = pms[idx + 1];
                          pms[idx + 1] = temp;
                          updateSetting('poems', pms);
                        }}
                        className="btn btn-light btn-xs p-1 text-muted"
                        title="Descendre"
                        aria-label="Descendre le poème"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const pms = settings.poems.filter((_, i) => i !== idx);
                          updateSetting('poems', pms);
                        }}
                        className="btn btn-light btn-xs p-1 text-danger"
                        title="Supprimer"
                        aria-label="Supprimer le poème"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="row g-1 mb-1.5">
                    <div className="col-4">
                      <label className="text-[10px] text-muted d-block mb-0.5">Badge (ex: FABLE)</label>
                      <input
                        type="text"
                        value={poem.tag || ''}
                        onChange={(e) => {
                          const pms = [...settings.poems];
                          pms[idx] = { ...pms[idx], tag: e.target.value };
                          updateSetting('poems', pms);
                        }}
                        className="db-input text-xs py-1 w-100"
                      />
                    </div>
                    <div className="col-8">
                      <label className="text-[10px] text-muted d-block mb-0.5">Titre</label>
                      <input
                        type="text"
                        value={poem.title || ''}
                        onChange={(e) => {
                          const pms = [...settings.poems];
                          pms[idx] = { ...pms[idx], title: e.target.value };
                          updateSetting('poems', pms);
                        }}
                        className="db-input text-xs py-1 w-100"
                      />
                    </div>
                  </div>

                  <div className="mb-1.5">
                    <label className="text-[10px] text-muted d-block mb-0.5">Extrait de texte</label>
                    <textarea
                      rows={2}
                      value={poem.excerpt || ''}
                      onChange={(e) => {
                        const pms = [...settings.poems];
                        pms[idx] = { ...pms[idx], excerpt: e.target.value };
                        updateSetting('poems', pms);
                      }}
                      className="db-input text-xs py-1 w-100"
                    />
                  </div>
                </div>
              ))}

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const cur = Array.isArray(settings.poems) ? [...settings.poems] : [];
                    cur.push({
                      id: `poem_${Date.now()}`,
                      tag: 'POÉSIE',
                      title: 'Nouveau Poème',
                      excerpt: 'Extrait des premiers vers...',
                      readMoreText: 'Lire la poésie'
                    });
                    updateSetting('poems', cur);
                  }}
                  className="btn btn-outline-primary btn-xs py-1 px-3 d-inline-flex align-items-center gap-1.5 rounded w-100 justify-content-center"
                  style={{ fontSize: '11px' }}
                >
                  <Plus size={12} /> Ajouter un texte à la suite
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            4. RÉGLAGES SPÉCIFIQUES : FLIPBOOKS INTERACTIFS
           ========================================================================= */}
        {type === 'flipbookFeatured' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Titre de la section</label>
              <input
                type="text"
                value={settings.title || ''}
                onChange={(e) => updateSetting('title', e.target.value)}
                className="db-input text-xs w-100"
              />
            </div>

            <div>
              <label className="db-label font-bold text-xs">Mode d'affichage</label>
              <select
                value={settings.mode || 'grid'}
                onChange={(e) => updateSetting('mode', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="grid">Grille d'ouvrages (Cartes à feuilleter)</option>
                <option value="reader">Lecteur interactif complet intégré</option>
              </select>
            </div>

            {settings.mode === 'reader' && (
              <div>
                <label className="db-label font-bold text-xs">Ouvrage à charger dans le lecteur</label>
                <select
                  value={settings.selectedBookId || '4455'}
                  onChange={(e) => updateSetting('selectedBookId', e.target.value)}
                  className="db-select text-xs w-100"
                >
                  {getLocalFlipbooksSync().map(fb => (
                    <option key={fb.id} value={fb.id}>{fb.title} ({fb.id})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            5. RÉGLAGES SPÉCIFIQUES : GALERIE PHOTOS
           ========================================================================= */}
        {type === 'photoGallery' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Titre de la galerie</label>
              <input
                type="text"
                value={settings.title || ''}
                onChange={(e) => updateSetting('title', e.target.value)}
                className="db-input text-xs w-100"
                placeholder="Galerie Photos"
              />
            </div>

            <div>
              <label className="db-label font-bold text-xs">Sous-titre / Consigne</label>
              <input
                type="text"
                value={settings.subtitle || ''}
                onChange={(e) => updateSetting('subtitle', e.target.value)}
                className="db-input text-xs w-100"
                placeholder="Cliquez sur une photographie pour l'agrandir en haute définition."
              />
            </div>

            <div>
              <label className="db-label font-bold text-xs">Disposition</label>
              <select
                value={settings.layout || 'grid'}
                onChange={(e) => updateSetting('layout', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="grid">Grille complète (avec zoom HD)</option>
                <option value="sidebar">Miniatures (format barre latérale)</option>
              </select>
            </div>

            {/* Gestion de la liste des photographies */}
            <div className="border-top pt-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="db-label font-bold text-xs mb-0">
                  Photographies ({settings.images?.length || 0})
                </label>
                <button
                  type="button"
                  onClick={() => setMediaModal({
                    isOpen: true,
                    filterType: 'image',
                    title: 'Ajouter une photo à la galerie',
                    onSelect: (media) => {
                      const currentImages = Array.isArray(settings.images) ? [...settings.images] : [];
                      currentImages.push({
                        id: media.id || `img_${Date.now()}`,
                        url: media.url || media.downloadUrl || '',
                        thumbnailUrl: media.thumbnailUrl || media.url || media.downloadUrl || '',
                        title: media.name || media.title || media.alt || 'Photographie',
                        description: media.alt || ''
                      });
                      updateSetting('images', currentImages);
                    }
                  })}
                  className="btn btn-outline-primary btn-xs py-1 px-2.5 d-inline-flex align-items-center gap-1.5 rounded"
                  style={{ fontSize: '11px' }}
                  aria-label="Ajouter une photo à la galerie depuis la médiathèque"
                >
                  <Plus size={12} /> <ImageIcon size={12} /> Ajouter depuis la médiathèque
                </button>
              </div>

              {(!settings.images || settings.images.length === 0) ? (
                <div className="text-center p-3 border rounded bg-slate-50 text-muted" style={{ fontSize: '11px' }}>
                  <ImageIcon size={24} className="mx-auto mb-1 text-slate-400" />
                  <p className="mb-1">Aucune photo dans la galerie.</p>
                  <button
                    type="button"
                    onClick={() => setMediaModal({
                      isOpen: true,
                      filterType: 'image',
                      title: 'Ajouter une photo à la galerie',
                      onSelect: (media) => {
                        updateSetting('images', [{
                          id: media.id || `img_${Date.now()}`,
                          url: media.url || media.downloadUrl || '',
                          thumbnailUrl: media.thumbnailUrl || media.url || media.downloadUrl || '',
                          title: media.name || media.title || media.alt || 'Photographie',
                          description: media.alt || ''
                        }]);
                      }
                    })}
                    className="btn btn-link btn-xs text-primary p-0 text-decoration-none font-bold"
                  >
                    Choisir une première photo
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {settings.images.map((img, idx) => (
                    <div key={img.id || idx} className="card p-2 bg-slate-50 dark:bg-slate-800 border">
                      <div className="d-flex align-items-center gap-2 mb-1.5">
                        <img 
                          src={img.thumbnailUrl || img.url} 
                          alt={img.title || "Photo"} 
                          className="rounded border" 
                          style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="flex-grow-1 min-w-0">
                          <input
                            type="text"
                            value={img.title || ''}
                            onChange={(e) => {
                              const next = [...settings.images];
                              next[idx] = { ...next[idx], title: e.target.value };
                              updateSetting('images', next);
                            }}
                            placeholder="Titre de la photo"
                            className="db-input text-xs py-0.5 px-1.5 w-100"
                            title="Modifier le titre de la photo"
                          />
                        </div>
                        <div className="d-flex gap-1 flex-shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const next = [...settings.images];
                              const tmp = next[idx];
                              next[idx] = next[idx - 1];
                              next[idx - 1] = tmp;
                              updateSetting('images', next);
                            }}
                            className="btn btn-light btn-xs p-1 text-muted"
                            title="Monter"
                            aria-label={`Monter la photo ${idx + 1}`}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === settings.images.length - 1}
                            onClick={() => {
                              const next = [...settings.images];
                              const tmp = next[idx];
                              next[idx] = next[idx + 1];
                              next[idx + 1] = tmp;
                              updateSetting('images', next);
                            }}
                            className="btn btn-light btn-xs p-1 text-muted"
                            title="Descendre"
                            aria-label={`Descendre la photo ${idx + 1}`}
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaModal({
                              isOpen: true,
                              filterType: 'image',
                              title: 'Remplacer cette photo',
                              onSelect: (media) => {
                                const next = [...settings.images];
                                next[idx] = {
                                  ...next[idx],
                                  url: media.url || media.downloadUrl || '',
                                  thumbnailUrl: media.thumbnailUrl || media.url || media.downloadUrl || '',
                                  title: next[idx].title || media.name || media.title || 'Photographie'
                                };
                                updateSetting('images', next);
                              }
                            })}
                            className="btn btn-light btn-xs p-1 text-primary"
                            title="Remplacer l'image"
                            aria-label={`Remplacer la photo ${idx + 1}`}
                          >
                            <ImageIcon size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = settings.images.filter((_, i) => i !== idx);
                              updateSetting('images', next);
                            }}
                            className="btn btn-light btn-xs p-1 text-danger"
                            title="Supprimer"
                            aria-label={`Supprimer la photo ${idx + 1}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            6. RÉGLAGES SPÉCIFIQUES : CHAÎNE YOUTUBE & BANNIÈRE
           ========================================================================= */}
        {type === 'youtubeChannel' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Titre du bloc</label>
              <input
                type="text"
                value={settings.title || ''}
                onChange={(e) => updateSetting('title', e.target.value)}
                className="db-input text-xs w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Sous-titre / Extrait</label>
              <input
                type="text"
                value={settings.subtitle || ''}
                onChange={(e) => updateSetting('subtitle', e.target.value)}
                className="db-input text-xs w-100"
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            7. RÉGLAGES SPÉCIFIQUES : TITRE (HEADING)
           ========================================================================= */}
        {type === 'heading' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Niveau de titre</label>
              <select
                value={settings.level || 'h2'}
                onChange={(e) => updateSetting('level', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="h1">Titre principal (H1)</option>
                <option value="h2">Titre de section (H2)</option>
                <option value="h3">Sous-titre (H3)</option>
                <option value="h4">Titre secondaire (H4)</option>
                <option value="h5">Petit titre (H5)</option>
                <option value="h6">En-tête mineure (H6)</option>
              </select>
            </div>
            <div>
              <label className="db-label font-bold text-xs">Texte du titre</label>
              <input
                type="text"
                value={settings.content || ''}
                onChange={(e) => updateSetting('content', e.target.value)}
                className="db-input text-xs w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Alignement</label>
              <select
                value={settings.alignment || 'left'}
                onChange={(e) => updateSetting('alignment', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="left">Gauche</option>
                <option value="center">Centré</option>
                <option value="right">Droite</option>
              </select>
            </div>
          </div>
        )}

        {/* =========================================================================
            8. RÉGLAGES SPÉCIFIQUES : TEXTE / HTML
           ========================================================================= */}
        {type === 'text' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Contenu texte ou HTML</label>
              <textarea
                rows={8}
                value={settings.content || ''}
                onChange={(e) => updateSetting('content', e.target.value)}
                placeholder="Rédigez votre texte..."
                className="db-input text-xs font-mono w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Alignement</label>
              <select
                value={settings.alignment || 'left'}
                onChange={(e) => updateSetting('alignment', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="left">Gauche</option>
                <option value="center">Centré</option>
                <option value="right">Droite</option>
                <option value="justify">Justifié</option>
              </select>
            </div>
          </div>
        )}

        {/* =========================================================================
            9. RÉGLAGES SPÉCIFIQUES : IMAGE
           ========================================================================= */}
        {type === 'image' && (
          <div className="space-y-3">
            {settings.src && (
              <div className="pb-media-preview-box mb-2 p-2 border rounded-lg bg-slate-50 text-center shadow-sm position-relative">
                <img 
                  src={settings.src} 
                  alt={settings.alt || "Aperçu de l'image"} 
                  className="img-fluid rounded border"
                  style={{ maxHeight: '150px', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="mt-1 text-muted text-xs d-flex justify-content-between align-items-center" style={{ fontSize: '11px' }}>
                  <span>Image actuelle</span>
                  <button
                    type="button"
                    onClick={() => {
                      updateSetting('src', '');
                      updateSetting('caption', '');
                    }}
                    className="btn btn-outline-danger btn-xs py-0.5 px-1.5"
                    style={{ fontSize: '10px' }}
                    title="Supprimer l'image actuelle"
                  >
                    Supprimer l'image
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="db-label font-bold text-xs">Source de l'image (URL)</label>
              <input
                type="text"
                value={settings.src || ''}
                onChange={(e) => updateSetting('src', e.target.value)}
                placeholder="https://... ou data:image/..."
                className="db-input text-xs w-100"
              />
              <div className="mt-1.5 d-flex gap-2">
                <button
                  type="button"
                  onClick={() => setMediaModal({
                    isOpen: true,
                    filterType: 'image',
                    title: 'Sélectionner une image dans la médiathèque',
                    onSelect: (media) => {
                      updateSetting('src', media.url);
                      if (!settings.alt && (media.alt || media.name)) {
                        updateSetting('alt', media.alt || media.name);
                      }
                    }
                  })}
                  className="btn btn-outline-primary btn-xs py-1 px-2.5 d-inline-flex align-items-center gap-1.5 rounded"
                  style={{ fontSize: '11px' }}
                >
                  <ImageIcon size={12} /> Choisir depuis la médiathèque
                </button>
              </div>
            </div>

            <div>
              <label className="db-label font-bold text-xs">Téléverser / Remplacer par un fichier</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    try {
                      updateSetting('src', 'Téléversement en cours...');
                      const url = await pageService.uploadMedia(file);
                      updateSetting('src', url);
                      if (!settings.alt) {
                        updateSetting('alt', file.name.replace(/\.[^/.]+$/, ''));
                      }
                    } catch (err) {
                      alert("Échec du téléversement de l'image.");
                      updateSetting('src', settings.src || '');
                    }
                  }
                }}
                className="db-input text-xs w-100"
              />
            </div>

            <div>
              <label className="db-label font-bold text-xs">Texte alternatif (Accessibilité Alt)</label>
              <input
                type="text"
                value={settings.alt || ''}
                onChange={(e) => updateSetting('alt', e.target.value)}
                placeholder="Description de l'image pour l'accessibilité"
                className="db-input text-xs w-100"
              />
            </div>

            <div>
              <label className="db-label font-bold text-xs">Légende de l'image (Optionnel)</label>
              <input
                type="text"
                value={settings.caption || ''}
                onChange={(e) => updateSetting('caption', e.target.value)}
                placeholder="Légende affichée sous l'image"
                className="db-input text-xs w-100"
              />
            </div>

            <div>
              <label className="db-label font-bold text-xs">Lien de redirection au clic (Optionnel)</label>
              <input
                type="text"
                value={settings.link || ''}
                onChange={(e) => updateSetting('link', e.target.value)}
                placeholder="https://... ou /flipbooks"
                className="db-input text-xs w-100"
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            9b. RÉGLAGES SPÉCIFIQUES : VIDÉO (YOUTUBE OU FICHIER DIRECT)
           ========================================================================= */}
        {type === 'video' && (
          <VideoBlockSettings
            block={block}
            onChange={onChange}
            onOpenMediaPicker={() => setMediaModal({
              isOpen: true,
              filterType: 'video',
              title: 'Sélectionner une vidéo dans la médiathèque',
              onSelect: (media) => {
                const vidUrl = media.url || media.downloadUrl || '';
                const newId = extractYoutubeVideoId(vidUrl);
                if (newId) {
                  onChange(id, {
                    ...settings,
                    url: vidUrl,
                    videoId: newId,
                    embedUrl: `https://www.youtube.com/embed/${newId}`,
                    lastValidVideoId: newId
                  });
                } else {
                  onChange(id, {
                    ...settings,
                    url: vidUrl,
                    videoId: '',
                    embedUrl: ''
                  });
                }
              }
            })}
          />
        )}

        {/* =========================================================================
            9c. RÉGLAGES SPÉCIFIQUES : CARTE (CARD)
           ========================================================================= */}
        {type === 'card' && (
          <div className="space-y-3">
            {settings.image && (
              <div className="pb-media-preview-box mb-2 p-2 border rounded-lg bg-slate-50 text-center shadow-sm">
                <img 
                  src={settings.image} 
                  alt={settings.title || "Illustration carte"} 
                  className="img-fluid rounded border"
                  style={{ maxHeight: '130px', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}

            <div>
              <label className="db-label font-bold text-xs">Titre de la carte</label>
              <input
                type="text"
                value={settings.title || ''}
                onChange={(e) => updateSetting('title', e.target.value)}
                className="db-input text-xs w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Texte / Description</label>
              <textarea
                rows={3}
                value={settings.text || ''}
                onChange={(e) => updateSetting('text', e.target.value)}
                className="db-input text-xs w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Image d'illustration (URL)</label>
              <input
                type="text"
                value={settings.image || ''}
                onChange={(e) => updateSetting('image', e.target.value)}
                placeholder="https://..."
                className="db-input text-xs w-100"
              />
              <div className="d-flex gap-2 mt-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMediaModal({
                    isOpen: true,
                    filterType: 'image',
                    title: 'Sélectionner une image pour la carte',
                    onSelect: (media) => {
                      updateSetting('image', media.url || media.downloadUrl || '');
                    }
                  })}
                  className="btn btn-outline-primary btn-xs py-1 px-2.5 d-inline-flex align-items-center gap-1.5 rounded"
                  style={{ fontSize: '11px' }}
                  aria-label="Choisir une image pour la carte depuis la médiathèque"
                >
                  <ImageIcon size={12} /> Choisir depuis la médiathèque
                </button>
                {settings.image && (
                  <button
                    type="button"
                    onClick={() => updateSetting('image', '')}
                    className="btn btn-outline-danger btn-xs py-1 px-2 rounded"
                    style={{ fontSize: '11px' }}
                    title="Retirer l'image de la carte"
                    aria-label="Retirer l'image de la carte"
                  >
                    Retirer l'image
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="db-label font-bold text-xs">Téléverser une image pour la carte</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    try {
                      updateSetting('image', 'Téléversement en cours...');
                      const url = await pageService.uploadMedia(file);
                      updateSetting('image', url);
                    } catch (err) {
                      alert("Échec du téléversement de l'image.");
                      updateSetting('image', settings.image || '');
                    }
                  }
                }}
                className="db-input text-xs w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Texte du bouton</label>
              <input
                type="text"
                value={settings.buttonText || ''}
                onChange={(e) => updateSetting('buttonText', e.target.value)}
                placeholder="Découvrir"
                className="db-input text-xs w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Lien du bouton</label>
              <input
                type="text"
                value={settings.buttonLink || ''}
                onChange={(e) => updateSetting('buttonLink', e.target.value)}
                placeholder="# ou https://..."
                className="db-input text-xs w-100"
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            9d. RÉGLAGES SPÉCIFIQUES : ALERTE
           ========================================================================= */}
        {type === 'alert' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Type d'alerte</label>
              <select
                value={settings.type || 'alert-info'}
                onChange={(e) => updateSetting('type', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="alert-info">Information (Bleu)</option>
                <option value="alert-success">Succès (Vert)</option>
                <option value="alert-warning">Avertissement (Jaune)</option>
                <option value="alert-danger">Erreur / Danger (Rouge)</option>
                <option value="alert-light">Gris clair (Light)</option>
              </select>
            </div>
            <div>
              <label className="db-label font-bold text-xs">Message de l'alerte</label>
              <textarea
                rows={3}
                value={settings.content || ''}
                onChange={(e) => updateSetting('content', e.target.value)}
                className="db-input text-xs w-100"
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            10. RÉGLAGES SPÉCIFIQUES : BOUTON
           ========================================================================= */}
        {type === 'button' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Texte du bouton</label>
              <input
                type="text"
                value={settings.text || ''}
                onChange={(e) => updateSetting('text', e.target.value)}
                className="db-input text-xs w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Lien de redirection</label>
              <input
                type="text"
                value={settings.link || ''}
                onChange={(e) => updateSetting('link', e.target.value)}
                placeholder="/ ou https://..."
                className="db-input text-xs w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Style visuel</label>
              <select
                value={settings.buttonStyle || 'btn-primary'}
                onChange={(e) => updateSetting('buttonStyle', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="btn-primary">Bleu Angevin (Primary)</option>
                <option value="btn-secondary">Gris neutre (Secondary)</option>
                <option value="btn-success">Vert (Success)</option>
                <option value="btn-outline-primary">Contour Bleu</option>
                <option value="btn-outline-secondary">Contour Gris</option>
              </select>
            </div>
            <div>
              <label className="db-label font-bold text-xs">Icône</label>
              <select
                value={settings.icon || ''}
                onChange={(e) => updateSetting('icon', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="">Aucune icône</option>
                {COMMON_ICONS.map(ic => (
                  <option key={ic} value={ic}>{ic}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* =========================================================================
            11. RÉGLAGES SPÉCIFIQUES : SÉPARATEUR (DIVIDER)
           ========================================================================= */}
        {type === 'divider' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Style de trait</label>
              <select
                value={settings.styleType || 'solid'}
                onChange={(e) => updateSetting('styleType', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="solid">Ligne continue (Solid)</option>
                <option value="dashed">Tirets (Dashed)</option>
                <option value="dotted">Pointillés (Dotted)</option>
              </select>
            </div>
            <div>
              <label className="db-label font-bold text-xs">Couleur du trait</label>
              <input
                type="color"
                value={settings.color || '#e2e8f0'}
                onChange={(e) => updateSetting('color', e.target.value)}
                className="db-input p-1 h-8 w-100 cursor-pointer"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Icône centrale</label>
              <div className="d-flex align-items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="div-icon-chk"
                  checked={settings.hasIcon || false}
                  onChange={(e) => updateSetting('hasIcon', e.target.checked)}
                />
                <label htmlFor="div-icon-chk" className="text-xs mb-0">Afficher une icône au centre</label>
              </div>
              {settings.hasIcon && (
                <select
                  value={settings.icon || 'BookOpen'}
                  onChange={(e) => updateSetting('icon', e.target.value)}
                  className="db-select text-xs w-100"
                >
                  {COMMON_ICONS.map(ic => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            12. RÉGLAGES SPÉCIFIQUES : LISTE À PUCES (LIST)
           ========================================================================= */}
        {type === 'list' && (
          <div className="space-y-3">
            <div>
              <label className="db-label font-bold text-xs">Type de liste</label>
              <select
                value={settings.listType || 'unordered'}
                onChange={(e) => updateSetting('listType', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="unordered">Puces standards</option>
                <option value="ordered">Numérotée (1, 2, 3...)</option>
                <option value="check">Icônes de validation (Checkmarks)</option>
              </select>
            </div>

            <div className="border-top pt-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="db-label font-bold text-xs mb-0">Éléments de la liste</label>
                <button
                  type="button"
                  onClick={() => {
                    const cur = Array.isArray(settings.items) ? [...settings.items] : [];
                    cur.push(`Nouvel élément ${cur.length + 1}`);
                    updateSetting('items', cur);
                  }}
                  className="btn btn-outline-primary btn-xs py-1 px-2 d-inline-flex align-items-center gap-1 rounded"
                  style={{ fontSize: '11px' }}
                >
                  <Plus size={12} /> Ajouter
                </button>
              </div>

              {(settings.items || []).map((it, idx) => (
                <div key={idx} className="d-flex gap-1.5 mb-1.5 align-items-center">
                  <input
                    type="text"
                    value={it}
                    onChange={(e) => {
                      const cur = [...settings.items];
                      cur[idx] = e.target.value;
                      updateSetting('items', cur);
                    }}
                    className="db-input text-xs py-1 flex-grow-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = settings.items.filter((_, i) => i !== idx);
                      updateSetting('items', cur);
                    }}
                    className="btn btn-light btn-xs p-1 text-danger"
                    title="Supprimer"
                    aria-label="Supprimer l'élément"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const cur = Array.isArray(settings.items) ? [...settings.items] : [];
                    cur.push(`Nouvel élément ${cur.length + 1}`);
                    updateSetting('items', cur);
                  }}
                  className="btn btn-outline-primary btn-xs py-1 px-3 d-inline-flex align-items-center gap-1.5 rounded w-100 justify-content-center"
                  style={{ fontSize: '11px' }}
                >
                  <Plus size={12} /> Ajouter un élément à la suite
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            13. RÉGLAGES SPÉCIFIQUES : STRUCTURE (SECTION, CONTAINER, COLUMN)
           ========================================================================= */}
        {type === 'section' && (
          <div className="space-y-3">
            {settings.backgroundImage && (
              <div className="pb-media-preview-box mb-2 p-2 border rounded-lg bg-slate-50 text-center shadow-sm">
                <img 
                  src={settings.backgroundImage} 
                  alt="Fond de section" 
                  className="img-fluid rounded border"
                  style={{ maxHeight: '100px', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}

            <div>
              <label className="db-label font-bold text-xs">Image de fond (URL)</label>
              <input
                type="text"
                value={settings.backgroundImage || ''}
                onChange={(e) => updateSetting('backgroundImage', e.target.value)}
                placeholder="https://ex.com/image.jpg"
                className="db-input text-xs w-100"
              />
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setMediaModal({
                    isOpen: true,
                    filterType: 'image',
                    title: 'Sélectionner une image de fond',
                    onSelect: (media) => {
                      updateSetting('backgroundImage', media.url);
                    }
                  })}
                  className="btn btn-outline-primary btn-xs py-1 px-2.5 d-inline-flex align-items-center gap-1.5 rounded"
                  style={{ fontSize: '11px' }}
                >
                  <ImageIcon size={12} /> Choisir depuis la médiathèque
                </button>
              </div>
            </div>

            <div>
              <label className="db-label font-bold text-xs">Téléverser une image de fond</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    try {
                      updateSetting('backgroundImage', 'Téléversement en cours...');
                      const url = await pageService.uploadMedia(file);
                      updateSetting('backgroundImage', url);
                    } catch (err) {
                      alert("Échec du téléversement de l'image.");
                      updateSetting('backgroundImage', settings.backgroundImage || '');
                    }
                  }
                }}
                className="db-input text-xs w-100"
              />
            </div>

            <div>
              <label className="db-label font-bold text-xs">Couleur de fond</label>
              <input
                type="color"
                value={settings.style?.backgroundColor || '#ffffff'}
                onChange={(e) => updateNestedStyle('backgroundColor', e.target.value)}
                className="db-input p-1 h-8 w-100 cursor-pointer"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Hauteur minimale</label>
              <input
                type="text"
                value={settings.style?.minHeight || ''}
                onChange={(e) => updateNestedStyle('minHeight', e.target.value)}
                placeholder="ex: 300px"
                className="db-input text-xs w-100"
              />
            </div>
          </div>
        )}

        {type === 'container' && (
          <div>
            <label className="ae-status-indicator-label d-flex align-items-center gap-2">
              <input
                type="checkbox"
                checked={settings.fluid || false}
                onChange={(e) => updateSetting('fluid', e.target.checked)}
                className="ae-form-control-bordered"
              />
              <span className="text-xs font-bold">Pleine largeur (Fluid 100%)</span>
            </label>
          </div>
        )}

        {type === 'column' && (
          <div>
            <label className="db-label font-bold text-xs">Largeur responsive de la colonne</label>
            <select
              value={settings.sizeClasses || 'col-md-12'}
              onChange={(e) => updateSetting('sizeClasses', e.target.value)}
              className="db-select text-xs w-100"
            >
              <option value="col-12">100% Pleine largeur (col-12)</option>
              <option value="col-md-6 col-12">50% Moitié de page (col-md-6)</option>
              <option value="col-md-4 col-sm-6 col-12">33% Tiers de page (col-md-4)</option>
              <option value="col-md-3 col-sm-6 col-12">25% Quart de page (col-md-3)</option>
              <option value="col-md-8 col-12">66% Deux tiers (col-md-8)</option>
              <option value="col">Largeur automatique (col)</option>
            </select>
          </div>
        )}

        {/* =========================================================================
            14. CLASSES BOOTSTRAP & STYLES CSS PERSONNALISÉS (POUR TOUS LES BLOCS)
           ========================================================================= */}
        <div className="border-top pt-3 mt-3">
          <label className="db-label font-bold text-xs">Classes Bootstrap additionnelles</label>
          <input
            type="text"
            value={settings.classes || ''}
            onChange={(e) => updateSetting('classes', e.target.value)}
            placeholder="ex: shadow-sm rounded mb-4"
            className="db-input text-xs w-100"
          />
        </div>

        {/* =========================================================================
            15. ACCORDÉON : NUANCIER OFFICIEL ANJOU ÉDITION (17 TEINTES) (R3)
           ========================================================================= */}
        <SettingsAccordionItem
          id={`acc-palette-${id}`}
          title={`Nuancier Officiel ${BRAND_NAME}`}
          icon={Palette}
          isOpen={openSections.palette}
          onToggle={() => toggleSection('palette')}
          badge={
            (settings.style?.backgroundColor || settings.style?.color) ? (
              <span className="badge bg-primary text-white" style={{ fontSize: '10px' }}>
                Personnalisé
              </span>
            ) : null
          }
        >
          <div className="pb-palette-container space-y-3">
            {/* Cible de couleur : Fond ou Texte */}
            <div className="d-flex align-items-center justify-content-between p-1 bg-slate-100 dark:bg-slate-800 rounded">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 ms-1">Appliquer la couleur sur :</span>
              <div className="btn-group btn-group-sm" role="group" aria-label="Cible de couleur">
                <button
                  type="button"
                  onClick={() => setColorTarget('backgroundColor')}
                  className={`btn btn-xs py-1 px-2.5 rounded ${colorTarget === 'backgroundColor' ? 'btn-primary text-white shadow-sm font-bold' : 'btn-light text-muted'}`}
                  style={{ fontSize: '11px' }}
                >
                  🎨 Fond
                </button>
                <button
                  type="button"
                  onClick={() => setColorTarget('color')}
                  className={`btn btn-xs py-1 px-2.5 rounded ${colorTarget === 'color' ? 'btn-primary text-white shadow-sm font-bold' : 'btn-light text-muted'}`}
                  style={{ fontSize: '11px' }}
                >
                  ✍️ Texte
                </button>
              </div>
            </div>

            {/* Grille des 17 nuances officielles */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Palette certifiée Anjou (17 nuances)
                </span>
                <span className="text-muted" style={{ fontSize: '10px' }}>
                  {colorTarget === 'backgroundColor' ? 'Arrière-plan' : 'Typographie'}
                </span>
              </div>
              <div className="pb-palette-grid">
                {ANJOU_EDITION_PALETTE.map((c) => {
                  const currentValue = colorTarget === 'backgroundColor' 
                    ? settings.style?.backgroundColor 
                    : settings.style?.color;
                  const isSelected = (currentValue || '').toLowerCase() === c.value.toLowerCase();
                  const isWhite = c.value.toLowerCase() === '#ffffff';

                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => updateNestedStyle(colorTarget, c.value)}
                      title={`${c.label} (${c.value})`}
                      aria-label={`${c.label} (${c.value})`}
                      className={`pb-palette-swatch ${isSelected ? 'pb-palette-swatch-active' : ''} ${isWhite ? 'pb-palette-swatch-white' : ''}`}
                      style={{
                        backgroundColor: c.value,
                        color: c.textColor
                      }}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sélecteur libre + saisie hexa + réinitialisation */}
            <div className="pt-2 border-top">
              <div className="d-flex align-items-center gap-2">
                <input
                  type="color"
                  value={
                    (colorTarget === 'backgroundColor' ? settings.style?.backgroundColor : settings.style?.color) || '#004b7a'
                  }
                  onChange={(e) => updateNestedStyle(colorTarget, e.target.value)}
                  className="p-0 border rounded cursor-pointer"
                  style={{ width: '32px', height: '28px' }}
                  title="Pipette de couleur personnalisée"
                  aria-label="Pipette de couleur personnalisée"
                />
                <input
                  type="text"
                  value={(colorTarget === 'backgroundColor' ? settings.style?.backgroundColor : settings.style?.color) || ''}
                  onChange={(e) => updateNestedStyle(colorTarget, e.target.value)}
                  placeholder="#004b7a ou transparent"
                  className="db-input text-xs flex-grow-1"
                  style={{ height: '28px' }}
                  aria-label="Code couleur hexadécimal"
                />
                <button
                  type="button"
                  onClick={() => updateNestedStyle(colorTarget, '')}
                  className="btn btn-outline-secondary btn-xs py-1 px-2 rounded"
                  style={{ fontSize: '11px', height: '28px' }}
                  title="Effacer la couleur"
                  aria-label="Effacer la couleur"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>
          </div>
        </SettingsAccordionItem>

        {/* =========================================================================
            16. ACCORDÉON : ESPACEMENTS (PADDING & MARGIN) (R3)
           ========================================================================= */}
        <SettingsAccordionItem
          id={`acc-spacing-${id}`}
          title="Espacements (Padding & Marges)"
          icon={Maximize2}
          isOpen={openSections.spacing}
          onToggle={() => toggleSection('spacing')}
          badge={
            (settings.style?.padding || settings.style?.paddingTop || settings.style?.marginTop) ? (
              <span className="badge bg-primary text-white" style={{ fontSize: '10px' }}>
                Actif
              </span>
            ) : null
          }
        >
          <div className="space-y-3">
            {/* Contrôle général de padding (Requis pour TEST-R3-1) */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor={`pb-style-padding-${id}`} className="db-label font-bold text-xs mb-0">
                  Espacement intérieur (Padding)
                </label>
                <button
                  type="button"
                  onClick={handleResetSpacing}
                  className="btn btn-link btn-xs p-0 text-decoration-none text-muted"
                  style={{ fontSize: '10px' }}
                  title="Réinitialiser tous les espacements"
                >
                  Réinitialiser
                </button>
              </div>
              <input
                id={`pb-style-padding-${id}`}
                aria-label="Espacement intérieur (Padding)"
                type="text"
                value={settings.style?.padding ?? settings.style?.paddingTop ?? ''}
                onChange={handleGeneralPaddingChange}
                placeholder="ex: 24px ou 1.5rem"
                className="db-input text-xs w-100"
              />
            </div>

            {/* Détail granulaire Padding 4 côtés */}
            <div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Padding granulaire par côté
              </span>
              <div className="pb-spacing-grid">
                <div className="pb-spacing-field">
                  <label htmlFor={`pb-pad-top-${id}`}>Haut (Top)</label>
                  <input
                    id={`pb-pad-top-${id}`}
                    type="text"
                    value={settings.style?.paddingTop ?? ''}
                    onChange={(e) => updateNestedStyle('paddingTop', e.target.value)}
                    placeholder="ex: 16px"
                    className="db-input text-xs"
                  />
                </div>
                <div className="pb-spacing-field">
                  <label htmlFor={`pb-pad-bottom-${id}`}>Bas (Bottom)</label>
                  <input
                    id={`pb-pad-bottom-${id}`}
                    type="text"
                    value={settings.style?.paddingBottom ?? ''}
                    onChange={(e) => updateNestedStyle('paddingBottom', e.target.value)}
                    placeholder="ex: 16px"
                    className="db-input text-xs"
                  />
                </div>
                <div className="pb-spacing-field">
                  <label htmlFor={`pb-pad-left-${id}`}>Gauche (Left)</label>
                  <input
                    id={`pb-pad-left-${id}`}
                    type="text"
                    value={settings.style?.paddingLeft ?? ''}
                    onChange={(e) => updateNestedStyle('paddingLeft', e.target.value)}
                    placeholder="ex: 16px"
                    className="db-input text-xs"
                  />
                </div>
                <div className="pb-spacing-field">
                  <label htmlFor={`pb-pad-right-${id}`}>Droite (Right)</label>
                  <input
                    id={`pb-pad-right-${id}`}
                    type="text"
                    value={settings.style?.paddingRight ?? ''}
                    onChange={(e) => updateNestedStyle('paddingRight', e.target.value)}
                    placeholder="ex: 16px"
                    className="db-input text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Marges extérieures */}
            <div className="pt-2 border-top">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Marges extérieures (Margin)
              </span>
              <div className="pb-spacing-grid">
                <div className="pb-spacing-field">
                  <label htmlFor={`pb-mar-top-${id}`}>Marge Haute (Top)</label>
                  <input
                    id={`pb-mar-top-${id}`}
                    type="text"
                    value={settings.style?.marginTop ?? ''}
                    onChange={(e) => updateNestedStyle('marginTop', e.target.value)}
                    placeholder="ex: 20px"
                    className="db-input text-xs"
                  />
                </div>
                <div className="pb-spacing-field">
                  <label htmlFor={`pb-mar-bottom-${id}`}>Marge Basse (Bottom)</label>
                  <input
                    id={`pb-mar-bottom-${id}`}
                    type="text"
                    value={settings.style?.marginBottom ?? ''}
                    onChange={(e) => updateNestedStyle('marginBottom', e.target.value)}
                    placeholder="ex: 20px"
                    className="db-input text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </SettingsAccordionItem>

        {/* =========================================================================
            17. ACCORDÉON : BORDURES & COINS ARRONDIS (R3)
           ========================================================================= */}
        <SettingsAccordionItem
          id={`acc-borders-${id}`}
          title="Bordures & Coins Arrondis"
          icon={Square}
          isOpen={openSections.borders}
          onToggle={() => toggleSection('borders')}
          badge={
            (settings.style?.borderStyle && settings.style?.borderStyle !== 'none') ? (
              <span className="badge bg-primary text-white" style={{ fontSize: '10px' }}>
                {settings.style.borderStyle}
              </span>
            ) : null
          }
        >
          <div className="space-y-3">
            {/* Style de bordure (Requis pour TEST-R3-1) */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor={`pb-style-border-style-${id}`} className="db-label font-bold text-xs mb-0">
                  Style de bordure
                </label>
                {settings.style?.borderStyle && settings.style?.borderStyle !== 'none' && (
                  <button
                    type="button"
                    onClick={handleResetBorders}
                    className="btn btn-link btn-xs p-0 text-decoration-none text-muted"
                    style={{ fontSize: '10px' }}
                  >
                    Effacer bordure
                  </button>
                )}
              </div>
              <select
                id={`pb-style-border-style-${id}`}
                aria-label="Style de bordure"
                value={settings.style?.borderStyle || 'none'}
                onChange={(e) => updateNestedStyle('borderStyle', e.target.value)}
                className="db-select text-xs w-100"
              >
                <option value="none">Aucune bordure (none)</option>
                <option value="solid">Ligne continue (solid)</option>
                <option value="dashed">Tirets (dashed)</option>
                <option value="dotted">Pointillés (dotted)</option>
                <option value="double">Double trait (double)</option>
              </select>
            </div>

            {/* Épaisseur et Couleur si bordure active */}
            {settings.style?.borderStyle && settings.style?.borderStyle !== 'none' && (
              <div className="pb-border-row">
                <div>
                  <label htmlFor={`pb-style-border-width-${id}`} className="db-label font-bold text-xs">
                    Épaisseur
                  </label>
                  <input
                    id={`pb-style-border-width-${id}`}
                    type="text"
                    value={settings.style?.borderWidth || ''}
                    onChange={(e) => updateNestedStyle('borderWidth', e.target.value)}
                    placeholder="ex: 2px"
                    className="db-input text-xs w-100"
                  />
                </div>
                <div>
                  <label htmlFor={`pb-style-border-color-${id}`} className="db-label font-bold text-xs">
                    Couleur de bordure
                  </label>
                  <div className="d-flex gap-1.5 align-items-center">
                    <input
                      type="color"
                      value={settings.style?.borderColor || '#004b7a'}
                      onChange={(e) => updateNestedStyle('borderColor', e.target.value)}
                      className="p-0 border rounded cursor-pointer"
                      style={{ width: '28px', height: '28px' }}
                      title="Couleur de bordure"
                    />
                    <input
                      id={`pb-style-border-color-${id}`}
                      type="text"
                      value={settings.style?.borderColor || ''}
                      onChange={(e) => updateNestedStyle('borderColor', e.target.value)}
                      placeholder="#004b7a"
                      className="db-input text-xs flex-grow-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Arrondi des angles (border-radius) */}
            <div className="pt-2 border-top">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor={`pb-style-border-radius-${id}`} className="db-label font-bold text-xs mb-0">
                  Arrondi des angles (Border Radius)
                </label>
                <span className="text-muted font-mono" style={{ fontSize: '11px' }}>
                  {settings.style?.borderRadius || '0px'}
                </span>
              </div>
              <input
                id={`pb-style-border-radius-${id}`}
                type="text"
                value={settings.style?.borderRadius || ''}
                onChange={(e) => updateNestedStyle('borderRadius', e.target.value)}
                placeholder="ex: 8px ou 16px"
                className="db-input text-xs w-100"
              />
              <div className="d-flex gap-1 mt-1.5 flex-wrap">
                {['0px', '4px', '8px', '16px', '24px', '9999px'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateNestedStyle('borderRadius', r)}
                    className={`btn btn-xs py-0.5 px-1.5 rounded ${settings.style?.borderRadius === r ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '10px' }}
                  >
                    {r === '9999px' ? 'Pilule' : r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SettingsAccordionItem>

        {/* =========================================================================
            18. ACCORDÉON : OMBRES PORTÉES (BOX-SHADOW) (R3)
           ========================================================================= */}
        <SettingsAccordionItem
          id={`acc-shadows-${id}`}
          title="Ombres Portées (Box Shadow)"
          icon={Sparkles}
          isOpen={openSections.shadows}
          onToggle={() => toggleSection('shadows')}
          badge={
            (settings.style?.boxShadow && settings.style?.boxShadow !== 'none') ? (
              <span className="badge bg-primary text-white" style={{ fontSize: '10px' }}>
                Active
              </span>
            ) : null
          }
        >
          <div className="space-y-3">
            {/* Sélecteur d'ombre portée (Requis pour TEST-R3-1) */}
            <div>
              <label htmlFor={`pb-style-box-shadow-${id}`} className="db-label font-bold text-xs">
                Ombre portée
              </label>
              <select
                id={`pb-style-box-shadow-${id}`}
                aria-label="Ombre portée"
                value={resolveShadowValue(settings.style?.boxShadow)}
                onChange={handleShadowSelectChange}
                className="db-select text-xs w-100"
              >
                <option value="none">Aucune ombre (none)</option>
                <option value="light">Ombre légère (Subtile)</option>
                <option value="medium">Ombre moyenne (Standard)</option>
                <option value="large">Ombre forte (Élevée)</option>
                <option value="anjou">Ombre marquée Loire (Bleu Anjou)</option>
                <option value="custom">Ombre personnalisée...</option>
              </select>
            </div>

            {/* Chips rapides de préréglages */}
            <div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Préréglages d'ombres Anjou
              </span>
              <div className="pb-shadow-presets">
                <button
                  type="button"
                  onClick={() => updateNestedStyle('boxShadow', 'none')}
                  className={`pb-shadow-chip ${(!settings.style?.boxShadow || settings.style?.boxShadow === 'none') ? 'pb-shadow-chip-active' : ''}`}
                >
                  Aucune
                </button>
                <button
                  type="button"
                  onClick={() => updateNestedStyle('boxShadow', SHADOW_PRESETS.light)}
                  className={`pb-shadow-chip ${settings.style?.boxShadow === SHADOW_PRESETS.light ? 'pb-shadow-chip-active' : ''}`}
                >
                  Légère
                </button>
                <button
                  type="button"
                  onClick={() => updateNestedStyle('boxShadow', SHADOW_PRESETS.medium)}
                  className={`pb-shadow-chip ${settings.style?.boxShadow === SHADOW_PRESETS.medium ? 'pb-shadow-chip-active' : ''}`}
                >
                  Moyenne
                </button>
                <button
                  type="button"
                  onClick={() => updateNestedStyle('boxShadow', SHADOW_PRESETS.large)}
                  className={`pb-shadow-chip ${settings.style?.boxShadow === SHADOW_PRESETS.large ? 'pb-shadow-chip-active' : ''}`}
                >
                  Forte
                </button>
                <button
                  type="button"
                  onClick={() => updateNestedStyle('boxShadow', SHADOW_PRESETS.anjou)}
                  className={`pb-shadow-chip ${settings.style?.boxShadow === SHADOW_PRESETS.anjou ? 'pb-shadow-chip-active' : ''}`}
                >
                  Bleu Loire
                </button>
              </div>
            </div>

            {/* Champ personnalisé si custom */}
            {resolveShadowValue(settings.style?.boxShadow) === 'custom' && (
              <div className="pt-2 border-top">
                <label htmlFor={`pb-custom-shadow-${id}`} className="db-label font-bold text-xs">
                  CSS box-shadow personnalisé
                </label>
                <input
                  id={`pb-custom-shadow-${id}`}
                  type="text"
                  value={settings.style?.boxShadow || ''}
                  onChange={(e) => updateNestedStyle('boxShadow', e.target.value)}
                  placeholder="0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  className="db-input text-xs w-100"
                />
              </div>
            )}
          </div>
        </SettingsAccordionItem>

        {/* =========================================================================
            19. ACCORDÉON : VISIBILITÉ RESPONSIVE PAR APPAREIL (R3)
           ========================================================================= */}
        <SettingsAccordionItem
          id={`acc-visibility-${id}`}
          title="Visibilité par Appareil (Responsive S/M/L)"
          icon={Smartphone}
          isOpen={openSections.visibility}
          onToggle={() => toggleSection('visibility')}
          badge={
            (settings.hideOnMobile || settings.hideOnTablet || settings.hideOnDesktop) ? (
              <span className="badge bg-warning text-dark" style={{ fontSize: '10px' }}>
                Partielle
              </span>
            ) : (
              <span className="badge bg-success text-white" style={{ fontSize: '10px' }}>
                Tous
              </span>
            )
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-muted mb-2">
              Contrôlez sur quels types d'écrans ce bloc doit être affiché ou masqué aux visiteurs :
            </p>

            <div className="pb-visibility-options">
              {/* Smartphone (S) */}
              <div className="pb-visibility-option-item">
                <label htmlFor={`chk-hide-mobile-${id}`} className="pb-visibility-option-label">
                  <Smartphone size={15} className="text-primary" />
                  <span>Masquer sur Smartphone (S &le; 599px)</span>
                </label>
                <input
                  type="checkbox"
                  id={`chk-hide-mobile-${id}`}
                  aria-label="Masquer sur mobile"
                  checked={Boolean(settings.hideOnMobile)}
                  onChange={(e) => updateSetting('hideOnMobile', e.target.checked)}
                  className="cursor-pointer"
                  style={{ width: '16px', height: '16px' }}
                />
              </div>

              {/* Tablette (M) */}
              <div className="pb-visibility-option-item">
                <label htmlFor={`chk-hide-tablet-${id}`} className="pb-visibility-option-label">
                  <Tablet size={15} className="text-primary" />
                  <span>Masquer sur Tablette (M 600-899px)</span>
                </label>
                <input
                  type="checkbox"
                  id={`chk-hide-tablet-${id}`}
                  aria-label="Masquer sur tablette"
                  checked={Boolean(settings.hideOnTablet)}
                  onChange={(e) => updateSetting('hideOnTablet', e.target.checked)}
                  className="cursor-pointer"
                  style={{ width: '16px', height: '16px' }}
                />
              </div>

              {/* Ordinateur (L / XL) */}
              <div className="pb-visibility-option-item">
                <label htmlFor={`chk-hide-desktop-${id}`} className="pb-visibility-option-label">
                  <Monitor size={15} className="text-primary" />
                  <span>Masquer sur Ordinateur (L/XL &ge; 900px)</span>
                </label>
                <input
                  type="checkbox"
                  id={`chk-hide-desktop-${id}`}
                  aria-label="Masquer sur ordinateur"
                  checked={Boolean(settings.hideOnDesktop)}
                  onChange={(e) => updateSetting('hideOnDesktop', e.target.checked)}
                  className="cursor-pointer"
                  style={{ width: '16px', height: '16px' }}
                />
              </div>
            </div>

            {/* Synthèse du statut responsive */}
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border text-center" style={{ fontSize: '11px' }}>
              {(!settings.hideOnMobile && !settings.hideOnTablet && !settings.hideOnDesktop) ? (
                <span className="text-success font-semibold">✓ Ce bloc est visible sur tous les écrans</span>
              ) : (
                <span className="text-warning font-semibold">
                  ⚠️ Masqué sur : {[
                    settings.hideOnMobile ? 'Smartphone' : '',
                    settings.hideOnTablet ? 'Tablette' : '',
                    settings.hideOnDesktop ? 'Ordinateur' : ''
                  ].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
        </SettingsAccordionItem>

      </div>

      {/* Modale Sélecteur de Médiathèque */}
      <MediaLibraryModal
        isOpen={mediaModal.isOpen}
        filterType={mediaModal.filterType}
        title={mediaModal.title}
        onClose={() => setMediaModal(prev => ({ ...prev, isOpen: false }))}
        onSelect={(media) => {
          if (typeof mediaModal.onSelect === 'function') {
            mediaModal.onSelect(media);
          }
        }}
      />
    </div>
  );
};

export default BuilderSettings;
