import React from 'react';
import { pageService } from '../../services/pageService';


const COMMON_ICONS = [
  'ArrowRight', 'BookOpen', 'ExternalLink', 'Calendar', 'Heart', 
  'FileText', 'Phone', 'MapPin', 'Video', 'Info', 'User', 'HelpCircle', 'Settings'
];

export const BuilderSettings = ({ block, onChange }) => {
  if (!block) {
    return (
      <div className="text-center text-muted py-5">
        <p className="text-sm">Sélectionnez un bloc sur le canevas pour modifier ses réglages.</p>
      </div>
    );
  }

  const { id, type, settings = {} } = block;

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
    <div className="builder-settings space-y-4">
      <div className="border-bottom pb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Réglages du bloc</span>
        <h6 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 capitalize">
          {type} <span className="text-xs font-mono font-normal text-slate-400">({id})</span>
        </h6>
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Champs communs */}
        <div>
          <label className="db-label">Classes Bootstrap personnalisées</label>
          <input
            type="text"
            value={settings.classes || ''}
            onChange={(e) => updateSetting('classes', e.target.value)}
            placeholder="ex: py-3 text-center shadow-sm"
            className="db-input text-xs"
          />
          <small className="text-[10px] text-slate-400 block mt-1">
            Ajoutez des classes Bootstrap séparées par des espaces.
          </small>
        </div>

        {/* Champs spécifiques à la structure */}
        {type === 'section' && (
          <>
            <div>
              <label className="db-label">Image de fond (URL)</label>
              <input
                type="text"
                value={settings.backgroundImage || ''}
                onChange={(e) => updateSetting('backgroundImage', e.target.value)}
                placeholder="https://ex.com/image.jpg"
                className="db-input text-xs"
              />
            </div>
            <div className="mt-1">
              <label className="db-label text-[10px] text-slate-400">Ou téléverser un fichier</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      updateSetting('backgroundImage', 'Téléversement en cours...');
                      const url = await pageService.uploadMedia(file);
                      updateSetting('backgroundImage', url);
                    } catch (err) {
                      alert('Échec du téléversement de l\'image.');
                      updateSetting('backgroundImage', '');
                    }
                  }
                }}
                className="db-input text-xs"
                style={{ padding: '4px' }}
              />
            </div>

            <div>
              <label className="db-label">Hauteur min (CSS)</label>
              <input
                type="text"
                value={settings.style?.minHeight || ''}
                onChange={(e) => updateNestedStyle('minHeight', e.target.value)}
                placeholder="ex: 300px ou 50vh"
                className="db-input text-xs"
              />
            </div>
          </>
        )}

        {type === 'container' && (
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={settings.fluid || false}
                onChange={(e) => updateSetting('fluid', e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700"
              />
              Pleine largeur (Fluid)
            </label>
          </div>
        )}

        {type === 'column' && (
          <div>
            <label className="db-label">Largeur de colonne (Responsive)</label>
            <select
              value={settings.sizeClasses || 'col'}
              onChange={(e) => updateSetting('sizeClasses', e.target.value)}
              className="db-select text-xs"
            >
              <option value="col">Automatique (col)</option>
              <option value="col-12">100% de large (col-12)</option>
              <option value="col-md-8 col-sm-12">Large (col-md-8)</option>
              <option value="col-md-6 col-sm-12">Moitié de large (col-md-6)</option>
              <option value="col-md-4 col-sm-12">Tiers de large (col-md-4)</option>
              <option value="col-md-3 col-sm-6 col-12">Quart de large (col-md-3)</option>
            </select>
          </div>
        )}

        {/* Champs spécifiques au contenu */}
        {type === 'heading' && (
          <>
            <div>
              <label className="db-label">Niveau de titre</label>
              <select
                value={settings.level || 'h2'}
                onChange={(e) => updateSetting('level', e.target.value)}
                className="db-select text-xs"
              >
                <option value="h1">Titre 1 (h1)</option>
                <option value="h2">Titre 2 (h2)</option>
                <option value="h3">Titre 3 (h3)</option>
                <option value="h4">Titre 4 (h4)</option>
                <option value="h5">Titre 5 (h5)</option>
                <option value="h6">Titre 6 (h6)</option>
              </select>
            </div>
            <div>
              <label className="db-label">Texte du titre</label>
              <input
                type="text"
                value={settings.content || ''}
                onChange={(e) => updateSetting('content', e.target.value)}
                className="db-input text-xs"
              />
            </div>
          </>
        )}

        {type === 'text' && (
          <div>
            <label className="db-label">Texte / HTML</label>
            <textarea
              rows={8}
              value={settings.content || ''}
              onChange={(e) => updateSetting('content', e.target.value)}
              placeholder="Saisissez votre texte ou code HTML..."
              className="db-input text-xs font-mono"
            />
          </div>
        )}

        {type === 'image' && (
          <>
            <div>
              <label className="db-label">Source de l'image (URL)</label>
              <input
                type="text"
                value={settings.src || ''}
                onChange={(e) => updateSetting('src', e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="db-input text-xs"
              />
            </div>
            <div className="mt-1">
              <label className="db-label text-[10px] text-slate-400">Ou téléverser un fichier</label>
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
                      alert('Échec du téléversement de l\'image.');
                      updateSetting('src', '');
                    }
                  }
                }}
                className="db-input text-xs"
                style={{ padding: '4px' }}
              />
            </div>

            <div>
              <label className="db-label">Texte alternatif (Alt)</label>
              <input
                type="text"
                value={settings.alt || ''}
                onChange={(e) => updateSetting('alt', e.target.value)}
                className="db-input text-xs"
              />
            </div>
          </>
        )}

        {type === 'button' && (
          <>
            <div>
              <label className="db-label">Texte du bouton</label>
              <input
                type="text"
                value={settings.text || ''}
                onChange={(e) => updateSetting('text', e.target.value)}
                className="db-input text-xs"
              />
            </div>
            <div>
              <label className="db-label">Lien de destination</label>
              <input
                type="text"
                value={settings.link || ''}
                onChange={(e) => updateSetting('link', e.target.value)}
                placeholder="ex: /ae-dashboard ou https://google.com"
                className="db-input text-xs"
              />
            </div>
            <div>
              <label className="db-label">Style de bouton (Bootstrap)</label>
              <select
                value={settings.buttonStyle || 'btn-primary'}
                onChange={(e) => updateSetting('buttonStyle', e.target.value)}
                className="db-select text-xs"
              >
                <option value="btn-primary">Bleu (Primary)</option>
                <option value="btn-secondary">Gris (Secondary)</option>
                <option value="btn-success">Vert (Success)</option>
                <option value="btn-danger">Rouge (Danger)</option>
                <option value="btn-warning">Jaune (Warning)</option>
                <option value="btn-info">Cyan (Info)</option>
                <option value="btn-light">Blanc (Light)</option>
                <option value="btn-dark">Noir (Dark)</option>
                <option value="btn-outline-primary">Bordure Bleue</option>
                <option value="btn-outline-secondary">Bordure Grise</option>
              </select>
            </div>
            <div>
              <label className="db-label">Taille</label>
              <select
                value={settings.size || ''}
                onChange={(e) => updateSetting('size', e.target.value)}
                className="db-select text-xs"
              >
                <option value="">Standard</option>
                <option value="btn-lg">Grand (lg)</option>
                <option value="btn-sm">Petit (sm)</option>
              </select>
            </div>
            <div>
              <label className="db-label">Icône</label>
              <select
                value={settings.icon || ''}
                onChange={(e) => updateSetting('icon', e.target.value)}
                className="db-select text-xs"
              >
                <option value="">Aucune</option>
                {COMMON_ICONS.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.newTab || false}
                  onChange={(e) => updateSetting('newTab', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700"
                />
                Ouvrir dans un nouvel onglet
              </label>
            </div>
          </>
        )}

        {type === 'card' && (
          <>
            <div>
              <label className="db-label">Titre de la carte</label>
              <input
                type="text"
                value={settings.title || ''}
                onChange={(e) => updateSetting('title', e.target.value)}
                className="db-input text-xs"
              />
            </div>
            <div>
              <label className="db-label">Texte de la carte</label>
              <textarea
                rows={3}
                value={settings.text || ''}
                onChange={(e) => updateSetting('text', e.target.value)}
                className="db-input text-xs"
              />
            </div>
            <div>
              <label className="db-label">URL de l'image</label>
              <input
                type="text"
                value={settings.image || ''}
                onChange={(e) => updateSetting('image', e.target.value)}
                className="db-input text-xs"
              />
            </div>
            <div className="mt-1">
              <label className="db-label text-[10px] text-slate-400">Ou téléverser un fichier</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      updateSetting('image', 'Téléversement en cours...');
                      const url = await pageService.uploadMedia(file);
                      updateSetting('image', url);
                    } catch (err) {
                      alert('Échec du téléversement de l\'image.');
                      updateSetting('image', '');
                    }
                  }
                }}
                className="db-input text-xs"
                style={{ padding: '4px' }}
              />
            </div>

            <div>
              <label className="db-label">Texte du bouton</label>
              <input
                type="text"
                value={settings.buttonText || ''}
                onChange={(e) => updateSetting('buttonText', e.target.value)}
                placeholder="Laisser vide pour masquer le bouton"
                className="db-input text-xs"
              />
            </div>
            <div>
              <label className="db-label">Lien du bouton</label>
              <input
                type="text"
                value={settings.buttonLink || ''}
                onChange={(e) => updateSetting('buttonLink', e.target.value)}
                className="db-input text-xs"
              />
            </div>
          </>
        )}

        {type === 'alert' && (
          <>
            <div>
              <label className="db-label">Texte de l'alerte</label>
              <textarea
                rows={3}
                value={settings.content || ''}
                onChange={(e) => updateSetting('content', e.target.value)}
                className="db-input text-xs"
              />
            </div>
            <div>
              <label className="db-label">Style d'alerte (Bootstrap)</label>
              <select
                value={settings.type || 'alert-info'}
                onChange={(e) => updateSetting('type', e.target.value)}
                className="db-select text-xs"
              >
                <option value="alert-primary">Bleu (Primary)</option>
                <option value="alert-success">Vert (Success)</option>
                <option value="alert-warning">Jaune (Warning)</option>
                <option value="alert-danger">Rouge (Danger)</option>
                <option value="alert-info">Cyan (Info)</option>
              </select>
            </div>
          </>
        )}

        {type === 'video' && (
          <div>
            <label className="db-label">URL Vidéo (Youtube / Direct)</label>
            <input
              type="text"
              value={settings.url || ''}
              onChange={(e) => updateSetting('url', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="db-input text-xs"
            />
          </div>
        )}

        {/* Espacements CSS avancés */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <label className="db-label text-[10px] text-slate-400 uppercase">Espacements (Styles personnalisés)</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500">Margin Top</label>
              <input
                type="text"
                value={settings.style?.marginTop || ''}
                onChange={(e) => updateNestedStyle('marginTop', e.target.value)}
                placeholder="ex: 1rem ou 20px"
                className="db-input text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500">Margin Bottom</label>
              <input
                type="text"
                value={settings.style?.marginBottom || ''}
                onChange={(e) => updateNestedStyle('marginBottom', e.target.value)}
                placeholder="ex: 1rem"
                className="db-input text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500">Padding Top</label>
              <input
                type="text"
                value={settings.style?.paddingTop || ''}
                onChange={(e) => updateNestedStyle('paddingTop', e.target.value)}
                placeholder="ex: 1rem"
                className="db-input text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500">Padding Bottom</label>
              <input
                type="text"
                value={settings.style?.paddingBottom || ''}
                onChange={(e) => updateNestedStyle('paddingBottom', e.target.value)}
                placeholder="ex: 1rem"
                className="db-input text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default BuilderSettings;
