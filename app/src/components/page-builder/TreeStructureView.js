import React, { useState, useMemo } from 'react';
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
  Minus, 
  List as ListIcon, 
  PlayCircle, 
  Info, 
  BookOpen, 
  Feather, 
  Mail, 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Trash2, 
  Layers, 
  HelpCircle 
} from 'lucide-react';
import { BLOCK_DEFINITIONS } from './blockRegistry';

/**
 * Nettoie les balises HTML d'une chaîne pour générer un extrait textuel propre.
 */
const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Tronque une chaîne de caractères à une longueur donnée.
 */
const truncate = (text, maxLength = 26) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}…` : text;
};

/**
 * Extrait les métadonnées de présentation d'un bloc selon son type et ses settings.
 */
export const getNodeDisplayInfo = (block) => {
  if (!block) {
    return {
      label: 'Élément',
      snippet: '',
      badgeText: 'Item',
      badgeClass: 'pb-tree-badge-content',
      iconColorClass: 'text-muted',
      Icon: HelpCircle,
      isContainer: false
    };
  }

  const { type = 'unknown', settings = {} } = block;
  const blockDef = BLOCK_DEFINITIONS[type] || {};

  switch (type) {
    case 'section':
      return {
        label: 'Section',
        snippet: settings.classes ? settings.classes : (settings.style?.backgroundColor ? `Fond ${settings.style.backgroundColor}` : ''),
        badgeText: 'Section',
        badgeClass: 'pb-tree-badge-section',
        iconColorClass: 'text-primary',
        Icon: Layout,
        isContainer: true
      };

    case 'container':
      return {
        label: 'Conteneur',
        snippet: settings.fluid ? 'Pleine largeur (fluid)' : 'Largeur fixe (centré)',
        badgeText: 'Container',
        badgeClass: 'pb-tree-badge-container',
        iconColorClass: 'text-success',
        Icon: Square,
        isContainer: true
      };

    case 'row':
      return {
        label: 'Ligne (Row)',
        snippet: `Grille (${(block.children || []).length} col.)`,
        badgeText: 'Row',
        badgeClass: 'pb-tree-badge-row',
        iconColorClass: 'text-warning',
        Icon: Columns,
        isContainer: true
      };

    case 'column':
      return {
        label: 'Colonne',
        snippet: settings.sizeClasses || 'col-md-12',
        badgeText: 'Col',
        badgeClass: 'pb-tree-badge-column',
        iconColorClass: 'text-purple',
        Icon: Grid,
        isContainer: true
      };

    case 'heading': {
      const level = (settings.level || 'h2').toUpperCase();
      const content = settings.content || 'Nouveau titre';
      return {
        label: `Titre (${level})`,
        snippet: truncate(content, 24),
        badgeText: level,
        badgeClass: 'pb-tree-badge-content',
        iconColorClass: 'text-info',
        Icon: HeadingIcon,
        isContainer: false
      };
    }

    case 'text':
      return {
        label: 'Texte / HTML',
        snippet: truncate(stripHtml(settings.content || 'Paragraphe de texte'), 24),
        badgeText: 'Texte',
        badgeClass: 'pb-tree-badge-content',
        iconColorClass: 'text-slate-600',
        Icon: AlignLeft,
        isContainer: false
      };

    case 'image':
      return {
        label: 'Image',
        snippet: truncate(settings.alt || settings.caption || (settings.src ? settings.src.split('/').pop() : 'Illustration'), 22),
        badgeText: 'Image',
        badgeClass: 'pb-tree-badge-content',
        iconColorClass: 'text-info',
        Icon: ImageIcon,
        isContainer: false
      };

    case 'video':
      return {
        label: 'Vidéo',
        snippet: truncate(settings.title || settings.videoId || 'Vidéo YouTube', 22),
        badgeText: 'Vidéo',
        badgeClass: 'pb-tree-badge-content',
        iconColorClass: 'text-danger',
        Icon: VideoIcon,
        isContainer: false
      };

    case 'button':
      return {
        label: 'Bouton',
        snippet: truncate(settings.text || 'Action', 20),
        badgeText: 'Bouton',
        badgeClass: 'pb-tree-badge-content',
        iconColorClass: 'text-primary',
        Icon: PlaySquare,
        isContainer: false
      };

    case 'card':
      return {
        label: 'Carte (Card)',
        snippet: truncate(settings.title || 'Carte sans titre', 22),
        badgeText: 'Carte',
        badgeClass: 'pb-tree-badge-content',
        iconColorClass: 'text-indigo',
        Icon: Square,
        isContainer: false
      };

    case 'alert':
      return {
        label: 'Alerte',
        snippet: truncate(stripHtml(settings.content || 'Message d’alerte'), 22),
        badgeText: 'Alerte',
        badgeClass: 'pb-tree-badge-content',
        iconColorClass: 'text-warning',
        Icon: AlertCircle,
        isContainer: false
      };

    case 'divider':
      return {
        label: 'Séparateur',
        snippet: `Ligne ${settings.styleType || 'pleine'}`,
        badgeText: 'Ligne',
        badgeClass: 'pb-tree-badge-content',
        iconColorClass: 'text-slate-400',
        Icon: Minus,
        isContainer: false
      };

    case 'list':
      return {
        label: 'Liste à puces',
        snippet: `${(settings.items || []).length} élément(s)`,
        badgeText: 'Liste',
        badgeClass: 'pb-tree-badge-content',
        iconColorClass: 'text-slate-600',
        Icon: ListIcon,
        isContainer: false
      };

    // Modules métier
    case 'popularVideos':
      return {
        label: 'Vidéos Populaires',
        snippet: `${(settings.videos || []).length} vidéo(s)`,
        badgeText: 'Module',
        badgeClass: 'pb-tree-badge-module',
        iconColorClass: 'text-warning',
        Icon: PlayCircle,
        isContainer: false
      };

    case 'newsList':
      return {
        label: 'Actualités 2026',
        snippet: `${(settings.news || []).length} actualité(s)`,
        badgeText: 'Module',
        badgeClass: 'pb-tree-badge-module',
        iconColorClass: 'text-warning',
        Icon: Info,
        isContainer: false
      };

    case 'featuredPoems':
      return {
        label: 'Poésies Phares',
        snippet: `${(settings.poems || []).length} poème(s)`,
        badgeText: 'Module',
        badgeClass: 'pb-tree-badge-module',
        iconColorClass: 'text-warning',
        Icon: Feather,
        isContainer: false
      };

    case 'flipbookFeatured':
      return {
        label: 'Flipbook en Vedette',
        snippet: settings.title || 'Ouvrage interactif',
        badgeText: 'Module',
        badgeClass: 'pb-tree-badge-module',
        iconColorClass: 'text-warning',
        Icon: BookOpen,
        isContainer: false
      };

    case 'photoGallery':
      return {
        label: 'Galerie Photos',
        snippet: `${(settings.images || []).length} photo(s)`,
        badgeText: 'Module',
        badgeClass: 'pb-tree-badge-module',
        iconColorClass: 'text-warning',
        Icon: ImageIcon,
        isContainer: false
      };

    case 'youtubeChannel':
      return {
        label: 'Chaîne Vidéos',
        snippet: settings.title || 'Chaîne YouTube',
        badgeText: 'Module',
        badgeClass: 'pb-tree-badge-module',
        iconColorClass: 'text-warning',
        Icon: VideoIcon,
        isContainer: false
      };

    case 'contactForm':
      return {
        label: 'Formulaire de Contact',
        snippet: settings.title || 'Contact sécurisé RGPD',
        badgeText: 'Module',
        badgeClass: 'pb-tree-badge-module',
        iconColorClass: 'text-warning',
        Icon: Mail,
        isContainer: false
      };

    default:
      return {
        label: blockDef.label || type,
        snippet: truncate(settings.title || settings.content || '', 20),
        badgeText: type.slice(0, 5),
        badgeClass: 'pb-tree-badge-content',
        iconColorClass: 'text-muted',
        Icon: blockDef.icon || HelpCircle,
        isContainer: Boolean(blockDef.hasChildren)
      };
  }
};

/**
 * Calcule récursivement le total des sections et des blocs de la page.
 */
export const countBlocksStats = (blocksList = []) => {
  let sections = 0;
  let totalBlocks = 0;

  const traverse = (items) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      totalBlocks += 1;
      if (item.type === 'section') {
        sections += 1;
      }
      if (Array.isArray(item.children) && item.children.length > 0) {
        traverse(item.children);
      }
    }
  };

  traverse(blocksList);
  return { sections, totalBlocks };
};

/**
 * Nœud individuel récursif de l'arborescence.
 */
export const TreeNodeItem = ({
  block,
  parentId = null,
  depth = 0,
  activeBlockId,
  collapsedMap,
  onToggleCollapse,
  onSelectBlock,
  onToggleHideBlock,
  onRemoveBlock
}) => {
  if (!block || !block.id) return null;

  const hasChildren = Array.isArray(block.children) && block.children.length > 0;
  const isCollapsed = Boolean(collapsedMap[block.id]);
  const isHidden = Boolean(block.settings?.hidden || block.hidden);
  const isActive = activeBlockId === block.id;

  const info = getNodeDisplayInfo(block);
  const IconComponent = info.Icon;

  return (
    <div className="pb-tree-item-wrapper" role="none">
      <div
        className={`pb-tree-node d-flex align-items-center justify-content-between rounded transition-all ${
          isActive ? 'pb-tree-node-active' : ''
        } ${isHidden ? 'pb-tree-node-hidden' : ''}`}
        style={{
          paddingLeft: `${Math.max(6, depth * 14 + 6)}px`,
          paddingRight: '8px',
          paddingTop: '6px',
          paddingBottom: '6px',
          cursor: 'pointer'
        }}
        onClick={() => onSelectBlock(block)}
        role="treeitem"
        aria-selected={isActive}
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        aria-label={`${info.label} ${info.snippet ? `(${info.snippet})` : ''}`}
        data-testid={`tree-node-${block.id}`}
        data-block-id={block.id}
        data-block-type={block.type}
      >
        {/* Partie Gauche : Chevron + Icône + Intitulé & Snippet */}
        <div className="d-flex align-items-center gap-1.5 min-w-0 flex-grow-1" style={{ overflow: 'hidden' }}>
          {/* Bouton Chevron pour les conteneurs avec enfants */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(block.id);
              }}
              className="pb-tree-chevron-btn btn btn-link p-0 text-muted d-flex align-items-center justify-content-center"
              aria-label={isCollapsed ? `Déplier les enfants de ${info.label}` : `Replier les enfants de ${info.label}`}
              title={isCollapsed ? 'Déplier' : 'Replier'}
              style={{ width: '16px', height: '16px', border: 'none', background: 'transparent' }}
            >
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : (
            <span className="pb-tree-chevron-spacer" style={{ width: '16px', display: 'inline-block' }} />
          )}

          {/* Icône du composant */}
          <span className={`pb-tree-node-icon d-flex align-items-center flex-shrink-0 ${info.iconColorClass}`}>
            <IconComponent size={14} />
          </span>

          {/* Titre et Snippet */}
          <div className="d-flex flex-column text-truncate" style={{ lineHeight: 1.25, minWidth: 0 }}>
            <div className="d-flex align-items-center gap-1">
              <span className="pb-tree-node-label text-truncate font-bold" style={{ fontSize: '11px', color: '#1e293b' }}>
                {info.label}
              </span>
              <span className={`pb-tree-badge ${info.badgeClass}`} style={{ fontSize: '9px' }}>
                {info.badgeText}
              </span>
              {isHidden && (
                <span className="badge bg-warning text-dark font-normal" style={{ fontSize: '9px', padding: '1px 4px' }}>
                  Masqué
                </span>
              )}
            </div>
            {info.snippet && (
              <span className="pb-tree-node-snippet text-muted text-truncate" style={{ fontSize: '10px' }}>
                {info.snippet}
              </span>
            )}
          </div>
        </div>

        {/* Partie Droite : Actions contextuelles rapides */}
        <div className="pb-tree-actions d-flex align-items-center gap-1 ms-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Masquer / Réafficher */}
          <button
            type="button"
            onClick={() => onToggleHideBlock(block.id)}
            className={`pb-tree-action-btn btn btn-link p-1 text-decoration-none rounded ${
              isHidden ? 'text-warning' : 'text-muted'
            }`}
            aria-label={isHidden ? `Afficher le bloc ${info.label}` : `Masquer le bloc ${info.label}`}
            title={isHidden ? 'Afficher ce bloc sur la page' : 'Masquer temporairement ce bloc'}
            data-testid={`tree-toggle-hide-${block.id}`}
            style={{ width: '22px', height: '22px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>

          {/* Supprimer */}
          <button
            type="button"
            onClick={() => onRemoveBlock(block.id, parentId)}
            className="pb-tree-action-btn btn btn-link p-1 text-decoration-none rounded text-muted pb-tree-btn-danger"
            aria-label={`Supprimer le bloc ${info.label}`}
            title="Supprimer ce bloc"
            data-testid={`tree-remove-${block.id}`}
            style={{ width: '22px', height: '22px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Rendu récursif des enfants si non replié */}
      {hasChildren && !isCollapsed && (
        <div className="pb-tree-children-container" role="group">
          {block.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              block={child}
              parentId={block.id}
              depth={depth + 1}
              activeBlockId={activeBlockId}
              collapsedMap={collapsedMap}
              onToggleCollapse={onToggleCollapse}
              onSelectBlock={onSelectBlock}
              onToggleHideBlock={onToggleHideBlock}
              onRemoveBlock={onRemoveBlock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Composant principal de la Vue Arborescente (Structure).
 */
export const TreeStructureView = ({
  blocks = [],
  activeBlockId = null,
  onSelectBlock = () => {},
  onToggleHideBlock = () => {},
  onRemoveBlock = () => {},
  onOpenLibrary = null
}) => {
  // Gestion de l'état de repliement individuel des conteneurs
  const [collapsedMap, setCollapsedMap] = useState({});

  // Statistiques globales de l'arbre
  const stats = useMemo(() => countBlocksStats(blocks), [blocks]);

  // Basculer l'état déplié/replié d'un conteneur
  const handleToggleCollapse = (blockId) => {
    setCollapsedMap(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  // Déplier tous les conteneurs
  const handleExpandAll = () => {
    setCollapsedMap({});
  };

  // Replier tous les conteneurs
  const handleCollapseAll = () => {
    const nextMap = {};
    const collectContainerIds = (items) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (Array.isArray(item.children) && item.children.length > 0) {
          nextMap[item.id] = true;
          collectContainerIds(item.children);
        }
      }
    };
    collectContainerIds(blocks);
    setCollapsedMap(nextMap);
  };

  // État vide si aucun bloc dans la page
  if (!blocks || blocks.length === 0) {
    return (
      <div className="pb-tree-empty-container p-4 text-center text-muted" data-testid="tree-empty-state">
        <Layers size={32} className="text-slate-300 mx-auto mb-2" />
        <h6 className="text-xs font-bold text-slate-700 mb-1">Structure vierge</h6>
        <p className="text-[11px] text-slate-500 mb-3" style={{ lineHeight: 1.4 }}>
          Aucun bloc n’est actuellement présent sur la page. Ajoutez une section ou insérez un modèle prédéfini pour concevoir votre mise en page.
        </p>
        {onOpenLibrary && (
          <button
            type="button"
            onClick={onOpenLibrary}
            className="btn btn-primary btn-xs py-1.5 px-3 rounded font-bold shadow-sm"
            style={{ fontSize: '11px' }}
          >
            Ouvrir la Bibliothèque
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pb-tree-wrapper d-flex flex-column h-100" data-testid="tree-structure-view">
      {/* Barre d'outils supérieure de l'arborescence */}
      <div className="pb-tree-toolbar px-3 py-2 border-bottom bg-slate-50 dark:bg-slate-800 d-flex align-items-center justify-content-between flex-shrink-0">
        <div className="d-flex align-items-center gap-1.5 text-muted" style={{ fontSize: '11px' }}>
          <Layers size={13} className="text-primary flex-shrink-0" />
          <span className="font-semibold text-slate-700">
            {stats.sections} {stats.sections > 1 ? 'sections' : 'section'} • {stats.totalBlocks} {stats.totalBlocks > 1 ? 'éléments' : 'élément'}
          </span>
        </div>

        <div className="d-flex align-items-center gap-1">
          <button
            type="button"
            onClick={handleExpandAll}
            className="btn btn-outline-secondary btn-xs py-0.5 px-1.5 rounded"
            style={{ fontSize: '10px' }}
            title="Déplier tous les conteneurs"
            aria-label="Tout déplier"
          >
            Tout déplier
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="btn btn-outline-secondary btn-xs py-0.5 px-1.5 rounded"
            style={{ fontSize: '10px' }}
            title="Replier tous les conteneurs"
            aria-label="Tout replier"
          >
            Tout replier
          </button>
        </div>
      </div>

      {/* Liste arborescente des blocs */}
      <div 
        className="pb-tree-scroll-area p-2 overflow-y-auto flex-grow-1" 
        role="tree" 
        aria-label="Structure hiérarchique de la page"
        style={{ overflowY: 'auto' }}
      >
        {blocks.map((section) => (
          <TreeNodeItem
            key={section.id}
            block={section}
            parentId={null}
            depth={0}
            activeBlockId={activeBlockId}
            collapsedMap={collapsedMap}
            onToggleCollapse={handleToggleCollapse}
            onSelectBlock={onSelectBlock}
            onToggleHideBlock={onToggleHideBlock}
            onRemoveBlock={onRemoveBlock}
          />
        ))}
      </div>

      {/* Note d'aide contextuelle en pied */}
      <div className="p-2 border-top bg-slate-50 text-[10px] text-muted flex-shrink-0" style={{ fontSize: '10px' }}>
        <strong>Astuce :</strong> Cliquez sur un élément pour ouvrir ses propriétés. Utilisez l’icône œil pour masquer temporairement un bloc sans le supprimer.
      </div>
    </div>
  );
};

export default TreeStructureView;
