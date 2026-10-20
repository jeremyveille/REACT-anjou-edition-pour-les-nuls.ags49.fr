
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { getWidgetIcon } from '../utils/iconMap';

export default function WidgetItem({ type, label, description, icon }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `widget-${type}`,
    data: { type: 'widget', widgetType: type }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 'auto'
  };

  const IconComponent = getWidgetIcon(icon);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`pb-widget-card${isDragging ? ' is-dragging' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`Widget ${label} — ${description}`}
    >
      <div className="pb-widget-icon" aria-hidden="true">
        <IconComponent size={16} />
      </div>

      <div className="pb-widget-meta">
        <div className="pb-widget-label">{label}</div>
        <div className="pb-widget-desc">{description}</div>
      </div>

      <div className="pb-widget-drag-handle" aria-hidden="true">
        <GripVertical size={14} />
      </div>
    </div>
  );
}
