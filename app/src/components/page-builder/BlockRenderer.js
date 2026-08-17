import React from 'react';
import { Section, Container, Row, Column } from '../bootstrap-blocks/LayoutBlocks';
import { Heading, Text, Image, Button, Card, Alert, Video } from '../bootstrap-blocks/ContentWidgets';
import { Trash2, ArrowUp, ArrowDown, Plus, GripVertical } from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';

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
      title="Déplacer"
      style={{ cursor: 'grab' }}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="w-3 h-3" />
    </button>
  );
};

const blockComponents = {
  section: Section,
  container: Container,
  row: Row,
  column: Column,
  heading: Heading,
  text: Text,
  image: Image,
  button: Button,
  card: Card,
  alert: Alert,
  video: Video
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
  onAddChild = () => {},
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

  // Rendu récursif des enfants
  const renderedChildren = children.map((child, idx) => (
    <BlockRenderer
      key={child.id}
      block={child}
      isEditing={isEditing}
      activeBlockId={activeBlockId}
      onSelectBlock={onSelectBlock}
      onRemoveBlock={onRemoveBlock}
      onMoveBlock={onMoveBlock}
      onAddChild={onAddChild}
      parentBlock={block}
      indexInParent={idx}
      siblingCount={children.length}
    />
  ));

  // (useDroppable a été déplacé au début du composant)

  // En mode édition, si un conteneur structurel est vide, on affiche une zone de dépôt vide
  const renderEmptyPlaceholder = () => {
    if (!isEditing) return null;
    if (children.length > 0) return null;

    if (type === 'column') {
      return (
        <div 
          className="pb-empty-placeholder d-flex flex-column align-items-center justify-content-center py-3 border border-dashed rounded text-muted cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(id, 'widget');
          }}
        >
          <Plus className="w-4 h-4 mb-1" />
          <span style={{ fontSize: '10px' }}>Widget</span>
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
          <span style={{ fontSize: '10px' }}>Ajouter une colonne</span>
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
          <span style={{ fontSize: '12px' }}>Ajouter un container</span>
        </div>
      );
    }
    return null;
  };

  // Rendu brut si on n'est pas en mode édition
  if (!isEditing) {
    return (
      <Component settings={settings}>
        {renderedChildren}
      </Component>
    );
  }

  // Rendu en mode édition (avec bordures et boutons de contrôle)
  const handleWrapperClick = (e) => {
    e.stopPropagation();
    onSelectBlock(block);
  };

  return (
    <div 
      ref={setNodeRef}
      className={`pb-editor-wrapper pb-type-${type} ${isActive ? 'pb-active-block' : ''} ${isOver ? 'ring-2 ring-blue-400 bg-blue-50/20' : ''}`}
      onClick={handleWrapperClick}
      data-block-id={id}
    >
      {/* Overlay de sélection / Hover */}
      <div className="pb-block-overlay"></div>
      
      {/* Barre de contrôle contextuelle */}
      <div className="pb-control-bar">
        <span className="pb-block-label">{type}</span>
        
        {/* Actions de déplacement (Drag & Drop + Flèches) */}
        <DragHandle id={id} />
        
        {parentBlock && siblingCount > 1 && (
          <>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onMoveBlock(id, parentBlock.id, 'up'); }}
              disabled={indexInParent === 0}
              className="pb-control-btn"
              title="Monter"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onMoveBlock(id, parentBlock.id, 'down'); }}
              disabled={indexInParent === siblingCount - 1}
              className="pb-control-btn"
              title="Descendre"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </>
        )}

        {/* Action d'ajout rapide pour les colonnes, rows, containers */}
        {['section', 'container', 'row', 'column'].includes(type) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const childType = type === 'section' ? 'container' : type === 'container' ? 'row' : type === 'row' ? 'column' : 'widget';
              onAddChild(id, childType);
            }}
            className="pb-control-btn pb-btn-add"
            title="Ajouter un enfant"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}

        {/* Action de suppression */}
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); onRemoveBlock(id, parentBlock ? parentBlock.id : null); }}
          className="pb-control-btn pb-btn-danger"
          title="Supprimer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Rendu effectif du composant */}
      <div className="pb-component-render">
        <Component settings={settings} isEditing={true}>
          {renderedChildren}
          {renderEmptyPlaceholder()}
        </Component>
      </div>
    </div>
  );
};
export default BlockRenderer;
