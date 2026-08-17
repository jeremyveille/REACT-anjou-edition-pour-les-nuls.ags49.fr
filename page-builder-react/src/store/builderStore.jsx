/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import updateElementTree from '../utils/updateElement';
import duplicateElementInTree from '../utils/duplicateElement';
import deleteElementFromTree from '../utils/deleteElement';
import moveElementInTree from '../utils/moveElement';
import { sanitizeBuilderData } from '../utils/sanitize';

const BuilderContext = createContext(null);

const LOCAL_STORAGE_KEY = 'react_page_builder_content';
const HISTORY_LIMIT = 50;

export function BuilderProvider({ children }) {
  const [elements, setElementsState] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  
  // New Elementor-inspired UI states
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [copiedStyle, setCopiedStyle] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, elementId }
  
  // History stacks
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // Local storage management
  const saveToLocalStorage = useCallback((dataToSave = elements) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }, [elements]);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const sanitized = sanitizeBuilderData(parsed);
        setElementsState(sanitized);
        setPast([]);
        setFuture([]);
        return sanitized;
      }
    } catch (e) {
      console.error('Error loading from localStorage', e);
    }
    return null;
  }, []);

  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setElementsState([]);
      setPast([]);
      setFuture([]);
      setSelectedElementId(null);
    } catch (e) {
      console.error('Error clearing localStorage', e);
    }
  }, []);

  // Initialize from localStorage on load
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Core state mutation with history checkpoint
  const updateElementsAndHistory = useCallback((newElements, options = {}) => {
    const { silent = false, clearFuture = true } = options;

    setElementsState(currentElements => {
      // 1. Record history if not silent
      if (!silent) {
        setPast(prevPast => {
          const updatedPast = [...prevPast, currentElements];
          if (updatedPast.length > HISTORY_LIMIT) {
            updatedPast.shift();
          }
          return updatedPast;
        });
        if (clearFuture) {
          setFuture([]);
        }
      }

      // 2. Save to localStorage (can auto-save on every state change)
      saveToLocalStorage(newElements);
      return newElements;
    });
  }, [saveToLocalStorage]);

  // Undo/Redo functions
  const undo = useCallback(() => {
    if (past.length === 0) return;

    setPast(prevPast => {
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, -1);

      setFuture(prevFuture => [elements, ...prevFuture]);
      setElementsState(previous);
      saveToLocalStorage(previous);
      return newPast;
    });
  }, [past, elements, saveToLocalStorage]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    setFuture(prevFuture => {
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setPast(prevPast => [...prevPast, elements]);
      setElementsState(next);
      saveToLocalStorage(next);
      return newFuture;
    });
  }, [future, elements, saveToLocalStorage]);

  // Handle Keyboard Shortcuts for Undo/Redo (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  // Elements operations
  const setElements = useCallback((newElements) => {
    updateElementsAndHistory(sanitizeBuilderData(newElements));
  }, [updateElementsAndHistory]);

  const selectElement = useCallback((id) => {
    setSelectedElementId(id);
  }, []);

  const updateElementSettings = useCallback((id, newSettings, options = {}) => {
    const updatedTree = updateElementTree(elements, id, newSettings);
    updateElementsAndHistory(updatedTree, options);
  }, [elements, updateElementsAndHistory]);

  // Avoid circular dep or direct reference before define
  const updateSelectedElementSettingsInternal = useCallback((id, newSettings, options) => {
    updateElementSettings(id, newSettings, options);
  }, [updateElementSettings]);

  const updateSelectedElementSettings = useCallback((newSettings, options = {}) => {
    if (!selectedElementId) return;
    updateSelectedElementSettingsInternal(selectedElementId, newSettings, options);
  }, [selectedElementId, updateSelectedElementSettingsInternal]);

  const duplicateElement = useCallback((id) => {
    const updatedTree = duplicateElementInTree(elements, id);
    updateElementsAndHistory(updatedTree);
  }, [elements, updateElementsAndHistory]);

  const deleteElement = useCallback((id) => {
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    const updatedTree = deleteElementFromTree(elements, id);
    updateElementsAndHistory(updatedTree);
  }, [elements, selectedElementId, updateElementsAndHistory]);

  const moveElement = useCallback((activeId, overId, isNew = false) => {
    const updatedTree = moveElementInTree(elements, activeId, overId, isNew);
    updateElementsAndHistory(updatedTree);
  }, [elements, updateElementsAndHistory]);

  const resetCanvas = useCallback(() => {
    setSelectedElementId(null);
    updateElementsAndHistory([]);
  }, [updateElementsAndHistory]);

  const importLayout = useCallback((newElements) => {
    setSelectedElementId(null);
    updateElementsAndHistory(newElements);
  }, [updateElementsAndHistory]);

  return (
    <BuilderContext.Provider
      value={{
        elements,
        selectedElementId,
        previewMode,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        isNavigatorOpen,
        setIsNavigatorOpen,
        isGlobalSettingsOpen,
        setIsGlobalSettingsOpen,
        copiedStyle,
        setCopiedStyle,
        contextMenu,
        setContextMenu,
        setElements,
        selectElement,
        updateElementSettings,
        updateSelectedElementSettings,
        duplicateElement,
        deleteElement,
        moveElement,
        resetCanvas,
        setPreviewMode,
        undo,
        redo,
        importLayout,
        saveToLocalStorage,
        loadFromLocalStorage,
        clearLocalStorage
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
}
