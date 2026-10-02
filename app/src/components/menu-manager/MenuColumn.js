import React, { useState } from "react";
import MenuItemRow from "./MenuItemRow";
import { Plus, ArrowLeft } from "lucide-react";

export default function MenuColumn({
  title,
  count = 0,
  items = [],
  selectedItem = null,
  allMenus = [],
  onSelectItem,
  onAddItem,
  addBtnLabel = "+ Ajouter",
  onMoveUp,
  onMoveDown,
  onMakeSubItem,
  onEdit,
  onMoveTo,
  onDuplicate,
  onDelete,
  onReorderItems,
  emptyMessage = "Aucun élément à ce niveau.",
  onBack = null,
  backLabel = "Retour"
}) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e, id) => {
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e, targetId) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    if (onReorderItems) {
      onReorderItems(draggedId, targetId);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="menu-column">
      {/* En-tête de la colonne */}
      <div className="menu-column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="ae-icon-button"
              style={{ width: '28px', height: '28px', padding: 0 }}
              title={backLabel}
              aria-label={backLabel}
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <span className="menu-column-title" title={title}>
            {title}
          </span>
        </div>
        <span className="menu-column-counter">{count}</span>
      </div>

      {/* Liste scrollable des éléments du niveau */}
      <div className="menu-column-body">
        {items.length > 0 ? (
          items.map((item, index) => {
            const hasChildren = allMenus.some(
              m => (m.parentId === item.id || String(m.parentId) === String(item.id))
            );
            const isSelected = selectedItem && String(selectedItem.id) === String(item.id);
            const canGoUp = index > 0;
            const canGoDown = index < items.length - 1;
            const canMakeSubItem = !item.parentId || index > 0;

            return (
              <MenuItemRow
                key={item.id}
                item={item}
                isSelected={isSelected}
                hasChildren={hasChildren}
                onSelect={onSelectItem}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onMakeSubItem={onMakeSubItem}
                onEdit={onEdit}
                onMoveTo={onMoveTo}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                canGoUp={canGoUp}
                canGoDown={canGoDown}
                canMakeSubItem={canMakeSubItem}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={draggedId === item.id}
                isDragOver={dragOverId === item.id}
              />
            );
          })
        ) : (
          <div className="menu-column-empty">
            <span>{emptyMessage}</span>
          </div>
        )}
      </div>

      {/* Pied de colonne : Bouton Ajouter */}
      {onAddItem && (
        <div className="menu-column-footer">
          <button
            type="button"
            onClick={onAddItem}
            className="menu-column-add-btn"
            aria-label={addBtnLabel}
          >
            <Plus size={16} />
            <span>{addBtnLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
