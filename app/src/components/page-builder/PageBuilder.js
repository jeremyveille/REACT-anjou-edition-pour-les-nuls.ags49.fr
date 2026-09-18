import React, { useState, useEffect, useCallback } from 'react';
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
  EyeOff,
  Command
} from 'lucide-react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import moveElementInTree from '../../utils/moveElement';
import { 
  createBlock, 
  normalizeBlocks, 
  cloneBlock, 
  getDefaultHomepageBlocks 
} from './blockRegistry';

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
    
    const nextState = moveElementInTree(blocks, activeId, overId, isNew, createBlock);
    pushBlocksState(normalizeBlocks(nextState));
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
            const title = page.title || '';
            setPageTitle(title);
            setPageSlug(page.slug || '');
            setPageCategory(page.category || 'Outils');
            setPageStatus(page.status || 'draft');

            let pageBlocks = page.blocks;
            // Si la page est la page d'accueil et n'a pas encore de blocs configurés, on génère sa structure par défaut complète
            const isHomePage = title.toLowerCase().includes('accueil') || page.slug === 'home' || page.slug === 'accueil';
            if ((!pageBlocks || pageBlocks.length === 0) && isHomePage) {
              pageBlocks = getDefaultHomepageBlocks();
            }

            clearHistory(normalizeBlocks(pageBlocks || []));
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

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setPageTitle(val);
    if (!editingId) {
      setPageSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  // Trouver un bloc dans l'arbre pour les réglages
  const findBlockById = useCallback((blocksList, id) => {
    for (let b of blocksList) {
      if (b.id === id) return b;
      if (b.children) {
        const found = findBlockById(b.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Trouver récursivement le parent d'un bloc par son identifiant
  const findParentId = useCallback((tree, childId, parent = null) => {
    for (let node of tree) {
      if (node.id === childId) return parent ? parent.id : null;
      if (node.children && node.children.length > 0) {
        const found = findParentId(node.children, childId, node);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }, []);

  const activeBlock = activeBlockId ? findBlockById(blocks, activeBlockId) : null;

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
    const newBlock = createBlock(type);

    // Si on ajoute une section, elle va d'office à la racine
    if (type === 'section') {
      const nextState = [...blocks, newBlock];
      pushBlocksState(normalizeBlocks(nextState));
      setActiveBlockId(newBlock.id);
      setActiveTab('settings');
      return;
    }

    // Si l'utilisateur clique sur un widget sans section existante, on initialise la hiérarchie standard
    if (blocks.length === 0) {
      const section = createBlock('section');
      const container = createBlock('container');
      const row = createBlock('row');
      const column = createBlock('column');

      section.children = [container];
      container.children = [row];
      row.children = [column];

      if (type === 'container') {
        // Déjà créé
      } else if (type === 'row') {
        container.children.push(newBlock);
      } else if (type === 'column') {
        row.children.push(newBlock);
      } else {
        column.children.push(newBlock);
      }

      pushBlocksState(normalizeBlocks([section]));
      setActiveBlockId(newBlock.id);
      setActiveTab('settings');
      return;
    }

    // Déterminer où insérer le bloc
    let targetParentId = activeBlockId;

    if (type === 'container') {
      const activeItem = findBlockById(blocks, activeBlockId);
      if (activeItem && activeItem.type === 'section') {
        targetParentId = activeItem.id;
      } else {
        const lastSection = blocks[blocks.length - 1];
        targetParentId = lastSection.id;
      }
    } else if (type === 'row') {
      const activeItem = findBlockById(blocks, activeBlockId);
      if (activeItem && activeItem.type === 'container') {
        targetParentId = activeItem.id;
      } else {
        targetParentId = findFirstContainer(blocks) || blocks[0].id;
      }
    } else if (type === 'column') {
      const activeItem = findBlockById(blocks, activeBlockId);
      if (activeItem && activeItem.type === 'row') {
        targetParentId = activeItem.id;
      } else {
        targetParentId = findFirstRow(blocks) || blocks[0].id;
      }
    } else {
      // Un widget va dans une colonne ou dans un container/section si plein écran
      const activeItem = findBlockById(blocks, activeBlockId);
      if (activeItem && (activeItem.type === 'column' || activeItem.type === 'container' || activeItem.type === 'section')) {
        targetParentId = activeItem.id;
      } else {
        targetParentId = findFirstColumn(blocks) || findFirstContainer(blocks) || blocks[0].id;
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
      pushBlocksState(normalizeBlocks(nextState));
      setActiveBlockId(newBlock.id);
      setActiveTab('settings');
    }
  };

  // AJOUTER UN ENFANT VIA LES BOUTONS "+" DU RENDERER
  const handleAddChild = (parentId, childType) => {
    if (!parentId) {
      handleAddBlock(childType || 'section');
      return;
    }
    setActiveBlockId(parentId);
    handleAddBlock(childType || 'heading');
  };

  // DUPLIQUER UN BLOC
  const handleDuplicateBlock = useCallback((id, parentId) => {
    const targetBlock = findBlockById(blocks, id);
    if (!targetBlock) return;

    const duplicated = cloneBlock(targetBlock);

    const duplicateInTree = (tree) => {
      if (!parentId) {
        const idx = tree.findIndex(b => b.id === id);
        if (idx === -1) return tree;
        const result = [...tree];
        result.splice(idx + 1, 0, duplicated);
        return result;
      }

      return tree.map(b => {
        if (b.id === parentId) {
          const idx = b.children.findIndex(c => c.id === id);
          if (idx === -1) return b;
          const newChildren = [...b.children];
          newChildren.splice(idx + 1, 0, duplicated);
          return { ...b, children: newChildren };
        }
        if (b.children) {
          return { ...b, children: duplicateInTree(b.children) };
        }
        return b;
      });
    };

    const nextState = duplicateInTree(blocks);
    pushBlocksState(normalizeBlocks(nextState));
    setActiveBlockId(duplicated.id);
    setActiveTab('settings');
  }, [blocks, findBlockById, pushBlocksState]);

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

  // DEPLACER UN BLOC (MONTER / DESCENDRE)
  const handleMoveBlock = (id, parentId, direction) => {
    const moveInTree = (tree) => {
      if (!parentId) {
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
  const handleRemoveBlock = useCallback((id, parentId) => {
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
  }, [blocks, pushBlocksState, activeBlockId]);

  // SAUVEGARDER ET PUBLIER LA PAGE
  const handleSavePage = useCallback(async () => {
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
        blocks: normalizeBlocks(blocks)
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
  }, [pageTitle, editingType, blocks, editingId, pageSlug, pageCategory, pageStatus, onSaveSuccess, onClose]);

  // GESTION GLOBALE DES RACCOURCIS CLAVIER (Ctrl+Z, Ctrl+Y, Suppr, Ctrl+D, Escape, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || document.activeElement?.isContentEditable;

      // 1. Annuler : Ctrl+Z / Cmd+Z (sans Shift)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (!isInput) {
          e.preventDefault();
          if (canUndo) undo();
        }
      }

      // 2. Rétablir : Ctrl+Y / Cmd+Y ou Ctrl+Shift+Z / Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        if (!isInput) {
          e.preventDefault();
          if (canRedo) redo();
        }
      }

      // 3. Dupliquer : Ctrl+D / Cmd+D (si un élément est sélectionné)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (!isInput && activeBlockId) {
          e.preventDefault();
          const parentId = findParentId(blocks, activeBlockId);
          handleDuplicateBlock(activeBlockId, parentId);
        }
      }

      // 4. Supprimer : Suppr / Delete ou Backspace (si un élément est sélectionné et hors champs texte)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isInput && activeBlockId) {
          e.preventDefault();
          const parentId = findParentId(blocks, activeBlockId);
          handleRemoveBlock(activeBlockId, parentId);
        }
      }

      // 5. Désélectionner : Échap / Escape
      if (e.key === 'Escape') {
        if (activeBlockId) {
          e.preventDefault();
          setActiveBlockId(null);
          setActiveTab('widgets');
        }
      }

      // 6. Sauvegarder : Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSavePage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, activeBlockId, blocks, findParentId, handleDuplicateBlock, handleRemoveBlock, handleSavePage]);

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
        <Loader className="w-8 h-8 text-primary animate-spin mb-2" />
        <span className="text-muted text-sm">Chargement de la page dans l'éditeur...</span>
      </div>
    );
  }

  // MODE PREVISUALISATION SEULE
  if (showPreview) {
    return (
      <div className="pb-preview-fullscreen min-vh-100 bg-slate-100 dark:bg-slate-950 d-flex flex-column" style={{ height: '100vh', overflow: 'hidden' }}>
        
        {/* Barre de contrôle supérieure */}
        <div className="pb-preview-bar bg-white dark:bg-slate-900 border-bottom p-2.5 d-flex justify-content-between align-items-center z-3 shadow-sm flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold text-slate-800 dark:text-slate-200 px-3" style={{ fontSize: '15px' }}>
              Aperçu : {pageTitle || 'Sans titre'}
            </span>
          </div>

          <div className="bpb-device-controls d-flex bg-slate-50 dark:bg-slate-800 rounded-lg p-1">
            <button 
              type="button" 
              onClick={() => setDevice('desktop')}
              className={`btn btn-link p-1.5 rounded-md ${device === 'desktop' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-muted'}`}
              style={{ border: 'none', background: device === 'desktop' ? '' : 'transparent' }}
              title="Desktop"
            >
              <Monitor size={18} />
            </button>
            <button 
              type="button" 
              onClick={() => setDevice('tablet')}
              className={`btn btn-link p-1.5 rounded-md ${device === 'tablet' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-muted'}`}
              style={{ border: 'none', background: device === 'tablet' ? '' : 'transparent' }}
              title="Tablette"
            >
              <Tablet size={18} />
            </button>
            <button 
              type="button" 
              onClick={() => setDevice('mobile')}
              className={`btn btn-link p-1.5 rounded-md ${device === 'mobile' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-muted'}`}
              style={{ border: 'none', background: device === 'mobile' ? '' : 'transparent' }}
              title="Mobile"
            >
              <Smartphone size={18} />
            </button>
          </div>

          <button 
            type="button"
            onClick={() => setShowPreview(false)}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 py-1.5 px-3 rounded-lg"
          >
            <EyeOff size={16} />
            Retour à l'éditeur
          </button>
        </div>

        {/* Barre d'adresse simulée */}
        <div className="browser-address-bar bg-slate-50 dark:bg-slate-900 border-bottom px-3 py-2 d-flex align-items-center gap-2 flex-shrink-0">
          <div className="d-flex gap-1.5 mr-2">
            <span style={{ width: '10px', height: '10px', opacity: 0.7, borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
            <span style={{ width: '10px', height: '10px', opacity: 0.7, borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
            <span style={{ width: '10px', height: '10px', opacity: 0.7, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
          </div>
          <div className="flex-grow-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg px-3 py-1.5 d-flex align-items-center gap-2 text-muted shadow-sm" style={{ fontSize: '12px' }}>
            <Lock size={12} className="text-success" />
            <span className="font-mono text-muted">
              https://anjou-edition.ags49.fr/{editingType === 'article' ? 'articles' : 'pages'}/{pageSlug || 'sans-titre'}
            </span>
          </div>
        </div>

        {/* Cadre de prévisualisation */}
        <div className="flex-grow-1" style={{ flex: 1, minHeight: 0 }}>
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
            aria-label="Quitter le constructeur"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="d-flex flex-column">
            <input
              type="text"
              value={pageTitle}
              onChange={handleTitleChange}
              placeholder="Titre de la page (ex: Accueil - Anjou Edition)"
              className="border-0 bg-transparent text-slate-800 dark:text-slate-100 font-bold px-2 py-0.5"
              style={{ fontSize: '15px', outline: 'none' }}
            />
            <span className="text-[10px] text-muted px-2" style={{ fontSize: '11px' }}>
              Slug : /{editingType === 'article' ? 'articles' : 'pages'}/{pageSlug || '...'}
            </span>
          </div>
        </div>

        {/* Historique Undo/Redo & Appareil */}
        <div className="d-flex align-items-center gap-3">
          <div className="bpb-history-controls d-flex bg-slate-50 dark:bg-slate-800 rounded-lg p-1">
            <button 
              type="button" 
              onClick={handleUndo}
              disabled={!canUndo}
              className="btn btn-link p-1 text-slate-500 hover:text-primary disabled:opacity-30"
              title="Annuler (Ctrl+Z)"
              aria-label="Annuler la dernière action (Ctrl+Z)"
            >
              <Undo size={18} />
            </button>
            <button 
              type="button" 
              onClick={handleRedo}
              disabled={!canRedo}
              className="btn btn-link p-1 text-slate-500 hover:text-primary disabled:opacity-30"
              title="Rétablir (Ctrl+Y)"
              aria-label="Rétablir l'action annulée (Ctrl+Y)"
            >
              <Redo size={18} />
            </button>
          </div>

          <div className="bpb-device-controls d-flex bg-slate-50 dark:bg-slate-800 rounded-lg p-1">
            <button 
              type="button" 
              onClick={() => setDevice('desktop')}
              className={`btn btn-link p-1 rounded-md ${device === 'desktop' ? 'bg-white dark:bg-slate-700 text-primary' : 'text-muted'}`}
              title="Desktop"
              aria-label="Vue Ordinateur"
            >
              <Monitor size={18} />
            </button>
            <button 
              type="button" 
              onClick={() => setDevice('tablet')}
              className={`btn btn-link p-1 rounded-md ${device === 'tablet' ? 'bg-white dark:bg-slate-700 text-primary' : 'text-muted'}`}
              title="Tablette"
              aria-label="Vue Tablette"
            >
              <Tablet size={18} />
            </button>
            <button 
              type="button" 
              onClick={() => setDevice('mobile')}
              className={`btn btn-link p-1 rounded-md ${device === 'mobile' ? 'bg-white dark:bg-slate-700 text-primary' : 'text-muted'}`}
              title="Mobile"
              aria-label="Vue Mobile"
            >
              <Smartphone size={18} />
            </button>
          </div>

          {/* Badge récapitulatif des raccourcis clavier */}
          <span 
            className="badge bg-slate-100 text-slate-600 border text-xxs d-none d-xl-inline-flex align-items-center gap-1 py-1 px-2 rounded-2"
            title="Raccourcis : Ctrl+Z (Annuler), Ctrl+Y (Rétablir), Suppr (Supprimer), Ctrl+D (Dupliquer), Échap (Désélectionner)"
            style={{ fontSize: '11px', fontWeight: '500' }}
          >
            <Command size={11} />
            <span>Ctrl+Z / Ctrl+Y / Suppr / Ctrl+D</span>
          </span>
        </div>

        {/* Statut et Actions globales */}
        <div className="d-flex align-items-center gap-2">
          <select
            value={pageStatus}
            onChange={(e) => setPageStatus(e.target.value)}
            className="db-select text-xs py-1.5 px-2.5 rounded-lg border-slate-200"
            style={{ width: 'auto' }}
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publier</option>
          </select>

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
            title="Prévisualiser la page"
          >
            <Eye size={16} />
            Aperçu
          </button>

          <button
            type="button"
            onClick={handleSavePage}
            disabled={saving || !pageTitle.trim() || blocks.length === 0}
            className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 py-1.5 px-3 rounded-lg font-bold"
          >
            {saving ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {editingId ? 'Mettre à jour' : 'Publier'}
          </button>
        </div>
      </div>

      {/* Zone principale (Sidebar + Canvas) */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="d-flex" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          
          {/* Sidebar gauche */}
          <div className="ae-sidebar-fixed-width" style={{ width: '340px', flexShrink: 0 }}>
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
              onDuplicateBlock={handleDuplicateBlock}
              onAddChild={handleAddChild}
              device={device}
              pageSlug={pageSlug}
            />
          </div>

        </div>

        <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(.18,.67,.6,1.22)' }}>
          {activeDragWidget ? (
            <div className="pb-widget-item d-flex flex-column align-items-center justify-content-center p-3 bg-white border border-primary rounded-lg shadow-lg opacity-90" style={{ width: '120px' }}>
              <span className="badge bg-primary text-white font-bold">{activeDragWidget.type}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

    </div>
  );
};

export default PageBuilder;
