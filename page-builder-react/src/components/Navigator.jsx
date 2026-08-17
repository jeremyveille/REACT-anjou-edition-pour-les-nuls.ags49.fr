import { useState } from 'react';
import { useBuilder } from '../store/builderStore';
import { Layers, ChevronRight, ChevronDown, X } from 'lucide-react';

function NavigatorItem({ element, depth = 0 }) {
  const { selectedElementId, selectElement } = useBuilder();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const isSelected = selectedElementId === element.id;
  const hasChildren = element.children && element.children.length > 0;
  
  const handleSelect = (e) => {
    e.stopPropagation();
    selectElement(element.id);
  };
  
  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="pb-nav-node">
      <div 
        className={`pb-nav-item ${isSelected ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleSelect}
      >
        <div className="pb-nav-expander" onClick={hasChildren ? toggleExpand : undefined}>
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span style={{width: 14, display: 'inline-block'}}/>
          )}
        </div>
        <span className="pb-nav-type">{element.type.toUpperCase()}</span>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="pb-nav-children">
          {element.children.map(child => (
            <NavigatorItem key={child.id} element={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navigator() {
  const { elements, isNavigatorOpen, setIsNavigatorOpen } = useBuilder();
  
  if (!isNavigatorOpen) return null;

  return (
    <div className="pb-navigator-panel">
      <div className="pb-navigator-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <Layers size={14} />
          <span style={{fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Navigateur</span>
        </div>
        <button type="button" className="pb-btn-close-nav" onClick={() => setIsNavigatorOpen(false)}>
          <X size={14} />
        </button>
      </div>
      <div className="pb-navigator-body">
        {elements.length === 0 ? (
          <div className="pb-nav-empty" style={{padding: '1rem', textAlign: 'center', color: 'var(--pb-text-3)', fontSize: '0.8rem'}}>
            Structure vide
          </div>
        ) : (
          elements.map(el => (
            <NavigatorItem key={el.id} element={el} />
          ))
        )}
      </div>
    </div>
  );
}
