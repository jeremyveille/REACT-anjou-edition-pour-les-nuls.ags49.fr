import { useState } from 'react';
import { LayoutTemplate, X, Check, Sparkles } from 'lucide-react';
import { TEMPLATES, instantiateTemplate } from '../data/templates';
import { useBuilder } from '../store/builderStore';
import { sanitizeBuilderData } from '../utils/sanitize';

const CATEGORY_ORDER = ['Démarrage', 'Business', 'Créatif', 'Contenu'];

export default function TemplatesModal({ onClose }) {
  const { importLayout, elements } = useBuilder();
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  const categories = CATEGORY_ORDER.filter(cat =>
    TEMPLATES.some(t => t.category === cat)
  );

  const handleApply = () => {
    if (!selected) return;

    const hasContent = elements.length > 0;
    if (hasContent) {
      if (!confirm('Charger ce template va remplacer votre contenu actuel. Continuer ?')) return;
    }

    const tree = instantiateTemplate(selected);
    importLayout(sanitizeBuilderData(tree));
    onClose();
  };

  const selectedTpl = TEMPLATES.find(t => t.id === selected);

  return (
    <div
      className="pb-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Bibliothèque de templates"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pb-modal pb-templates-modal">

        {/* Header */}
        <div className="pb-modal-header">
          <h2 className="pb-modal-title">
            <LayoutTemplate size={18} style={{ color: 'var(--pb-primary)' }} />
            Bibliothèque de templates
          </h2>
          <button type="button" className="pb-btn pb-btn-icon-only" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="pb-modal-body pb-templates-body">
          <p className="pb-templates-intro">
            <Sparkles size={14} style={{ color: 'var(--pb-primary)', flexShrink: 0 }} />
            Choisissez un template pour démarrer rapidement. Vous pourrez tout modifier ensuite.
          </p>

          {categories.map(cat => (
            <div key={cat} className="pb-templates-category">
              <div className="pb-templates-category-label">{cat}</div>
              <div className="pb-templates-grid">
                {TEMPLATES.filter(t => t.category === cat).map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    className={[
                      'pb-template-card',
                      selected === tpl.id ? 'selected' : '',
                      hovered === tpl.id ? 'hovered' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setSelected(tpl.id === selected ? null : tpl.id)}
                    onMouseEnter={() => setHovered(tpl.id)}
                    onMouseLeave={() => setHovered(null)}
                    aria-pressed={selected === tpl.id}
                    aria-label={`Template ${tpl.name}`}
                  >
                    {/* Preview emoji / thumbnail */}
                    <div className="pb-template-preview">
                      <span className="pb-template-emoji">{tpl.preview}</span>
                      {selected === tpl.id && (
                        <div className="pb-template-check">
                          <Check size={18} />
                        </div>
                      )}
                    </div>

                    <div className="pb-template-info">
                      <div className="pb-template-name">{tpl.name}</div>
                      <div className="pb-template-desc">{tpl.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pb-modal-footer">
          <button type="button" className="pb-btn" onClick={onClose}>Annuler</button>
          <button
            type="button"
            className="pb-btn pb-btn-primary"
            onClick={handleApply}
            disabled={!selected}
          >
            <LayoutTemplate size={14} />
            {selectedTpl ? `Charger « ${selectedTpl.name} »` : 'Choisir un template'}
          </button>
        </div>
      </div>
    </div>
  );
}
