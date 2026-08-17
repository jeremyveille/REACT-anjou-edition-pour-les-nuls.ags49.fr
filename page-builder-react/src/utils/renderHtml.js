import { escapeAttr, sanitizeHtml } from './sanitize';

/**
 * Builds extra inline styles from advanced settings (gradient, box-shadow).
 * @param {object} s - element settings
 * @returns {{ styleStr: string, wrapClass: string }}
 */
function buildAdvancedAttrs(s) {
  const styles = [];
  const classes = [];

  // Gradient background
  if (s.gradientFrom && s.gradientTo) {
    styles.push(`background: linear-gradient(${s.gradientDir || 'to bottom'}, ${escapeAttr(s.gradientFrom)}, ${escapeAttr(s.gradientTo)})`);
  }

  // Box shadow
  if (s.boxShadow) {
    styles.push(`box-shadow: ${escapeAttr(s.boxShadow)}`);
  }

  // Responsive visibility
  if (s.hideMobile) classes.push('d-none d-md-block');
  if (s.hideTablet) classes.push('d-md-none d-lg-block');
  if (s.hideDesktop) classes.push('d-lg-none');

  return {
    styleStr: styles.length ? ` style="${styles.join('; ')}"` : '',
    wrapClass: classes.join(' '),
  };
}

