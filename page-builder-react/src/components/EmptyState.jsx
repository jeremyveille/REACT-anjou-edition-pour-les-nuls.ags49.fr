import { PlusCircle, LayoutTemplate } from 'lucide-react';

export default function EmptyState({ onClick, onOpenTemplates }) {
  return (
    <div className="pb-empty-state-container">
      <div className="pb-empty-icon-ring" aria-hidden="true">
        <PlusCircle size={30} />
      </div>

      <h3 className="pb-empty-title">Votre canvas est vide</h3>

      <p className="pb-empty-desc">
        Choisissez un template pour démarrer rapidement,<br />
        ou glissez des widgets depuis la barre latérale.
      </p>

      <div className="pb-empty-actions">
        <button
          type="button"
          className="pb-btn pb-btn-primary"
          onClick={onOpenTemplates}
          aria-label="Ouvrir la bibliothèque de templates"
        >
          <LayoutTemplate size={15} />
          Choisir un template
        </button>
        <button
          type="button"
          className="pb-btn"
          onClick={onClick}
          aria-label="Créer une section vide"
        >
          <PlusCircle size={15} />
          Section vide
        </button>
      </div>
    </div>
  );
}
