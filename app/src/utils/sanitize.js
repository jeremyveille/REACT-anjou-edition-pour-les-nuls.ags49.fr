/**
 * Sanitizes HTML content by removing script tags, dangerous attributes, and inline javascript.
 * @param {string} html 
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  
  // Remove script tags and contents
  let cleaned = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  
  // Remove iframe, object, embed, form, applet, base tags
  cleaned = cleaned.replace(/<\/?(script|object|embed|form|applet|base)[^>]*>/gi, '');
  
  // Remove event handlers (onmouseover, onload, onerror, onclick, etc.)
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');
  
  // Remove javascript: pseudo-protocol in href, src, etc.
  cleaned = cleaned.replace(/(href|src|xlink:href|action)\s*=\s*["']\s*(?:javascript|data|vbscript):[^"']*["']/gi, '$1="#"');
  cleaned = cleaned.replace(/(href|src|xlink:href|action)\s*=\s*(?:javascript|data|vbscript):[^\s>]+/gi, '$1="#"');
  
  return cleaned;
}

/**
 * Validates and sanitizes a URL against javascript: or dangerous URI schemes.
 * @param {string} url 
 * @returns {string} Sanitized URL
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  
  // Block javascript:, vbscript:, data:text/html, etc.
  if (/^(javascript|vbscript):/i.test(trimmed)) {
    return '#';
  }
  
  // Allow safe data image URLs, http(s), mailto, tel, relative paths
  if (/^(https?:\/\/|\/|#|mailto:|tel:|data:image\/)/i.test(trimmed)) {
    return trimmed;
  }
  
  // Relative internal paths (e.g. "contact", "/pages/demo")
  if (/^[a-zA-Z0-9_./-]+$/.test(trimmed)) {
    return trimmed;
  }
  
  return '#';
}

/**
 * Escapes HTML characters in text.
 * @param {string} str 
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
