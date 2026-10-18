import React from 'react';
import { ExternalLink, FileText, Download } from 'lucide-react';
import { sanitizeHtml, sanitizeUrl } from '../utils/sanitize';
import { extractYoutubeVideoId, getYoutubeEmbedUrl } from '../utils/youtubeUtils';

import { computeBlockCustomStyles } from '../utils/flipbookBlockStyleUtils';

/**
 * Composant de rendu individuel d'un bloc de la barre latérale du Flipbook.
 * Supporte : image, vidéo (locale & YouTube), texte/HTML sécurisé, titre, bouton/lien, document PDF.
 */
export default function FlipbookSidebarBlock({ block }) {
  if (!block || block.enabled === false) {
    return null;
  }

  const { type, title, caption } = block;

  // Construction du style individuel du bloc (contours, ombres, couleurs, alignement)
  const customBlockStyle = computeBlockCustomStyles(block);
  const bStyle = block.style || {};
  const txtColor = bStyle.textColor || block.textColor;

  switch (type) {
    case 'heading': {
      const level = ['h2', 'h3', 'h4', 'h5'].includes(block.level) ? block.level : 'h3';
      const HeadingTag = level;
      return (
        <div className="flipbook-sidebar-card flipbook-block-heading-container" style={customBlockStyle} data-block-type="heading">
          <HeadingTag className={`flipbook-block-heading level-${level}`} style={txtColor ? { color: txtColor } : undefined}>
            {block.text || title || ''}
          </HeadingTag>
        </div>
      );
    }

    case 'text': {
      const safeHtml = sanitizeHtml(block.content || '');
      return (
        <div className="flipbook-sidebar-card flipbook-block-text" style={customBlockStyle} data-block-type="text">
          {title && <h4 className="flipbook-block-title">{title}</h4>}
          <div 
            className="flipbook-block-content"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </div>
      );
    }

    case 'image': {
      const imageUrl = block.imageUrl || block.url || '';
      if (!imageUrl) return null;
      const imageAlt = block.imageAlt || block.alt || title || "Illustration de l'ouvrage";
      const isExternalLink = block.openNewTab;

      return (
        <div className="flipbook-sidebar-card flipbook-block-image" style={customBlockStyle} data-block-type="image">
          {title && <h4 className="flipbook-block-title">{title}</h4>}
          <figure className="flipbook-block-figure">
            <div className="flipbook-image-ratio-container">
              {block.linkUrl ? (
                <a 
                  href={sanitizeUrl(block.linkUrl)}
                  target={isExternalLink ? "_blank" : undefined}
                  rel={isExternalLink ? "noopener noreferrer" : undefined}
                  className="flipbook-image-link"
                  aria-label={title || imageAlt}
                >
                  <img 
                    src={imageUrl} 
                    alt={imageAlt} 
                    className="flipbook-responsive-img" 
                    loading="lazy" 
                    decoding="async"
                  />
                </a>
              ) : (
                <img 
                  src={imageUrl} 
                  alt={imageAlt} 
                  className="flipbook-responsive-img" 
                  loading="lazy" 
                  decoding="async"
                />
              )}
            </div>
            {caption && (
              <figcaption className="flipbook-block-caption">{caption}</figcaption>
            )}
          </figure>
        </div>
      );
    }

    case 'video': {
      const videoUrl = block.videoUrl || block.url || '';
      if (!videoUrl) return null;

      const isYoutube = block.videoSourceType === 'youtube' || Boolean(extractYoutubeVideoId(videoUrl));

      return (
        <div className="flipbook-sidebar-card flipbook-block-video" style={customBlockStyle} data-block-type="video">
          {title && <h4 className="flipbook-block-title">{title}</h4>}
          <div className="flipbook-video-ratio-container">
            {isYoutube ? (
              <iframe 
                src={getYoutubeEmbedUrl(videoUrl)} 
                title={title || "Vidéo YouTube intégrée"}
                className="flipbook-video-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video 
                controls 
                className="flipbook-responsive-video"
                preload="metadata"
                poster={block.posterUrl || undefined}
                aria-label={title || "Vidéo d'illustration"}
              >
                <source src={sanitizeUrl(videoUrl)} />
                Votre navigateur ne prend pas en charge la lecture de cette vidéo.
              </video>
            )}
          </div>
          {caption && <p className="flipbook-block-caption">{caption}</p>}
        </div>
      );
    }

    case 'button': {
      const buttonText = block.buttonText || title || 'En savoir plus';
      const buttonUrl = sanitizeUrl(block.buttonUrl || block.url || '#');
      const isExternal = block.openNewTab;
      const buttonStyle = block.buttonStyle || 'primary';

      return (
        <div className="flipbook-sidebar-card flipbook-block-button-container" style={customBlockStyle} data-block-type="button">
          {title && title !== buttonText && <h4 className="flipbook-block-title">{title}</h4>}
          <a 
            href={buttonUrl}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className={`flipbook-sidebar-btn flipbook-btn-${buttonStyle}`}
            role="button"
          >
            <span>{buttonText}</span>
            {isExternal && <ExternalLink size={13} aria-hidden="true" />}
          </a>
        </div>
      );
    }

    case 'pdf': {
      const pdfTitle = block.pdfTitle || title || 'Document complémentaire (PDF)';
      const pdfUrl = sanitizeUrl(block.pdfUrl || block.pdfFile || '#');

      return (
        <div className="flipbook-sidebar-card flipbook-block-pdf" style={customBlockStyle} data-block-type="pdf">
          <div className="flipbook-pdf-icon-wrap" aria-hidden="true">
            <FileText size={20} />
          </div>
          <div className="flipbook-pdf-details">
            <h4 className="flipbook-block-title">{pdfTitle}</h4>
            {block.description && <p className="flipbook-pdf-desc">{block.description}</p>}
            <a 
              href={pdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flipbook-pdf-download-btn"
              aria-label={`Télécharger le document PDF : ${pdfTitle}`}
            >
              <Download size={13} aria-hidden="true" />
              <span>Télécharger</span>
            </a>
          </div>
        </div>
      );
    }

    default:
      // Fallback simple si type inconnu mais avec du texte
      if (block.content) {
        return (
          <div className="flipbook-sidebar-card flipbook-block-text" style={customBlockStyle}>
            {title && <h4 className="flipbook-block-title">{title}</h4>}
            <div className="flipbook-block-content">{block.content}</div>
          </div>
        );
      }
      return null;
  }
}
