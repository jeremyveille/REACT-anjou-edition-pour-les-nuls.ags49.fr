/**
 * Generates a unique ID with an optional prefix.
 * @param {string} prefix 
 * @returns {string}
 */
export default function generateId(prefix = 'el') {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}
