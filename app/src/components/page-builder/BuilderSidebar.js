import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { BuilderSettings } from './BuilderSettings';
import { 
  BLOCK_DEFINITIONS 
} from './blockRegistry';
import { 
  Folder,
  Search
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
  activeBlock,
  onBlockSettingsChange,
  builderPageCategory,
  setBuilderPageCategory
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const allWidgets = Object.values(BLOCK_DEFINITIONS);
  const filteredWidgets = allWidgets.filter(w => 
    w.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const structureWidgets = filteredWidgets.filter(w => w.category === 'structure');
  const contentWidgets = filteredWidgets.filter(w => w.category === 'content');
  const sectionWidgets = filteredWidgets.filter(w => w.category === 'sections');

  return (
    <div className="builder-sidebar d-flex flex-column h-100 border-end bg-white dark:bg-slate-900" style={{ height: '100%' }}>
      {/* Onglets de navigation */}
      <div className="builder-sidebar-tabs d-flex border-bottom bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
        <button 
          type="button"
          onClick={() => setActiveTab('widgets')}
          className={`bpb-tab-btn flex-fill py-2.5 text-xs font-bold border-0 cursor-pointer transition-colors ${
            activeTab === 'widgets' 
              ? 'bg-white dark:bg-slate-900 text-primary border-bottom border-primary' 
              : 'text-muted bg-transparent'
          }`}
          style={{ borderBottomWidth: activeTab === 'widgets' ? '2px' : '0' }}
        >
          Bibliothèque de Blocs
        </button>
        <button 
          type="button"
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

      {/* Contenu de l'onglet Widgets */}
      {activeTab === 'widgets' && (
        <div className="ae-sidebar-scrollable-body p-3 overflow-y-auto flex-grow-1" style={{ overflowY: 'auto' }}>
          
          {/* Recherche de blocs */}
          <div className="mb-3">
            <div className="position-relative">
              <input
                type="text"
                placeholder="Rechercher un composant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="db-input text-xs ps-4 py-1.5 w-100"
              />
              <Search size={14} className="position-absolute start-0 top-50 translate-middle-y ms-2 text-muted" />
            </div>
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

          {/* Aide */}
          <div className="ae-info-callout-box p-2.5 rounded bg-blue-50 border border-blue-200 text-xs text-slate-700 mt-3" style={{ fontSize: '11px' }}>
            <strong>Astuce :</strong> Cliquez sur un composant pour l'ajouter à la page ou dans le conteneur actuellement sélectionné.
          </div>
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
