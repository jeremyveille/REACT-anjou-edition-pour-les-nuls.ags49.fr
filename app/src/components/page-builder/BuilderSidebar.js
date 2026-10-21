import React, { useState, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { BuilderSettings } from './BuilderSettings';
import { 
  BLOCK_DEFINITIONS 
} from './blockRegistry';
import { 
  SECTION_TEMPLATES, 
  instantiateSectionTemplate 
} from './sectionTemplates';
import { TreeStructureView } from './TreeStructureView';
import { 
  Folder,
  Search,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  LayoutTemplate
} from 'lucide-react';

const DraggableWidget = ({ item, onAddBlock }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `widget-${item.type}`,
    data: { type: 'widget', widgetType: item.type }
  });

  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onAddBlock(item.type)}
      className={`pb-widget-item d-flex flex-column align-items-center justify-content-center p-2.5 border rounded-lg transition-all cursor-pointer text-center ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{ 
        touchAction: 'none',
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0'
      }}
      title={item.desc}
    >
      <Icon 
        size={20} 
        className={`mb-1.5 ${
          item.category === 'structure' 
            ? 'text-primary' 
            : item.category === 'sections'
              ? 'text-warning'
              : 'text-success'
        }`} 
      />
      <span className="text-xs font-bold block" style={{ fontSize: '11px' }}>{item.label}</span>
    </div>
  );
};

export const BuilderSidebar = ({
  activeTab,
  setActiveTab,
  onAddBlock,
  onInsertSectionTemplate,
  activeBlock,
  activeBlockId,
  onBlockSettingsChange,
  builderPageCategory,
  setBuilderPageCategory,
  isCollapsed = false,
  // Props pour la vue arborescente (TreeStructureView)
  blocks = [],
  onSelectBlock = () => {},
  onToggleHideBlock = () => {},
  onRemoveBlock = () => {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(true);
  const searchInputRef = useRef(null);

  // Définition des pilules de catégorie
  const CATEGORY_PILLS = [
    { id: 'all', label: 'Tous' },
    { id: 'structure', label: 'Structure' },
    { id: 'content', label: 'Contenu' },
    { id: 'sections', label: 'Modules' },
    { id: 'templates', label: 'Modèles' }
  ];

  // Gestion de l'effacement de la recherche avec restitution du focus
  const handleClearSearch = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Insertion en 1 clic d'un modèle de section
  const handleInsertTemplate = (templateId) => {
    if (typeof onInsertSectionTemplate === 'function') {
      onInsertSectionTemplate(templateId);
    } else if (typeof onAddBlock === 'function') {
      const instantiated = instantiateSectionTemplate(templateId);
      instantiated.forEach(b => onAddBlock(b));
    }
  };

  // Filtrage des widgets
  const allWidgets = Object.values(BLOCK_DEFINITIONS);
  const filteredWidgets = allWidgets.filter(w => {
    const matchesCategory = selectedCategory === 'all' || w.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      w.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const structureWidgets = filteredWidgets.filter(w => w.category === 'structure');
  const contentWidgets = filteredWidgets.filter(w => w.category === 'content');
  const sectionWidgets = filteredWidgets.filter(w => w.category === 'sections');

  // Filtrage des modèles
  const filteredTemplates = SECTION_TEMPLATES.filter(tmpl => {
    const matchesCategory = selectedCategory === 'all' || selectedCategory === 'templates';
    if (!matchesCategory) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tmpl.name.toLowerCase().includes(term) ||
      tmpl.description.toLowerCase().includes(term) ||
      tmpl.category.toLowerCase().includes(term) ||
      (Array.isArray(tmpl.aliases) && tmpl.aliases.some(a => a.toLowerCase().includes(term)))
    );
  });

  return (
    <div 
      className={`builder-sidebar d-flex flex-column h-100 border-end bg-white dark:bg-slate-900 ${isCollapsed ? 'collapsed' : ''}`} 
      style={{ 
        height: '100%', 
        width: isCollapsed ? '0px' : undefined, 
        display: isCollapsed ? 'none' : undefined 
      }}
    >
      {/* Onglets de navigation */}
      <div className="builder-sidebar-tabs d-flex border-bottom bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
        <button 
          type="button"
          aria-pressed={activeTab === 'widgets'}
          id="pb-tab-widgets"
          onClick={() => setActiveTab('widgets')}
          className={`bpb-tab-btn flex-fill py-2.5 text-xs font-bold border-0 cursor-pointer transition-colors ${
            activeTab === 'widgets' 
              ? 'bg-white dark:bg-slate-900 text-primary border-bottom border-primary' 
              : 'text-muted bg-transparent'
          }`}
          style={{ borderBottomWidth: activeTab === 'widgets' ? '2px' : '0' }}
        >
          Bibliothèque
        </button>
        <button 
          type="button"
          aria-pressed={activeTab === 'structure'}
          id="pb-tab-structure"
          data-testid="tab-structure"
          onClick={() => setActiveTab('structure')}
          className={`bpb-tab-btn flex-fill py-2.5 text-xs font-bold border-0 cursor-pointer transition-colors ${
            activeTab === 'structure' 
              ? 'bg-white dark:bg-slate-900 text-primary border-bottom border-primary' 
              : 'text-muted bg-transparent'
          }`}
          style={{ borderBottomWidth: activeTab === 'structure' ? '2px' : '0' }}
        >
          Structure
        </button>
        <button 
          type="button"
          aria-pressed={activeTab === 'settings'}
          id="pb-tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`bpb-tab-btn flex-fill py-2.5 text-xs font-bold border-0 cursor-pointer transition-colors ${
            activeTab === 'settings' 
              ? 'bg-white dark:bg-slate-900 text-primary border-bottom border-primary' 
              : 'text-muted bg-transparent'
          }`}
          style={{ borderBottomWidth: activeTab === 'settings' ? '2px' : '0' }}
        >
          Propriétés {activeBlock && <span className="ae-sidebar-status-dot-blue d-inline-block rounded-circle bg-primary ms-1" style={{ width: '6px', height: '6px' }}></span>}
        </button>
      </div>

      {/* Contenu de l'onglet Bibliothèque (Widgets & Modèles) */}
      {activeTab === 'widgets' && (
        <div className="ae-sidebar-scrollable-body p-3 overflow-y-auto flex-grow-1" style={{ overflowY: 'auto' }}>
          
          {/* Recherche de blocs avec bouton Reset rapide ✕ */}
          <div className="pb-search-container mb-2">
            <div className="position-relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher un composant ou modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    handleClearSearch();
                  }
                }}
                className="db-input text-xs ps-4 pe-4 py-1.5 w-100 pb-search-input"
                aria-label="Rechercher un composant ou modèle"
              />
              <Search 
                size={14} 
                className="position-absolute start-0 top-50 translate-middle-y ms-2 text-muted pointer-events-none" 
                aria-hidden="true" 
              />
              {searchTerm.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="pb-search-clear-btn position-absolute end-0 top-50 translate-middle-y me-1.5 border-0 bg-transparent text-muted p-1 d-flex align-items-center justify-content-center rounded-circle"
                  aria-label="Effacer la recherche"
                  title="Effacer la recherche"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Pilules de filtrage par catégorie */}
          <div className="pb-category-pills d-flex flex-wrap gap-1 mb-3" role="toolbar" aria-label="Filtrer par catégorie">
            {CATEGORY_PILLS.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`pb-category-pill btn btn-sm border-0 py-0.5 px-2 rounded-pill text-xs transition-all ${
                    isActive 
                      ? 'pb-category-pill-active font-bold text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover-bg-slate'
                  }`}
                  aria-pressed={isActive}
                  style={{
                    fontSize: '11px',
                    backgroundColor: isActive ? '#1e3a8a' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#475569'
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Métadonnées de page */}
          <div className="pb-category-selector-panel p-2 rounded mb-3 bg-slate-50 border">
            <label className="db-label d-flex align-items-center gap-1.5 mb-1 text-slate-500 font-bold" style={{ fontSize: '11px' }}>
              <Folder size={14} />
              Catégorie de la page
            </label>
            <select
              value={builderPageCategory}
              onChange={(e) => setBuilderPageCategory(e.target.value)}
              className="db-select text-xs py-1 w-100"
            >
              <option value="Accueil">Accueil</option>
              <option value="Outils">Outils</option>
              <option value="Poésies">Poésies</option>
              <option value="Nouvelles">Nouvelles</option>
              <option value="Romans">Romans</option>
              <option value="Contes et légendes">Contes et légendes</option>
              <option value="Essais">Essais</option>
              <option value="Sciences">Sciences</option>
            </select>
          </div>

          {/* Section Modèles de Sections Prédéfinis (SECTION_TEMPLATES) */}
          {filteredTemplates.length > 0 && (selectedCategory === 'all' || selectedCategory === 'templates') && (
            <div className="pb-templates-section mb-3 border rounded p-2 bg-slate-50">
              <div 
                className="d-flex align-items-center justify-content-between cursor-pointer user-select-none pb-1"
                onClick={() => setIsTemplatesExpanded(!isTemplatesExpanded)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsTemplatesExpanded(!isTemplatesExpanded); }}
                aria-expanded={isTemplatesExpanded}
                aria-label="Déplier ou replier les modèles de sections"
              >
                <div className="d-flex align-items-center gap-1.5">
                  <LayoutTemplate size={14} className="text-primary" />
                  <span className="text-xs font-bold text-slate-800" style={{ fontSize: '11px' }}>
                    Modèles de Sections Prêts ({filteredTemplates.length})
                  </span>
                </div>
                <button 
                  type="button" 
                  className="btn btn-sm p-0 text-muted border-0 bg-transparent"
                  aria-label={isTemplatesExpanded ? "Replier les modèles" : "Déplier les modèles"}
                >
                  {isTemplatesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {isTemplatesExpanded && (
                <div className="d-flex flex-column gap-2 mt-2">
                  {filteredTemplates.map((template) => {
                    const IconComp = template.iconComponent || LayoutTemplate;
                    return (
                      <div 
                        key={template.id} 
                        className="pb-template-card p-2 border rounded bg-white transition-all shadow-sm"
                      >
                        <div className="d-flex align-items-start gap-2 mb-1.5">
                          <div 
                            className="pb-template-icon-badge rounded p-1.5 flex-shrink-0 d-flex align-items-center justify-content-center"
                            style={{ backgroundColor: '#eff6ff', color: '#1e3a8a' }}
                          >
                            <IconComp size={16} />
                          </div>
                          <div className="flex-grow-1 min-w-0">
                            <div className="d-flex align-items-center justify-content-between gap-1">
                              <span className="text-xs font-bold text-slate-800 text-truncate" style={{ fontSize: '11px' }}>
                                {template.name}
                              </span>
                              <span 
                                className="badge bg-slate-100 text-slate-500 rounded-pill px-1.5 py-0.5 text-[9px]"
                                style={{ fontSize: '9px', fontWeight: 600 }}
                              >
                                {template.category}
                              </span>
                            </div>
                            <p className="text-muted mb-0 mt-0.5 text-[10px] line-clamp-2" style={{ fontSize: '10px', lineHeight: '1.3' }}>
                              {template.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleInsertTemplate(template.id)}
                          className="btn btn-sm btn-outline-primary w-100 py-1 text-xs d-flex align-items-center justify-content-center gap-1 font-semibold"
                          style={{ fontSize: '11px' }}
                          aria-label={`Insérer cette section (${template.name})`}
                        >
                          <Plus size={13} />
                          Insérer cette section
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 1 : Structure */}
          {structureWidgets.length > 0 && (
            <div className="mb-3">
              <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                Mise en page & Structure
              </h6>
              <div className="row g-2">
                {structureWidgets.map((item) => (
                  <div key={item.type} className="col-6">
                    <DraggableWidget item={item} onAddBlock={onAddBlock} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2 : Modules Métier du Site */}
          {sectionWidgets.length > 0 && (
            <div className="mb-3">
              <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                Modules & Sections du Site
              </h6>
              <div className="row g-2">
                {sectionWidgets.map((item) => (
                  <div key={item.type} className="col-6">
                    <DraggableWidget item={item} onAddBlock={onAddBlock} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3 : Éléments de Contenu */}
          {contentWidgets.length > 0 && (
            <div className="mb-3">
              <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                Éléments de contenu
              </h6>
              <div className="row g-2">
                {contentWidgets.map((item) => (
                  <div key={item.type} className="col-6">
                    <DraggableWidget item={item} onAddBlock={onAddBlock} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aucun résultat trouvé */}
          {filteredWidgets.length === 0 && filteredTemplates.length === 0 && (
            <div className="text-center p-4 border rounded bg-slate-50 my-3">
              <p className="text-xs text-muted mb-2" style={{ fontSize: '11px' }}>
                Aucun composant ou modèle ne correspond à « <strong>{searchTerm}</strong> ».
              </p>
              <button
                type="button"
                onClick={handleClearSearch}
                className="btn btn-sm btn-link text-primary p-0 text-xs text-decoration-none font-bold"
                style={{ fontSize: '11px' }}
              >
                Effacer la recherche
              </button>
            </div>
          )}

          {/* Aide */}
          <div className="ae-info-callout-box p-2.5 rounded bg-blue-50 border border-blue-200 text-xs text-slate-700 mt-3" style={{ fontSize: '11px' }}>
            <strong>Astuce :</strong> Cliquez sur un composant pour l'ajouter à la page ou dans le conteneur actuellement sélectionné.
          </div>
        </div>
      )}

      {/* Contenu de l'onglet Structure (TreeStructureView) */}
      {activeTab === 'structure' && (
        <div 
          id="pb-tabpanel-structure" 
          role="tabpanel" 
          aria-labelledby="pb-tab-structure"
          className="ae-pb-sidebar-content flex-grow-1 overflow-y-auto"
          style={{ overflowY: 'auto' }}
        >
          <TreeStructureView
            blocks={blocks}
            activeBlockId={activeBlockId}
            onSelectBlock={(block) => {
              if (typeof onSelectBlock === 'function') {
                onSelectBlock(block);
              }
              setActiveTab('settings');
            }}
            onToggleHideBlock={onToggleHideBlock}
            onRemoveBlock={onRemoveBlock}
            onOpenLibrary={() => setActiveTab('widgets')}
          />
        </div>
      )}

      {/* Contenu de l'onglet Réglages */}
      {activeTab === 'settings' && (
        <div className="ae-pb-sidebar-content flex-grow-1 overflow-y-auto" style={{ overflowY: 'auto' }}>
          <BuilderSettings 
            block={activeBlock} 
            onChange={onBlockSettingsChange} 
          />
        </div>
      )}
    </div>
  );
};

export default BuilderSidebar;
