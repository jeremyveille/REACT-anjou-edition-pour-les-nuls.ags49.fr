import React, { useState, useEffect } from 'react';
import { BlockRenderer } from './BlockRenderer';
import { 
  Plus, 
  PlayCircle, 
  Play, 
  Info, 
  Lock, 
  Image as ImageIcon 
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { videosData, galleryImages } from '../../data';
import { PublicHeader, PublicFooter } from '../PublicComponents';
import { PublicNav } from '../PublicNav';

const YoutubeIcon = ({ size = 20, color = "currentColor", fill = "none" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-youtube"
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9 10 15" fill={fill !== "none" ? "white" : "none"} />
  </svg>
);

export const BuilderCanvas = ({
  blocks = [],
  activeBlockId = null,
  onSelectBlock = () => {},
  onRemoveBlock = () => {},
  onMoveBlock = () => {},
  onAddChild = () => {},
  device = 'desktop',
  pageSlug = ''
}) => {
  const canvasRef = React.useRef(null);
  // Watched global states
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [menusList, setMenusList] = useState([]);

  const { setNodeRef: setCanvasRootRef, isOver } = useDroppable({
    id: 'canvas-root',
    data: { type: 'canvas' }
  });

  // Fallback sûr pour JSON
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

  // Watch for global dark mode toggling
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark-mode'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    // Load menus
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

  useEffect(() => {
    if (canvasRef.current) {
      const computed = window.getComputedStyle(canvasRef.current);
      console.log("[BuilderCanvas] Rendu DOM - Dimensions et styles calculés:", {
        width: canvasRef.current.clientWidth,
        height: canvasRef.current.clientHeight,
        display: computed.display,
        overflow: computed.overflow,
        position: computed.position,
        device,
        blocksCount: blocks.length
      });
    }
  }, [device, blocks]);

  const toggleLocalDarkMode = () => {
    // Toggles globally so the builder interface stays in sync
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
    if (depth > 10) return []; // Prevent infinite recursion in case of cyclic references
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
    // Preview nav is non-interactive for routing
  };

  return (
    <div ref={canvasRef} className="pb-canvas-viewport" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <div 
        data-testid="builder-canvas-debug"
        style={{
          padding: "10px",
          marginBottom: "10px",
          background: "#fff3cd",
          color: "#664d03",
          border: "2px solid #ffca2c",
          fontWeight: 700,
          width: "100%",
          textAlign: "center"
        }}
      >
        BuilderCanvas est bien monté - device: {device}
      </div>

      {/* Browser Address Bar Mock */}
      <div className="browser-address-bar bg-slate-200 dark:bg-slate-800 border-bottom px-3 py-2 d-flex align-items-center gap-2 rounded-t-lg shadow-sm flex-shrink-0" style={{ width: '100%', maxWidth: device === 'desktop' ? '1200px' : device === 'tablet' ? '768px' : '390px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <div className="d-flex gap-1.5 mr-2">
          <span className="rounded-circle bg-danger inline-block" style={{ width: '10px', height: '10px', opacity: 0.7 }}></span>
          <span className="rounded-circle bg-warning inline-block" style={{ width: '10px', height: '10px', opacity: 0.7 }}></span>
          <span className="rounded-circle bg-success inline-block" style={{ width: '10px', height: '10px', opacity: 0.7 }}></span>
        </div>
        <div className="flex-grow-1 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded px-2.5 py-1 d-flex align-items-center gap-2 text-muted shadow-sm" style={{ fontSize: '11px' }}>
          <Lock className="w-3.5 h-3.5 text-success" />
          <span className="text-slate-500 dark:text-slate-300 font-mono">
            https://anjou-edition.ags49.fr/pages/{pageSlug || 'sans-titre'}
          </span>
        </div>
      </div>

      {/* Main Public Website Layout Container */}
      <div className={`pb-canvas-wrapper mx-auto transition-all duration-300 shadow-lg min-vh-100 ${getDeviceClass()}`} style={{ borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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

          {/* Main workspace */}
          <main style={{ gridTemplateColumns: device === 'desktop' ? '320px 1fr 320px' : (device === 'tablet' ? '250px 1fr' : '1fr') }}>
            {/* Left Sidebar widgets */}
            <aside className="sidebar left-sidebar" style={{ display: device === 'mobile' ? 'none' : 'flex', flexDirection: 'column', gap: '1.75rem' }}>

              <div className="card widget">
                <h2 className="widget-title">
                  <PlayCircle size={20} /> Vidéos Populaires
                </h2>
                <div className="video-mini-list">
                  {videosData.map((vid) => (
                    <button 
                      key={vid.id} 
                      type="button"
                      className="video-mini-item"
                      aria-label={`Lire la vidéo : ${vid.title}`}
                    >
                      <div className="mini-thumb">
                        <Play size={20} color="white" fill="white" />
                      </div>
                      <div className="mini-info">
                        <h4>{vid.title}</h4>
                        <span>{vid.duration}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="card widget">
                <h2 className="widget-title">
                  <Info size={20} /> Actualités 2026
                </h2>
                <ul className="news-list">
                  <li>
                    <strong>Salon du Livre de Saumur</strong>
                    <p>Retrouvez l'équipe d'Anjou Édition au stand C12 les 14 et 15 octobre 2026.</p>
                  </li>
                  <li>
                    <strong>Nouvelle parution fables</strong>
                    <p>Découvrez notre nouvelle édition papier des fables locales de Séraphin.</p>
                  </li>
                  <li>
                    <strong>Mise à jour portail</strong>
                    <p>Nouveau design épuré, lecteur audio de textes intégré et galerie interactive.</p>
                  </li>
                </ul>
              </div>
            </aside>

            {/* Central Editable Content Area */}
            <section 
              ref={setCanvasRootRef}
              className={`main-content ${isOver ? 'ring-2 ring-blue-400 ring-inset rounded-lg bg-blue-50/10 transition-colors duration-200' : ''}`} 
              style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0, minHeight: '300px' }}
            >
              <div className="custom-page-view p-2">
                <div className="pb-rendered-page shadow-sm rounded bg-white p-3">
                  
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
                          onAddChild={onAddChild}
                          parentBlock={null}
                          indexInParent={idx}
                          siblingCount={blocks.length}
                        />
                      ))}
                      
                      {/* Section append button */}
                      <div className="text-center mt-4 pb-4">
                        <button
                          type="button"
                          onClick={() => onAddChild(null, 'section')}
                          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1.5 px-3 rounded-pill"
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter une nouvelle section
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty canvas */
                    <div className="builder-public-preview__empty cursor-pointer" onClick={() => onAddChild(null, 'section')}>
                      <div className="pb-canvas-empty-icon bg-blue-50 dark:bg-slate-800 text-blue-500 rounded-circle p-4 mb-3">
                        <Plus className="w-8 h-8" />
                      </div>
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">Votre canevas est vide</h5>
                      <p className="text-sm text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
                        Cette page ne contient encore aucun bloc. Cliquez pour ajouter une première <strong>Section</strong>.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm px-4 py-2 rounded-lg font-bold"
                      >
                        Ajouter une Section
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </section>

            {/* Right Sidebar widgets */}
            <aside className="sidebar right-sidebar" style={{ display: device === 'desktop' ? 'flex' : 'none', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="card widget">
                <h2 className="widget-title">
                  <ImageIcon size={20} /> Galerie
                </h2>
                <div className="gallery-grid">
                  {galleryImages.slice(0, 4).map((img) => (
                    <button 
                      key={img.id} 
                      type="button"
                      className="gallery-item" 
                      style={{ backgroundImage: `url('${img.url}')` }}
                      title={img.title}
                      aria-label={`Voir l'image : ${img.title}`}
                    ></button>
                  ))}
                </div>
                <button type="button" className="widget-footer-btn">
                  Voir toutes les photos
                </button>
              </div>
              
              <div className="card widget">
                <h2 className="widget-title">
                  <YoutubeIcon size={20} color="currentColor" /> Chaîne YouTube
                </h2>
                <button 
                  type="button"
                  className="video-placeholder" 
                  style={{ background: '#fee2e2' }}
                  aria-label="Lire la conférence Anjou 2026"
                >
                  <YoutubeIcon size={40} color="#ef4444" fill="#ef4444" />
                </button>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                  Conférence Anjou 2026 - Extrait
                </p>
              </div>
            </aside>
          </main>

          <PublicFooter />

        </div>
      </div>
    </div>
  );
};

export default BuilderCanvas;
