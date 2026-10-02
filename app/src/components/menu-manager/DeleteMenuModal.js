import React, { useState } from "react";
import { AlertTriangle, X, Trash2 } from "lucide-react";

export default function DeleteMenuModal({
  isOpen,
  item,
  childCount = 0,
  childrenCount = 0,
  onClose,
  onCancel,
  onConfirm,
  onConfirmDeleteWithChildren,
  onConfirmDeletePromoteChildren
}) {
  const [keepChildren, setKeepChildren] = useState(true);
  const count = childrenCount || childCount || 0;
  const handleClose = onCancel || onClose;

  if (!isOpen || !item) return null;

  const handleConfirmSubmit = () => {
    if (onConfirm) {
      onConfirm(item.id, keepChildren);
    } else if (keepChildren && onConfirmDeletePromoteChildren) {
      onConfirmDeletePromoteChildren(item.id, item.title);
    } else if (onConfirmDeleteWithChildren) {
      onConfirmDeleteWithChildren(item.id, item.title);
    }
  };

  return (
    <div 
      className="menu-modal-overlay" 
      onClick={handleClose} 
      aria-modal="true" 
      role="dialog"
      aria-label="Supprimer la catégorie"
    >
      <div className="menu-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="menu-modal-header">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
            <AlertTriangle size={20} color="#ef4444" />
            Confirmation de suppression
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

        <div className="menu-modal-body">
          <p>
            Voulez-vous vraiment supprimer l'élément <strong>« {item.title} »</strong> ?
          </p>

          {count > 0 ? (
            <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '14px', marginTop: '12px' }}>
              <div style={{ fontWeight: 700, color: '#c2410c', marginBottom: '8px' }}>
                ⚠️ Cette catégorie contient {count} sous-élément{count > 1 ? "s" : ""}.
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.8125rem', color: '#7c2d12' }}>
                Choisissez l'action à appliquer aux sous-éléments :
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', cursor: 'pointer', color: '#1e293b' }}>
                  <input
                    type="radio"
                    name="delete-children-choice"
                    checked={keepChildren}
                    onChange={() => setKeepChildren(true)}
                  />
                  <span>Conserver les sous-éléments (les remonter d'un niveau)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', cursor: 'pointer', color: '#b91c1c' }}>
                  <input
                    type="radio"
                    name="delete-children-choice"
                    checked={!keepChildren}
                    onChange={() => setKeepChildren(false)}
                  />
                  <span>Supprimer la catégorie et tous ses sous-éléments</span>
                </label>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '8px 0 0 0' }}>
              Cette action retirera cet élément du menu de votre site.
            </p>
          )}
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
            type="button"
            onClick={handleConfirmSubmit}
            className="ae-button ae-button--danger"
            aria-label="Confirmer la suppression"
          >
            <Trash2 size={16} /> Confirmer la suppression
          </button>
        </div>
      </div>
    </div>
  );
}
