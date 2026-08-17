import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useBuilder } from '../store/builderStore';
import ElementRenderer from './ElementRenderer';
import EmptyState from './EmptyState';
import TemplatesModal from './TemplatesModal';
import createDefaultElement from '../utils/defaultElements';

export default function Canvas() {
  const { elements, previewMode, setElements } = useBuilder();
  const [showTemplates, setShowTemplates] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-root',
    data: { type: 'canvas-root' },
  });

  const handleAddDefaultSection = () => {
    const section = createDefaultElement('section');
    const row = createDefaultElement('row-1');
    section.children.push(row);
    setElements([section]);
  };

  const canvasClasses = [
    'builder-canvas',
    previewMode,
    isOver && elements.length === 0 ? 'drop-active' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div className="builder-canvas-wrapper">
        <div
          ref={setNodeRef}
          className={canvasClasses}
          style={{ minHeight: '600px' }}
          aria-label="Zone de construction de la page"
          role="region"
        >
          {elements.length === 0 ? (
            <EmptyState
              onClick={handleAddDefaultSection}
              onOpenTemplates={() => setShowTemplates(true)}
            />
          ) : (
            elements.map(element => (
              <ElementRenderer key={element.id} element={element} />
            ))
          )}
        </div>
      </div>

      {/* Templates modal triggered from EmptyState */}
      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
    </>
  );
}
