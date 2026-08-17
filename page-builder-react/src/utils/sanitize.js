/**
 * Sanitizes HTML content by removing script tags, dangerous attributes, etc.
 * @param {string} html 
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  
  // Basic script tag removal
  let cleaned = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  
  // Remove event handlers (onmouseover, onload, onerror, etc.)
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*\S+/gi, '');
  
  // Remove javascript: pseudo-protocol
  cleaned = cleaned.replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
  cleaned = cleaned.replace(/src\s*=\s*["']\s*javascript:[^"']*["']/gi, 'src=""');
  
  return cleaned;
}

/**
 * Validates and sanitizes a URL.
 * @param {string} url 
 * @returns {string} Sanitized URL
 */
export function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Block javascript:, data:text/html, vbscript:, etc.
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    // Check if it's a safe data image URL
    if (/^data:image\//i.test(trimmed)) {
      return trimmed;
    }
    return '#';
  }
  return trimmed;
}

/**
 * Escapes HTML attributes to prevent XSS.
 * @param {string} str 
 * @returns {string} Escaped string
 */
export function escapeAttr(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Recursively sanitizes page builder elements.
 * @param {Array|object} data 
 * @returns {Array} Sanitized data
 */
export function sanitizeBuilderData(data) {
  if (!Array.isArray(data)) {
    console.warn('sanitizeBuilderData: Data is not an array, returning empty array');
    return [];
  }

  return data.map(item => {
    if (!item || typeof item !== 'object') return null;

    const sanitizedItem = {
      id: typeof item.id === 'string' ? item.id : `el-${Math.random().toString(36).substring(2, 11)}`,
      type: typeof item.type === 'string' ? item.type : 'text',
      settings: {},
      children: []
    };

    // Sanitize settings
    if (item.settings && typeof item.settings === 'object') {
      for (const [key, value] of Object.entries(item.settings)) {
        if (typeof value === 'string') {
          if (['content', 'text', 'subtitle', 'quote', 'title', 'author', 'role'].includes(key)) {
            sanitizedItem.settings[key] = sanitizeHtml(value);
          } else if (['src', 'href', 'imageSrc', 'buttonHref', 'backgroundImage', 'avatarSrc'].includes(key)) {
            sanitizedItem.settings[key] = sanitizeUrl(value);
          } else {
            // General: class names, alignment, variants, padding, colors, etc.
            sanitizedItem.settings[key] = value;
          }
        } else if (typeof value === 'boolean' || typeof value === 'number') {
          sanitizedItem.settings[key] = value;
        } else {
          sanitizedItem.settings[key] = value; // Fallback
        }
      }
    }

    // Sanitize children
    if (Array.isArray(item.children)) {
      sanitizedItem.children = sanitizeBuilderData(item.children);
    }

    return sanitizedItem;
  }).filter(Boolean);
}
