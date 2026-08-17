import React from 'react';
import * as Icons from 'lucide-react';

/**
 * Widget Titre (Heading)
 */
export const Heading = ({ settings = {} }) => {
  const Tag = settings.level || 'h2';
  const content = settings.content || 'Titre exemple';
  const customClasses = settings.classes || 'text-dark';
  const style = settings.style || {};

  return (
    <Tag className={`pb-widget-heading ${customClasses}`} style={style}>
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
  const style = settings.style || {};

  // Rendu de texte riche (si HTML) ou paragraphe simple
  return (
    <div 
      className={`pb-widget-text ${customClasses}`} 
      style={style}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

/**
 * Widget Image
 */
export const Image = ({ settings = {} }) => {
  const src = settings.src || 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=600';
  const alt = settings.alt || 'Illustration';
  const customClasses = settings.classes || 'img-fluid rounded';
  const style = settings.style || {};

  return (
    <div className="pb-widget-image-container text-center" style={style}>
      <img src={src} alt={alt} className={customClasses} />
    </div>
  );
};

/**
 * Widget Bouton
 */
export const Button = ({ settings = {} }) => {
  const text = settings.text || 'Cliquez ici';
  const link = settings.link || '#';
  const buttonStyle = settings.buttonStyle || 'btn-primary';
  const size = settings.size || ''; // btn-lg, btn-sm, etc.
  const customClasses = settings.classes || '';
  const style = settings.style || {};
  const iconName = settings.icon; // optionnel

  const IconComponent = iconName ? Icons[iconName] : null;

  return (
    <a 
      href={link} 
      className={`btn ${buttonStyle} ${size} ${customClasses} d-inline-flex align-items-center gap-2`}
      style={style}
      target={settings.newTab ? '_blank' : '_self'}
      rel="noopener noreferrer"
    >
      {IconComponent && <IconComponent className="w-4 h-4" />}
      {text}
    </a>
  );
};

/**
 * Widget Carte (Card)
 */
export const Card = ({ settings = {} }) => {
  const title = settings.title || 'Titre de la carte';
  const text = settings.text || 'Contenu court de la carte pour illustrer un propos.';
  const image = settings.image || '';
  const buttonText = settings.buttonText || '';
  const buttonLink = settings.buttonLink || '#';
  const customClasses = settings.classes || 'shadow-sm';
  const style = settings.style || {};

  return (
    <div className={`card ${customClasses}`} style={style}>
      {image && <img src={image} className="card-img-top" alt={title} />}
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
  const type = settings.type || 'alert-info'; // alert-success, alert-warning, etc.
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
export const Video = ({ settings = {} }) => {
  const url = settings.url || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  // Permet de convertir les liens youtube standards en embeds si besoin
  let embedUrl = url;
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  }

  return (
    <div className={`ratio ratio-16x9 ${customClasses}`} style={style}>
      <iframe 
        src={embedUrl} 
        title="Widget Vidéo" 
        allowFullScreen
        className="rounded"
      ></iframe>
    </div>
  );
};
