import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useBuilder } from '../store/builderStore';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import Canvas from './Canvas';
import SettingsPanel from './SettingsPanel';
import Navigator from './Navigator';
import GlobalSettings from './GlobalSettings';
import ContextMenu from './ContextMenu';
import { GripVertical } from 'lucide-react';
import { renderWidgetIcon } from '../utils/iconMap';
import { widgets } from '../data/widgets';

export default function Layout() {
  const { moveElement, selectedElementId } = useBuilder();
  const [activeWidget, setActiveWidget] = useState(null);
  const [mobileTab, setMobileTab] = useState('canvas'); // 'widgets' | 'canvas' | 'settings'

  // Basculer automatiquement sur l'onglet réglages sur mobile si un élément est sélectionné
  useEffect(() => {
    if (selectedElementId) {
      setMobileTab('settings');
    }
  }, [selectedElementId]);

  // Require 8px movement before starting drag to allow normal clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  const handleDragStart = ({ active }) => {
    const activeId = active.id.toString();
    if (activeId.startsWith('widget-')) {
      const widgetType = activeId.replace('widget-', '');
      const widget = widgets.find(w => w.type === widgetType);
      setActiveWidget(widget);
    }
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveWidget(null);
    if (!over) return;
    const activeId = active.id.toString();
    const overId   = over.id.toString();
    if (activeId === overId) return;
    moveElement(activeId, overId, activeId.startsWith('widget-'));
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="builder-layout">
        <Toolbar />

        {/* Sélecteur d'onglets pour navigation mobile et tablette (< 1024px) */}
        <div className="pb-mobile-tabs" role="tablist" aria-label="Navigation des vues mobiles">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'widgets'}
            className={`pb-mobile-tab ${mobileTab === 'widgets' ? 'active' : ''}`}
            onClick={() => setMobileTab('widgets')}
          >
            📦 Widgets
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'canvas'}
            className={`pb-mobile-tab ${mobileTab === 'canvas' ? 'active' : ''}`}
            onClick={() => setMobileTab('canvas')}
          >
            👁️ Canevas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'settings'}
            className={`pb-mobile-tab ${mobileTab === 'settings' ? 'active' : ''}`}
            onClick={() => setMobileTab('settings')}
          >
            ⚙️ Réglages {selectedElementId ? '•' : ''}
          </button>
        </div>

        <div className={`builder-workspace tab-${mobileTab}`} style={{ position: 'relative' }}>
          <Sidebar />
          <Navigator />
          <Canvas />
          <SettingsPanel />
          <GlobalSettings />
        </div>
      </div>
      <ContextMenu />

      {/* Floating ghost shown while dragging a widget from sidebar */}
      <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(.18,.67,.6,1.22)' }}>
        {activeWidget ? (
          <div className="drag-overlay-widget">
            <span style={{ color: 'var(--pb-primary)', display: 'flex' }}>
              {renderWidgetIcon(activeWidget.icon, { size: 16 })}
            </span>
            <GripVertical size={13} style={{ color: 'var(--pb-text-3)', marginRight: '-.1rem' }} />
            <span style={{ fontWeight: 600, color: 'var(--pb-text)', fontSize: '.82rem' }}>
              {activeWidget.label}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
