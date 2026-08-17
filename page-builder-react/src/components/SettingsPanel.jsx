import { useState } from 'react';
import { useBuilder } from '../store/builderStore';
import findElement from '../utils/findElement';
import { Settings, Trash2, Copy, Sliders, ChevronDown, ChevronRight, PenTool, Palette } from 'lucide-react';

/* ══════════════════════════════════════════════
   Shared field helpers
══════════════════════════════════════════════ */

function Field({ label, htmlFor, children, hint }) {
  return (
    <div className="pb-field">
      <label className="pb-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="pb-field-hint">{hint}</p>}
    </div>
  );
}

function PbSelect({ id, value, onChange, options }) {
  return (
    <select id={id} className="pb-select" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(([val, text]) => (
        <option key={val} value={val}>{text}</option>
      ))}
    </select>
  );
}

function PbInput({ id, type = 'text', value, onChange, placeholder, min, max }) {
  return (
    <input
      id={id}
      type={type}
      className="pb-input"
      value={value}
      onChange={e => onChange(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
    />
  );
}

function PbTextarea({ id, value, onChange, rows = 3, placeholder }) {
  return (
    <textarea
      id={id}
      className="pb-textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
    />
  );
}

function ColorRow({ id, value, onChange }) {
  return (
    <div className="pb-color-row">
      <input
        type="color"
        className="pb-color-swatch"
        id={id}
        value={value || '#ffffff'}
        onChange={e => onChange(e.target.value)}
        title="Choisir une couleur"
      />
      <PbInput
        id={`${id}-text`}
        value={value || ''}
        onChange={onChange}
        placeholder="#ffffff ou transparent"
      />
    </div>
  );
}

function Switch({ id, checked, onChange, label }) {
  return (
    <div className="pb-switch-row">
      <label className="pb-switch-label" htmlFor={id}>{label}</label>
      <label className="pb-toggle">
        <input
          type="checkbox"
          id={id}
          checked={!!checked}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="pb-toggle-slider" />
      </label>
    </div>
  );
}

function GroupTitle({ children }) {
  return <div className="pb-settings-group-title">{children}</div>;
}

/** Collapsible section for advanced options */
function Collapsible({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pb-collapsible">
      <button
        type="button"
        className="pb-collapsible-trigger"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>{title}</span>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {open && <div className="pb-collapsible-body">{children}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main SettingsPanel
══════════════════════════════════════════════ */
export default function SettingsPanel() {
  const {
    elements,
    selectedElementId,
    updateSelectedElementSettings,
    duplicateElement,
    deleteElement,
  } = useBuilder();

  const selectedNode = selectedElementId ? findElement(elements, selectedElementId) : null;
  const element = selectedNode ? selectedNode.element : null;

  const [activeTab, setActiveTab] = useState('content'); // 'content', 'style', 'advanced'

  if (!element) {
    return (
      <div className="builder-settings-panel">
        <div className="pb-no-selection">
          <div className="pb-no-selection-icon" aria-hidden="true">
            <Sliders size={24} />
          </div>
          <p className="pb-no-selection-title">Aucun élément sélectionné</p>
          <p className="pb-no-selection-desc">
            Cliquez sur un bloc du canvas pour modifier ses propriétés.
          </p>
        </div>
      </div>
    );
  }

  const settings = element.settings || {};
  const set = (key, value) => updateSelectedElementSettings({ [key]: value });

  return (
    <div className="builder-settings-panel" aria-label="Panneau de réglages">

      {/* Header */}
      <div className="pb-settings-header">
        <div className="pb-settings-title">
          <Settings size={15} style={{ color: 'var(--pb-primary)' }} aria-hidden="true" />
          <span>Réglages</span>
          <span className="pb-type-badge">{TYPE_LABELS[element.type] || element.type}</span>
        </div>
        <div style={{ display: 'flex', gap: '.375rem' }}>
          <button type="button" className="pb-btn pb-btn-icon-only" title="Dupliquer" onClick={() => duplicateElement(element.id)}>
            <Copy size={13} />
          </button>
          <button type="button" className="pb-btn pb-btn-danger pb-btn-icon-only" title="Supprimer" onClick={() => deleteElement(element.id)}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Elementor Style Tabs */}
      <div className="pb-settings-tabs">
        <button
          type="button"
          className={`pb-tab-btn ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          <PenTool size={14} /> Contenu
        </button>
        <button
          type="button"
          className={`pb-tab-btn ${activeTab === 'style' ? 'active' : ''}`}
          onClick={() => setActiveTab('style')}
        >
          <Palette size={14} /> Style
        </button>
        <button
          type="button"
          className={`pb-tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          <Settings size={14} /> Avancé
        </button>
      </div>

      {/* Scrollable settings */}
      <div className="pb-settings-scroll">

        {/* --- DYNAMIC VISIBILITY WRAPPER --- */}
        <div style={{ display: activeTab !== 'advanced' ? 'block' : 'none' }}>

        {/* ── SECTION ── */}
        {element.type === 'section' && (
          <>
            <div className="pb-settings-group">
              <GroupTitle>Structure</GroupTitle>
              <Switch id="s-container" checked={settings.container} onChange={v => set('container', v)} label="Centrer le contenu" />
              <Field label="Espacement vertical" htmlFor="s-padding">
                <PbSelect id="s-padding" value={settings.padding || 'py-5'} onChange={v => set('padding', v)} options={[
                  ['py-0', 'Aucun'], ['py-2', 'Petit (16px)'], ['py-3', 'Moyen (24px)'],
                  ['py-4', 'Grand (32px)'], ['py-5', 'Très grand (48px)'],
                ]} />
              </Field>
              <Field label="Hauteur minimale" htmlFor="s-minheight">
                <PbInput id="s-minheight" value={settings.minHeight || ''} onChange={v => set('minHeight', v)} placeholder="ex: 500px ou 80vh" />
              </Field>
            </div>
            <div className="pb-settings-group">
              <GroupTitle>Arrière-plan</GroupTitle>
              <Field label="Couleur de fond" htmlFor="s-bg">
                <ColorRow id="s-bg" value={settings.backgroundColor} onChange={v => set('backgroundColor', v)} />
              </Field>
              <Field label="Image de fond (URL)" htmlFor="s-bgimg">
                <PbInput id="s-bgimg" value={settings.backgroundImage || ''} onChange={v => set('backgroundImage', v)} placeholder="https://..." />
              </Field>
            </div>
          </>
        )}

        {/* ── HERO ── */}
        {element.type === 'hero' && (
          <>
            <div className="pb-settings-group">
              <GroupTitle>Contenu</GroupTitle>
              <Field label="Titre principal" htmlFor="h-title">
                <PbInput id="h-title" value={settings.title || ''} onChange={v => set('title', v)} placeholder="Titre accrocheur..." />
              </Field>
              <Field label="Sous-titre / Description" htmlFor="h-subtitle">
                <PbTextarea id="h-subtitle" value={settings.subtitle || ''} onChange={v => set('subtitle', v)} rows={3} placeholder="Décrivez votre offre..." />
              </Field>
              <Field label="Texte du bouton" htmlFor="h-btn-text">
                <PbInput id="h-btn-text" value={settings.buttonText || ''} onChange={v => set('buttonText', v)} placeholder="Découvrir" />
              </Field>
              <Field label="Lien du bouton" htmlFor="h-btn-href">
                <PbInput id="h-btn-href" value={settings.buttonHref || ''} onChange={v => set('buttonHref', v)} placeholder="#section" />
              </Field>
              <Field label="Style du bouton" htmlFor="h-btn-variant">
                <PbSelect id="h-btn-variant" value={settings.buttonVariant || 'btn-primary'} onChange={v => set('buttonVariant', v)} options={[
                  ['btn-primary', 'Bleu'], ['btn-light', 'Blanc'], ['btn-outline-light', 'Bordure blanche'],
                  ['btn-dark', 'Sombre'], ['btn-success', 'Vert'], ['btn-danger', 'Rouge'],
                ]} />
              </Field>
            </div>
            <div className="pb-settings-group">
              <GroupTitle>Style visuel</GroupTitle>
              <Field label="Alignement" htmlFor="h-align">
                <PbSelect id="h-align" value={settings.textAlign || 'text-center'} onChange={v => set('textAlign', v)} options={[
                  ['text-start', 'Gauche'], ['text-center', 'Centré'], ['text-end', 'Droite'],
                ]} />
              </Field>
              <Field label="Couleur de fond" htmlFor="h-bg">
                <ColorRow id="h-bg" value={settings.backgroundColor || '#1e293b'} onChange={v => set('backgroundColor', v)} />
              </Field>
              <Field label="Couleur du texte" htmlFor="h-color">
                <ColorRow id="h-color" value={settings.textColor || '#ffffff'} onChange={v => set('textColor', v)} />
              </Field>
              <Field label="Image de fond (URL)" htmlFor="h-bgimg">
                <PbInput id="h-bgimg" value={settings.backgroundImage || ''} onChange={v => set('backgroundImage', v)} placeholder="https://..." />
              </Field>
              {settings.backgroundImage && (
                <Field label="Opacité du voile (0–1)" htmlFor="h-overlay">
                  <PbInput id="h-overlay" type="number" value={settings.overlayOpacity || 0} onChange={v => set('overlayOpacity', v)} min={0} max={1} />
                </Field>
              )}
              <Field label="Hauteur minimale" htmlFor="h-height">
                <PbInput id="h-height" value={settings.minHeight || '500px'} onChange={v => set('minHeight', v)} placeholder="500px" />
              </Field>
            </div>
          </>
        )}

        {/* ── ROW ── */}
        {element.type === 'row' && (
          <div className="pb-settings-group">
            <GroupTitle>Grille</GroupTitle>
            <Field label="Espacement entre colonnes" htmlFor="r-gap">
              <PbSelect id="r-gap" value={settings.gap || 'g-3'} onChange={v => set('gap', v)} options={[
                ['g-0', 'Aucun'], ['g-1', 'Très serré'], ['g-2', 'Serré'],
                ['g-3', 'Normal'], ['g-4', 'Large'], ['g-5', 'Très large'],
              ]} />
            </Field>
            <Field label="Alignement vertical" htmlFor="r-ai">
              <PbSelect id="r-ai" value={settings.alignItems || 'align-items-start'} onChange={v => set('alignItems', v)} options={[
                ['align-items-start', 'Haut'], ['align-items-center', 'Milieu'],
                ['align-items-end', 'Bas'], ['align-items-stretch', 'Étirer'],
              ]} />
            </Field>
            <Field label="Distribution horizontale" htmlFor="r-jc">
              <PbSelect id="r-jc" value={settings.justifyContent || 'justify-content-start'} onChange={v => set('justifyContent', v)} options={[
                ['justify-content-start', 'Gauche'], ['justify-content-center', 'Centré'],
                ['justify-content-end', 'Droite'], ['justify-content-between', 'Réparti'],
              ]} />
            </Field>
          </div>
        )}

        {/* ── COLUMN ── */}
        {element.type === 'column' && (
          <div className="pb-settings-group">
            <GroupTitle>Colonne</GroupTitle>
            <Field label="Largeur" htmlFor="col-class">
              <PbSelect id="col-class" value={settings.className || 'col-md-6'} onChange={v => set('className', v)} options={[
                ['col-12', 'Pleine largeur (100%)'],
                ['col-md-10', '10/12 (83%)'], ['col-md-9', '9/12 (75%)'],
                ['col-md-8', '8/12 (66%)'], ['col-md-6', '6/12 (50%)'],
                ['col-md-4', '4/12 (33%)'], ['col-md-3', '3/12 (25%)'],
                ['col-md-2', '2/12 (17%)'], ['col', 'Auto'],
              ]} />
            </Field>
            <Field label="Remplissage interne" htmlFor="col-padding">
              <PbSelect id="col-padding" value={settings.padding || ''} onChange={v => set('padding', v)} options={[
                ['', 'Défaut'], ['p-1', 'Très petit'], ['p-2', 'Petit'],
                ['p-3', 'Normal'], ['p-4', 'Grand'], ['p-5', 'Très grand'],
              ]} />
            </Field>
            <Field label="Couleur de fond" htmlFor="col-bg">
              <ColorRow id="col-bg" value={settings.backgroundColor} onChange={v => set('backgroundColor', v)} />
            </Field>
          </div>
        )}

        {/* ── SPACER ── */}
        {element.type === 'spacer' && (
          <div className="pb-settings-group">
            <GroupTitle>Espacement</GroupTitle>
            <Field label="Hauteur (px)" htmlFor="sp-height" hint="Espace vertical entre les blocs">
              <PbInput id="sp-height" type="number" value={settings.height || 48} onChange={v => set('height', v)} min={4} max={400} />
            </Field>
          </div>
        )}

        {/* ── SEPARATOR ── */}
        {element.type === 'separator' && (
          <div className="pb-settings-group">
            <GroupTitle>Séparateur</GroupTitle>
            <Field label="Couleur" htmlFor="sep-color">
              <ColorRow id="sep-color" value={settings.color || '#e2e5ec'} onChange={v => set('color', v)} />
            </Field>
            <Field label="Épaisseur (px)" htmlFor="sep-thickness">
              <PbInput id="sep-thickness" type="number" value={settings.thickness || 1} onChange={v => set('thickness', v)} min={1} max={10} />
            </Field>
            <Field label="Style" htmlFor="sep-style">
              <PbSelect id="sep-style" value={settings.style || 'solid'} onChange={v => set('style', v)} options={[
                ['solid', 'Plein'], ['dashed', 'Tirets'], ['dotted', 'Points'], ['double', 'Double'],
              ]} />
            </Field>
            <Field label="Largeur" htmlFor="sep-width">
              <PbInput id="sep-width" value={settings.width || '100%'} onChange={v => set('width', v)} placeholder="100% ou 200px" />
            </Field>
            <Field label="Marge verticale" htmlFor="sep-margin">
              <PbSelect id="sep-margin" value={settings.margin || 'my-4'} onChange={v => set('margin', v)} options={[
                ['my-0', 'Aucune'], ['my-2', 'Petite'], ['my-3', 'Normale'],
                ['my-4', 'Grande'], ['my-5', 'Très grande'],
              ]} />
            </Field>
          </div>
        )}

        {/* ── TEXT ── */}
        {element.type === 'text' && (
          <>
            <div className="pb-settings-group">
              <GroupTitle>Contenu</GroupTitle>
              <Field label="Contenu textuel" htmlFor="t-content" hint="Vous pouvez aussi double-cliquer sur le texte dans le canvas">
                <PbTextarea id="t-content" value={settings.content || ''} onChange={v => set('content', v)} rows={4} />
              </Field>
              <Field label="Type de texte" htmlFor="t-tag">
                <PbSelect id="t-tag" value={settings.tag || 'p'} onChange={v => set('tag', v)} options={[
                  ['p', 'Paragraphe'], ['h1', 'Titre 1 (très grand)'], ['h2', 'Titre 2 (grand)'],
                  ['h3', 'Titre 3 (moyen)'], ['h4', 'Titre 4'], ['h5', 'Titre 5'], ['h6', 'Titre 6 (petit)'],
                  ['div', 'Conteneur'],
                ]} />
              </Field>
            </div>
            <div className="pb-settings-group">
              <GroupTitle>Style</GroupTitle>
              <Field label="Alignement" htmlFor="t-align">
                <PbSelect id="t-align" value={settings.textAlign || 'text-start'} onChange={v => set('textAlign', v)} options={[
                  ['text-start', 'Gauche'], ['text-center', 'Centré'],
                  ['text-end', 'Droite'], ['text-justify', 'Justifié'],
                ]} />
              </Field>
              <Field label="Couleur du texte" htmlFor="t-color">
                <ColorRow id="t-color" value={settings.color || '#333333'} onChange={v => set('color', v)} />
              </Field>
              <Field label="Taille de police" htmlFor="t-fontsize">
                <PbInput id="t-fontsize" value={settings.fontSize || ''} onChange={v => set('fontSize', v)} placeholder="1rem, 18px, 1.5em..." />
              </Field>
              <Field label="Graisse" htmlFor="t-fontweight">
                <PbSelect id="t-fontweight" value={settings.fontWeight || ''} onChange={v => set('fontWeight', v)} options={[
                  ['', 'Défaut'], ['300', 'Léger'], ['400', 'Normal'], ['500', 'Medium'],
                  ['600', 'Semi-gras'], ['700', 'Gras'], ['800', 'Très gras'],
                ]} />
              </Field>
              <Field label="Marge du bas" htmlFor="t-margin">
                <PbSelect id="t-margin" value={settings.margin || 'mb-3'} onChange={v => set('margin', v)} options={[
                  ['mb-0', 'Aucune'], ['mb-1', 'Très petite'], ['mb-2', 'Petite'],
                  ['mb-3', 'Normale'], ['mb-4', 'Grande'], ['mb-5', 'Très grande'],
                ]} />
              </Field>
            </div>
          </>
        )}

        {/* ── IMAGE ── */}
        {element.type === 'image' && (
          <>
            <div className="pb-settings-group">
              <GroupTitle>Image</GroupTitle>
              <Field label="URL de l'image" htmlFor="img-src">
                <PbInput id="img-src" value={settings.src || ''} onChange={v => set('src', v)} placeholder="https://exemple.com/image.jpg" />
              </Field>
              <Field label="Description (alt)" htmlFor="img-alt" hint="Important pour l'accessibilité et le SEO">
                <PbInput id="img-alt" value={settings.alt || ''} onChange={v => set('alt', v)} placeholder="Description de l'image" />
              </Field>
            </div>
            <div className="pb-settings-group">
              <GroupTitle>Dimensions &amp; Style</GroupTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                <Field label="Largeur" htmlFor="img-w">
                  <PbInput id="img-w" value={settings.width || ''} onChange={v => set('width', v)} placeholder="100% ou 300" />
                </Field>
                <Field label="Hauteur (px)" htmlFor="img-h">
                  <PbInput id="img-h" value={settings.height || ''} onChange={v => set('height', v)} placeholder="200" />
                </Field>
              </div>
              <Field label="Arrondi des coins" htmlFor="img-radius">
                <PbSelect id="img-radius" value={settings.borderRadius || ''} onChange={v => set('borderRadius', v)} options={[
                  ['', 'Aucun'], ['4px', 'Léger'], ['8px', 'Moyen'], ['12px', 'Grand'],
                  ['16px', 'Très grand'], ['50%', 'Circulaire'],
                ]} />
              </Field>
              <Field label="Ajustement" htmlFor="img-fit">
                <PbSelect id="img-fit" value={settings.objectFit || 'cover'} onChange={v => set('objectFit', v)} options={[
                  ['cover', 'Remplir (cover)'], ['contain', 'Contenir (contain)'],
                  ['fill', 'Étirer (fill)'], ['none', 'Aucun'],
                ]} />
              </Field>
            </div>
          </>
        )}

        {/* ── VIDEO ── */}
        {element.type === 'video' && (
          <div className="pb-settings-group">
            <GroupTitle>Vidéo YouTube / Vimeo</GroupTitle>
            <Field label="URL de la vidéo" htmlFor="vid-src" hint="Formats acceptés : youtube.com/watch?v=… ou youtu.be/…">
              <PbInput id="vid-src" value={settings.src || ''} onChange={v => set('src', v)} placeholder="https://www.youtube.com/watch?v=..." />
            </Field>
            <Field label="Marge du bas" htmlFor="vid-margin">
              <PbSelect id="vid-margin" value={settings.margin || 'mb-3'} onChange={v => set('margin', v)} options={[
                ['mb-0', 'Aucune'], ['mb-2', 'Petite'], ['mb-3', 'Normale'], ['mb-5', 'Grande'],
              ]} />
            </Field>
          </div>
        )}

        {/* ── BUTTON ── */}
        {element.type === 'button' && (
          <>
            <div className="pb-settings-group">
              <GroupTitle>Contenu</GroupTitle>
              <Field label="Texte du bouton" htmlFor="btn-text">
                <PbInput id="btn-text" value={settings.text || ''} onChange={v => set('text', v)} placeholder="Cliquez ici" />
              </Field>
              <Field label="Lien (URL)" htmlFor="btn-href">
                <PbInput id="btn-href" value={settings.href || ''} onChange={v => set('href', v)} placeholder="#section ou https://..." />
              </Field>
              <Field label="Ouverture" htmlFor="btn-target">
                <PbSelect id="btn-target" value={settings.target || '_self'} onChange={v => set('target', v)} options={[
                  ['_self', 'Même fenêtre'], ['_blank', 'Nouvel onglet'],
                ]} />
              </Field>
            </div>
            <div className="pb-settings-group">
              <GroupTitle>Apparence</GroupTitle>
              <Field label="Style de couleur" htmlFor="btn-variant">
                <PbSelect id="btn-variant" value={settings.variant || 'btn-primary'} onChange={v => set('variant', v)} options={[
                  ['btn-primary', 'Bleu (primaire)'], ['btn-secondary', 'Gris'], ['btn-success', 'Vert'],
                  ['btn-danger', 'Rouge'], ['btn-warning', 'Orange'], ['btn-info', 'Cyan'],
                  ['btn-light', 'Clair'], ['btn-dark', 'Sombre'], ['btn-link', 'Lien texte'],
                  ['btn-outline-primary', 'Contour bleu'], ['btn-outline-dark', 'Contour sombre'],
                ]} />
              </Field>
              <Field label="Taille" htmlFor="btn-size">
                <PbSelect id="btn-size" value={settings.size || ''} onChange={v => set('size', v)} options={[
                  ['btn-sm', 'Petit'], ['', 'Normal'], ['btn-lg', 'Grand'],
                ]} />
              </Field>
              <Field label="Alignement" htmlFor="btn-align">
                <PbSelect id="btn-align" value={settings.textAlign || 'text-start'} onChange={v => set('textAlign', v)} options={[
                  ['text-start', 'Gauche'], ['text-center', 'Centré'], ['text-end', 'Droite'],
                ]} />
              </Field>
            </div>
          </>
        )}

        {/* ── ICON ── */}
        {element.type === 'icon' && (
          <div className="pb-settings-group">
            <GroupTitle>Icône</GroupTitle>
            <Field label="Nom de l'icône Lucide" htmlFor="ico-name">
              <PbSelect id="ico-name" value={settings.name || 'Smile'} onChange={v => set('name', v)} options={[
                ['Smile', '😊 Smile'], ['Heart', '❤ Heart'], ['Star', '⭐ Star'], ['Coffee', '☕ Coffee'],
                ['CheckCircle', '✅ CheckCircle'], ['AlertCircle', '⚠ AlertCircle'], ['Calendar', '📅 Calendar'],
                ['MapPin', '📍 MapPin'], ['Phone', '📞 Phone'], ['Mail', '✉ Mail'],
                ['ThumbsUp', '👍 ThumbsUp'], ['User', '👤 User'], ['Award', '🏆 Award'],
                ['Bookmark', '🔖 Bookmark'], ['Globe', '🌍 Globe'], ['Zap', '⚡ Zap'],
                ['Shield', '🛡 Shield'], ['Gift', '🎁 Gift'], ['Home', '🏠 Home'],
                ['Settings', '⚙ Settings'], ['Search', '🔍 Search'], ['Download', '⬇ Download'],
                ['Upload', '⬆ Upload'], ['Share2', '↗ Share'], ['Lock', '🔒 Lock'],
                ['Unlock', '🔓 Unlock'], ['Camera', '📷 Camera'], ['Music', '🎵 Music'],
              ]} />
            </Field>
            <Field label="Taille (px)" htmlFor="ico-size">
              <PbInput id="ico-size" type="number" value={settings.size || 32} onChange={v => set('size', v)} min={8} max={120} />
            </Field>
            <Field label="Couleur" htmlFor="ico-color">
              <ColorRow id="ico-color" value={settings.color || '#3b6ef8'} onChange={v => set('color', v)} />
            </Field>
          </div>
        )}

        {/* ── CARD ── */}
        {element.type === 'card' && (
          <>
            <div className="pb-settings-group">
              <GroupTitle>Contenu</GroupTitle>
              <Field label="Titre" htmlFor="card-title">
                <PbInput id="card-title" value={settings.title || ''} onChange={v => set('title', v)} />
              </Field>
              <Field label="Description" htmlFor="card-text">
                <PbTextarea id="card-text" value={settings.text || ''} onChange={v => set('text', v)} rows={3} />
              </Field>
              <Field label="URL de l'image" htmlFor="card-img">
                <PbInput id="card-img" value={settings.imageSrc || ''} onChange={v => set('imageSrc', v)} placeholder="https://..." />
              </Field>
            </div>
            <div className="pb-settings-group">
              <GroupTitle>Bouton de la carte</GroupTitle>
              <Field label="Texte du bouton" htmlFor="card-btntxt">
                <PbInput id="card-btntxt" value={settings.buttonText || ''} onChange={v => set('buttonText', v)} />
              </Field>
              <Field label="Lien du bouton" htmlFor="card-btnhref">
                <PbInput id="card-btnhref" value={settings.buttonHref || ''} onChange={v => set('buttonHref', v)} placeholder="#" />
              </Field>
              <Field label="Style du bouton" htmlFor="card-btnvar">
                <PbSelect id="card-btnvar" value={settings.variant || 'btn-primary'} onChange={v => set('variant', v)} options={[
                  ['btn-primary', 'Bleu'], ['btn-secondary', 'Gris'], ['btn-success', 'Vert'],
                  ['btn-outline-primary', 'Contour bleu'],
                ]} />
              </Field>
            </div>
          </>
        )}

        {/* ── ALERT ── */}
        {element.type === 'alert' && (
          <div className="pb-settings-group">
            <GroupTitle>Alerte</GroupTitle>
            <Field label="Message" htmlFor="alert-content">
              <PbTextarea id="alert-content" value={settings.content || ''} onChange={v => set('content', v)} rows={3} />
            </Field>
            <Field label="Type" htmlFor="alert-variant">
              <PbSelect id="alert-variant" value={settings.variant || 'alert-info'} onChange={v => set('variant', v)} options={[
                ['alert-success', '✅ Succès (vert)'], ['alert-info', 'ℹ️ Information (bleu)'],
                ['alert-warning', '⚠️ Avertissement (jaune)'], ['alert-danger', '🚨 Danger (rouge)'],
                ['alert-primary', 'Primaire'], ['alert-secondary', 'Secondaire'],
              ]} />
            </Field>
            <Switch id="alert-dismissible" checked={settings.dismissible} onChange={v => set('dismissible', v)} label="Bouton Fermer" />
          </div>
        )}

        {/* ── TESTIMONIAL ── */}
        {element.type === 'testimonial' && (
          <>
            <div className="pb-settings-group">
              <GroupTitle>Témoignage</GroupTitle>
              <Field label="Citation" htmlFor="t-quote">
                <PbTextarea id="t-quote" value={settings.quote || ''} onChange={v => set('quote', v)} rows={4} placeholder="Ce service est excellent..." />
              </Field>
              <Field label="Auteur" htmlFor="t-author">
                <PbInput id="t-author" value={settings.author || ''} onChange={v => set('author', v)} placeholder="Prénom Nom" />
              </Field>
              <Field label="Rôle / Poste" htmlFor="t-role">
                <PbInput id="t-role" value={settings.role || ''} onChange={v => set('role', v)} placeholder="Directeur, Client..." />
              </Field>
              <Field label="URL de l'avatar" htmlFor="t-avatar">
                <PbInput id="t-avatar" value={settings.avatarSrc || ''} onChange={v => set('avatarSrc', v)} placeholder="https://..." />
              </Field>
              <Field label="Nombre d'étoiles" htmlFor="t-stars">
                <PbSelect id="t-stars" value={String(settings.stars || 5)} onChange={v => set('stars', parseInt(v))} options={[
                  ['5', '⭐⭐⭐⭐⭐ (5)'], ['4', '⭐⭐⭐⭐ (4)'], ['3', '⭐⭐⭐ (3)'],
                  ['2', '⭐⭐ (2)'], ['1', '⭐ (1)'], ['0', 'Aucune'],
                ]} />
              </Field>
            </div>
            <div className="pb-settings-group">
              <GroupTitle>Couleurs</GroupTitle>
              <Field label="Fond" htmlFor="t-bg">
                <ColorRow id="t-bg" value={settings.backgroundColor || '#f8f9fb'} onChange={v => set('backgroundColor', v)} />
              </Field>
              <Field label="Texte" htmlFor="t-tc">
                <ColorRow id="t-tc" value={settings.textColor || '#0f172a'} onChange={v => set('textColor', v)} />
              </Field>
            </div>
          </>
        )}

        {/* ── CTA ── */}
        {element.type === 'cta' && (
          <>
            <div className="pb-settings-group">
              <GroupTitle>Contenu</GroupTitle>
              <Field label="Titre" htmlFor="cta-title">
                <PbInput id="cta-title" value={settings.title || ''} onChange={v => set('title', v)} placeholder="Prêt à commencer ?" />
              </Field>
              <Field label="Sous-titre" htmlFor="cta-sub">
                <PbTextarea id="cta-sub" value={settings.subtitle || ''} onChange={v => set('subtitle', v)} rows={2} />
              </Field>
              <Field label="Texte du bouton" htmlFor="cta-btn-txt">
                <PbInput id="cta-btn-txt" value={settings.buttonText || ''} onChange={v => set('buttonText', v)} />
              </Field>
              <Field label="Lien du bouton" htmlFor="cta-btn-href">
                <PbInput id="cta-btn-href" value={settings.buttonHref || ''} onChange={v => set('buttonHref', v)} placeholder="#" />
              </Field>
              <Field label="Style du bouton" htmlFor="cta-btn-var">
                <PbSelect id="cta-btn-var" value={settings.buttonVariant || 'btn-primary'} onChange={v => set('buttonVariant', v)} options={[
                  ['btn-primary', 'Bleu'], ['btn-light', 'Blanc'], ['btn-outline-light', 'Contour blanc'],
                  ['btn-dark', 'Sombre'], ['btn-success', 'Vert'],
                ]} />
              </Field>
            </div>
            <div className="pb-settings-group">
              <GroupTitle>Apparence</GroupTitle>
              <Field label="Couleur de fond" htmlFor="cta-bg">
                <ColorRow id="cta-bg" value={settings.backgroundColor || '#3b6ef8'} onChange={v => set('backgroundColor', v)} />
              </Field>
              <Field label="Couleur du texte" htmlFor="cta-color">
                <ColorRow id="cta-color" value={settings.textColor || '#ffffff'} onChange={v => set('textColor', v)} />
              </Field>
            </div>
          </>
        )}

        </div> {/* End dynamic visibility wrapper */}

        {/* ── GLOBAL ADVANCED: Gradient, Shadow, Responsive ── */}
        <div style={{ display: activeTab === 'advanced' ? 'block' : 'none' }}>
        <Collapsible title="Dégradé d'arrière-plan" defaultOpen={true}>
          <Field label="Couleur de départ" htmlFor="grad-from">
            <ColorRow id="grad-from" value={settings.gradientFrom || ''} onChange={v => set('gradientFrom', v)} />
          </Field>
          <Field label="Couleur de fin" htmlFor="grad-to">
            <ColorRow id="grad-to" value={settings.gradientTo || ''} onChange={v => set('gradientTo', v)} />
          </Field>
          <Field label="Direction" htmlFor="grad-dir">
            <PbSelect id="grad-dir" value={settings.gradientDir || 'to bottom'} onChange={v => set('gradientDir', v)} options={[
              ['to bottom', '⬇ Haut → Bas'],
              ['to right', '➡ Gauche → Droite'],
              ['to bottom right', '↘ Diagonale'],
              ['to top', '⬆ Bas → Haut'],
              ['135deg', '↗ 135°'],
            ]} />
          </Field>
          {settings.gradientFrom && settings.gradientTo && (
            <div style={{
              height: 32, borderRadius: 6, marginTop: 4,
              background: `linear-gradient(${settings.gradientDir || 'to bottom'}, ${settings.gradientFrom}, ${settings.gradientTo})`,
              border: '1px solid var(--pb-border)',
            }} />
          )}
          {(settings.gradientFrom || settings.gradientTo) && (
            <button type="button" className="pb-btn" style={{ width: '100%', marginTop: '.5rem', fontSize: '.75rem' }}
              onClick={() => { set('gradientFrom', ''); set('gradientTo', ''); }}>
              Effacer le dégradé
            </button>
          )}
        </Collapsible>

        <Collapsible title="Ombre portée">
          <Field label="Présélection d'ombre" htmlFor="shadow-preset">
            <PbSelect id="shadow-preset" value={settings.boxShadow || ''} onChange={v => set('boxShadow', v)} options={[
              ['', 'Aucune'],
              ['0 1px 3px rgba(0,0,0,.07)', 'Très légère'],
              ['0 4px 12px rgba(0,0,0,.08)', 'Légère'],
              ['0 8px 24px rgba(0,0,0,.12)', 'Moyenne'],
              ['0 16px 48px rgba(0,0,0,.16)', 'Prononcée'],
              ['0 24px 64px rgba(0,0,0,.20)', 'Forte'],
              ['inset 0 2px 8px rgba(0,0,0,.08)', 'Ombre intérieure'],
            ]} />
          </Field>
          {settings.boxShadow && (
            <div style={{
              height: 40, borderRadius: 8, marginTop: 4,
              background: 'var(--pb-surface)',
              boxShadow: settings.boxShadow,
              border: '1px solid var(--pb-border)',
            }} />
          )}
        </Collapsible>

        <Collapsible title="Responsive — Visibilité">
          <p style={{ fontSize: '.72rem', color: 'var(--pb-text-3)', marginBottom: '.75rem', lineHeight: 1.5 }}>
            Masquez cet élément sur certains appareils. La classe Bootstrap correspondante sera appliquée à l&apos;export HTML.
          </p>
          <Switch
            id="resp-hide-mobile"
            checked={settings.hideMobile}
            onChange={v => set('hideMobile', v)}
            label="Masquer sur mobile"
          />
          <Switch
            id="resp-hide-tablet"
            checked={settings.hideTablet}
            onChange={v => set('hideTablet', v)}
            label="Masquer sur tablette"
          />
          <Switch
            id="resp-hide-desktop"
            checked={settings.hideDesktop}
            onChange={v => set('hideDesktop', v)}
            label="Masquer sur bureau"
          />
        </Collapsible>

        <Collapsible title="Classes CSS personnalisées" defaultOpen={true}>
          <Field label="Classes CSS" htmlFor="g-class" hint="Ajoutez des classes Bootstrap ou personnalisées">
            <PbInput id="g-class" value={settings.className || ''} onChange={v => set('className', v)} placeholder="shadow-lg border rounded-4..." />
          </Field>
        </Collapsible>
        </div> {/* End advanced wrapper */}

      </div>
    </div>
  );
}


const TYPE_LABELS = {
  section: 'Section', hero: 'Hero', row: 'Grille', column: 'Colonne',
  text: 'Texte', image: 'Image', video: 'Vidéo', button: 'Bouton',
  icon: 'Icône', card: 'Carte', alert: 'Alerte', spacer: 'Espacement',
  separator: 'Séparateur', testimonial: 'Témoignage', cta: 'Appel à l\'action',
};
