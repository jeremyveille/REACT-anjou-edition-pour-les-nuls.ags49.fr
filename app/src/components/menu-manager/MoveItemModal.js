import React, { useState, useEffect } from "react";
import { FolderInput, X } from "lucide-react";

export default function MoveItemModal({
  isOpen,
  item,
  allMenus = [],
  onClose,
  onCancel,
  onConfirm,
  onConfirmMove,
  getFlattenedMenuTree,
  getDescendantIds,
  normalizeParentId
}) {
  const [selectedParentId, setSelectedParentId] = useState("");

  const handleClose = onCancel || onClose;
  const handleConfirm = onConfirm || onConfirmMove;

  useEffect(() => {
    if (item) {
      const pId = normalizeParentId ? normalizeParentId(item.parentId) : item.parentId;
      setSelectedParentId(pId || "");
    }
  }, [item, normalizeParentId]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (handleConfirm) {
      handleConfirm(item.id, selectedParentId === "" ? null : selectedParentId);
    }
  };

  const flatTree = getFlattenedMenuTree ? getFlattenedMenuTree(allMenus) : [];
  const descendantIds = (getDescendantIds && item) ? getDescendantIds(item.id, allMenus) : [];
  const excludedIds = [item.id, ...descendantIds];

  return (
    <div 
      className="menu-modal-overlay" 
      onClick={handleClose} 
      aria-modal="true" 
      role="dialog"
      aria-label="Déplacer l'élément"
    >
      <div className="menu-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="menu-modal-header">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderInput size={20} color="#004b7a" />
            Déplacer « {item.title} »
          </h4>
          <button
            type="button"
            onClick={handleClose}
            className="ae-icon-button"
            aria-label="Fermer la boîte de dialogue"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="menu-modal-body">
            <p>
              Sélectionnez la catégorie ou le sous-menu de destination pour <strong>{item.title}</strong> :
            </p>

            <div className="menu-editor-form-group">
              <label htmlFor="move-destination-select" className="menu-editor-label">
                Nouvel emplacement parent :
              </label>
              <select
                id="move-destination-select"
                className="menu-editor-select"
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
              >
                <option value="">-- Racine (Niveau 1 - Catégorie principale) --</option>
                {flatTree.length > 0 ? (
                  flatTree
                    .filter(m => !excludedIds.includes(m.id))
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {"\u00a0\u00a0".repeat(m.depth || 0) + (m.depth > 0 ? "└── " : "") + m.title}
                      </option>
                    ))
                ) : (
                  allMenus
                    .filter(m => !excludedIds.includes(m.id))
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))
                )}
              </select>
              <span style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '4px' }}>
                L'élément et ses sous-niveaux seront déplacés sans boucle hiérarchique.
              </span>
            </div>
          </div>

          <div className="menu-modal-footer">
            <button
              type="button"
              onClick={handleClose}
              className="ae-button"
              style={{ background: '#e2e8f0', color: '#334155' }}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="ae-button ae-button--primary"
              aria-label="Déplacer l'élément"
            >
              <FolderInput size={16} /> Déplacer l'élément
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
