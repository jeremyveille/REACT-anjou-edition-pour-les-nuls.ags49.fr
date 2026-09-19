import React, { useState } from 'react';
import { sanitizeUrl } from './sanitize';

/**
 * Optimise une URL d'image pour le Web et les appareils mobiles.
 * Génère automatiquement les variantes WebP et le dimensionnement adapté.
 *
 * @param {string} url - L'URL originale de l'image
 * @param {object} options - Options d'optimisation
 * @param {number} [options.width] - Largeur désirée en pixels
 * @param {number} [options.height] - Hauteur désirée en pixels
 * @param {number} [options.quality=80] - Qualité de compression (1-100)
 * @param {string} [options.format='webp'] - Format cible ('webp', 'jpg', 'png')
 * @returns {string} L'URL optimisée et sécurisée
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return '';
  const sanitized = sanitizeUrl(url);
  if (!sanitized || sanitized === '#' || sanitized === 'about:blank') return '';

  const { width, height, quality = 80, format = 'webp' } = options;

  try {
    // 1. Unsplash Images
    if (sanitized.includes('images.unsplash.com')) {
      const parsedUrl = new URL(sanitized);
      parsedUrl.searchParams.set('auto', 'format');
      parsedUrl.searchParams.set('fm', format);
      parsedUrl.searchParams.set('q', quality.toString());
      if (width) parsedUrl.searchParams.set('w', width.toString());
      if (height) parsedUrl.searchParams.set('h', height.toString());
      if (width && height) parsedUrl.searchParams.set('fit', 'crop');
      return parsedUrl.toString();
    }

    // 2. Picsum / Lorem Picsum Images
    if (sanitized.includes('picsum.photos')) {
      // Formats: https://picsum.photos/800/600?random=11 or https://picsum.photos/id/123/800/600.webp
      const targetW = width || 400;
      const targetH = height || Math.round(targetW * 0.75);
      
      const parsedUrl = new URL(sanitized);
      const query = parsedUrl.search; // preserves ?random=...
      
      // Match /id/:id/:w/:h or /:w/:h pattern
      const idMatch = parsedUrl.pathname.match(/\/id\/(\d+)/);
      if (idMatch) {
        return `https://picsum.photos/id/${idMatch[1]}/${targetW}/${targetH}.${format}${query}`;
      }

      // Check if standard dimension path /800/600
      const dimMatch = parsedUrl.pathname.match(/^\/(\d+)(?:\/(\d+))?/);
      if (dimMatch) {
        return `https://picsum.photos/${targetW}/${targetH}.${format}${query}`;
      }

      return `${sanitized}${sanitized.includes('?') ? '&' : '?'}w=${targetW}&format=${format}`;
    }

    // 3. Cloudinary CDN Images
    if (sanitized.includes('cloudinary.com')) {
      const transforms = [`f_${format}`, `q_${quality}`];
      if (width) transforms.push(`w_${width}`);
      if (height) transforms.push(`h_${height}`, 'c_fill');
      const transformStr = transforms.join(',');
      return sanitized.replace('/upload/', `/upload/${transformStr}/`);
    }

    // 4. Firebase Storage or generic images with query param support
    if (width || format === 'webp') {
      const separator = sanitized.includes('?') ? '&' : '?';
      const params = [];
      if (format) params.push(`fm=${format}`);
      if (width) params.push(`w=${width}`);
      if (quality) params.push(`q=${quality}`);
      // Only append if it looks like a standard queryable URL
      if (!sanitized.startsWith('data:') && !sanitized.startsWith('blob:')) {
        return `${sanitized}${separator}${params.join('&')}`;
      }
    }
  } catch (e) {
    // Return sanitized URL as safe fallback if parsing fails
    return sanitized;
  }

  return sanitized;
}

/**
 * Génère une URL de miniature légère WebP pour l'affichage mobile ou les grilles
 *
 * @param {string} url - L'URL originale
 * @param {object} options
 * @returns {string} L'URL de la miniature optimisée
 */
export function getThumbnailUrl(url, options = {}) {
  const { width = 400, height = 300, quality = 75, format = 'webp' } = options;
  return getOptimizedImageUrl(url, { width, height, quality, format });
}

/**
 * Génère une chaîne d'attribut `srcset` responsive pour les balises <img> et <source>
 *
 * @param {string} url - L'URL originale
 * @param {number[]} [widths=[320, 480, 640, 800, 1200]] - Les largeurs en pixels
 * @returns {string} La chaîne d'attribut srcset (ex: "url-320.webp 320w, url-640.webp 640w")
 */
export function generateSrcSet(url, widths = [320, 480, 640, 800, 1200]) {
  if (!url || typeof url !== 'string') return '';
  const sanitized = sanitizeUrl(url);
  if (!sanitized || sanitized === '#' || sanitized === 'about:blank' || sanitized.startsWith('data:') || sanitized.startsWith('blob:')) return '';

  return widths
    .map(w => {
      const optUrl = getOptimizedImageUrl(sanitized, { width: w, format: 'webp' });
      return `${optUrl} ${w}w`;
    })
    .join(', ');
}

