import React, { useState, useEffect, useCallback } from 'react';
import { Maximize } from 'lucide-react';

/**
 * Bouton et gestionnaire de plein écran pour tous les conteneurs vidéo d'Anjou Édition
 * (Vidéos YouTube intégrées et vidéos téléversées MP4/WebM).
 *
 * Comportement :
 * 1. En affichage normal : le bouton est visible en bas à droite du lecteur.
 * 2. En mode plein écran : le bouton est intégralement retiré du DOM (return null) pour
 *    ne jamais se superposer à la vidéo ni aux commandes natives.
 * 3. Au retour à l'affichage normal (touche Échap ou sortie plein écran native via fullscreenchange) :
 *    le bouton réapparaît automatiquement sans rechargement de la page, de manière répétable.
 */
export default function VideoFullscreenButton({ containerRef, videoTitle = 'la vidéo' }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getFullscreenElement = useCallback((doc = document) => {
    if (!doc) return null;
    return (
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      null
    );
  }, []);

  const exitNativeFullscreen = useCallback(async (doc = document) => {
    if (!doc) return;
    try {
      if (typeof doc.exitFullscreen === 'function') {
        await doc.exitFullscreen();
      } else if (typeof doc.webkitExitFullscreen === 'function') {
        await doc.webkitExitFullscreen();
      } else if (typeof doc.mozCancelFullScreen === 'function') {
        await doc.mozCancelFullScreen();
      } else if (typeof doc.msExitFullscreen === 'function') {
        await doc.msExitFullscreen();
      }
    } catch (_) {
      // Ignorer silencieusement si le document n'était pas en plein écran natif
    }
  }, []);

  // Synchronisation de la classe CSS sur le conteneur et verrouillage du scroll en mode plein écran
  useEffect(() => {
    const containerEl = containerRef?.current;
    if (!containerEl) return;

    const ownerDoc = containerEl.ownerDocument || document;

    if (isFullscreen) {
      containerEl.classList.add('ae-video-is-fullscreen');
      containerEl.setAttribute('data-fullscreen', 'true');
      if (ownerDoc?.body) {
        ownerDoc.body.classList.add('ae-body-video-fullscreen');
      }
    } else {
      containerEl.classList.remove('ae-video-is-fullscreen');
      containerEl.removeAttribute('data-fullscreen');
      if (ownerDoc?.body) {
        ownerDoc.body.classList.remove('ae-body-video-fullscreen');
      }
    }

    return () => {
      containerEl.classList.remove('ae-video-is-fullscreen');
      containerEl.removeAttribute('data-fullscreen');
      if (ownerDoc?.body) {
        ownerDoc.body.classList.remove('ae-body-video-fullscreen');
      }
    };
  }, [isFullscreen, containerRef]);

  // Synchronisation avec les événements natifs fullscreenchange, fin de plein écran iOS et touche Échap
  useEffect(() => {
    const containerEl = containerRef?.current;
    const ownerDoc = containerEl?.ownerDocument || document;
    const ownerWin = ownerDoc?.defaultView || window;
    const nativeVideoEl = containerEl?.querySelector('video') || null;

    const handleFullscreenChange = () => {
      const fsEl = getFullscreenElement(ownerDoc);
      if (fsEl && containerEl && (fsEl === containerEl || containerEl.contains(fsEl))) {
        setIsFullscreen(true);
      } else if (!fsEl) {
        setIsFullscreen(false);
      }
    };

    const handleWebkitBeginFullscreen = () => {
      setIsFullscreen(true);
    };

    const handleWebkitEndFullscreen = () => {
      setIsFullscreen(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (isFullscreen) {
          e.stopPropagation();
          const fsEl = getFullscreenElement(ownerDoc);
          if (fsEl) {
            exitNativeFullscreen(ownerDoc);
          }
          setIsFullscreen(false);
        }
      }
    };

    ownerDoc.addEventListener('fullscreenchange', handleFullscreenChange);
    ownerDoc.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    ownerDoc.addEventListener('mozfullscreenchange', handleFullscreenChange);
    ownerDoc.addEventListener('MSFullscreenChange', handleFullscreenChange);
    ownerWin.addEventListener('keydown', handleKeyDown);

    if (nativeVideoEl) {
      nativeVideoEl.addEventListener('webkitbeginfullscreen', handleWebkitBeginFullscreen);
      nativeVideoEl.addEventListener('webkitendfullscreen', handleWebkitEndFullscreen);
    }

    return () => {
      ownerDoc.removeEventListener('fullscreenchange', handleFullscreenChange);
      ownerDoc.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      ownerDoc.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      ownerDoc.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      ownerWin.removeEventListener('keydown', handleKeyDown);

      if (nativeVideoEl) {
        nativeVideoEl.removeEventListener('webkitbeginfullscreen', handleWebkitBeginFullscreen);
        nativeVideoEl.removeEventListener('webkitendfullscreen', handleWebkitEndFullscreen);
      }
    };
  }, [containerRef, isFullscreen, getFullscreenElement, exitNativeFullscreen]);

  const handleEnterFullscreen = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const containerEl = containerRef?.current;
    if (!containerEl) return;

    // Retrait immédiat du bouton dès l'activation du mode plein écran
    setIsFullscreen(true);

    try {
      if (typeof containerEl.requestFullscreen === 'function') {
        await containerEl.requestFullscreen();
        return;
      }
      if (typeof containerEl.webkitRequestFullscreen === 'function') {
        await containerEl.webkitRequestFullscreen();
        return;
      }
      if (typeof containerEl.msRequestFullscreen === 'function') {
        await containerEl.msRequestFullscreen();
        return;
      }

      // Support spécifique iOS Safari pour les vidéos HTML5 téléversées (<video>)
      const nativeVideoEl = containerEl.querySelector('video');
      if (nativeVideoEl && typeof nativeVideoEl.webkitEnterFullscreen === 'function') {
        nativeVideoEl.webkitEnterFullscreen();
      }
    } catch (_) {
      // En cas de restriction d'iframe ou navigateur mobile, la classe .ae-video-is-fullscreen
      // assure immédiatement le plein écran sur toute la surface du viewport.
    }
  };

  // En mode plein écran, retirer complètement le bouton du DOM et des interactions
  if (isFullscreen) {
    return null;
  }

  return (
    <button
      type="button"
      className="ae-video-fullscreen-btn"
      onClick={handleEnterFullscreen}
      aria-label={`Afficher en plein écran : ${videoTitle}`}
      title="Plein écran"
      data-testid="video-fullscreen-btn"
    >
      <Maximize size={16} className="ae-video-fullscreen-icon" aria-hidden="true" />
    </button>
  );
}
