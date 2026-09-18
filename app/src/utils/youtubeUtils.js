/**
 * Utilitaires pour la gestion, l'extraction et la validation des URLs YouTube.
 * Conforme aux exigences du constructeur de pages Anjou Édition.
 */

/**
 * Extrait l'identifiant unique (11 caractères) d'une vidéo YouTube à partir d'une URL ou d'un ID brut.
 * Formats acceptés :
 * - https://www.youtube.com/watch?v=VIDEO_ID (avec ou sans paramètres supplémentaires)
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - VIDEO_ID brut (11 caractères)
 *
 * @param {string} input - URL YouTube ou ID de vidéo
 * @returns {string|null} - ID de la vidéo extrait ou null si invalide
 */
export const extractYoutubeVideoId = (input) => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. ID brut direct (11 caractères alphanumériques + '-' ou '_')
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. youtu.be/VIDEO_ID
  const youtuBeMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (youtuBeMatch && youtuBeMatch[1]) {
    return youtuBeMatch[1];
  }

  // 3. youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }

  // 4. youtube.com/embed/VIDEO_ID ou youtube-nocookie.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  // 5. youtube.com/v/VIDEO_ID ou youtube.com/live/VIDEO_ID
  const vOrLiveMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/(?:v|live)\/([a-zA-Z0-9_-]{11})/i);
  if (vOrLiveMatch && vOrLiveMatch[1]) {
    return vOrLiveMatch[1];
  }

  // 6. youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  return null;
};

/**
 * Valide si une chaîne correspond à une vidéo YouTube valide.
 * @param {string} input - URL YouTube ou ID
 * @returns {boolean}
 */
export const isValidYoutubeUrl = (input) => {
  return extractYoutubeVideoId(input) !== null;
};

/**
 * Génère l'URL d'intégration (embed) pour l'iframe YouTube.
 * @param {string} input - URL YouTube ou ID
 * @param {string} fallbackUrl - URL d'intégration de secours par défaut
 * @returns {string}
 */
export const getYoutubeEmbedUrl = (input, fallbackUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ') => {
  const videoId = extractYoutubeVideoId(input);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return fallbackUrl;
};

/**
 * Génère l'URL de visionnage standard (watch) pour ouvrir la vidéo sur YouTube.
 * @param {string} input - URL YouTube ou ID
 * @returns {string|null}
 */
export const getYoutubeWatchUrl = (input) => {
  const videoId = extractYoutubeVideoId(input);
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (input && typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
    return input;
  }
  return null;
};

/**
 * Normalise une URL YouTube vers son format canonique watch.
 * @param {string} input - URL YouTube ou ID
 * @returns {string}
 */
export const normalizeYoutubeWatchUrl = (input) => {
  const videoId = extractYoutubeVideoId(input);
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  return input || '';
};