/**
 * Génère côté client une miniature WebP redimensionnée à partir d'un fichier image ou d'une URL.
 * Utilise l'API Canvas HTML5 avec encodage WebP haute efficacité.
 *
 * @param {File|Blob|string|HTMLImageElement} imageSource - Image source
 * @param {object} options
 * @param {number} [options.maxWidth=400]
 * @param {number} [options.maxHeight=400]
 * @param {number} [options.quality=0.8]
 * @returns {Promise<{ dataUrl: string, blob: Blob, width: number, height: number, format: string, originalSize?: number, optimizedSize?: number }>}
 */
export function generateWebPThumbnail(imageSource, options = {}) {
  const { maxWidth = 400, maxHeight = 400, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    // Si l'environnement ne supporte pas document/canvas (ex: node sans canvas natif), fallback propre
    if (
      typeof document === 'undefined' || 
      typeof document.createElement !== 'function' || 
      typeof window === 'undefined' ||
      !window.HTMLCanvasElement ||
      !window.HTMLCanvasElement.prototype.getContext
    ) {
      resolve({
        dataUrl: typeof imageSource === 'string' ? imageSource : '',
        blob: null,
        width: maxWidth,
        height: maxHeight,
        format: 'image/webp'
      });
      return;
    }

    let settled = false;
    // Timeout de sécurité pour éviter tout blocage en environnement sans rendu réseau complet (ex: JSDOM)
    const safetyTimeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({
          dataUrl: typeof imageSource === 'string' ? imageSource : '',
          blob: null,
          width: maxWidth,
          height: maxHeight,
          format: 'image/webp'
        });
      }
    }, 400);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(safetyTimeout);

      try {
        let width = img.naturalWidth || img.width || maxWidth;
        let height = img.naturalHeight || img.height || maxHeight;

        // Calcul du redimensionnement proportionnel
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: typeof imageSource === 'string' ? imageSource : '',
            blob: null,
            width,
            height,
            format: 'image/webp'
          });
          return;
        }

        // Lissage haute qualité
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Détection du support WebP dans le canvas
        let targetFormat = 'image/webp';
        let dataUrl = canvas.toDataURL(targetFormat, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          // Fallback sur JPEG si WebP non supporté par l'encodeur
          targetFormat = 'image/jpeg';
          dataUrl = canvas.toDataURL(targetFormat, quality);
        }

        if (canvas.toBlob) {
          canvas.toBlob(
            (blob) => {
              resolve({
                dataUrl,
                blob,
                width,
                height,
                format: targetFormat,
                originalSize: imageSource?.size,
                optimizedSize: blob ? blob.size : undefined
              });
            },
            targetFormat,
            quality
          );
        } else {
          resolve({
            dataUrl,
            blob: null,
            width,
            height,
            format: targetFormat,
            originalSize: imageSource?.size
          });
        }
      } catch (err) {
        resolve({
          dataUrl: typeof imageSource === 'string' ? imageSource : '',
          blob: null,
          width: maxWidth,
          height: maxHeight,
          format: 'image/webp'
        });
      }
    };

    img.onerror = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(safetyTimeout);
      reject(new Error(`Échec du chargement de l'image pour la génération de miniature: ${err?.message || 'Erreur'}`));
    };

    if (typeof imageSource === 'string') {
      img.src = sanitizeUrl(imageSource);
    } else if (imageSource instanceof Blob || (typeof File !== 'undefined' && imageSource instanceof File)) {
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        img.src = URL.createObjectURL(imageSource);
      } else {
        const reader = new FileReader();
        reader.onload = () => { img.src = reader.result; };
        reader.onerror = reject;
        reader.readAsDataURL(imageSource);
      }
    } else {
      clearTimeout(safetyTimeout);
      reject(new Error('Source d\'image invalide fournie à generateWebPThumbnail'));
    }
  });
}

/**
 * Composant React Image Optimisée (<OptimizedImage />)
 * Offre un chargement WebP natif avec balise <picture>, srcset adaptatif, fallback transparent et lazy-loading.
 */
export const OptimizedImage = ({
  src,
  thumbnailSrc,
  alt = 'Illustration',
  className = '',
  style = {},
  width,
  height,
  loading = 'lazy',
  decoding = 'async',
  useThumbnail = false,
  thumbnailWidth = 400,
  thumbnailHeight = 300,
  sizes = '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onClick,
  ariaLabel
}) => {
  const [hasError, setHasError] = useState(false);

  const safeSrc = sanitizeUrl(src || '');
  if (!safeSrc || safeSrc === '#' || safeSrc === 'about:blank' || hasError) {
    return (
      <div 
        className={`optimized-image-placeholder ${className}`}
        style={{
          backgroundColor: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px',
          color: '#64748b',
          fontSize: '0.85rem',
          ...style
        }}
        role="img"
        aria-label={alt || "Image non disponible"}
      >
        <span>{alt || "Image indisponible"}</span>
      </div>
    );
  }

  const optimizedSrc = useThumbnail
    ? (thumbnailSrc ? sanitizeUrl(thumbnailSrc) : getThumbnailUrl(safeSrc, { width: thumbnailWidth, height: thumbnailHeight }))
    : getOptimizedImageUrl(safeSrc, { width, height });

  const webpSrcSet = generateSrcSet(safeSrc);

  return (
    <picture className="optimized-image-picture" onClick={onClick}>
      {webpSrcSet && (
        <source 
          type="image/webp" 
          srcSet={webpSrcSet} 
          sizes={sizes} 
        />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        className={className}
        style={style}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        onError={() => setHasError(true)}
        aria-label={ariaLabel}
      />
    </picture>
  );
};
