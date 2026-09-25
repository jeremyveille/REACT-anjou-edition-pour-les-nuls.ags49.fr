import React from 'react';
import { Section, Container, Row, Column } from '../bootstrap-blocks/LayoutBlocks';
import { 
  Heading, 
  Text, 
  Image, 
  Button, 
  Card, 
  Alert, 
  Video, 
  Divider, 
  List,
  PopularVideos,
  NewsList,
  FeaturedPoems,
  FlipbookFeatured,
  PhotoGallery,
  YoutubeChannel,
  ContactFormWidget
} from '../bootstrap-blocks/ContentWidgets';
import { Trash2, ArrowUp, ArrowDown, Plus, GripVertical, Copy, Image as ImageIcon, Film } from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { BLOCK_DEFINITIONS } from './blockRegistry';

// Composant wrapper pour la poignée de drag
const DragHandle = ({ id }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id,
    data: { type: 'element', blockId: id }
  });
  
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`pb-control-btn pb-btn-drag ${isDragging ? 'opacity-50' : ''}`}
      title="Glisser pour déplacer"
      aria-label="Glisser pour déplacer le bloc"
      style={{ cursor: 'grab' }}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="ae-icon-tiny" aria-hidden="true" />
    </button>
  );
};

const blockComponents = {
  // Structure
  section: Section,
  container: Container,
  row: Row,
  column: Column,
  // Contenu standard
  heading: Heading,
  text: Text,
  image: Image,
  button: Button,
  card: Card,
  alert: Alert,
  video: Video,
  divider: Divider,
  list: List,
  // Sections & modules métier
  popularVideos: PopularVideos,
  newsList: NewsList,
  featuredPoems: FeaturedPoems,
  flipbookFeatured: FlipbookFeatured,
  photoGallery: PhotoGallery,
  youtubeChannel: YoutubeChannel,
  contactForm: ContactFormWidget
};

/**
 * Composant de rendu récursif de blocs.
 */
