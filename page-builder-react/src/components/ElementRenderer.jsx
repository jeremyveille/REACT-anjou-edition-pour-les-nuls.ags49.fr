import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useBuilder } from '../store/builderStore';
import * as Icons from 'lucide-react';
import { Copy, Trash2, GripVertical, Settings, Star } from 'lucide-react';

/* ── Draggable wrapper for existing elements ── */
function DraggableElement({ id, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <span
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1, display: 'contents' }}
      {...attributes}
      {...listeners}
    >
      {children}
    </span>
  );
}

export default function ElementRenderer({ element }) {
  const {
    selectedElementId,
    selectElement,
    updateElementSettings,
    duplicateElement,
    deleteElement,
    setContextMenu,
  } = useBuilder();

  const { setNodeRef, isOver } = useDroppable({
    id: element.id,
    data: { type: 'element', element },
  });

  const isSelected = selectedElementId === element.id;
  const settings = element.settings || {};

  const handleSelect = (e) => {
    e.stopPropagation();
    selectElement(element.id);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    selectElement(element.id);
    setContextMenu({ x: e.clientX, y: e.clientY, elementId: element.id });
  };

  const handleTextChange = (e) => {
    const htmlValue = e.currentTarget.innerHTML;
    updateElementSettings(element.id, { content: htmlValue }, { silent: true });
  };

  const handleTextBlur = (e) => {
    const htmlValue = e.currentTarget.innerHTML;
    updateElementSettings(element.id, { content: htmlValue });
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    duplicateElement(element.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElement(element.id);
  };

  /* ── Floating toolbar labels (human-readable) ── */
  const TYPE_LABELS = {
    section: 'Section', hero: 'Hero', row: 'Grille', column: 'Colonne',
    text: 'Texte', image: 'Image', video: 'Vidéo', button: 'Bouton',
    icon: 'Icône', card: 'Carte', alert: 'Alerte', spacer: 'Espacement',
    separator: 'Séparateur', testimonial: 'Témoignage', cta: 'Appel à l\'action',
  };

  const renderToolbar = () => (
    <div className="element-toolbar" role="toolbar" aria-label={`Contrôles de l'élément ${element.type}`}>
      <DraggableElement id={element.id}>
        <span style={{ opacity: 0.8, cursor: 'grab', display: 'flex' }}>
          <GripVertical size={11} />
        </span>
      </DraggableElement>
      <span style={{ fontWeight: 700, fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.06em', opacity: 0.9 }}>
        {TYPE_LABELS[element.type] || element.type}
      </span>
      <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,.3)', margin: '0 2px' }} aria-hidden="true" />
      <button type="button" className="element-toolbar-btn" title="Dupliquer" aria-label="Dupliquer" onClick={handleDuplicate}>
        <Copy size={11} />
      </button>
      <button type="button" className="element-toolbar-btn" title="Réglages" aria-label="Sélectionner" onClick={handleSelect}>
        <Settings size={11} />
      </button>
      <button type="button" className="element-toolbar-btn danger" title="Supprimer" aria-label="Supprimer" onClick={handleDelete}>
        <Trash2 size={11} />
      </button>
    </div>
  );

  /* ── Icon resolver ── */
  const renderIcon = () => {
    const IconComponent = Icons[settings.name] || Icons.Smile;
    return (
      <div className={settings.className || 'd-inline-block'}>
        <IconComponent size={settings.size || 24} color={settings.color || '#000000'} />
      </div>
    );
  };

  /* ── Stars renderer for testimonials ── */
  const renderStars = (count = 5) => (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '0.75rem' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={16}
          fill={i < count ? '#f59e0b' : 'none'}
          stroke={i < count ? '#f59e0b' : '#cbd5e1'}
        />
      ))}
    </div>
  );

  /* ── Content per type ── */
  const renderContent = () => {
    switch (element.type) {

      case 'section': {
        const sectionStyle = {};
        if (settings.backgroundColor) sectionStyle.backgroundColor = settings.backgroundColor;
        if (settings.backgroundImage) {
          sectionStyle.backgroundImage = `url(${settings.backgroundImage})`;
          sectionStyle.backgroundSize = 'cover';
          sectionStyle.backgroundPosition = 'center';
        }
        if (settings.minHeight) sectionStyle.minHeight = settings.minHeight;
        const containerClass = settings.container ? 'container' : 'container-fluid';
        const paddingClass = settings.padding || 'py-5';
        const marginClass = settings.margin || 'mb-0';

        return (
          <section
            className={`canvas-section ${paddingClass} ${marginClass} ${settings.className || ''}`}
            style={sectionStyle}
          >
            <div className={containerClass}>
              {element.children && element.children.length > 0 ? (
                element.children.map(child => (
                  <ElementRenderer key={child.id} element={child} />
                ))
              ) : (
                <div className="section-empty-placeholder">
                  Section vide — ajoutez une <strong>Grille</strong> ou glissez un <strong>Widget</strong>.
                </div>
              )}
            </div>
          </section>
        );
      }

      case 'hero': {
        const heroStyle = {
          backgroundColor: settings.backgroundColor || '#1e293b',
          color: settings.textColor || '#ffffff',
          minHeight: settings.minHeight || '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        };
        if (settings.backgroundImage) {
          heroStyle.backgroundImage = `url(${settings.backgroundImage})`;
          heroStyle.backgroundSize = 'cover';
          heroStyle.backgroundPosition = 'center';
        }

        return (
          <div className={`canvas-hero ${settings.textAlign || 'text-center'}`} style={heroStyle}>
            {settings.backgroundImage && settings.overlayOpacity > 0 && (
              <div style={{
                position: 'absolute', inset: 0,
                backgroundColor: `rgba(0,0,0,${settings.overlayOpacity})`,
                zIndex: 0,
              }} />
            )}
            <div className="container" style={{ position: 'relative', zIndex: 1, padding: '3rem 1rem' }}>
              <h1 style={{ color: settings.textColor || '#ffffff', marginBottom: '1rem', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 800 }}>
                {settings.title || 'Titre héros'}
              </h1>
              {settings.subtitle && (
                <p style={{ color: settings.textColor || '#ffffff', opacity: 0.85, fontSize: '1.1rem', marginBottom: '1.75rem', maxWidth: '600px', margin: '0 auto 1.75rem' }}>
                  {settings.subtitle}
                </p>
              )}
              {settings.buttonText && (
                <a
                  href={settings.buttonHref || '#'}
                  className={`btn ${settings.buttonVariant || 'btn-primary'} btn-lg`}
                  onClick={e => e.preventDefault()}
                >
                  {settings.buttonText}
                </a>
              )}
            </div>
          </div>
        );
      }

      case 'row': {
        const gap = settings.gap || 'g-3';
        const ai = settings.alignItems || 'align-items-start';
        const jc = settings.justifyContent || 'justify-content-start';
        return (
          <div className={`row ${gap} ${ai} ${jc}`}>
            {element.children && element.children.map(child => (
              <ElementRenderer key={child.id} element={child} />
            ))}
          </div>
        );
      }

      case 'column': {
        const colClass = settings.className || 'col';
        const colStyle = settings.backgroundColor ? { backgroundColor: settings.backgroundColor } : {};
        const colClasses = [
          'canvas-column',
          colClass,
          settings.padding || '',
          settings.margin || '',
          isOver ? 'drag-over' : '',
        ].filter(Boolean).join(' ');

        return (
          <div
            ref={setNodeRef}
            className={colClasses}
            style={colStyle}
            onClick={handleSelect}
            aria-label="Colonne — zone de dépôt"
          >
            {element.children && element.children.length > 0 ? (
              element.children.map(child => (
                <ElementRenderer key={child.id} element={child} />
              ))
            ) : (
              <div className="canvas-column-empty">
                <span>Glissez un widget ici</span>
              </div>
            )}
          </div>
        );
      }

      case 'spacer': {
        const h = settings.height || 48;
        return (
          <div
            style={{ height: `${h}px`, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={handleSelect}
            className="canvas-spacer"
          >
            <div className="canvas-spacer-label">{h}px d'espace</div>
          </div>
        );
      }

      case 'separator': {
        return (
          <div onClick={handleSelect} className={settings.margin || 'my-4'}>
            <hr
              style={{
                borderColor: settings.color || '#e2e5ec',
                borderStyle: settings.style || 'solid',
                borderTopWidth: `${settings.thickness || 1}px`,
                opacity: 1,
                width: settings.width || '100%',
                margin: 0,
              }}
            />
          </div>
        );
      }

      case 'text': {
        const Tag = settings.tag || 'p';
        const textStyle = {};
        if (settings.color) textStyle.color = settings.color;
        if (settings.fontSize) textStyle.fontSize = settings.fontSize;
        if (settings.fontWeight) textStyle.fontWeight = settings.fontWeight;

        return (
          <Tag
            className={`editable-text-wrapper ${settings.textAlign || 'text-start'} ${settings.className || ''} ${settings.margin || 'mb-3'}`}
            style={textStyle}
            contentEditable
            suppressContentEditableWarning
            onInput={handleTextChange}
            onBlur={handleTextBlur}
            onClick={handleSelect}
            dangerouslySetInnerHTML={{ __html: settings.content || '' }}
            aria-label="Texte éditable"
          />
        );
      }

      case 'image': {
        const imgStyle = {
          width: settings.width ? (isNaN(settings.width) ? settings.width : `${settings.width}px`) : '100%',
          height: settings.height ? `${settings.height}px` : 'auto',
          objectFit: settings.objectFit || 'cover',
          borderRadius: settings.borderRadius || '',
        };
        return (
          <img
            src={settings.src || 'https://placehold.co/800x400/eef3ff/3b6ef8?text=Image'}
            alt={settings.alt || ''}
            className={`${settings.className || 'img-fluid rounded'} ${settings.margin || 'mb-3'}`}
            style={imgStyle}
            onClick={handleSelect}
          />
        );
      }

      case 'video': {
        let embedSrc = settings.src || '';
        if (embedSrc.includes('youtube.com/watch?v=')) {
          const vid = embedSrc.split('v=')[1]?.split('&')[0];
          embedSrc = `https://www.youtube.com/embed/${vid}`;
        } else if (embedSrc.includes('youtu.be/')) {
          const vid = embedSrc.split('youtu.be/')[1]?.split('?')[0];
          embedSrc = `https://www.youtube.com/embed/${vid}`;
        }
        return (
          <div
            className={`${settings.className || 'ratio ratio-16x9 rounded overflow-hidden'} ${settings.margin || 'mb-3'}`}
            onClick={handleSelect}
            style={{ position: 'relative' }}
          >
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer' }} />
            {embedSrc ? (
              <iframe
                src={embedSrc}
                title="Lecteur vidéo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div style={{ background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', borderRadius: '8px' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <Icons.Video size={32} style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: '.8rem', margin: 0 }}>Cliquez pour configurer la vidéo</p>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'button': {
        const variant = settings.variant || 'btn-primary';
        const size = settings.size || '';
        const btnClasses = `btn ${variant} ${size} ${settings.className || ''} ${settings.margin || 'mb-3'}`;
        return (
          <div className={settings.textAlign || 'text-start'}>
            <a
              href={settings.href || '#'}
              target={settings.target || '_self'}
              className={btnClasses}
              onClick={e => { e.preventDefault(); handleSelect(e); }}
            >
              {settings.text || 'Bouton'}
            </a>
          </div>
        );
      }

      case 'icon': {
        return (
          <div
            onClick={handleSelect}
            className={`d-inline-block ${settings.margin || 'mb-3'}`}
            style={{ cursor: 'pointer' }}
          >
            {renderIcon()}
          </div>
        );
      }

      case 'card': {
        const cardStyle = settings.backgroundColor ? { backgroundColor: settings.backgroundColor } : {};
        return (
          <div
            className={`card ${settings.className || 'shadow-sm border-0 h-100'} ${settings.margin || 'mb-3'}`}
            style={cardStyle}
            onClick={handleSelect}
          >
            {settings.imageSrc && (
              <img
                src={settings.imageSrc}
                className="card-img-top"
                alt={settings.title || ''}
                style={{ height: '180px', objectFit: 'cover' }}
              />
            )}
            <div className="card-body">
              {settings.title && <h5 className="card-title fw-bold">{settings.title}</h5>}
              {settings.text && <p className="card-text text-muted small">{settings.text}</p>}
              {settings.buttonText && (
                <a href={settings.buttonHref || '#'} className={`btn btn-sm ${settings.variant || 'btn-primary'}`} onClick={e => e.preventDefault()}>
                  {settings.buttonText}
                </a>
              )}
            </div>
          </div>
        );
      }

      case 'alert': {
        const variant = settings.variant || 'alert-info';
        const dismissible = settings.dismissible ? 'alert-dismissible fade show' : '';
        return (
          <div
            className={`alert ${variant} ${dismissible} ${settings.className || ''} ${settings.margin || 'mb-3'}`}
            role="alert"
            onClick={handleSelect}
          >
            <div dangerouslySetInnerHTML={{ __html: settings.content || '' }} />
            {settings.dismissible && <button type="button" className="btn-close" aria-label="Fermer" />}
          </div>
        );
      }

      case 'testimonial': {
        const tStyle = {
          backgroundColor: settings.backgroundColor || '#f8f9fb',
          color: settings.textColor || '#0f172a',
          borderRadius: '12px',
          padding: '1.5rem',
        };
        return (
          <div
            className={`canvas-testimonial ${settings.className || ''} ${settings.margin || 'mb-3'}`}
            style={tStyle}
            onClick={handleSelect}
          >
            {renderStars(settings.stars || 5)}
            <blockquote style={{ margin: '0 0 1rem', fontStyle: 'italic', fontSize: '1rem', lineHeight: 1.6 }}>
              &ldquo;{settings.quote || 'Témoignage ici...'}&rdquo;
            </blockquote>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {settings.avatarSrc ? (
                <img src={settings.avatarSrc} alt={settings.author || ''} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dde7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icons.User size={20} color="#3b6ef8" />
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{settings.author || 'Prénom Nom'}</div>
                {settings.role && <div style={{ fontSize: '.75rem', opacity: 0.65 }}>{settings.role}</div>}
              </div>
            </div>
          </div>
        );
      }

      case 'cta': {
        const ctaStyle = {
          backgroundColor: settings.backgroundColor || '#3b6ef8',
          color: settings.textColor || '#ffffff',
          padding: '3rem 1rem',
          textAlign: 'center',
          borderRadius: '12px',
        };
        return (
          <div
            className={`canvas-cta ${settings.padding || ''} ${settings.className || ''} ${settings.margin || 'mb-0'}`}
            style={ctaStyle}
            onClick={handleSelect}
          >
            <div className="container">
              {settings.title && (
                <h2 style={{ color: settings.textColor || '#ffffff', marginBottom: '0.75rem', fontWeight: 800 }}>
                  {settings.title}
                </h2>
              )}
              {settings.subtitle && (
                <p style={{ color: settings.textColor || '#ffffff', opacity: 0.85, marginBottom: '1.75rem' }}>
                  {settings.subtitle}
                </p>
              )}
              {settings.buttonText && (
                <a href={settings.buttonHref || '#'} className={`btn ${settings.buttonVariant || 'btn-primary'} btn-lg`} onClick={e => e.preventDefault()}>
                  {settings.buttonText}
                </a>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Build wrapper-level inline styles from advanced settings
  const buildWrapperStyle = () => {
    const s = settings;
    const style = {};
    // Gradient (overrides solid background color if both defined)
    if (s.gradientFrom && s.gradientTo) {
      style.background = `linear-gradient(${s.gradientDir || 'to bottom'}, ${s.gradientFrom}, ${s.gradientTo})`;
    }
    // Box shadow
    if (s.boxShadow) style.boxShadow = s.boxShadow;
    return style;
  };

  // Responsive visibility classes
  const buildResponsiveClasses = () => {
    const s = settings;
    const cls = [];
    if (s.hideMobile) cls.push('d-none d-md-block');
    if (s.hideTablet) cls.push('d-md-none d-lg-block');
    if (s.hideDesktop) cls.push('d-lg-none');
    return cls.join(' ');
  };

  const wrapperClasses = [
    'canvas-element-wrapper',
    isSelected ? 'selected' : '',
    isOver && element.type !== 'column' ? 'drop-indicator-top' : '',
    buildResponsiveClasses(),
  ].filter(Boolean).join(' ');

  const wrapperStyle = buildWrapperStyle();

  return (
    <div
      ref={element.type !== 'column' ? setNodeRef : null}
      className={wrapperClasses}
      style={Object.keys(wrapperStyle).length ? wrapperStyle : undefined}
      onClick={handleSelect}
      onContextMenu={handleContextMenu}
    >
      {renderToolbar()}
      {renderContent()}
    </div>
  );
}

