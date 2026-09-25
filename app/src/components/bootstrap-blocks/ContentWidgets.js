import React from 'react';
import * as Icons from 'lucide-react';
import { 
  PlayCircle, 
  Play, 
  Info, 
  BookOpen, 
  ChevronRight, 
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { sanitizeHtml, sanitizeUrl } from '../../utils/sanitize';
import { getThumbnailUrl, OptimizedImage } from '../../utils/imageOptimizer';
import { getYoutubeEmbedUrl } from '../../utils/youtubeUtils';
import PdfFlipbookReader from '../PdfFlipbookReader';
import { ContactForm } from '../ContactForm';
import { flipbooksData } from '../../data';
import { getLocalFlipbooksSync } from '../../services/pageService';

const YoutubeIcon = ({ size = 20, color = "currentColor", fill = "none" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-youtube"
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9 10 15" fill={fill !== "none" ? "white" : "none"} />
  </svg>
);

/**
 * Widget Titre (Heading)
 */
export const Heading = ({ settings = {} }) => {
  const Tag = settings.level || 'h2';
  const content = settings.content || 'Titre exemple';
  const customClasses = settings.classes || 'text-dark';
  const alignment = settings.alignment ? `text-${settings.alignment}` : '';
  const style = settings.style || {};

  return (
    <Tag className={`pb-widget-heading ${alignment} ${customClasses}`} style={style}>
      {content}
    </Tag>
  );
};

/**
 * Widget Texte (Paragraph / WYSIWYG)
 */
export const Text = ({ settings = {} }) => {
  const content = settings.content || 'Paragraphe de texte exemple. Vous pouvez modifier ce contenu dans les réglages.';
  const customClasses = settings.classes || 'text-secondary';
  const alignment = settings.alignment ? `text-${settings.alignment}` : '';
  const style = settings.style || {};
  const sanitizedContent = sanitizeHtml(content);

  return (
    <div 
      className={`pb-widget-text ${alignment} ${customClasses}`} 
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

/**
 * Widget Image
 */
export const Image = ({ settings = {}, isEditing = false, onOpenMediaPicker }) => {
  const rawSrc = settings.src || 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=600';
  const src = sanitizeUrl(rawSrc);
  const alt = settings.alt || 'Illustration';
  const customClasses = settings.classes || 'img-fluid rounded';
  const style = settings.style || {};
  const caption = settings.caption;
  const link = settings.link ? sanitizeUrl(settings.link) : null;

  const imgElement = (
    <OptimizedImage 
      src={src} 
      alt={alt} 
      className={customClasses} 
      loading="lazy" 
      decoding="async"
    />
  );

  return (
    <div className="pb-widget-image-container position-relative text-center" style={style}>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer">
          {imgElement}
        </a>
      ) : (
        imgElement
      )}
      {caption && <p className="text-muted text-xs mt-1">{caption}</p>}
      {isEditing && (
        <div className="pb-media-action-overlay">
          <button
            type="button"
            className="pb-media-action-overlay-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenMediaPicker) onOpenMediaPicker('src', 'image');
            }}
            title="Modifier / Remplacer cette image"
            aria-label="Modifier ou remplacer cette image"
          >
            <ImageIcon size={14} /> Modifier / Remplacer l'image
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Widget Bouton
 */
export const Button = ({ settings = {} }) => {
  const text = settings.text || 'Cliquez ici';
  const link = sanitizeUrl(settings.link || '#');
  const buttonStyle = settings.buttonStyle || 'btn-primary';
  const size = settings.size || '';
  const customClasses = settings.classes || '';
  const style = settings.style || {};
  const iconName = settings.icon;

  const IconComponent = iconName ? Icons[iconName] : null;

  return (
    <a 
      href={link} 
      className={`btn ${buttonStyle} ${size} ${customClasses} d-inline-flex align-items-center gap-2`}
      style={style}
      target={settings.newTab ? '_blank' : '_self'}
      rel="noopener noreferrer"
    >
      {IconComponent && <IconComponent className="ae-icon-size-sm" />}
      {text}
    </a>
  );
};

/**
 * Widget Carte (Card)
 */
export const Card = ({ settings = {}, isEditing = false, onOpenMediaPicker }) => {
  const title = settings.title || 'Titre de la carte';
  const text = settings.text || 'Contenu court de la carte pour illustrer un propos.';
  const image = settings.image ? sanitizeUrl(settings.image) : '';
  const buttonText = settings.buttonText || '';
  const buttonLink = sanitizeUrl(settings.buttonLink || '#');
  const customClasses = settings.classes || 'shadow-sm';
  const style = settings.style || {};

  return (
    <div className={`card ${customClasses}`} style={style}>
      <div className="position-relative">
        {image && (
          <OptimizedImage 
            src={image} 
            className="card-img-top" 
            alt={title} 
            loading="lazy" 
            useThumbnail={true} 
            thumbnailWidth={600} 
            thumbnailHeight={350} 
          />
        )}
        {isEditing && (
          <div className="pb-media-action-overlay" style={{ top: '8px', right: '8px', bottom: 'auto', left: 'auto' }}>
            <button
              type="button"
              className="pb-media-action-overlay-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenMediaPicker) onOpenMediaPicker('image', 'image');
              }}
              title="Modifier / Remplacer l'image de la carte"
              aria-label="Modifier ou remplacer l'image de la carte"
            >
              <ImageIcon size={13} /> {image ? "Remplacer l'image" : "Ajouter une image"}
            </button>
          </div>
        )}
      </div>
      <div className="card-body">
        <h5 className="card-title">{title}</h5>
        <p className="card-text">{text}</p>
        {buttonText && (
          <a href={buttonLink} className="btn btn-primary btn-sm">
            {buttonText}
          </a>
        )}
      </div>
    </div>
  );
};

/**
 * Widget Alerte
 */
export const Alert = ({ settings = {} }) => {
  const type = settings.type || 'alert-info';
  const content = settings.content || 'Ceci est une alerte informative.';
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  return (
    <div className={`alert ${type} ${customClasses}`} role="alert" style={style}>
      {content}
    </div>
  );
};

/**
 * Widget Vidéo
 */
export const Video = ({ settings = {}, isEditing = false, onOpenMediaPicker }) => {
  const input = settings.url || (settings.videoId ? `https://www.youtube.com/watch?v=${settings.videoId}` : (settings.src || ''));
  const fallbackEmbed = settings.videoId ? `https://www.youtube.com/embed/${settings.videoId}` : (settings.lastValidVideoId ? `https://www.youtube.com/embed/${settings.lastValidVideoId}` : 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  const embedUrl = getYoutubeEmbedUrl(input, fallbackEmbed);
  const customClasses = settings.classes || settings.className || '';
  const style = settings.style || {};

  return (
    <div className={`ratio ratio-16x9 position-relative ${customClasses}`} style={style}>
      <iframe 
        src={sanitizeUrl(embedUrl)} 
        title={settings.title || "Lecteur vidéo YouTube"} 
        allowFullScreen
        className="rounded"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      ></iframe>
      {isEditing && (
        <div className="pb-media-action-overlay">
          <button
            type="button"
            className="pb-media-action-overlay-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenMediaPicker) onOpenMediaPicker('url', 'video');
            }}
            title="Modifier l'URL YouTube ou remplacer la vidéo"
            aria-label="Modifier l'URL YouTube ou remplacer la vidéo"
          >
            <Play size={14} fill="white" color="white" /> Modifier / Remplacer la vidéo
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Widget Séparateur (Divider)
 */
export const Divider = ({ settings = {} }) => {
  const styleType = settings.styleType || 'solid';
  const thickness = settings.thickness || '1px';
  const color = settings.color || '#e2e8f0';
  const margin = settings.margin || '2rem 0';
  const hasIcon = settings.hasIcon || false;
  const iconName = settings.icon || 'BookOpen';
  const IconComponent = hasIcon && Icons[iconName] ? Icons[iconName] : null;

  if (hasIcon && IconComponent) {
    return (
      <div className="d-flex align-items-center my-4" style={{ margin }}>
        <div style={{ flex: 1, height: thickness, backgroundColor: color, borderTop: `${thickness} ${styleType} ${color}` }}></div>
        <div className="px-3 text-muted">
          <IconComponent size={18} />
        </div>
        <div style={{ flex: 1, height: thickness, backgroundColor: color, borderTop: `${thickness} ${styleType} ${color}` }}></div>
      </div>
    );
  }

  return (
    <hr 
      style={{
        border: 'none',
        borderTop: `${thickness} ${styleType} ${color}`,
        margin,
        opacity: 1
      }}
    />
  );
};

/**
 * Widget Liste (List)
 */
export const List = ({ settings = {} }) => {
  const listType = settings.listType || 'unordered';
  const items = Array.isArray(settings.items) ? settings.items : ['Élément 1', 'Élément 2'];
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  if (listType === 'ordered') {
    return (
      <ol className={`pb-widget-list ${customClasses}`} style={style}>
        {items.map((it, idx) => (
          <li key={idx} className="mb-1.5">{it}</li>
        ))}
      </ol>
    );
  }

  if (listType === 'check') {
    return (
      <ul className={`list-unstyled pb-widget-list ${customClasses}`} style={style}>
        {items.map((it, idx) => (
          <li key={idx} className="d-flex align-items-start gap-2 mb-2">
            <span className="badge bg-success-subtle text-success p-1 rounded-circle mt-0.5">
              <Check size={14} />
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={`pb-widget-list ${customClasses}`} style={style}>
      {items.map((it, idx) => (
        <li key={idx} className="mb-1.5">{it}</li>
      ))}
    </ul>
  );
};

/**
 * =========================================================================
 * MODULES MÉTIER DU SITE ANJOU ÉDITION
 * =========================================================================
 */

/**
 * Widget Vidéos Populaires
 */
export const PopularVideos = ({ settings = {}, isEditing = false }) => {
  const title = settings.title || 'Vidéos Populaires';
  const layout = settings.layout || 'list'; // 'list' ou 'grid'
  const videos = Array.isArray(settings.videos) && settings.videos.length > 0 ? settings.videos : [
    { id: 'v1', title: 'Histoire des Châteaux de la Loire', duration: '14:20' },
    { id: 'v2', title: 'La Loire sauvage en Anjou', duration: '08:45' }
  ];
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  const handleVideoClick = (vidId, e) => {
    // Non-interactive in builder mode to prevent navigation while selecting
  };

  if (layout === 'grid') {
    return (
      <div className={`popular-videos-grid-widget ${customClasses}`} style={style}>
        <div className="section-title mb-3">
          <h3 className="d-flex align-items-center gap-2">
            <PlayCircle size={22} className="text-primary" /> {title}
          </h3>
        </div>
        <div className="row g-3">
          {videos.map((vid) => (
            <div key={vid.id || vid.title} className="col-12 col-md-6 col-lg-4">
              <div 
                className="card h-100 shadow-sm border-0 video-card-item cursor-pointer"
                onClick={(e) => handleVideoClick(vid.id, e)}
              >
                <div 
                  className="bg-slate-800 text-white d-flex align-items-center justify-content-center position-relative rounded-top"
                  style={{ height: '140px' }}
                >
                  <div className="mini-thumb bg-primary rounded-circle p-2 shadow">
                    <Play size={24} color="white" fill="white" />
                  </div>
                  {vid.duration && (
                    <span 
                      className="position-absolute bottom-0 end-0 m-2 px-2 py-0.5 bg-black bg-opacity-75 text-white rounded text-xs"
                      style={{ fontSize: '11px' }}
                    >
                      {vid.duration}
                    </span>
                  )}
                </div>
                <div className="card-body p-3">
                  <h5 className="card-title text-sm font-bold mb-1">{vid.title}</h5>
                  {vid.description && <p className="card-text text-xs text-muted">{vid.description}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Sidebar list style (default)
  return (
    <div className={`card widget ${customClasses}`} style={style}>
      <h2 className="widget-title">
        <PlayCircle size={20} /> {title}
      </h2>
      <div className="video-mini-list">
        {videos.map((vid) => (
          <button 
            key={vid.id || vid.title} 
            type="button"
            className="video-mini-item"
            onClick={(e) => handleVideoClick(vid.id, e)}
            aria-label={`Lire la vidéo : ${vid.title}`}
          >
            <div className="mini-thumb">
              <Play size={20} color="white" fill="white" />
            </div>
            <div className="mini-info">
              <h4>{vid.title}</h4>
              {vid.duration && <span>{vid.duration}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Widget Actualités (NewsList)
 */
export const NewsList = ({ settings = {}, isEditing = false }) => {
  const title = settings.title || 'Actualités 2026';
  const news = Array.isArray(settings.news) && settings.news.length > 0 ? settings.news : [
    { id: 'n1', title: 'Salon du Livre de Saumur', description: 'Retrouvez l\'équipe d\'Anjou Édition au stand C12 les 14 et 15 octobre 2026.' }
  ];
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  return (
    <div className={`card widget ${customClasses}`} style={style}>
      <h2 className="widget-title">
        <Info size={20} /> {title}
      </h2>
      <ul className="news-list">
        {news.map((item, idx) => (
          <li key={item.id || idx}>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Widget Poésies et Fables Phares (FeaturedPoems)
 */
export const FeaturedPoems = ({ settings = {}, isEditing = false }) => {
  const title = settings.title || 'Poésies et Fables Phares';
  const poems = Array.isArray(settings.poems) && settings.poems.length > 0 ? settings.poems : [
    {
      id: 'p1',
      tag: 'FABLE',
      title: 'Ma pomme',
      excerpt: '"Une belle pomme rouge, au sommet d\'un pommier, se prélassait au soleil du matin printanier..."',
      readMoreText: 'Lire la fable'
    },
    {
      id: 'p2',
      tag: 'POÉSIE',
      title: 'Rappel d\'Anjou',
      excerpt: '"Doux pays de la Loire où mon enfance a fui, sous un ciel argenté que la brume caresse..."',
      readMoreText: 'Lire la poésie'
    }
  ];
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  return (
    <div className={`featured-poems-widget ${customClasses}`} style={style}>
      {title && (
        <div className="section-title mb-3">
          <h3>{title}</h3>
        </div>
      )}
      <div className="featured-poems">
        {poems.map((poem, idx) => (
          <button 
            key={poem.id || idx} 
            type="button" 
            className="poem-card" 
            aria-label={`Lire : ${poem.title}`}
          >
            {poem.tag && <span>{poem.tag}</span>}
            <h4>{poem.title}</h4>
            <p>{poem.excerpt}</p>
            <span className="read-more">{poem.readMoreText || 'Lire'}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Widget Flipbooks à la une ou Lecteur intégré (FlipbookFeatured)
 */
export const FlipbookFeatured = ({ settings = {}, isEditing = false }) => {
  const title = settings.title || 'À la une : Flipbooks Interactifs';
  const mode = settings.mode || 'grid'; // 'reader' ou 'grid'
  
  // Utiliser la liste synchronisée des flipbooks du projet (Firestore / LocalStorage / Fallback)
  const currentFlipbooks = React.useMemo(() => {
    if (Array.isArray(settings.items) && settings.items.length > 0) {
      return settings.items;
    }
    return getLocalFlipbooksSync();
  }, [settings.items]);

  const selectedBookId = settings.selectedBookId;
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  if (mode === 'reader') {
    // Trouver le livre demandé ou le premier disponible
    const activeBook = (selectedBookId && currentFlipbooks.find(b => b.id === selectedBookId)) 
      || currentFlipbooks[0] 
      || flipbooksData[0];

    if (process.env.NODE_ENV !== 'production' || window.__AE_DEV_LOGS__) {
      console.log('[PageBuilder] Flipbook selected:', activeBook?.id);
    }

    return (
      <div className={`home-flipbook-section ${customClasses}`} style={style}>
        {title && (
          <div className="section-title">
            <h3>{title}</h3>
          </div>
        )}
        <div className="home-flipbook-reader-wrapper">
          <PdfFlipbookReader book={activeBook} />
        </div>
      </div>
    );
  }

  return (
    <div className={`featured-flipbooks-widget ${customClasses}`} style={style}>
      {title && (
        <div className="section-title mb-3">
          <h3>{title}</h3>
        </div>
      )}
      <div className="featured-grid">
        {currentFlipbooks.map((fb) => (
          <div key={fb.id} className="featured-card">
            <div className="featured-card-icon">
              <BookOpen size={36} color="var(--primary)" />
            </div>
            <h4>{fb.title}</h4>
            <p>{fb.description}</p>
            <button type="button" className="btn-card" aria-label={`Feuilleter l'ouvrage : ${fb.title}`}>
              {fb.buttonText || "Feuilleter l'ouvrage"} <ChevronRight size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Widget Galerie Photos
 */
export const PhotoGallery = ({ settings = {}, isEditing = false }) => {
  const title = settings.title || 'Galerie Photo d\'Anjou';
  const subtitle = settings.subtitle || 'Cliquez sur une photographie pour l\'agrandir en haute définition.';
  const layout = settings.layout || 'grid';
  const images = Array.isArray(settings.images) && settings.images.length > 0 ? settings.images : [];
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  if (layout === 'sidebar') {
    return (
      <div className={`card widget ${customClasses}`} style={style}>
        <h2 className="widget-title">
          <ImageIcon size={20} /> {title}
        </h2>
        <div className="gallery-grid">
          {images.slice(0, 4).map((img) => {
            const thumbUrl = getThumbnailUrl(img.thumbnailUrl || img.url, { width: 300, height: 220 });
            return (
              <div 
                key={img.id || img.url} 
                className="gallery-item" 
                style={{ backgroundImage: `url('${sanitizeUrl(thumbUrl)}')` }}
                title={img.title}
                aria-label={`Voir l'image : ${img.title}`}
              ></div>
            );
          })}
        </div>
        <button type="button" className="widget-footer-btn">
          Voir toutes les photos
        </button>
      </div>
    );
  }

  return (
    <div className={`photo-gallery-widget ${customClasses}`} style={style}>
      {title && (
        <div className="mb-3">
          <h2 className="view-title text-xl font-bold">{title}</h2>
          {subtitle && <p className="view-description text-muted text-sm">{subtitle}</p>}
        </div>
      )}
      <div className="full-gallery-grid">
        {images.map((img) => (
          <div key={img.id || img.url} className="full-gallery-item">
            <div className="gallery-img-wrapper">
              <OptimizedImage 
                src={img.url} 
                thumbnailSrc={img.thumbnailUrl}
                alt={img.title || 'Photo Anjou'} 
                loading="lazy"
                useThumbnail={true}
                thumbnailWidth={450}
                thumbnailHeight={320}
              />
              <div className="gallery-item-overlay">
                <h4>{img.title}</h4>
                {img.description && <p>{img.description}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Widget Chaîne YouTube
 */
export const YoutubeChannel = ({ settings = {}, isEditing = false }) => {
  const title = settings.title || 'Chaîne YouTube';
  const subtitle = settings.subtitle || 'Conférence Anjou 2026 - Extrait';
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  return (
    <div className={`card widget ${customClasses}`} style={style}>
      <h2 className="widget-title">
        <YoutubeIcon size={20} color="currentColor" /> {title}
      </h2>
      <div 
        className="video-placeholder d-flex align-items-center justify-content-center cursor-pointer" 
        style={{ background: '#fee2e2', height: '140px', borderRadius: '8px' }}
      >
        <YoutubeIcon size={40} color="#ef4444" fill="#ef4444" />
      </div>
      <p style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', marginTop: '0.75rem' }}>
        {subtitle}
      </p>
    </div>
  );
};

/**
 * Widget Formulaire de Contact
 */
export const ContactFormWidget = ({ settings = {}, isEditing = false }) => {
  const title = settings.title || '';
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  return (
    <div className={`contact-widget-container ${customClasses}`} style={style}>
      {title && (
        <div className="section-title mb-3">
          <h3>{title}</h3>
        </div>
      )}
      <ContactForm setView={() => {}} />
    </div>
  );
};