export const BlockRenderer = ({
  block,
  isEditing = false,
  activeBlockId = null,
  onSelectBlock = () => {},
  onRemoveBlock = () => {},
  onMoveBlock = () => {},
  onDuplicateBlock = () => {},
  onAddChild = () => {},
  onOpenMediaPicker = null,
  parentBlock = null,
  indexInParent = 0,
  siblingCount = 0
}) => {
  const { id = 'invalid', type = 'unknown', settings = {}, children = [] } = block || {};
  
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: { type: 'element', element: block },
    disabled: !block
  });

  if (!block) return null;
  const Component = blockComponents[type];

  if (!Component) {
    console.warn(`Type de bloc inconnu: ${type}`);
    return null;
  }

  const isActive = activeBlockId === id;
  const blockDef = BLOCK_DEFINITIONS[type] || {};
  const displayLabel = blockDef.label || type;

  // Rendu récursif des enfants
  const renderedChildren = Array.isArray(children) ? children.map((child, idx) => (
    <BlockRenderer
      key={child.id}
      block={child}
      isEditing={isEditing}
      activeBlockId={activeBlockId}
      onSelectBlock={onSelectBlock}
      onRemoveBlock={onRemoveBlock}
      onMoveBlock={onMoveBlock}
      onDuplicateBlock={onDuplicateBlock}
      onAddChild={onAddChild}
      onOpenMediaPicker={onOpenMediaPicker}
      parentBlock={block}
      indexInParent={idx}
      siblingCount={children.length}
    />
  )) : null;

  // En mode édition, si un conteneur structurel est vide, on affiche une zone de dépôt vide
  const renderEmptyPlaceholder = () => {
    if (!isEditing) return null;
    if (children && children.length > 0) return null;

    if (type === 'column') {
      return (
        <div 
          className="pb-empty-placeholder d-flex flex-column align-items-center justify-content-center py-3 border border-dashed rounded text-muted cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(id, 'heading');
          }}
        >
          <Plus className="w-4 h-4 mb-1" />
          <span style={{ fontSize: '11px' }}>Ajouter un élément dans cette colonne</span>
        </div>
      );
    }
    if (type === 'row') {
      return (
        <div 
          className="pb-empty-placeholder d-flex flex-column align-items-center justify-content-center py-3 border border-dashed rounded text-muted cursor-pointer w-100"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(id, 'column');
          }}
        >
          <Plus className="w-4 h-4 mb-1" />
          <span style={{ fontSize: '11px' }}>Ajouter une colonne</span>
        </div>
      );
    }
    if (type === 'container') {
      return (
        <div 
          className="pb-empty-placeholder d-flex flex-column align-items-center justify-content-center py-4 border border-dashed rounded text-muted cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(id, 'row');
          }}
        >
          <Plus className="w-4 h-4 mb-1" />
          <span style={{ fontSize: '11px' }}>Ajouter une ligne</span>
        </div>
      );
    }
    if (type === 'section') {
      return (
        <div 
          className="pb-empty-placeholder d-flex flex-column align-items-center justify-content-center py-5 border border-dashed rounded text-muted cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(id, 'container');
          }}
        >
          <Plus className="w-5 h-5 mb-1" />
          <span style={{ fontSize: '12px' }}>Ajouter un conteneur</span>
        </div>
      );
    }
    return null;
  };

  // Rendu brut si on n'est pas en mode édition (site public ou preview)
  if (!isEditing) {
    return (
      <Component settings={settings} isEditing={false}>
        {renderedChildren}
      </Component>
    );
  }

  // Rendu en mode édition (avec bordures interactives et barre d'actions contextuelle)
  const handleWrapperClick = (e) => {
    e.stopPropagation();
    onSelectBlock(block);
  };

  return (
    <div 
      ref={setNodeRef}
      className={`ae-pagebuilder-block-wrapper pb-editor-wrapper pb-type-${type} ${isActive ? 'pb-active-block' : ''} ${isOver ? 'ae-drop-active-block' : ''}`}
      onClick={handleWrapperClick}
      data-block-id={id}
    >
      {/* Overlay de sélection / Hover */}
      <div className="pb-block-overlay"></div>
      
      {/* Barre de contrôle contextuelle */}
      <div className="pb-control-bar">
        <span className="pb-block-label">{displayLabel}</span>
        
        {/* Actions de déplacement (Drag & Drop + Flèches) */}
        <DragHandle id={id} />
        
        {siblingCount > 1 && (
          <>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onMoveBlock(id, parentBlock ? parentBlock.id : null, 'up'); }}
              disabled={indexInParent === 0}
              className="pb-control-btn"
              title="Monter"
              aria-label={`Monter le bloc ${displayLabel}`}
            >
              <ArrowUp className="ae-icon-tiny" aria-hidden="true" />
            </button>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onMoveBlock(id, parentBlock ? parentBlock.id : null, 'down'); }}
              disabled={indexInParent === siblingCount - 1}
              className="pb-control-btn"
              title="Descendre"
              aria-label={`Descendre le bloc ${displayLabel}`}
            >
              <ArrowDown className="ae-icon-tiny" aria-hidden="true" />
            </button>
          </>
        )}

        {/* Action directe de modification de média (Image ou Vidéo) */}
        {type === 'image' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(block);
              if (onOpenMediaPicker) onOpenMediaPicker(block, 'src', 'image');
            }}
            className="pb-control-btn pb-btn-media"
            title="Modifier / Remplacer l'image"
            aria-label="Modifier ou remplacer l'image"
          >
            <ImageIcon className="ae-icon-tiny" aria-hidden="true" />
          </button>
        )}

        {type === 'video' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(block);
              if (onOpenMediaPicker) onOpenMediaPicker(block, 'url', 'video');
            }}
            className="pb-control-btn pb-btn-media"
            title="Modifier / Remplacer la vidéo"
            aria-label="Modifier ou remplacer la vidéo"
          >
            <Film className="ae-icon-tiny" aria-hidden="true" />
          </button>
        )}

        {type === 'card' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(block);
              if (onOpenMediaPicker) onOpenMediaPicker(block, 'image', 'image');
            }}
            className="pb-control-btn pb-btn-media"
            title="Modifier l'image de la carte"
            aria-label="Modifier l'image de la carte"
          >
            <ImageIcon className="ae-icon-tiny" aria-hidden="true" />
          </button>
        )}

        {/* Action de duplication */}
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); onDuplicateBlock(id, parentBlock ? parentBlock.id : null); }}
          className="pb-control-btn"
          title="Dupliquer"
          aria-label={`Dupliquer le bloc ${displayLabel}`}
        >
          <Copy className="ae-icon-tiny" aria-hidden="true" />
        </button>

        {/* Action d'ajout rapide pour les colonnes, rows, containers */}
        {['section', 'container', 'row', 'column'].includes(type) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const childType = type === 'section' ? 'container' : type === 'container' ? 'row' : type === 'row' ? 'column' : 'heading';
              onAddChild(id, childType);
            }}
            className="pb-control-btn pb-btn-add"
            title="Ajouter un sous-élément"
            aria-label={`Ajouter un sous-élément dans ${displayLabel}`}
          >
            <Plus className="ae-icon-tiny" aria-hidden="true" />
          </button>
        )}

        {/* Action de suppression */}
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); onRemoveBlock(id, parentBlock ? parentBlock.id : null); }}
          className="pb-control-btn pb-btn-danger"
          title="Supprimer"
          aria-label={`Supprimer le bloc ${displayLabel}`}
        >
          <Trash2 className="ae-icon-tiny" aria-hidden="true" />
        </button>
      </div>

      {/* Rendu effectif du composant */}
      <div className="pb-component-render">
        <Component 
          settings={settings} 
          isEditing={true}
          onOpenMediaPicker={(settingKey, filterType) => {
            if (onOpenMediaPicker) onOpenMediaPicker(block, settingKey, filterType);
          }}
        >
          {renderedChildren}
          {renderEmptyPlaceholder()}
        </Component>
      </div>
    </div>
  );
};

export default BlockRenderer;
