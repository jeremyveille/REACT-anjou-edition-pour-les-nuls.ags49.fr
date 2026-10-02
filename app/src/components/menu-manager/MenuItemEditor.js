import React, { useState, useEffect, useRef } from "react";
import { Save, Plus, X, Trash2, FolderInput, Copy, CheckCircle2 } from "lucide-react";

export default function MenuItemEditor({
  item,
  isNew = false,
  presetParentId = null,
  allMenus = [],
  pagesList = [],
  textsData = {},
  flipbooks = [],
  onSave,
  onCancel,
  onMoveTo,
  onDuplicate,
  onDelete,
  normalizeParentId,
  getFlattenedMenuTree,
  getDescendantIds
}) {
  const [title, setTitle] = useState(item ? (item.title || item.label || "") : "");
  const [type, setType] = useState(item ? (item.type || "internal") : "internal-link");
  const [status, setStatus] = useState(item ? (item.status || (item.isActive ? "Actif" : "Inactif")) : "Actif");
  const [url, setUrl] = useState(item ? (item.url || item.slug || "") : "");
  const [shortcode, setShortcode] = useState(item ? (item.shortcode || "") : "");
  const [parentId, setParentId] = useState(item ? (normalizeParentId ? normalizeParentId(item.parentId) : item.parentId) || "" : (presetParentId || ""));
  const [icon, setIcon] = useState(item ? (item.icon || "Layers") : "Layers");
  const [description, setDescription] = useState(item ? (item.description || "") : "");

  // Synchronisation uniquement si l'ID de l'élément sélectionné change
  const prevItemIdRef = useRef(item ? item.id : null);
  useEffect(() => {
    if (item && item.id !== prevItemIdRef.current) {
      prevItemIdRef.current = item.id;
      setTitle(item.title || item.label || "");
      setType(item.type || "internal");
      setStatus(item.status || (item.isActive ? "Actif" : "Inactif"));
      setUrl(item.url || item.slug || "");
      setShortcode(item.shortcode || "");
      setParentId(normalizeParentId ? normalizeParentId(item.parentId) || "" : "");
      setIcon(item.icon || "Layers");
      setDescription(item.description || "");
    }
  }, [item, normalizeParentId]);

  const handleSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    onSave({
      id: isNew ? null : item?.id,
      title,
      type,
      status,
      url,
      shortcode,
      parentId: parentId === "" ? null : parentId,
      icon,
      description
    });
  };

  const hasChildren = item && allMenus.some(
    m => (m.parentId === item.id || String(m.parentId) === String(item.id))
  );

  const flatTree = getFlattenedMenuTree ? getFlattenedMenuTree(allMenus) : [];
  const excludedIds = (!isNew && item && getDescendantIds)
    ? [item.id, ...getDescendantIds(item.id, allMenus)]
    : [];

  return (
    <div className="menu-editor-panel">
      {/* En-tête du panneau */}
      <div className="menu-editor-header">
        <h4>
          {isNew ? (
            <>
              <Plus size={18} color="#004b7a" />
              Ajouter un élément
            </>
          ) : (
            <>
              <CheckCircle2 size={18} color="#004b7a" />
              Propriétés de « {title || "Élément"} »
            </>
          )}
        </h4>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="ae-icon-button"
            aria-label="Fermer l'éditeur"
            title="Fermer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Formulaire d'édition */}
      <form onSubmit={handleSubmit} className="menu-editor-scroll-body">
        {/* Titre */}
        <div className="menu-editor-form-group">
          <label htmlFor="menu-item-title" className="menu-editor-label">
            Intitulé de l'élément <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="menu-item-title"
            type="text"
            required
            placeholder="ex: Accueil"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="menu-editor-input"
          />
        </div>

        {/* Type et Statut */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="menu-editor-form-group">
            <label htmlFor="menu-item-type" className="menu-editor-label">
              Type d'action
            </label>
            <select
              id="menu-item-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="menu-editor-select"
            >
              <option value="internal">Lien interne (Route)</option>
              <option value="internal-link">Lien interne (Lien)</option>
              <option value="external">Lien externe (URL)</option>
              <option value="shortcode">Contenu dynamique / Action</option>
            </select>
          </div>

          <div className="menu-editor-form-group">
            <label htmlFor="menu-item-status" className="menu-editor-label">
              État de publication
            </label>
            <select
              id="menu-item-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="menu-editor-select"
            >
              <option value="Actif">Actif</option>
              <option value="Inactif">Inactif</option>
            </select>
          </div>
        </div>

        {/* URL / Route si pas un shortcode pur */}
        {type !== "shortcode" && (
          <div className="menu-editor-form-group">
            <label htmlFor="menu-item-url" className="menu-editor-label">
              Adresse URL / Route / Slug <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="menu-item-url"
              type="text"
              required
              placeholder="ex: /contact"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="menu-editor-input"
            />
          </div>
        )}

        {/* Shortcode / Action au clic (masqué si parent avec sous-menus) */}
        {!hasChildren ? (
          <div className="menu-editor-form-group">
            <label htmlFor="menu-item-shortcode" className="menu-editor-label">
              Contenu Dynamique / Action au clic
            </label>
            <input
              id="menu-item-shortcode"
              type="text"
              list="shortcode-options"
              placeholder="Sélectionnez ou saisissez un identifiant..."
              value={shortcode}
              onChange={(e) => setShortcode(e.target.value)}
              className="menu-editor-input font-mono"
            />
            <datalist id="shortcode-options">
              <option value="open_contact_modal">Action : Formulaire de contact</option>
              <option value="toggle_theme">Action : Changer de thème</option>
              <option value="play_speech">Action : Lire bienvenue</option>
              <option value="increase_font">Action : Agrandir texte</option>
              <option value="show_flipbooks">Action : Liste des flipbooks</option>
              <option value="show_videos">Action : Liste des vidéos</option>
              <option value="show_gallery">Action : Galerie photos</option>
              {pagesList && pagesList.map(p => (
                <option key={`page-${p.id}`} value={p.slug || p.title}>Page : {p.title}</option>
              ))}
              {textsData && Object.entries(textsData).map(([key, data]) => (
                <option key={`txt-${key}`} value={key}>Texte : {data.title}</option>
              ))}
              {flipbooks && flipbooks.map(fb => (
                <option key={`fb-${fb.id}`} value={`[PdfFlipbookReader id="${fb.id}"]`}>Flipbook : {fb.title}</option>
              ))}
            </datalist>
            <span style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '2px' }}>
              Choisissez un contenu ou saisissez son identifiant.
            </span>
          </div>
        ) : (
          <div style={{ backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', color: '#64748b' }}>
            ℹ️ Le champ shortcode est masqué car cet élément possède des sous-menus (menu parent).
          </div>
        )}

        {/* Élément parent */}
        <div className="menu-editor-form-group">
          <label htmlFor="menu-item-parent" className="menu-editor-label">
            Élément parent (niveaux illimités)
          </label>
          <select
            id="menu-item-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="menu-editor-select"
          >
            <option value="">-- Aucun parent (Catégorie principale) --</option>
            {flatTree
              .filter(m => !excludedIds.includes(m.id))
              .map(m => (
                <option key={m.id} value={m.id}>
                  {"\u00a0\u00a0".repeat(m.depth || 0) + (m.depth > 0 ? "└── " : "") + m.title}
                </option>
              ))}
          </select>
        </div>

        {/* Icône */}
        <div className="menu-editor-form-group">
          <label htmlFor="menu-item-icon" className="menu-editor-label">
            Icône (Nom du symbole)
          </label>
          <select
            id="menu-item-icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="menu-editor-select"
          >
            <option value="Home">🏠 Accueil (Home)</option>
            <option value="Newspaper">📰 Actualités (Newspaper)</option>
            <option value="HelpCircle">❓ Aide / Contact (HelpCircle)</option>
            <option value="Layers">🧩 Blocs (Layers)</option>
            <option value="Link">🔗 Lien externe (Link)</option>
          </select>
        </div>

        {/* Description courte */}
        <div className="menu-editor-form-group">
          <label htmlFor="menu-item-desc" className="menu-editor-label">
            Description courte
          </label>
          <textarea
            id="menu-item-desc"
            placeholder="Brève description de la fonction de cet élément..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="menu-editor-textarea"
          />
        </div>

        {/* Boutons d'action principaux */}
        <div className="menu-editor-actions-primary">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="ae-button"
              style={{ background: '#e2e8f0', color: '#334155' }}
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            onClick={handleSubmit}
            className="ae-button ae-button--primary"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {isNew ? (
              <>
                <Plus size={16} /> Créer l'élément
              </>
            ) : (
              <>
                <Save size={16} /> Enregistrer
              </>
            )}
          </button>
        </div>

        {/* Actions secondaires si élément existant */}
        {!isNew && item && (
          <div className="menu-editor-actions-secondary">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onMoveTo(item)}
                className="ae-button"
                style={{ fontSize: '0.75rem', padding: '6px 10px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                title="Déplacer vers une autre catégorie"
              >
                <FolderInput size={14} /> Déplacer
              </button>
              <button
                type="button"
                onClick={() => onDuplicate(item)}
                className="ae-button"
                style={{ fontSize: '0.75rem', padding: '6px 10px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                title="Créer une copie"
              >
                <Copy size={14} /> Dupliquer
              </button>
            </div>

            <button
              type="button"
              onClick={() => onDelete(item)}
              className="ae-button ae-button--danger"
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
              title="Supprimer cet élément"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
