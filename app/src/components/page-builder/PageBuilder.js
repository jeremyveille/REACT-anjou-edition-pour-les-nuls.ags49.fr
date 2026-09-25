import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Command,
  ChevronDown,
  Check,
  FileText,
  Newspaper,
  AlertTriangle,
  RotateCcw,
  CheckCircle
} from 'lucide-react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import moveElementInTree from '../../utils/moveElement';
import { extractYoutubeVideoId } from '../../utils/youtubeUtils';
import { 
  createBlock, 
  normalizeBlocks, 
  cloneBlock, 
  getDefaultHomepageBlocks 
} from './blockRegistry';
import { MediaLibraryModal } from '../MediaLibraryModal';

/**
 * Vérifie si un élément correspond à la page Accueil selon l'ordre de priorité défini.
 */
export const isHomePage = (item) => {
  if (!item) return false;
  if (item.isHome === true || item.isHomePage === true || item.is_home === true || item.is_homepage === true) {
    return true;
  }
  const slug = (item.slug || '').trim().toLowerCase();
  if (slug === '/' || slug === 'accueil' || slug === 'home' || slug === '') {
    return true;
  }
  const title = (item.title || '').trim().toLowerCase();
  if (title === 'accueil' || title.includes('accueil')) {
    return true;
  }
  return false;
};

/**
 * Identifie la véritable page d'accueil dans la liste de pages existantes.
 * Ordre de priorité :
 * 1. page explicitement définie comme page d'accueil (isHome / isHomePage)
 * 2. slug « / » ou « accueil » ou « home »
 * 3. page portant le titre « Accueil »
 */
export const findHomePage = (pages = []) => {
  if (!Array.isArray(pages) || pages.length === 0) return null;

  // Priorité 1 : Explicitement définie comme page d'accueil
  const explicit = pages.find(p => p.isHome === true || p.isHomePage === true || p.is_home === true || p.is_homepage === true);
  if (explicit) return explicit;

  // Priorité 2 : Slug « / » ou « accueil » ou « home »
  const bySlug = pages.find(p => {
    const s = (p.slug || '').trim().toLowerCase();
    return s === '/' || s === 'accueil' || s === 'home' || s === '';
  });
  if (bySlug) return bySlug;

  // Priorité 3 : Titre exact « Accueil »
  const byExactTitle = pages.find(p => (p.title || '').trim().toLowerCase() === 'accueil');
  if (byExactTitle) return byExactTitle;

  // Priorité 3bis : Titre contenant « accueil » (ex: « Accueil - Anjou Edition »)
  const byTitle = pages.find(p => (p.title || '').toLowerCase().includes('accueil'));
  if (byTitle) return byTitle;

  // Fallback si aucune ne correspond : première page existante
  return pages[0] || null;
};

