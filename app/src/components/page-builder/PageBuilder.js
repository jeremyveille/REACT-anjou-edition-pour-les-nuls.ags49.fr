import React, { useState, useEffect } from 'react';
import { pageService } from '../../services/pageService';
import { usePageBuilderHistory } from '../../hooks/usePageBuilderHistory';
import { BuilderSidebar } from './BuilderSidebar';
import { BuilderCanvas } from './BuilderCanvas';
import { IframePreview } from './IframePreview';
import { 
  Undo, 
  Redo, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Save, 
  ArrowLeft,
  Loader,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import moveElementInTree from '../../utils/moveElement';
export const PageBuilder = ({
  editingId = null,
  editingType = 'page', // 'page' or 'article'
  onClose = () => {},
  onSaveSuccess = () => {}
}) => {
  // Titre et Slug de la page
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageCategory, setPageCategory] = useState('Outils');
  const [pageStatus, setPageStatus] = useState('draft');

  // État des blocs géré par le hook d'historique
  const {
    state: blocks,
    push: pushBlocksState,
    undo,
    redo,
    canUndo,
    canRedo,
    clear: clearHistory
  } = usePageBuilderHistory([]);

  // Inject Bootstrap dynamically for the builder context
  useEffect(() => {
    const linkId = 'page-builder-bootstrap-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
      document.head.appendChild(link);
    }
    
    // Cleanup on unmount to not pollute the rest of the dashboard
    return () => {
      const link = document.getElementById(linkId);
      if (link) {
        document.head.removeChild(link);
      }
    };
  }, []);

  // États d'interface
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [activeTab, setActiveTab] = useState('widgets');

  // Drag & Drop State
  const [activeDragWidget, setActiveDragWidget] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  const handleDragStart = ({ active }) => {
    const activeId = active.id.toString();
    if (activeId.startsWith('widget-')) {
      const widgetType = activeId.replace('widget-', '');
      setActiveDragWidget({ type: widgetType });
    }
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveDragWidget(null);
    if (!over) return;
    const activeId = active.id.toString();
    const overId = over.id.toString();
    if (activeId === overId) return;

    const isNew = activeId.startsWith('widget-');
    
    // On passe createNewBlock comme callback à moveElementInTree
    // pour s'assurer que les blocs créés (comme les auto-wrappers) respectent la structure
    const nextState = moveElementInTree(blocks, activeId, overId, isNew, createNewBlock);
    pushBlocksState(nextState);
  };
  const [device, setDevice] = useState('desktop');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Charger les données de la page si editingId est fourni
  useEffect(() => {
    if (editingId) {
      setLoading(true);
      const fetchPage = async () => {
        try {
          const collectionName = editingType === 'article' ? 'articles' : 'pages';
          const pages = await pageService.getPages(collectionName);
          const page = pages.find(p => p.id === editingId);
          if (page) {
            setPageTitle(page.title || '');
            setPageSlug(page.slug || '');
            setPageCategory(page.category || 'Outils');
            setPageStatus(page.status || 'draft');
            clearHistory(page.blocks || []);
          }
        } catch (e) {
          console.error("Erreur de chargement de la page ou de l'article", e);
        } finally {
          setLoading(false);
        }
      };
      fetchPage();
    }
  }, [editingId, editingType, clearHistory]);

  // Synchroniser les données d'aperçu dans le localStorage pour le mode preview
  useEffect(() => {
    try {
      localStorage.setItem('ae_preview_data', JSON.stringify({
        id: editingId,
        title: pageTitle,
        slug: pageSlug,
        category: pageCategory,
        status: pageStatus,
        blocks: blocks
      }));
    } catch (e) {
      console.error("Error setting preview data in localStorage:", e);
    }
  }, [editingId, pageTitle, pageSlug, pageCategory, pageStatus, blocks]);

  // Synchroniser le slug avec le titre en création
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setPageTitle(val);
    if (!editingId) {
      setPageSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  // Trouver un bloc dans l'arbre pour les réglages
  const findBlockById = (blocksList, id) => {
    for (let b of blocksList) {
      if (b.id === id) return b;
      if (b.children) {
        const found = findBlockById(b.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const activeBlock = activeBlockId ? findBlockById(blocks, activeBlockId) : null;

  // Créer un nouveau bloc avec des paramètres par défaut
  const createNewBlock = (type) => {
    const id = `${type}_${Math.random().toString(36).substr(2, 9)}`;
    let defaultSettings = { classes: '' };
    let children = [];

    if (type === 'section') {
      defaultSettings.classes = 'py-5 bg-white';
    } else if (type === 'container') {
      defaultSettings.classes = 'container';
    } else if (type === 'row') {
      defaultSettings.classes = 'row';
    } else if (type === 'column') {
      defaultSettings.sizeClasses = 'col-md-12';
    } else if (type === 'heading') {
      defaultSettings = { content: 'Nouveau Titre', level: 'h2', classes: 'mb-3' };
    } else if (type === 'text') {
      defaultSettings = { content: '<p>Nouveau paragraphe de texte libre. Double-cliquez pour éditer dans la barre latérale.</p>', classes: 'mb-3' };
    } else if (type === 'image') {
      defaultSettings = { src: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=600', alt: 'Illustration', classes: 'img-fluid rounded' };
    } else if (type === 'button') {
      defaultSettings = { text: 'En savoir plus', link: '#', buttonStyle: 'btn-primary', newTab: false, classes: '' };
    } else if (type === 'card') {
      defaultSettings = { title: 'Titre de la carte', text: 'Description de la carte.', image: '', buttonText: 'Action', buttonLink: '#', classes: 'shadow-sm' };
    } else if (type === 'alert') {
      defaultSettings = { content: 'Ceci est un bloc d\'alerte.', type: 'alert-info', classes: '' };
    } else if (type === 'video') {
      defaultSettings = { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', classes: '' };
    }

    return { id, type, settings: defaultSettings, children };
  };

  // Trouver récursivement une colonne dans l'arbre pour insérer un widget
  const findFirstColumn = (blocksList) => {
    for (let b of blocksList) {
      if (b.type === 'column') return b.id;
      if (b.children) {
        const foundId = findFirstColumn(b.children);
        if (foundId) return foundId;
      }
    }
    return null;
  };

  // Trouver récursivement un row dans l'arbre
  const findFirstRow = (blocksList) => {
    for (let b of blocksList) {
      if (b.type === 'row') return b.id;
      if (b.children) {
        const foundId = findFirstRow(b.children);
        if (foundId) return foundId;
      }
    }
    return null;
  };

  // Trouver récursivement un container dans l'arbre
  const findFirstContainer = (blocksList) => {
    for (let b of blocksList) {
      if (b.type === 'container') return b.id;
      if (b.children) {
        const foundId = findFirstContainer(b.children);
        if (foundId) return foundId;
      }
    }
    return null;
  };

  // AJOUTER UN BLOC
  const handleAddBlock = (type) => {
    const newBlock = createNewBlock(type);

    // Si on ajoute une section, elle va d'office à la racine
    if (type === 'section') {
      const nextState = [...blocks, newBlock];
      pushBlocksState(nextState);
      setActiveBlockId(newBlock.id);
      setActiveTab('settings');
      return;
    }

    // Si l'utilisateur clique sur un widget ou une structure sans section existante, on initialise tout
    if (blocks.length === 0) {
      const section = createNewBlock('section');
      const container = createNewBlock('container');
      const row = createNewBlock('row');
      const column = createNewBlock('column');

      section.children.push(container);
      container.children.push(row);
      row.children.push(column);

      if (type === 'container') {
        // Déjà créé
      } else if (type === 'row') {
        container.children.push(newBlock);
      } else if (type === 'column') {
        row.children.push(newBlock);
      } else {
        column.children.push(newBlock);
      }

      pushBlocksState([section]);
      setActiveBlockId(newBlock.id);
      setActiveTab('settings');
      return;
    }

    // Déterminer où insérer le bloc
    let targetParentId = activeBlockId;

    if (type === 'container') {
      // Un container va dans une section
      const activeItem = findBlockById(blocks, activeBlockId);
      if (activeItem && activeItem.type === 'section') {
        targetParentId = activeItem.id;
      } else {
        // Aller dans la dernière section de la page
        const lastSection = blocks[blocks.length - 1];
        targetParentId = lastSection.id;
      }
    } else if (type === 'row') {
      // Un row va dans un container
      const activeItem = findBlockById(blocks, activeBlockId);
      if (activeItem && activeItem.type === 'container') {
        targetParentId = activeItem.id;
      } else {
        targetParentId = findFirstContainer(blocks) || blocks[0].id;
      }
    } else if (type === 'column') {
      // Une colonne va dans un row
      const activeItem = findBlockById(blocks, activeBlockId);
      if (activeItem && activeItem.type === 'row') {
        targetParentId = activeItem.id;
      } else {
        targetParentId = findFirstRow(blocks) || blocks[0].id;
      }
    } else {
      // Un widget va dans une colonne
      const activeItem = findBlockById(blocks, activeBlockId);
      if (activeItem && activeItem.type === 'column') {
        targetParentId = activeItem.id;
      } else {
        targetParentId = findFirstColumn(blocks);
        if (!targetParentId) {
          // Si aucune colonne, en créer une dans la première ligne
          const firstRowId = findFirstRow(blocks);
          if (firstRowId) {
            const col = createNewBlock('column');
            col.children.push(newBlock);
            
            const insertColInTree = (tree) => {
              return tree.map(b => {
                if (b.id === firstRowId) {
                  return { ...b, children: [...(b.children || []), col] };
                }
                if (b.children) {
                  return { ...b, children: insertColInTree(b.children) };
                }
                return b;
              });
            };
            pushBlocksState(insertColInTree(blocks));
            setActiveBlockId(newBlock.id);
            setActiveTab('settings');
            return;
          }
        }
      }
    }

    if (targetParentId) {
      const insertInTree = (tree, parentId, item) => {
        return tree.map(b => {
          if (b.id === parentId) {
            return { ...b, children: [...(b.children || []), item] };
          }
          if (b.children) {
            return { ...b, children: insertInTree(b.children, parentId, item) };
          }
          return b;
        });
      };
      
      const nextState = insertInTree(blocks, targetParentId, newBlock);
      pushBlocksState(nextState);
      setActiveBlockId(newBlock.id);
      setActiveTab('settings');
    }
  };

  // AJOUTER UN ENFANT VIA LES BOUTONS "+" DU RENDERER
  const handleAddChild = (parentId, childType) => {
    setActiveBlockId(parentId);
    handleAddBlock(childType);
  };

  // MODIFIER LES REGLAGES D'UN BLOC
  const handleBlockSettingsChange = (id, newSettings) => {
    const updateInTree = (tree) => {
      return tree.map(b => {
        if (b.id === id) {
          return { ...b, settings: newSettings };
        }
        if (b.children) {
          return { ...b, children: updateInTree(b.children) };
        }
        return b;
      });
    };
    pushBlocksState(updateInTree(blocks));
  };

  // DEPLACER UN BLOC
  const handleMoveBlock = (id, parentId, direction) => {
    const moveInTree = (tree) => {
      if (!parentId) {
        // À la racine
        const idx = tree.findIndex(b => b.id === id);
        if (idx === -1) return tree;
        const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= tree.length) return tree;
        
        const result = [...tree];
        const temp = result[idx];
        result[idx] = result[nextIdx];
        result[nextIdx] = temp;
        return result;
      }

      return tree.map(b => {
        if (b.id === parentId) {
          const idx = b.children.findIndex(c => c.id === id);
          if (idx === -1) return b;
          const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (nextIdx < 0 || nextIdx >= b.children.length) return b;

          const newChildren = [...b.children];
          const temp = newChildren[idx];
          newChildren[idx] = newChildren[nextIdx];
          newChildren[nextIdx] = temp;
          return { ...b, children: newChildren };
        }
        if (b.children) {
          return { ...b, children: moveInTree(b.children) };
        }
        return b;
      });
    };

    pushBlocksState(moveInTree(blocks));
  };

  // SUPPRIMER UN BLOC
  const handleRemoveBlock = (id, parentId) => {
    const removeFromTree = (tree) => {
      if (!parentId) {
        return tree.filter(b => b.id !== id);
      }
      return tree.map(b => {
        if (b.id === parentId) {
          return { ...b, children: b.children.filter(c => c.id !== id) };
        }
        if (b.children) {
          return { ...b, children: removeFromTree(b.children) };
        }
        return b;
      });
    };

    pushBlocksState(removeFromTree(blocks));
    if (activeBlockId === id) {
      setActiveBlockId(null);
      setActiveTab('widgets');
    }
  };

  // SAUVEGARDER ET PUBLIER LA PAGE
  const handleSavePage = async () => {
    if (!pageTitle.trim()) {
      alert(editingType === 'article' ? "Veuillez donner un titre à l'article." : "Veuillez donner un titre à la page.");
      return;
    }
    if (blocks.length === 0) {
      alert("Veuillez ajouter au moins un élément.");
      return;
    }

    setSaving(true);
    try {
      const collectionName = editingType === 'article' ? 'articles' : 'pages';
      const result = await pageService.savePage({
        title: pageTitle,
        slug: pageSlug,
        category: pageCategory,
        status: pageStatus,
        blocks: blocks
      }, editingId, collectionName);

      alert(`${editingType === 'article' ? 'Article' : 'Page'} "${pageTitle}" enregistrée avec succès.`);
      onSaveSuccess(result);
      onClose();
    } catch (e) {
      console.error("Erreur de sauvegarde", e);
      alert("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  // ACTIONS UNDO / REDO
  const handleUndo = () => {
    const previous = undo();
    if (previous) setActiveBlockId(null);
  };

  const handleRedo = () => {
    const next = redo();
    if (next) setActiveBlockId(null);
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-slate-50 dark:bg-slate-900">
        <Loader className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-sm font-semibold text-slate-500">Chargement de l'éditeur...</span>
      </div>
    );
  }

  // MODE PREVISUALISATION SEULE
  if (showPreview) {
    return (
      <div className="pb-preview-fullscreen min-vh-100 bg-slate-100 dark:bg-slate-950 d-flex flex-column" style={{ height: '100vh', overflow: 'hidden' }}>
        
        {/* Top Control Bar for Preview */}
        <div className="pb-preview-bar bg-white dark:bg-slate-900 border-bottom p-2.5 d-flex justify-content-between align-items-center z-3 shadow-sm flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold text-slate-800 dark:text-slate-200 px-3" style={{ fontSize: '15px' }}>
              Aperçu : {pageTitle || 'Sans titre'}
            </span>
          </div>

          {/* Device Toggle Controls (Desktop/Tablet/Mobile) for Preview */}
          <div className="bpb-device-controls d-flex bg-slate-50 dark:bg-slate-800 rounded-lg p-1">
            <button 
              type="button" 
              onClick={() => setDevice('desktop')}
              className={`btn btn-link p-1.5 rounded-md ${device === 'desktop' ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-slate-500'}`}
              style={{ border: 'none', background: device === 'desktop' ? '' : 'transparent' }}
              title="Desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setDevice('tablet')}
              className={`btn btn-link p-1.5 rounded-md ${device === 'tablet' ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-slate-500'}`}
              style={{ border: 'none', background: device === 'tablet' ? '' : 'transparent' }}
              title="Tablette"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setDevice('mobile')}
              className={`btn btn-link p-1.5 rounded-md ${device === 'mobile' ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-slate-500'}`}
              style={{ border: 'none', background: device === 'mobile' ? '' : 'transparent' }}
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button 
            type="button"
            onClick={() => setShowPreview(false)}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 py-1.5 px-3 rounded-lg"
          >
            <EyeOff className="w-4 h-4" />
            Retour à l'éditeur
          </button>
        </div>

        {/* Browser Mock Address Bar */}
        <div className="browser-address-bar bg-slate-50 dark:bg-slate-900 border-bottom px-3 py-2 d-flex align-items-center gap-2 flex-shrink-0">
          <div className="d-flex gap-1.5 mr-2">
            <span className="rounded-circle bg-danger inline-block" style={{ width: '10px', height: '10px', opacity: 0.7 }}></span>
            <span className="rounded-circle bg-warning inline-block" style={{ width: '10px', height: '10px', opacity: 0.7 }}></span>
            <span className="rounded-circle bg-success inline-block" style={{ width: '10px', height: '10px', opacity: 0.7 }}></span>
          </div>
          <div className="flex-grow-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg px-3 py-1.5 d-flex align-items-center gap-2 text-muted shadow-sm" style={{ fontSize: '12px' }}>
            <Lock className="w-3.5 h-3.5 text-success" />
            <span className="text-slate-600 dark:text-slate-300 font-mono">
              https://anjou-edition.ags49.fr/{editingType === 'article' ? 'articles' : 'pages'}/{pageSlug || 'sans-titre'}
            </span>
          </div>
        </div>

        {/* Content Preview Frame */}
        <div className="flex-grow-1 overflow-hidden position-relative">
          <IframePreview 
            device={device} 
            src={`/?preview=true&pageId=${editingId || 'new'}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div id="bpb-builder-app" className="d-flex flex-column bg-light" style={{ height: '100%', overflow: 'hidden' }}>
      
      {/* Barre d'outils supérieure */}
      <div id="bpb-toolbar" className="bg-white dark:bg-slate-900 border-bottom p-2.5 d-flex flex-wrap gap-3 justify-content-between align-items-center position-sticky top-0 z-3 shadow-sm">
        
        {/* Titre et Retour */}
        <div className="d-flex align-items-center gap-2">
          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-outline-secondary btn-sm p-1.5 rounded-lg"
            title="Quitter le constructeur"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="d-flex flex-column">
            <input
              type="text"
              value={pageTitle}
              onChange={handleTitleChange}
              placeholder="Titre de la page (ex: Légende d'Anjou)"
              className="border-0 bg-transparent text-slate-800 dark:text-slate-100 font-bold px-2 py-0.5"
              style={{ fontSize: '15px', outline: 'none' }}
            />
            <span className="text-[10px] text-slate-400 px-2">
              Slug : /pages/{pageSlug || '...'}
            </span>
          </div>
        </div>

        {/* Historique Undo/Redo & Appareil */}
        <div className="d-flex align-items-center gap-3">
          {/* Undo/Redo */}
          <div className="bpb-history-controls d-flex bg-slate-50 dark:bg-slate-800 rounded-lg p-1">
            <button 
              type="button" 
              onClick={handleUndo}
              disabled={!canUndo}
              className="btn btn-link p-1 text-slate-500 hover:text-blue-500 disabled:opacity-30"
              title="Annuler"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={handleRedo}
              disabled={!canRedo}
              className="btn btn-link p-1 text-slate-500 hover:text-blue-500 disabled:opacity-30"
              title="Rétablir"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Appareil */}
          <div className="bpb-device-controls d-flex bg-slate-50 dark:bg-slate-800 rounded-lg p-1">
            <button 
              type="button" 
              onClick={() => setDevice('desktop')}
              className={`btn btn-link p-1 rounded-md ${device === 'desktop' ? 'bg-white dark:bg-slate-700 text-blue-500' : 'text-slate-500'}`}
              title="Desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setDevice('tablet')}
              className={`btn btn-link p-1 rounded-md ${device === 'tablet' ? 'bg-white dark:bg-slate-700 text-blue-500' : 'text-slate-500'}`}
              title="Tablette"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setDevice('mobile')}
              className={`btn btn-link p-1 rounded-md ${device === 'mobile' ? 'bg-white dark:bg-slate-700 text-blue-500' : 'text-slate-500'}`}
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Statut et Actions globales */}
        <div className="d-flex align-items-center gap-2">
          {/* Statut de la page */}
          <select
            value={pageStatus}
            onChange={(e) => setPageStatus(e.target.value)}
            className="db-select text-xs py-1.5 px-2.5 rounded-lg border-slate-200"
            style={{ width: 'auto' }}
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publier</option>
          </select>

          {/* Prévisualiser */}
          <button
            type="button"
            onClick={() => {
              if (blocks.length === 0) {
                alert("Le canevas est vide. Veuillez ajouter du contenu avant de prévisualiser.");
              } else {
                setShowPreview(true);
              }
            }}
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5 py-1.5 px-3 rounded-lg"
            title={blocks.length === 0 ? "Aperçu : le canevas est vide, ajoutez des blocs pour voir votre contenu" : "Prévisualiser la page"}
          >
            <Eye className="w-4 h-4" />
            Aperçu
          </button>

          {/* Enregistrer */}
          <button
            type="button"
            onClick={handleSavePage}
            disabled={saving || !pageTitle.trim() || blocks.length === 0}
            className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 py-1.5 px-3 rounded-lg"
          >
            {saving ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {editingId ? 'Mettre à jour' : 'Publier'}
          </button>
        </div>
      </div>

      {/* Zone principale (Sidebar + Canvas) */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="d-flex" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          
          {/* Sidebar gauche */}
          <div className="w-80 flex-shrink-0" style={{ width: '320px' }}>
            <BuilderSidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onAddBlock={handleAddBlock}
              activeBlock={activeBlock}
              onBlockSettingsChange={handleBlockSettingsChange}
              builderPageCategory={pageCategory}
              setBuilderPageCategory={setPageCategory}
            />
          </div>

          {/* Canvas central */}
          <div style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <BuilderCanvas
              blocks={blocks}
              activeBlockId={activeBlockId}
              onSelectBlock={(block) => {
                setActiveBlockId(block.id);
                setActiveTab('settings');
              }}
              onRemoveBlock={handleRemoveBlock}
              onMoveBlock={handleMoveBlock}
              onAddChild={handleAddChild}
              device={device}
              pageSlug={pageSlug}
            />
          </div>

        </div>

        <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(.18,.67,.6,1.22)' }}>
          {activeDragWidget ? (
            <div className="pb-widget-item flex flex-col items-center justify-content-center p-3 bg-white border border-blue-400 rounded-lg shadow-lg opacity-90" style={{ width: '100px' }}>
              <span className="text-xs font-bold text-blue-500">{activeDragWidget.type}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

    </div>
  );
};
export default PageBuilder;
