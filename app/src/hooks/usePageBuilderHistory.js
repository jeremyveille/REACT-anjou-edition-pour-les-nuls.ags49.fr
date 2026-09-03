import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer l'historique Undo / Redo des blocs du Page Builder.
 */
export const usePageBuilderHistory = (initialState = [], maxHistory = 30) => {
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pushState = useCallback((nextState) => {
    // Si l'état n'a pas changé par rapport à l'actuel, on ne fait rien
    const currentStateStr = JSON.stringify(history[currentIndex]);
    const nextStateStr = JSON.stringify(nextState);
    if (currentStateStr === nextStateStr) return;

    let newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(nextState);

    // Limiter la taille de l'historique pour préserver la mémoire
    if (newHistory.length > maxHistory) {
      newHistory = newHistory.slice(newHistory.length - maxHistory);
    }

    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, [history, currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  const clear = useCallback((newState = []) => {
    setHistory([newState]);
    setCurrentIndex(0);
  }, []);

  return {
    state: history[currentIndex] || [],
    push: pushState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    clear
  };
};
export default usePageBuilderHistory;
