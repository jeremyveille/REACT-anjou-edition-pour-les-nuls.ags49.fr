import React, { useState, useRef, useEffect } from "react";
import { 
  GripVertical, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown, 
  MoreVertical, 
  Edit3, 
  FolderInput, 
  Copy, 
  Trash2,
  CornerDownRight
} from "lucide-react";

export default function MenuItemRow({
  item,
  isSelected,
  hasChildren,
  onSelect,
  onMoveUp,
  onMoveDown,
  onMakeSubItem,
  onEdit,
  onMoveTo,
  onDuplicate,
  onDelete,
  canGoUp,
  canGoDown,
  canMakeSubItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver
}) {
  const [contextOpen, setContextOpen] = useState(false);
  const contextRef = useRef(null);

  // Fermer le menu contextuel lors d'un clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextRef.current && !contextRef.current.contains(e.target)) {
        setContextOpen(false);
      }
    };
    if (contextOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextOpen]);

  // Symboles d'icônes
  const renderIcon = (iconName) => {
    switch (iconName) {
      case "Home": return "🏠";
      case "Newspaper": return "📰";
      case "HelpCircle": return "❓";
      case "Layers": return "🧩";
      case "Link": return "🔗";
      default: return "📄";
    }
  };

  const isActive = item.status === "Actif" || item.isActive || item.enabled;

  return (
    <div
      className={`menu-item-row ${isSelected ? "is-selected" : ""} ${isDragging ? "is-dragging" : ""} ${isDragOver ? "is-drag-over" : ""}`}
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${item.title}, ${hasChildren ? "possède des sous-catégories" : "sans sous-catégorie"}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(e, item.id);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        onDragEnd(e);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver(e, item.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e, item.id);
      }}
    >
      {/* Côté gauche : Poignée, icône, titre et statut */}
      <div className="menu-item-row-left">
        <div 
          className="menu-item-drag-handle" 
          title="Faites glisser pour réordonner dans ce niveau"
          onClick={(e) => e.stopPropagation()}
          aria-hidden="true"
        >
          <GripVertical size={16} />
        </div>

        <span className="menu-item-row-icon" aria-hidden="true">
          {renderIcon(item.icon)}
        </span>

        <div className="menu-item-row-details">
          <span className="menu-item-row-title">{item.title}</span>
          <div className="menu-item-row-meta">
            <span 
              className={`menu-item-badge-status ${isActive ? "active" : "inactive"}`} 
              title={isActive ? "Actif" : "Inactif"}
              aria-label={isActive ? "Statut Actif" : "Statut Inactif"}
            />
            <span>{item.type === "shortcode" ? "Shortcode" : item.type === "external" || item.type === "external-link" ? "Lien externe" : "Lien interne"}</span>
          </div>
        </div>
      </div>

      {/* Côté droit : Chevron si enfants + Menu contextuel */}
      <div className="menu-item-row-right" onClick={(e) => e.stopPropagation()}>
        {/* Boutons d'accessibilité clavier indispensables pour RGAA et tests Jest */}
        <div className="ae-accessibility-actions" style={{ display: 'inline-flex', gap: '2px' }}>
          <button
            type="button"
            onClick={() => onMoveUp(item.id)}
            disabled={!canGoUp}
            className="menu-action-btn-accessible"
            aria-label={`Monter l'élément ${item.title}`}
            title="Monter"
            style={{ padding: '2px 4px', background: 'transparent', border: 'none', cursor: canGoUp ? 'pointer' : 'default', color: canGoUp ? '#64748b' : '#cbd5e1' }}
          >
            <ChevronUp size={14} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onMoveDown(item.id)}
            disabled={!canGoDown}
            className="menu-action-btn-accessible"
            aria-label={`Descendre l'élément ${item.title}`}
            title="Descendre"
            style={{ padding: '2px 4px', background: 'transparent', border: 'none', cursor: canGoDown ? 'pointer' : 'default', color: canGoDown ? '#64748b' : '#cbd5e1' }}
          >
            <ChevronDown size={14} aria-hidden="true" />
          </button>

          {canMakeSubItem && (
            <button
              type="button"
              onClick={() => onMakeSubItem(item.id)}
              className="menu-action-btn-accessible"
              aria-label="Déplacer en sous-menu de l'élément précédent"
              title="Déplacer en sous-menu de l'élément précédent"
              style={{ padding: '2px 4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <CornerDownRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Indicateur de sous-catégories existantes */}
        {hasChildren && (
          <span className="menu-item-has-children-badge" title="Cette catégorie contient des sous-éléments" aria-label="Possède des sous-catégories">
            <ChevronRight size={16} />
          </span>
        )}

        {/* Bouton d'action menu contextuel */}
        <div ref={contextRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setContextOpen(prev => !prev)}
            className="menu-item-more-btn"
            aria-label={`Options pour ${item.title}`}
            aria-expanded={contextOpen}
            title="Options"
          >
            <MoreVertical size={16} />
          </button>

          {contextOpen && (
            <div className="menu-context-popup" role="menu">
              <button
                type="button"
                className="menu-context-action-btn"
                role="menuitem"
                onClick={() => {
                  setContextOpen(false);
                  onEdit(item);
                }}
              >
                <Edit3 size={14} /> Modifier
              </button>

              <button
                type="button"
                className="menu-context-action-btn"
                role="menuitem"
                onClick={() => {
                  setContextOpen(false);
                  onMoveTo(item);
                }}
              >
                <FolderInput size={14} /> Déplacer vers...
              </button>

              <button
                type="button"
                className="menu-context-action-btn"
                role="menuitem"
                onClick={() => {
                  setContextOpen(false);
                  onDuplicate(item);
                }}
              >
                <Copy size={14} /> Dupliquer
              </button>

              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

              <button
                type="button"
                className="menu-context-action-btn danger"
                role="menuitem"
                onClick={() => {
                  setContextOpen(false);
                  onDelete(item);
                }}
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
