
import { useState } from 'react';
import { widgets, WIDGET_CATEGORIES } from '../data/widgets';
import WidgetItem from './WidgetItem';
import { Search, Info } from 'lucide-react';

const CATEGORY_ICONS = {
  [WIDGET_CATEGORIES.LAYOUT]:     '⊞',
  [WIDGET_CATEGORIES.CONTENT]:    '✏',
  [WIDGET_CATEGORIES.COMPONENTS]: '⧫',
};

export default function Sidebar() {
  const [query, setQuery] = useState('');

  const categories = Object.values(WIDGET_CATEGORIES);

  const filteredWidgets = query.trim()
    ? widgets.filter(w =>
        w.label.toLowerCase().includes(query.toLowerCase()) ||
        w.description.toLowerCase().includes(query.toLowerCase())
      )
    : null;

  const hasResults = !filteredWidgets || filteredWidgets.length > 0;

  return (
    <aside className="builder-sidebar" aria-label="Catalogue de widgets">

      {/* Header */}
      <div className="pb-sidebar-header">
        <p className="pb-sidebar-title">Widgets</p>
        <p className="pb-sidebar-subtitle">
          Glissez un élément vers le canvas pour l&apos;ajouter.
        </p>
      </div>

      {/* Search */}
      <div className="pb-search-wrap">
        <div className="pb-search">
          <Search size={13} style={{ color: 'var(--pb-text-3)', flexShrink: 0 }} aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher un widget…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Rechercher un widget"
          />
        </div>
      </div>

      {/* Widget list */}
      <div className="pb-sidebar-scroll">

        {/* Search results */}
        {filteredWidgets && (
          <>
            {filteredWidgets.length === 0 ? (
              <div className="pb-no-results">
                Aucun widget ne correspond à &laquo;&nbsp;{query}&nbsp;&raquo;
              </div>
            ) : (
              <div>
                <div className="pb-category-label">Résultats ({filteredWidgets.length})</div>
                {filteredWidgets.map(w => (
                  <WidgetItem
                    key={w.type}
                    type={w.type}
                    label={w.label}
                    description={w.description}
                    icon={w.icon}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Normal category view */}
        {!filteredWidgets && categories.map(category => {
          const categoryWidgets = widgets.filter(w => w.category === category);
          if (categoryWidgets.length === 0) return null;

          return (
            <div key={category}>
              <div className="pb-category-label">
                <span aria-hidden="true">{CATEGORY_ICONS[category]}</span>
                {category}
              </div>
              {categoryWidgets.map(w => (
                <WidgetItem
                  key={w.type}
                  type={w.type}
                  label={w.label}
                  description={w.description}
                  icon={w.icon}
                />
              ))}
            </div>
          );
        })}

        {!hasResults && null}
      </div>

      {/* Footer / Help */}
      <div className="pb-sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.375rem', marginBottom: '.5rem' }}>
          <Info size={12} style={{ color: 'var(--pb-text-3)' }} aria-hidden="true" />
          <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--pb-text-2)' }}>
            Aide rapide
          </span>
        </div>
        <div className="pb-help-item">
          <span className="pb-help-dot" aria-hidden="true" />
          <span>Cliquez pour sélectionner un élément</span>
        </div>
        <div className="pb-help-item">
          <span className="pb-help-dot" aria-hidden="true" />
          <span>Double-cliquez sur un texte pour l&apos;éditer</span>
        </div>
        <div className="pb-help-item">
          <span className="pb-help-dot" aria-hidden="true" />
          <span>
            <kbd style={{ fontSize: '.65rem', background: 'var(--pb-surface-3)', border: '1px solid var(--pb-border)', borderRadius: '3px', padding: '0 3px' }}>Ctrl+Z</kbd>
            {' '}annuler,{' '}
            <kbd style={{ fontSize: '.65rem', background: 'var(--pb-surface-3)', border: '1px solid var(--pb-border)', borderRadius: '3px', padding: '0 3px' }}>Ctrl+Y</kbd>
            {' '}rétablir
          </span>
        </div>
      </div>
    </aside>
  );
}