export default function renderHtml(elements, depth = 0) {
  if (!elements || !Array.isArray(elements)) return '';

  const indent = '  '.repeat(depth);
  let html = '';

  elements.forEach(el => {
    const s = el.settings || {};
    const { styleStr: advStyle, wrapClass: advClass } = buildAdvancedAttrs(s);

    // Wrap in a div if advanced classes are present (for responsive hiding)
    const needsWrap = advClass && !['section', 'hero', 'cta'].includes(el.type);
    if (needsWrap) {
      html += `${indent}<div class="${advClass}"${advStyle}>\n`;
    }



    switch (el.type) {

      case 'section': {
        const styles = [];
        if (s.backgroundColor) styles.push(`background-color: ${escapeAttr(s.backgroundColor)}`);
        if (s.backgroundImage) styles.push(`background-image: url(${escapeAttr(s.backgroundImage)}); background-size: cover; background-position: center`);
        if (s.minHeight) styles.push(`min-height: ${escapeAttr(s.minHeight)}`);
        const styleAttr = styles.length ? ` style="${styles.join('; ')}"` : '';
        const classes = [s.padding || '', s.margin || '', s.className || ''].filter(Boolean).join(' ');
        const containerClass = s.container ? 'container' : 'container-fluid';

        html += `${indent}<section class="${escapeAttr(classes)}"${styleAttr}>\n`;
        html += `${indent}  <div class="${containerClass}">\n`;
        html += renderHtml(el.children || [], depth + 2);
        html += `${indent}  </div>\n`;
        html += `${indent}</section>\n`;
        break;
      }

      case 'hero': {
        const styles = [];
        if (s.backgroundColor) styles.push(`background-color: ${escapeAttr(s.backgroundColor)}`);
        if (s.backgroundImage) styles.push(`background-image: url(${escapeAttr(s.backgroundImage)}); background-size: cover; background-position: center`);
        if (s.minHeight) styles.push(`min-height: ${escapeAttr(s.minHeight)}`);
        styles.push('display: flex; align-items: center; justify-content: center');
        const styleAttr = ` style="${styles.join('; ')}"`;
        const textAlign = s.textAlign || 'text-center';
        const textColor = s.textColor || '#ffffff';

        html += `${indent}<div class="${textAlign}" ${styleAttr}>\n`;
        if (s.backgroundImage && s.overlayOpacity > 0) {
          html += `${indent}  <div style="position:absolute;inset:0;background:rgba(0,0,0,${s.overlayOpacity})"></div>\n`;
        }
        html += `${indent}  <div class="container" style="position:relative;padding:3rem 1rem">\n`;
        if (s.title) {
          html += `${indent}    <h1 style="color:${escapeAttr(textColor)};font-weight:800;margin-bottom:1rem">${escapeAttr(s.title)}</h1>\n`;
        }
        if (s.subtitle) {
          html += `${indent}    <p style="color:${escapeAttr(textColor)};opacity:.85;margin-bottom:1.75rem">${escapeAttr(s.subtitle)}</p>\n`;
        }
        if (s.buttonText) {
          const btnVariant = s.buttonVariant || 'btn-primary';
          html += `${indent}    <a href="${escapeAttr(s.buttonHref || '#')}" class="btn ${escapeAttr(btnVariant)} btn-lg">${escapeAttr(s.buttonText)}</a>\n`;
        }
        html += `${indent}  </div>\n`;
        html += `${indent}</div>\n`;
        break;
      }

      case 'row': {
        const gap = s.gap || 'g-3';
        const ai = s.alignItems || '';
        const jc = s.justifyContent || '';
        const classes = ['row', gap, ai, jc].filter(Boolean).join(' ');

        html += `${indent}<div class="${escapeAttr(classes)}">\n`;
        html += renderHtml(el.children || [], depth + 1);
        html += `${indent}</div>\n`;
        break;
      }

      case 'column': {
        const colClass = s.className || 'col';
        const styles = [];
        if (s.backgroundColor) styles.push(`background-color: ${escapeAttr(s.backgroundColor)}`);
        const styleAttr = styles.length ? ` style="${styles.join('; ')}"` : '';
        const classes = [colClass, s.padding || '', s.margin || ''].filter(Boolean).join(' ');

        html += `${indent}<div class="${escapeAttr(classes)}"${styleAttr}>\n`;
        html += renderHtml(el.children || [], depth + 1);
        html += `${indent}</div>\n`;
        break;
      }

      case 'spacer': {
        const h = s.height || 48;
        html += `${indent}<div style="height: ${h}px; display: block;" aria-hidden="true"></div>\n`;
        break;
      }

      case 'separator': {
        const styles = [
          `border-color: ${escapeAttr(s.color || '#e2e5ec')}`,
          `border-top-width: ${s.thickness || 1}px`,
          `border-style: ${escapeAttr(s.style || 'solid')}`,
          `width: ${escapeAttr(s.width || '100%')}`,
          'opacity: 1',
        ];
        html += `${indent}<hr class="${escapeAttr(s.margin || 'my-4')}" style="${styles.join('; ')}">\n`;
        break;
      }

      case 'text': {
        const tag = s.tag || 'p';
        const textAlign = s.textAlign || 'text-start';
        const customClass = s.className || '';
        const margin = s.margin || 'mb-3';
        const classes = [textAlign, customClass, margin].filter(Boolean).join(' ');

        const styles = [];
        if (s.color) styles.push(`color: ${escapeAttr(s.color)}`);
        if (s.fontSize) styles.push(`font-size: ${escapeAttr(s.fontSize)}`);
        if (s.fontWeight) styles.push(`font-weight: ${escapeAttr(s.fontWeight)}`);
        const styleAttr = styles.length ? ` style="${styles.join('; ')}"` : '';

        const content = sanitizeHtml(s.content || '');
        html += `${indent}<${tag} class="${escapeAttr(classes)}"${styleAttr}>${content}</${tag}>\n`;
        break;
      }

      case 'image': {
        const src = s.src || 'https://via.placeholder.com/800x400';
        const alt = s.alt || '';
        const customClass = s.className || 'img-fluid rounded';
        const margin = s.margin || 'mb-3';
        const classes = [customClass, margin].filter(Boolean).join(' ');

        const styles = [];
        if (s.width) styles.push(`width: ${isNaN(s.width) ? s.width : `${s.width}px`}`);
        if (s.height) styles.push(`height: ${s.height}px`);
        if (s.objectFit) styles.push(`object-fit: ${escapeAttr(s.objectFit)}`);
        if (s.borderRadius) styles.push(`border-radius: ${escapeAttr(s.borderRadius)}`);
        const styleAttr = styles.length ? ` style="${styles.join('; ')}"` : '';

        html += `${indent}<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" class="${escapeAttr(classes)}"${styleAttr}>\n`;
        break;
      }

      case 'video': {
        const customClass = s.className || 'ratio ratio-16x9';
        const margin = s.margin || 'mb-3';
        const classes = [customClass, margin].filter(Boolean).join(' ');

        let embedSrc = s.src || '';
        if (embedSrc.includes('youtube.com/watch?v=')) {
          const vid = embedSrc.split('v=')[1]?.split('&')[0];
          embedSrc = `https://www.youtube.com/embed/${vid}`;
        } else if (embedSrc.includes('youtu.be/')) {
          const vid = embedSrc.split('youtu.be/')[1]?.split('?')[0];
          embedSrc = `https://www.youtube.com/embed/${vid}`;
        }

        html += `${indent}<div class="${escapeAttr(classes)}">\n`;
        if (embedSrc) {
          html += `${indent}  <iframe src="${escapeAttr(embedSrc)}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n`;
        }
        html += `${indent}</div>\n`;
        break;
      }

      case 'button': {
        const text = s.text || 'Bouton';
        const href = s.href || '#';
        const variant = s.variant || 'btn-primary';
        const size = s.size || '';
        const target = s.target || '_self';
        const customClass = s.className || '';
        const margin = s.margin || 'mb-3';
        const btnClasses = ['btn', variant, size, customClass, margin].filter(Boolean).join(' ');
        const align = s.textAlign || 'text-start';

        html += `${indent}<div class="${align}">\n`;
        html += `${indent}  <a href="${escapeAttr(href)}" target="${escapeAttr(target)}" class="${escapeAttr(btnClasses)}">${escapeAttr(text)}</a>\n`;
        html += `${indent}</div>\n`;
        break;
      }

      case 'icon': {
        const name = s.name || 'Star';
        const size = s.size || 24;
        const color = s.color || '#000000';
        const customClass = s.className || '';
        const margin = s.margin || 'mb-3';
        const iconClass = `bi bi-${name.toLowerCase()}`;
        const styles = `font-size: ${size}px; color: ${escapeAttr(color)};`;

        html += `${indent}<i class="${escapeAttr(iconClass)} ${escapeAttr(customClass)} ${margin}" style="${styles}"></i>\n`;
        break;
      }

      case 'card': {
        const customClass = s.className || 'card h-100 shadow-sm border-0';
        const margin = s.margin || 'mb-3';

        html += `${indent}<div class="${escapeAttr(customClass)} ${margin}">\n`;
        if (s.imageSrc) {
          html += `${indent}  <img src="${escapeAttr(s.imageSrc)}" class="card-img-top" alt="${escapeAttr(s.title || '')}" style="height:180px;object-fit:cover">\n`;
        }
        html += `${indent}  <div class="card-body">\n`;
        if (s.title) html += `${indent}    <h5 class="card-title fw-bold">${escapeAttr(s.title)}</h5>\n`;
        if (s.text) html += `${indent}    <p class="card-text text-muted small">${escapeAttr(s.text)}</p>\n`;
        if (s.buttonText) {
          html += `${indent}    <a href="${escapeAttr(s.buttonHref || '#')}" class="btn btn-sm ${escapeAttr(s.variant || 'btn-primary')}">${escapeAttr(s.buttonText)}</a>\n`;
        }
        html += `${indent}  </div>\n`;
        html += `${indent}</div>\n`;
        break;
      }

      case 'alert': {
        const content = sanitizeHtml(s.content || '');
        const variant = s.variant || 'alert-info';
        const dismissible = s.dismissible ? 'alert-dismissible fade show' : '';
        const customClass = s.className || '';
        const margin = s.margin || 'mb-3';
        const classes = ['alert', variant, dismissible, customClass, margin].filter(Boolean).join(' ');

        html += `${indent}<div class="${escapeAttr(classes)}" role="alert">\n`;
        html += `${indent}  ${content}\n`;
        if (s.dismissible) {
          html += `${indent}  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>\n`;
        }
        html += `${indent}</div>\n`;
        break;
      }

      case 'testimonial': {
        const bgColor = s.backgroundColor || '#f8f9fb';
        const textColor = s.textColor || '#0f172a';
        const stars = s.stars || 5;
        const starHtml = Array.from({ length: 5 })
          .map((_, i) => `<span style="color:${i < stars ? '#f59e0b' : '#cbd5e1'}">★</span>`)
          .join('');

        html += `${indent}<div class="${escapeAttr(s.className || '')} ${s.margin || 'mb-3'}" style="background-color:${escapeAttr(bgColor)};color:${escapeAttr(textColor)};border-radius:12px;padding:1.5rem">\n`;
        html += `${indent}  <div style="font-size:1.2rem;margin-bottom:.75rem">${starHtml}</div>\n`;
        html += `${indent}  <blockquote style="margin:0 0 1rem;font-style:italic">&ldquo;${escapeAttr(s.quote || '')}&rdquo;</blockquote>\n`;
        html += `${indent}  <div style="display:flex;align-items:center;gap:.75rem">\n`;
        if (s.avatarSrc) {
          html += `${indent}    <img src="${escapeAttr(s.avatarSrc)}" alt="${escapeAttr(s.author || '')}" style="width:40px;height:40px;border-radius:50%;object-fit:cover">\n`;
        }
        html += `${indent}    <div>\n`;
        html += `${indent}      <div style="font-weight:700;font-size:.88rem">${escapeAttr(s.author || '')}</div>\n`;
        if (s.role) html += `${indent}      <div style="font-size:.75rem;opacity:.65">${escapeAttr(s.role)}</div>\n`;
        html += `${indent}    </div>\n`;
        html += `${indent}  </div>\n`;
        html += `${indent}</div>\n`;
        break;
      }

      case 'cta': {
        const bgColor = s.backgroundColor || '#3b6ef8';
        const textColor = s.textColor || '#ffffff';
        const classes = [s.padding || 'py-5', s.className || '', s.margin || 'mb-0'].filter(Boolean).join(' ');

        html += `${indent}<div class="${escapeAttr(classes)}" style="background-color:${escapeAttr(bgColor)};text-align:center;border-radius:12px">\n`;
        html += `${indent}  <div class="container">\n`;
        if (s.title) html += `${indent}    <h2 style="color:${escapeAttr(textColor)};font-weight:800;margin-bottom:.75rem">${escapeAttr(s.title)}</h2>\n`;
        if (s.subtitle) html += `${indent}    <p style="color:${escapeAttr(textColor)};opacity:.85;margin-bottom:1.75rem">${escapeAttr(s.subtitle)}</p>\n`;
        if (s.buttonText) {
          html += `${indent}    <a href="${escapeAttr(s.buttonHref || '#')}" class="btn ${escapeAttr(s.buttonVariant || 'btn-primary')} btn-lg">${escapeAttr(s.buttonText)}</a>\n`;
        }
        html += `${indent}  </div>\n`;
        html += `${indent}</div>\n`;
        break;
      }

      default:
        break;
    }

    // Close the responsive wrapper if one was opened
    if (needsWrap) {
      html += `${indent}</div>\n`;
    }
  });

  return html;
}
