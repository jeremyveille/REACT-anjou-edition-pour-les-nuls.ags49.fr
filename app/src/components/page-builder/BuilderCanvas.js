import React, { useState, useEffect } from 'react';
import { BlockRenderer } from './BlockRenderer';
import { 
  Plus, 
  Lock
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { PublicHeader, PublicFooter } from '../PublicComponents';
import { PublicNav } from '../PublicNav';

export const BuilderCanvas = ({
  blocks = [],
  activeBlockId = null,
  onSelectBlock = () => {},
  onRemoveBlock = () => {},
  onMoveBlock = () => {},
  onDuplicateBlock = () => {},
  onAddChild = () => {},
  device = 'desktop',
  pageSlug = ''
}) => {
  const canvasRef = React.useRef(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [menusList, setMenusList] = useState([]);

  const { setNodeRef: setCanvasRootRef, isOver } = useDroppable({
    id: 'canvas-root',
    data: { type: 'canvas' }
  });

  const safeParseArray = (value, fallback = []) => {
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      console.warn("Données localStorage invalides :", error);
      return fallback;
    }
  };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark-mode'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    const localMenus = localStorage.getItem("ae_menus");
    if (localMenus) {
      setMenusList(safeParseArray(localMenus, []));
    } else {
      setMenusList([
        { id: "m1", title: "Accueil", label: "Accueil", status: "Actif" },
        { id: "m2", title: "Flipbooks", label: "Flipbooks", status: "Actif" },
        { id: "m3", title: "Vidéos", label: "Vidéos", status: "Actif" },
        { id: "m4", title: "Galerie Photos", label: "Galerie Photos", status: "Actif" },
        { id: "m5", title: "Contact", label: "Contact", status: "Actif" }
      ]);
    }

    return () => observer.disconnect();
  }, []);

  const toggleLocalDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const getDeviceClass = () => {
    switch (device) {
      case 'tablet': return 'pb-canvas-tablet';
      case 'mobile': return 'pb-canvas-mobile';
      default: return 'pb-canvas-desktop';
    }
  };

  const buildMenuTree = (items, parentId = null, depth = 0) => {
    if (depth > 10) return [];
    return items
      .filter(item => {
        const pId = item.parentId === "null" || item.parentId === "" ? null : item.parentId;
        const targetId = parentId === "null" || parentId === "" ? null : parentId;
        return pId === targetId;
      })
      .map(item => ({
        ...item,
        children: buildMenuTree(items, item.id, depth + 1)
      }));
  };

  const getActiveMenuItems = () => {
    if (!Array.isArray(menusList)) return [];
    const activeRaw = menusList.filter(m => m.status === "Actif" || m.isActive || m.enabled);
    return buildMenuTree(activeRaw, null);
  };

  const handleMenuItemClick = (item, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div ref={canvasRef} className="pb-canvas-viewport" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Barre d'adresse simulée */}
      <div className="browser-address-bar bg-slate-200 dark:bg-slate-800 border-bottom px-3 py-2 d-flex align-items-center gap-2 rounded-t-lg shadow-sm flex-shrink-0" style={{ width: '100%', maxWidth: device === 'desktop' ? '1200px' : device === 'tablet' ? '768px' : '390px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <div className="d-flex gap-1.5 mr-2">
          <span className="ae-status-dot-danger" style={{ width: '10px', height: '10px', opacity: 0.7, borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
          <span className="ae-status-indicator-warning" style={{ width: '10px', height: '10px', opacity: 0.7, borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
          <span className="ae-status-dot-success" style={{ width: '10px', height: '10px', opacity: 0.7, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
        </div>
        <div className="flex-grow-1 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded px-2.5 py-1 d-flex align-items-center gap-2 text-muted shadow-sm" style={{ fontSize: '11px' }}>
          <Lock size={12} className="text-success" />
          <span className="font-mono text-muted">
            https://anjou-edition.ags49.fr/pages/{pageSlug || 'sans-titre'}
          </span>
        </div>
      </div>

      {/* Rendu principal fidèle au site public */}
      <div className={`pb-canvas-wrapper mx-auto shadow-lg min-vh-100 ${getDeviceClass()}`} style={{ borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: device === 'desktop' ? '1200px' : device === 'tablet' ? '768px' : '390px', backgroundColor: '#ffffff' }}>
        <div className={`App ${darkMode ? 'dark-mode' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <PublicHeader darkMode={darkMode} toggleDarkMode={toggleLocalDarkMode} />

          {/* Navigation */}
          <PublicNav 
            isPreview={true}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            getActiveMenuItems={getActiveMenuItems}
            handleMenuItemClick={handleMenuItemClick}
            mobileMenuOpen={false}
            setMobileMenuOpen={() => {}}
          />

          {/* Zone de contenu éditable */}
          <div 
            ref={setCanvasRootRef}
            className={`ae-dropzone-main-content ${isOver ? 'ae-dropzone-active-main' : ''}`} 
            style={{ display: 'flex', flexDirection: 'column', minHeight: '400px', flex: 1 }}
          >
            <div className="ae-page-builder-canvas-panel p-3">
              
              {blocks.length > 0 ? (
                <div className="pb-canvas-inner">
                  {blocks.map((block, idx) => (
                    <BlockRenderer
                      key={block.id}
                      block={block}
                      isEditing={true}
                      activeBlockId={activeBlockId}
                      onSelectBlock={onSelectBlock}
                      onRemoveBlock={onRemoveBlock}
                      onMoveBlock={onMoveBlock}
                      onDuplicateBlock={onDuplicateBlock}
                      onAddChild={onAddChild}
                      parentBlock={null}
                      indexInParent={idx}
                      siblingCount={blocks.length}
                    />
                  ))}
                  
                  {/* Bouton d'ajout rapide de section en fin de page */}
                  <div className="text-center mt-4 pb-4">
                    <button
                      type="button"
                      onClick={() => onAddChild(null, 'section')}
                      className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1.5 px-3 rounded-pill shadow-sm"
                      aria-label="Ajouter une nouvelle section en fin de page"
                    >
                      <Plus size={16} />
                      Ajouter une nouvelle section
                    </button>
                  </div>
                </div>
              ) : (
                /* Canevas vide */
                <div 
                  className="builder-public-preview__empty cursor-pointer p-5 text-center border-dashed rounded-lg bg-slate-50"
                  onClick={() => onAddChild(null, 'section')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAddChild(null, 'section'); } }}
                  role="button"
                  tabIndex="0"
                  aria-label="Canevas vide. Cliquez ou appuyez sur Entrée pour ajouter une première section."
                >
                  <div className="pb-canvas-empty-icon bg-blue-50 dark:bg-slate-800 text-primary rounded-circle d-inline-flex p-3 mb-3">
                    <Plus size={32} aria-hidden="true" />
                  </div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-100">Votre canevas est vide</h5>
                  <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4 mx-auto">
                    Cette page ne contient encore aucun bloc. Cliquez ci-dessous pour ajouter une première <strong>Section</strong> ou choisissez un bloc dans la bibliothèque.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm px-4 py-2 rounded font-bold"
                    aria-label="Ajouter une section au canevas"
                  >
                    Ajouter une Section
                  </button>
                </div>
              )}

            </div>
          </div>

          <PublicFooter />

        </div>
      </div>
    </div>
  );
};

export default BuilderCanvas;
