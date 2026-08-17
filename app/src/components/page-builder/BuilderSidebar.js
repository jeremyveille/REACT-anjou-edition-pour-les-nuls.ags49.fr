import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { BuilderSettings } from './BuilderSettings';
import { 
  Layout, 
  Square, 
  Columns, 
  Grid, 
  Heading as HeadingIcon, 
  AlignLeft, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  PlaySquare,
  AlertCircle, 
  Folder 
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
      className={`pb-widget-item flex flex-col items-center justify-content-center p-3 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 bg-slate-50 hover:bg-blue-50/20 dark:bg-slate-800/30 dark:hover:bg-blue-900/10 rounded-lg text-slate-700 dark:text-slate-300 transition-all cursor-pointer text-center ${isDragging ? 'opacity-50' : ''}`}
      style={{ touchAction: 'none' }}
    >
      <Icon className={`w-5 h-5 mb-1.5 ${item.category === 'structure' ? 'text-blue-500' : 'text-emerald-500'}`} />
      <span className="text-xs font-bold block">{item.label}</span>
    </div>
  );
};

const STRUCTURE_ITEMS = [
  { type: 'section', label: 'Section', icon: Layout, desc: 'Division globale de la page' },
  { type: 'container', label: 'Container', icon: Square, desc: 'Conteneur centré ou fluide' },
  { type: 'row', label: 'Ligne (Row)', icon: Columns, desc: 'Ligne pour grille de colonnes' },
  { type: 'column', label: 'Colonne', icon: Grid, desc: 'Colonne ajustable de la grille' }
];

const CONTENT_ITEMS = [
  { type: 'heading', label: 'Titre', icon: HeadingIcon, desc: 'Titre H1 à H6 ajustable' },
  { type: 'text', label: 'Texte / HTML', icon: AlignLeft, desc: 'Paragraphe de texte riche' },
  { type: 'image', label: 'Image', icon: ImageIcon, desc: 'Image avec classe responsive' },
  { type: 'video', label: 'Vidéo', icon: VideoIcon, desc: 'Intégration vidéo YouTube' },
  { type: 'button', label: 'Bouton', icon: PlaySquare, desc: 'Bouton avec lien et icône' },
  { type: 'card', label: 'Carte (Card)', icon: Square, desc: 'Boîte avec titre, texte, image' },
  { type: 'alert', label: 'Alerte', icon: AlertCircle, desc: 'Message d\'alerte de couleur' }
];

export const BuilderSidebar = ({
  activeTab,
  setActiveTab,
  onAddBlock,
  activeBlock,
  onBlockSettingsChange,
  builderPageCategory,
  setBuilderPageCategory
}) => {
  return (
    <div className="builder-sidebar d-flex flex-column h-100 border-end bg-white dark:bg-slate-900">
      {/* Onglets de navigation */}
      <div className="builder-sidebar-tabs d-flex border-bottom bg-slate-50 dark:bg-slate-900/50">
        <button 
          type="button"
          onClick={() => setActiveTab('widgets')}
          className={`bpb-tab-btn flex-fill py-2.5 text-xs font-bold border-0 cursor-pointer transition-colors ${
            activeTab === 'widgets' 
              ? 'bg-white dark:bg-slate-900 text-blue-600 border-bottom border-blue-600' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent'
          }`}
        >
          Widgets
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`bpb-tab-btn flex-fill py-2.5 text-xs font-bold border-0 cursor-pointer transition-colors ${
            activeTab === 'settings' 
              ? 'bg-white dark:bg-slate-900 text-blue-600 border-bottom border-blue-600' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent'
          }`}
        >
          Réglages {activeBlock && <span className="pb-sidebar-dot bg-blue-500 rounded-circle d-inline-block ms-1" style={{ width: '6px', height: '6px' }}></span>}
        </button>
      </div>

      {/* Contenu de l'onglet Widgets */}
      {activeTab === 'widgets' && (
        <div className="pb-sidebar-content flex-grow overflow-y-auto p-3 space-y-4">
          
          {/* Métadonnées de page */}
          <div className="pb-category-selector bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <label className="db-label flex items-center gap-1.5 mb-1.5 text-slate-500">
              <Folder className="w-3.5 h-3.5" />
              Catégorie de la page
            </label>
            <select
              value={builderPageCategory}
              onChange={(e) => setBuilderPageCategory(e.target.value)}
              className="db-select text-xs py-1.5"
            >
              <option value="Outils">Outils</option>
              <option value="Poésies">Poésies</option>
              <option value="Nouvelles">Nouvelles</option>
              <option value="Romans">Romans</option>
              <option value="Contes et légendes">Contes et légendes</option>
              <option value="Essais">Essais</option>
              <option value="Sciences">Sciences</option>
            </select>
          </div>

          {/* Section structurelle */}
          <div>
            <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mise en page & Structure</h6>
            <div className="grid grid-cols-2 gap-2">
              {STRUCTURE_ITEMS.map((item) => (
                <DraggableWidget key={item.type} item={{...item, category: 'structure'}} onAddBlock={onAddBlock} />
              ))}
            </div>
          </div>

          {/* Section contenu */}
          <div>
            <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Éléments de contenu</h6>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_ITEMS.map((item) => (
                <DraggableWidget key={item.type} item={{...item, category: 'content'}} onAddBlock={onAddBlock} />
              ))}
            </div>
          </div>

          {/* Aide rapide */}
          <div className="text-[10px] text-slate-400 leading-relaxed bg-blue-50/10 dark:bg-blue-950/10 p-3 rounded-lg border border-blue-100/20">
            <strong>Conseil :</strong> Sélectionnez un élément de structure (Section, Container ou Colonne) sur le canevas puis cliquez sur un widget pour l'y insérer directement. S'il n'y a pas d'élément actif, le bloc sera ajouté en bas de page.
          </div>
        </div>
      )}

      {/* Contenu de l'onglet Réglages */}
      {activeTab === 'settings' && (
        <div className="pb-sidebar-content flex-grow overflow-y-auto p-4">
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
