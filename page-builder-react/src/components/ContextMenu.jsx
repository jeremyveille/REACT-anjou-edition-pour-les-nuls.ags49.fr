import { useEffect } from 'react';
import { useBuilder } from '../store/builderStore';
import { Copy, Clipboard, Trash2, Settings } from 'lucide-react';
import findElement from '../utils/findElement';

export default function ContextMenu() {
  const {
    contextMenu,
    setContextMenu,
    selectElement,
    duplicateElement,
    deleteElement,
    elements,
    copiedStyle,
    setCopiedStyle,
    updateElementSettings
  } = useBuilder();

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      // Use setTimeout so the current click doesn't close it instantly
      setTimeout(() => {
        document.addEventListener('contextmenu', handleClickOutside);
      }, 50);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [contextMenu, setContextMenu]);

  if (!contextMenu) return null;

  const node = findElement(elements, contextMenu.elementId);
  if (!node) return null;
  const { element } = node;

  const handleDuplicate = (e) => {
    e.stopPropagation();
    duplicateElement(element.id);
    setContextMenu(null);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElement(element.id);
    setContextMenu(null);
  };

  const handleSelect = (e) => {
    e.stopPropagation();
    selectElement(element.id);
    setContextMenu(null);
  };

  const handleCopyStyle = (e) => {
    e.stopPropagation();
    setCopiedStyle(element.settings || {});
    setContextMenu(null);
  };

  const handlePasteStyle = (e) => {
    e.stopPropagation();
    if (copiedStyle) {
      updateElementSettings(element.id, copiedStyle);
    }
    setContextMenu(null);
  };

  return (
    <div
      className="pb-context-menu"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="pb-context-header">
        {element.type.toUpperCase()}
      </div>
      <button type="button" className="pb-context-item" onClick={handleSelect}>
        <Settings size={14} /> Éditer les réglages
      </button>
      <button type="button" className="pb-context-item" onClick={handleDuplicate}>
        <Copy size={14} /> Dupliquer
      </button>
      <div className="pb-context-divider" />
      <button type="button" className="pb-context-item" onClick={handleCopyStyle}>
        <Copy size={14} /> Copier le style
      </button>
      <button type="button" className="pb-context-item" onClick={handlePasteStyle} disabled={!copiedStyle}>
        <Clipboard size={14} /> Coller le style
      </button>
      <div className="pb-context-divider" />
      <button type="button" className="pb-context-item pb-context-danger" onClick={handleDelete}>
        <Trash2 size={14} /> Supprimer
      </button>
    </div>
  );
}
