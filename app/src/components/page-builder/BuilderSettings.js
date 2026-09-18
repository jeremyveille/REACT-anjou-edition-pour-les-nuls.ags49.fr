import React, { useState, useEffect } from 'react';
import { pageService } from '../../services/pageService';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Settings,
  ExternalLink
} from 'lucide-react';
import { extractYoutubeVideoId } from '../../utils/youtubeUtils';
import { BLOCK_DEFINITIONS } from './blockRegistry';
import { flipbooksData } from '../../data';

const COMMON_ICONS = [
  'ArrowRight', 'BookOpen', 'ExternalLink', 'Calendar', 'Heart', 
  'FileText', 'Phone', 'MapPin', 'Video', 'Info', 'User', 'HelpCircle', 'Settings',
  'PlayCircle', 'Play', 'Feather', 'Check', 'Search'
];

/**
 * Panneau de réglages pour le composant Vidéo (YouTube).
 * Récupère automatiquement l'URL existante, supporte tous les formats YouTube
 * et valide en temps réel sans interrompre la saisie.
 */
const VideoBlockSettings = ({ block, onChange }) => {
  const { id, settings = {} } = block;

  // Récupérer l'URL actuelle sans écraser avec une valeur par défaut
  const currentUrl = settings.url || (settings.videoId ? `https://www.youtube.com/watch?v=${settings.videoId}` : (settings.src || ''));
  const [inputValue, setInputValue] = useState(currentUrl);

  // Synchronisation lors de la sélection d'un autre bloc ou modification externe
  useEffect(() => {
    const val = settings.url || (settings.videoId ? `https://www.youtube.com/watch?v=${settings.videoId}` : (settings.src || ''));
    setInputValue(val);
  }, [id, settings.url, settings.videoId, settings.src]);

  const extractedId = extractYoutubeVideoId(inputValue);
  const isInputEmpty = !inputValue || inputValue.trim() === '';
  const isInvalid = !isInputEmpty && !extractedId;

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    const newVideoId = extractYoutubeVideoId(val);

    if (newVideoId) {
      onChange(id, {
        ...settings,
        url: val,
        videoId: newVideoId,
        embedUrl: `https://www.youtube.com/embed/${newVideoId}`,
        lastValidVideoId: newVideoId
      });
    } else {
      // URL invalide ou en cours de frappe : on conserve la saisie dans url et on maintient le dernier videoId valide pour ne pas casser le lecteur
      onChange(id, {
        ...settings,
        url: val,
        videoId: settings.videoId || settings.lastValidVideoId || 'dQw4w9WgXcQ'
      });
    }
  };

  const activeVideoId = extractedId || settings.videoId || settings.lastValidVideoId;
  const watchUrl = activeVideoId ? `https://www.youtube.com/watch?v=${activeVideoId}` : null;

  return (
    <div className="space-y-3">
      <div>
        <label className="db-label font-bold text-xs" htmlFor="pb-video-url-input">
          Lien YouTube
        </label>
        <input
          id="pb-video-url-input"
          type="text"
          value={inputValue}
          onChange={handleUrlChange}
          placeholder="https://www.youtube.com/watch?v=..."
          className={`db-input text-xs w-100 ${isInvalid ? 'border-danger' : ''}`}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid ? 'pb-video-error' : undefined}
        />
        {isInvalid && (
          <p id="pb-video-error" className="text-danger mt-1 mb-0 font-medium" style={{ fontSize: '11px', color: '#dc3545' }}>
            Lien YouTube invalide
          </p>
        )}
      </div>

      {watchUrl && (
        <div className="pt-1">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary d-inline-flex align-items-center gap-1 text-decoration-none"
            style={{ fontSize: '11px' }}
          >
            <ExternalLink size={12} />
            <span>Ouvrir sur YouTube</span>
          </a>
        </div>
      )}
    </div>
  );
};

export const BuilderSettings = ({ block, onChange }) => {
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
                  value={settings.selectedBookId || '3322'}
                  onChange={(e) => updateSetting('selectedBookId', e.target.value)}
                  className="db-select text-xs w-100"
                >
                  {flipbooksData.map(fb => (
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
              />
            </div>

            <div>
              <label className="db-label font-bold text-xs">Sous-titre / Consigne</label>
              <input
                type="text"
                value={settings.subtitle || ''}
                onChange={(e) => updateSetting('subtitle', e.target.value)}
                className="db-input text-xs w-100"
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
            <div>
              <label className="db-label font-bold text-xs">Source de l'image (URL)</label>
              <input
                type="text"
                value={settings.src || ''}
                onChange={(e) => updateSetting('src', e.target.value)}
                className="db-input text-xs w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Téléverser une image locale</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      updateSetting('src', 'Téléversement en cours...');
                      const url = await pageService.uploadMedia(file);
                      updateSetting('src', url);
                    } catch (err) {
                      alert("Échec du téléversement de l'image.");
                      updateSetting('src', '');
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
                className="db-input text-xs w-100"
              />
            </div>
            <div>
              <label className="db-label font-bold text-xs">Lien optionnel (Clic sur l'image)</label>
              <input
                type="text"
                value={settings.link || ''}
                onChange={(e) => updateSetting('link', e.target.value)}
                placeholder="https://..."
                className="db-input text-xs w-100"
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            9b. RÉGLAGES SPÉCIFIQUES : VIDÉO (YOUTUBE)
           ========================================================================= */}
        {type === 'video' && (
          <VideoBlockSettings
            block={block}
            onChange={onChange}
          />
        )}

        {/* =========================================================================
            9c. RÉGLAGES SPÉCIFIQUES : CARTE (CARD)
           ========================================================================= */}
        {type === 'card' && (
          <div className="space-y-3">
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
            <div>
              <label className="db-label font-bold text-xs">Image de fond (URL)</label>
              <input
                type="text"
                value={settings.backgroundImage || ''}
                onChange={(e) => updateSetting('backgroundImage', e.target.value)}
                placeholder="https://ex.com/image.jpg"
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

      </div>
    </div>
  );
};

export default BuilderSettings;