export const PageBuilder = ({
  editingId = null,
  editingType = 'page', // 'page' or 'article'
  onClose = () => {},
  onSaveSuccess = () => {}
}) => {
  // Listes des contenus disponibles (Pages & Articles)
  const [pagesList, setPagesList] = useState([]);
  const [articlesList, setArticlesList] = useState([]);

  // Cible courante sélectionnée dans le constructeur
  const [selectedContent, setSelectedContent] = useState(null);

  // Titre, Slug, Catégorie et Statut du contenu actuellement édité
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

  // Référence pour conserver l'état initial du contenu chargé (détection modifications non enregistrées)
  const initialContentRef = useRef(null);

  // Sélecteur de contenu (dropdown)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorRef = useRef(null);

  // Modale de confirmation pour modifications non enregistrées
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingContentChange, setPendingContentChange] = useState(null); // { id, type, action }

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification Toast visuelle de confirmation
  const [saveToast, setSaveToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (saveToast.show) {
      const timer = setTimeout(() => {
        setSaveToast(prev => ({ ...prev, show: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [saveToast.show]);

  // État du sélecteur de médiathèque direct pour remplacement sur canevas
  const [mediaPickerState, setMediaPickerState] = useState({
    isOpen: false,
    blockId: null,
    settingKey: 'src',
    filterType: 'image',
    title: 'Sélectionner un média'
  });

  // Charger les pages, articles et déterminer le contenu initial (Accueil par défaut)
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [fetchedPages, fetchedArticles] = await Promise.all([
          pageService.getPages('pages'),
          pageService.getPages('articles')
        ]);

        if (!isMounted) return;

        const safePages = Array.isArray(fetchedPages) ? fetchedPages : [];
        const safeArticles = Array.isArray(fetchedArticles) ? fetchedArticles : [];

        setPagesList(safePages);
        setArticlesList(safeArticles);

        // Déterminer la cible à charger
        const searchParams = new URLSearchParams(window.location.search);
        const urlPageId = searchParams.get('pageId');
        const urlArticleId = searchParams.get('articleId');
        const urlId = searchParams.get('id');
        const urlType = searchParams.get('type');

        let targetItem = null;
        let targetType = 'page';

        // 1. Priorité aux props explicites
        if (editingId) {
          if (editingType === 'article') {
            targetItem = safeArticles.find(a => a.id === editingId) || safePages.find(p => p.id === editingId);
            targetType = targetItem && safeArticles.includes(targetItem) ? 'article' : 'page';
          } else {
            targetItem = safePages.find(p => p.id === editingId) || safeArticles.find(a => a.id === editingId);
            targetType = targetItem && safeArticles.includes(targetItem) ? 'article' : 'page';
          }
        } 
        // 2. Paramètres d'URL explicites
        else if (urlPageId) {
          targetItem = safePages.find(p => p.id === urlPageId);
          targetType = 'page';
        } else if (urlArticleId) {
          targetItem = safeArticles.find(a => a.id === urlArticleId);
          targetType = 'article';
        } else if (urlId) {
          if (urlType === 'article') {
            targetItem = safeArticles.find(a => a.id === urlId);
            targetType = 'article';
          } else {
            targetItem = safePages.find(p => p.id === urlId);
            targetType = 'page';
          }
        }
        
        // 3. Cible par DÉFAUT : « Accueil » réelle existante
        if (!targetItem) {
          const homePage = findHomePage(safePages);
          if (homePage) {
            targetItem = homePage;
            targetType = 'page';
          } else if (safePages.length > 0) {
            targetItem = safePages[0];
            targetType = 'page';
          } else if (safeArticles.length > 0) {
            targetItem = safeArticles[0];
            targetType = 'article';
          }
        }

        if (targetItem) {
          if (targetType === 'page' && isHomePage(targetItem)) {
            console.log('[PageBuilder] Home page resolved:', targetItem.id);
          }
          const title = targetItem.title || '';
          const slug = targetItem.slug || '';
          const category = targetItem.category || 'Outils';
          const status = targetItem.status || 'draft';

          let targetBlocks = targetItem.blocks;
          if ((!targetBlocks || targetBlocks.length === 0) && isHomePage(targetItem) && targetType === 'page') {
            targetBlocks = getDefaultHomepageBlocks();
            console.log('[PageBuilder] Homepage legacy content hydrated');
          }
          const normalized = normalizeBlocks(targetBlocks || []);
          console.log('[PageBuilder] Loaded blocks:', normalized.length);

          setPageTitle(title);
          setPageSlug(slug);
          setPageCategory(category);
          setPageStatus(status);
          clearHistory(normalized);

          const newSelected = {
            id: targetItem.id,
            type: targetType,
            title,
            slug,
            category,
            status
          };
          setSelectedContent(newSelected);

          initialContentRef.current = {
            id: targetItem.id,
            type: targetType,
            title,
            slug,
            category,
            status,
            blocksJson: JSON.stringify(normalized)
          };
        }
      } catch (e) {
        console.error("Erreur de chargement des données dans le constructeur", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [editingId, editingType, clearHistory]);

  // Synchroniser les données d'aperçu dans le localStorage pour le mode preview
  useEffect(() => {
    if (!selectedContent || !selectedContent.id) return;
    try {
      localStorage.setItem('ae_preview_data', JSON.stringify({
        id: selectedContent.id,
        type: selectedContent.type,
        title: pageTitle,
        slug: pageSlug,
        category: pageCategory,
        status: pageStatus,
        blocks: blocks
      }));
    } catch (e) {
      console.error("Error setting preview data in localStorage:", e);
    }
  }, [selectedContent, pageTitle, pageSlug, pageCategory, pageStatus, blocks]);

  // Fermer le sélecteur si clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setIsSelectorOpen(false);
      }
    };

    if (isSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelectorOpen]);

  // Vérifier si des modifications non enregistrées sont présentes
  const hasUnsavedChanges = useCallback(() => {
    if (!initialContentRef.current || !selectedContent || !selectedContent.id) return false;
    const init = initialContentRef.current;
    if (init.id !== selectedContent.id || init.type !== selectedContent.type) return false;

    if (pageTitle !== init.title) return true;
    if (pageSlug !== init.slug) return true;
    if (pageCategory !== init.category) return true;
    if (pageStatus !== init.status) return true;

    const currentBlocksJson = JSON.stringify(normalizeBlocks(blocks));
    if (currentBlocksJson !== init.blocksJson) return true;

    return false;
  }, [pageTitle, pageSlug, pageCategory, pageStatus, blocks, selectedContent]);

  // Charger un contenu spécifique dans le constructeur avec réinitialisation complète de l'état
  const loadSelectedContent = useCallback((targetId, targetType, customPages = null, customArticles = null) => {
    const pList = customPages || pagesList;
    const aList = customArticles || articlesList;
    const collectionList = targetType === 'article' ? aList : pList;
    const targetItem = collectionList.find(item => item.id === targetId);

    if (!targetItem) {
      console.warn(`Contenu ${targetId} (${targetType}) introuvable.`);
      return;
    }

    // 1. Vider correctement l'état de l'ancien contenu
    setActiveBlockId(null);
    setActiveTab('widgets');
    setActiveDragWidget(null);

    if (targetType === 'page' && isHomePage(targetItem)) {
      console.log('[PageBuilder] Home page resolved:', targetItem.id);
    }

    // 2. Charger les nouvelles données
    const title = targetItem.title || '';
    const slug = targetItem.slug || '';
    const category = targetItem.category || 'Outils';
    const status = targetItem.status || 'draft';

    let itemBlocks = targetItem.blocks;
    if ((!itemBlocks || itemBlocks.length === 0) && isHomePage(targetItem) && targetType === 'page') {
      itemBlocks = getDefaultHomepageBlocks();
      console.log('[PageBuilder] Homepage legacy content hydrated');
    }
    const normalizedBlocks = normalizeBlocks(itemBlocks || []);
    console.log('[PageBuilder] Loaded blocks:', normalizedBlocks.length);

    // 3. Mettre à jour tous les états React
    setPageTitle(title);
    setPageSlug(slug);
    setPageCategory(category);
    setPageStatus(status);
    clearHistory(normalizedBlocks);

    const newSelected = {
      id: targetItem.id,
      type: targetType,
      title,
      slug,
      category,
      status
    };
    setSelectedContent(newSelected);

    // 4. Mettre à jour le snapshot initial
    initialContentRef.current = {
      id: targetItem.id,
      type: targetType,
      title,
      slug,
      category,
      status,
      blocksJson: JSON.stringify(normalizedBlocks)
    };

    // 5. Mettre à jour les données d'aperçu localStorage
    try {
      localStorage.setItem('ae_preview_data', JSON.stringify({
        id: targetItem.id,
        type: targetType,
        title,
        slug,
        category,
        status,
        blocks: normalizedBlocks
      }));
    } catch (e) {}
  }, [pagesList, articlesList, clearHistory]);

  // Demande de changement de contenu avec vérification des modifications non enregistrées
  const handleRequestContentChange = (nextId, nextType) => {
    setIsSelectorOpen(false);
    if (selectedContent && selectedContent.id === nextId && selectedContent.type === nextType) {
      return;
    }

    if (hasUnsavedChanges()) {
      setPendingContentChange({ id: nextId, type: nextType });
      setShowUnsavedModal(true);
    } else {
      loadSelectedContent(nextId, nextType);
    }
  };

  // Sauvegarder et continuer vers la nouvelle page demandée
  const handleSaveAndContinue = async () => {
    if (!selectedContent || !selectedContent.id) {
      setShowUnsavedModal(false);
      return;
    }

    setSaving(true);
    try {
      const collectionName = selectedContent.type === 'article' ? 'articles' : 'pages';
      const normalizedBlocks = normalizeBlocks(blocks);
      const payload = {
        title: pageTitle,
        slug: pageSlug,
        category: pageCategory,
        status: pageStatus,
        blocks: normalizedBlocks
      };

      const result = await pageService.savePage(payload, selectedContent.id, collectionName);

      let updatedPages = pagesList;
      let updatedArticles = articlesList;

      if (selectedContent.type === 'article') {
        updatedArticles = articlesList.map(a => a.id === selectedContent.id ? { ...a, ...payload, ...result } : a);
        setArticlesList(updatedArticles);
      } else {
        updatedPages = pagesList.map(p => p.id === selectedContent.id ? { ...p, ...payload, ...result } : p);
        setPagesList(updatedPages);
      }

      onSaveSuccess(result);
      setShowUnsavedModal(false);

      if (pendingContentChange) {
        if (pendingContentChange.action === 'close') {
          onClose();
        } else {
          loadSelectedContent(pendingContentChange.id, pendingContentChange.type, updatedPages, updatedArticles);
        }
        setPendingContentChange(null);
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde avant changement", err);
      alert("Une erreur est survenue lors de l'enregistrement des modifications.");
    } finally {
      setSaving(false);
    }
  };

  // Continuer sans enregistrer (abandonner les modifications)
  const handleDiscardAndContinue = () => {
    setShowUnsavedModal(false);
    if (pendingContentChange) {
      if (pendingContentChange.action === 'close') {
        onClose();
      } else {
        loadSelectedContent(pendingContentChange.id, pendingContentChange.type);
      }
      setPendingContentChange(null);
    }
  };

  // Annuler le changement de page
  const handleCancelModal = () => {
    setShowUnsavedModal(false);
    setPendingContentChange(null);
  };

  // Demande de fermeture du constructeur avec protection des données
  const handleRequestClose = () => {
    if (hasUnsavedChanges()) {
      setPendingContentChange({ action: 'close' });
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setPageTitle(val);
    if (!pageSlug) {
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
  const handleBlockSettingsChange = useCallback((id, newSettings) => {
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
  }, [blocks, pushBlocksState]);

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

  // GESTION DU REMPLACEMENT DE MÉDIA DIRECT (IMAGE / VIDÉO)
  const handleOpenMediaPicker = useCallback((block, settingKey = 'src', filterType = null) => {
    if (!block) return;
    const detectedFilter = filterType || (block.type === 'video' ? 'video' : 'image');
    setMediaPickerState({
      isOpen: true,
      blockId: block.id,
      settingKey: settingKey || (detectedFilter === 'video' ? 'url' : 'src'),
      filterType: detectedFilter,
      title: detectedFilter === 'video' 
        ? 'Sélectionner une vidéo dans la médiathèque' 
        : 'Sélectionner une image dans la médiathèque'
    });
    setActiveBlockId(block.id);
    setActiveTab('settings');
  }, []);

  const handleMediaPickerSelect = useCallback((media) => {
    if (mediaPickerState.blockId && media) {
      const targetBlock = findBlockById(blocks, mediaPickerState.blockId);
      if (targetBlock) {
        const isVideo = targetBlock.type === 'video' || mediaPickerState.filterType === 'video';
        if (isVideo) {
          const vidUrl = media.url || '';
          const newId = extractYoutubeVideoId(vidUrl);
          handleBlockSettingsChange(targetBlock.id, {
            ...targetBlock.settings,
            url: vidUrl,
            videoId: newId || targetBlock.settings.videoId || 'dQw4w9WgXcQ',
            embedUrl: newId ? `https://www.youtube.com/embed/${newId}` : undefined,
            lastValidVideoId: newId || targetBlock.settings.lastValidVideoId
          });
          setSaveToast({ show: true, message: "Vidéo YouTube mise à jour dans le bloc.", type: 'success' });
        } else {
          const key = mediaPickerState.settingKey || 'src';
          handleBlockSettingsChange(targetBlock.id, {
            ...targetBlock.settings,
            [key]: media.url,
            ...(key === 'src' && !targetBlock.settings.alt ? { alt: media.alt || media.name || '' } : {})
          });
          setSaveToast({ show: true, message: "Image mise à jour dans le bloc.", type: 'success' });
        }
      }
    }
    setMediaPickerState(prev => ({ ...prev, isOpen: false }));
  }, [blocks, findBlockById, handleBlockSettingsChange, mediaPickerState]);

  // ANNULER LES MODIFICATIONS (RÉTABLIR L'ÉTAT INITIAL)
  const handleRevertChanges = useCallback(() => {
    if (!initialContentRef.current) return;
    if (!hasUnsavedChanges()) {
      setSaveToast({ show: true, message: "Aucune modification à annuler (état initial déjà actif).", type: 'info' });
      return;
    }
    const confirmRevert = window.confirm("Voulez-vous annuler toutes les modifications non enregistrées et rétablir l'état initial ?");
    if (confirmRevert) {
      const init = initialContentRef.current;
      setPageTitle(init.title || '');
      setPageSlug(init.slug || '');
      setPageCategory(init.category || 'Outils');
      setPageStatus(init.status || 'draft');
      const restoredBlocks = JSON.parse(init.blocksJson || '[]');
      clearHistory(restoredBlocks);
      setActiveBlockId(null);
      setSaveToast({ show: true, message: "Modifications annulées — contenu initial rétabli.", type: 'info' });
    }
  }, [hasUnsavedChanges, clearHistory]);

  // SAUVEGARDER ET PUBLIER LA PAGE
  const handleSavePage = useCallback(async () => {
    if (!selectedContent || !selectedContent.id) {
      alert("Aucun contenu sélectionné pour l'enregistrement.");
      return;
    }
    if (!pageTitle.trim()) {
      alert(selectedContent.type === 'article' ? "Veuillez donner un titre à l'article." : "Veuillez donner un titre à la page.");
      return;
    }
    if (blocks.length === 0) {
      alert("Veuillez ajouter au moins un élément.");
      return;
    }

    setSaving(true);
    try {
      const collectionName = selectedContent.type === 'article' ? 'articles' : 'pages';
      const normalizedBlocks = normalizeBlocks(blocks);
      const payload = {
        title: pageTitle,
        slug: pageSlug,
        category: pageCategory,
        status: pageStatus,
        blocks: normalizedBlocks
      };

      const result = await pageService.savePage(payload, selectedContent.id, collectionName);

      if (selectedContent.type === 'article') {
        setArticlesList(prev => prev.map(a => a.id === selectedContent.id ? { ...a, ...payload, ...result } : a));
      } else {
        setPagesList(prev => prev.map(p => p.id === selectedContent.id ? { ...p, ...payload, ...result } : p));
      }

      initialContentRef.current = {
        id: selectedContent.id,
        type: selectedContent.type,
        title: pageTitle,
        slug: pageSlug,
        category: pageCategory,
        status: pageStatus,
        blocksJson: JSON.stringify(normalizedBlocks)
      };

      setSelectedContent(prev => ({
        ...prev,
        title: pageTitle,
        slug: pageSlug,
        category: pageCategory,
        status: pageStatus
      }));

      setSaveToast({
        show: true,
        message: `${selectedContent.type === 'article' ? 'Article' : 'Page'} "${pageTitle}" enregistré et synchronisé avec succès !`,
        type: 'success'
      });
      onSaveSuccess(result);
    } catch (e) {
      console.error("Erreur de sauvegarde", e);
      setSaveToast({
        show: true,
        message: "Une erreur est survenue lors de l'enregistrement.",
        type: 'error'
      });
      alert("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }, [selectedContent, pageTitle, pageSlug, pageCategory, pageStatus, blocks, onSaveSuccess]);

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
        <span className="text-muted text-sm">Chargement du contenu dans le constructeur...</span>
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
              https://anjou-edition.ags49.fr/{selectedContent?.type === 'article' ? 'articles' : 'pages'}/{pageSlug || 'sans-titre'}
            </span>
          </div>
        </div>

        {/* Cadre de prévisualisation */}
        <div className="flex-grow-1" style={{ flex: 1, minHeight: 0 }}>
          <IframePreview 
            device={device} 
            src={`/?preview=true&pageId=${selectedContent?.id || 'new'}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div id="bpb-builder-app" className="d-flex flex-column bg-light" style={{ height: '100%', overflow: 'hidden' }}>
      
      {/* Barre d'outils supérieure avec sélecteur de contenu intégré */}
      <div id="bpb-toolbar" className="bg-white dark:bg-slate-900 border-bottom p-2.5 d-flex flex-wrap gap-3 justify-content-between align-items-center position-sticky top-0 z-3 shadow-sm">
        
        {/* Partie Gauche : Retour, Sélecteur de Contenu & Titre/Slug */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button 
            type="button" 
            onClick={handleRequestClose}
            className="btn btn-outline-secondary btn-sm p-1.5 rounded-lg"
            title="Quitter le constructeur"
            aria-label="Quitter le constructeur"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Sélecteur de Contenu Actuel */}
          <div className="position-relative" ref={selectorRef}>
            <div className="d-flex align-items-center gap-1.5">
              <span className="text-muted text-xs font-semibold d-none d-md-inline" style={{ fontSize: '12px' }}>
                {selectedContent?.type === 'article' ? "Article actuel :" : "Page actuelle :"}
              </span>
              <button
                type="button"
                onClick={() => setIsSelectorOpen(prev => !prev)}
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 py-1 px-2.5 rounded-lg font-bold shadow-sm"
                style={{ background: '#f8fafc', borderColor: '#cbd5e1', color: '#1e293b' }}
                aria-haspopup="listbox"
                aria-expanded={isSelectorOpen}
                title="Changer de page ou d'article"
                data-testid="content-selector-btn"
              >
                {selectedContent?.type === 'article' ? (
                  <Newspaper size={15} className="text-primary flex-shrink-0" />
                ) : isHomePage(selectedContent) ? (
                  <span role="img" aria-label="Accueil" style={{ fontSize: '14px' }}>🏠</span>
                ) : (
                  <FileText size={15} className="text-primary flex-shrink-0" />
                )}
                <span className="text-truncate" style={{ maxWidth: '180px', fontWeight: 600 }}>
                  {selectedContent?.title || (selectedContent?.type === 'article' ? 'Article sans titre' : 'Accueil')}
                </span>
                <ChevronDown size={14} className="text-muted flex-shrink-0" />
              </button>
            </div>

            {/* Menu déroulant du sélecteur */}
            {isSelectorOpen && (
              <div 
                className="pb-content-selector-dropdown shadow-lg rounded-xl border bg-white dark:bg-slate-900 position-absolute"
                style={{ 
                  top: 'calc(100% + 6px)', 
                  left: 0, 
                  minWidth: '280px', 
                  zIndex: 1050, 
                  maxHeight: '380px', 
                  overflowY: 'auto',
                  borderRadius: '10px'
                }}
                role="listbox"
                data-testid="content-selector-dropdown"
              >
                {/* Section PAGES */}
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-bottom text-xs font-bold text-muted uppercase tracking-wider d-flex justify-content-between align-items-center">
                  <span>Pages ({pagesList.length})</span>
                </div>
                <div className="p-1">
                  {pagesList.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted italic">Aucune page disponible</div>
                  ) : (
                    pagesList.map((page) => {
                      const isSelected = selectedContent?.id === page.id && selectedContent?.type === 'page';
                      const isHome = isHomePage(page);
                      return (
                        <button
                          key={`page-item-${page.id}`}
                          type="button"
                          onClick={() => handleRequestContentChange(page.id, 'page')}
                          className={`w-100 text-start d-flex align-items-center justify-content-between px-2.5 py-1.5 rounded-lg border-0 my-0.5 text-sm transition-all ${
                            isSelected 
                              ? 'bg-primary text-white font-bold' 
                              : 'bg-transparent text-slate-700 dark:text-slate-200 hover-bg-slate'
                          }`}
                          style={{ cursor: 'pointer', background: isSelected ? '#2563eb' : 'transparent' }}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="d-flex align-items-center gap-2 text-truncate">
                            {isHome ? (
                              <span role="img" aria-label="Accueil" style={{ fontSize: '13px' }}>🏠</span>
                            ) : (
                              <FileText size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                            )}
                            <span className="text-truncate">{page.title || 'Page sans titre'}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-white flex-shrink-0 ms-2" />}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Section ARTICLES */}
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-top border-bottom text-xs font-bold text-muted uppercase tracking-wider d-flex justify-content-between align-items-center mt-1">
                  <span>Articles ({articlesList.length})</span>
                </div>
                <div className="p-1">
                  {articlesList.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted italic">Aucun article disponible</div>
                  ) : (
                    articlesList.map((article) => {
                      const isSelected = selectedContent?.id === article.id && selectedContent?.type === 'article';
                      return (
                        <button
                          key={`article-item-${article.id}`}
                          type="button"
                          onClick={() => handleRequestContentChange(article.id, 'article')}
                          className={`w-100 text-start d-flex align-items-center justify-content-between px-2.5 py-1.5 rounded-lg border-0 my-0.5 text-sm transition-all ${
                            isSelected 
                              ? 'bg-primary text-white font-bold' 
                              : 'bg-transparent text-slate-700 dark:text-slate-200 hover-bg-slate'
                          }`}
                          style={{ cursor: 'pointer', background: isSelected ? '#2563eb' : 'transparent' }}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="d-flex align-items-center gap-2 text-truncate">
                            <Newspaper size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                            <span className="text-truncate">{article.title || 'Article sans titre'}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-white flex-shrink-0 ms-2" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Titre et Slug */}
          <div className="d-flex flex-column ms-1">
            <input
              type="text"
              value={pageTitle}
              onChange={handleTitleChange}
              placeholder="Titre de la page (ex: Accueil - Anjou Edition)"
              className="border-0 bg-transparent text-slate-800 dark:text-slate-100 font-bold px-1.5 py-0.5"
              style={{ fontSize: '15px', outline: 'none', maxWidth: '240px' }}
            />
            <span className="text-[10px] text-muted px-1.5" style={{ fontSize: '11px' }}>
              Slug : /{selectedContent?.type === 'article' ? 'articles' : 'pages'}/{pageSlug || '...'}
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
            aria-label="Statut de publication"
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
            onClick={handleRevertChanges}
            disabled={!hasUnsavedChanges()}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 py-1.5 px-3 rounded-lg"
            title="Annuler les modifications et rétablir le contenu initial"
            aria-label="Annuler les modifications non enregistrées"
          >
            <RotateCcw size={15} />
            Annuler
          </button>

          <button
            type="button"
            onClick={handleSavePage}
            disabled={saving || !pageTitle.trim() || blocks.length === 0}
            className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 py-1.5 px-3 rounded-lg font-bold shadow-sm"
          >
            {saving ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {selectedContent?.id ? 'Enregistrer' : 'Publier'}
          </button>
        </div>
      </div>

      {/* Save Notification Toast */}
      {saveToast.show && (
        <div 
          className={`pb-save-toast-banner position-fixed bottom-0 end-0 m-4 p-3 rounded-xl shadow-2xl border d-flex align-items-center gap-2.5 z-3 fade-in ${
            saveToast.type === 'error' ? 'bg-danger text-white' : (saveToast.type === 'info' ? 'bg-slate-800 text-white' : 'bg-success text-white')
          }`}
          style={{ zIndex: 9999, maxWidth: '420px', borderRadius: '12px' }}
          role="status"
          aria-live="polite"
        >
          {saveToast.type === 'error' ? (
            <AlertTriangle size={20} className="flex-shrink-0" />
          ) : (
            <CheckCircle size={20} className="flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{saveToast.message}</span>
          <button
            type="button"
            onClick={() => setSaveToast(prev => ({ ...prev, show: false }))}
            className="btn btn-link text-white p-0 ms-auto text-decoration-none"
            style={{ fontSize: '12px' }}
            aria-label="Fermer la notification"
          >
            ✕
          </button>
        </div>
      )}

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
              onOpenMediaPicker={handleOpenMediaPicker}
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

      {/* Modale de sélection directe de média pour remplacement sur le canevas */}
      <MediaLibraryModal
        isOpen={mediaPickerState.isOpen}
        filterType={mediaPickerState.filterType}
        title={mediaPickerState.title}
        onClose={() => setMediaPickerState(prev => ({ ...prev, isOpen: false }))}
        onSelect={handleMediaPickerSelect}
      />

      {/* Modale de confirmation pour modifications non enregistrées */}
      {showUnsavedModal && (
        <div 
          className="pb-modal-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 10000,
            backdropFilter: 'blur(4px)'
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-modal-title"
          data-testid="unsaved-changes-modal"
        >
          <div 
            className="pb-modal-card bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-4 p-md-5 border dark:border-slate-800"
            style={{ maxWidth: '520px', width: '90%', borderRadius: '16px' }}
          >
            <div className="d-flex align-items-start gap-3 mb-3">
              <div 
                className="rounded-circle p-2.5 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ backgroundColor: '#fef3c7', color: '#d97706' }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 id="unsaved-modal-title" className="fw-bold text-slate-900 dark:text-slate-100 mb-1" style={{ fontSize: '18px' }}>
                  Modifications non enregistrées
                </h4>
                <p className="text-slate-600 dark:text-slate-300 text-sm mb-0" style={{ fontSize: '14px', lineHeight: 1.5 }}>
                  Des modifications de {selectedContent?.type === 'article' ? "l'article" : 'la page'} <strong>« {selectedContent?.title || 'Accueil'} »</strong> n’ont pas encore été enregistrées.
                </p>
              </div>
            </div>

            <p className="text-muted text-xs mb-4" style={{ fontSize: '12px' }}>
              Que souhaitez-vous faire avant de continuer ?
            </p>

            <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 pt-2 border-top">
              <button
                type="button"
                onClick={handleCancelModal}
                className="btn btn-outline-secondary btn-sm py-2 px-3 rounded-lg font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDiscardAndContinue}
                className="btn btn-outline-danger btn-sm py-2 px-3 rounded-lg font-medium"
              >
                Continuer sans enregistrer
              </button>
              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving}
                className="btn btn-primary btn-sm py-2 px-3 rounded-lg font-bold d-flex align-items-center justify-content-center gap-1.5"
              >
                {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer et continuer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PageBuilder;
