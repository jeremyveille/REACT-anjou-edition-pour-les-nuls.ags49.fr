import { sanitizeBuilderData } from './sanitize.js';

const ELEMENT_TYPES = new Set([
  'section', 'hero', 'row', 'column', 'spacer', 'separator', 'text',
  'image', 'video', 'button', 'icon', 'card', 'alert', 'testimonial', 'cta',
]);

// Validate the entire document before any editor state or storage is changed.
export default function validateLayout(data) {
  if (!Array.isArray(data)) {
    throw new Error('Le document doit contenir un tableau de blocs. Le contenu actuel est conservé.');
  }
  const ids = new Set();
  let count = 0;
  function visit(items, depth = 0) {
    if (depth > 50) throw new Error('Le document contient trop de niveaux imbriqués.');
    for (const item of items) {
      if (++count > 10000) throw new Error('Le document contient trop de blocs.');
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error('Chaque bloc doit être un objet valide.');
      }
      if (typeof item.id !== 'string' || !item.id.trim()) {
        throw new Error('Chaque bloc doit avoir un identifiant non vide.');
      }
      if (ids.has(item.id)) throw new Error(`Identifiant de bloc dupliqué : ${item.id}`);
      ids.add(item.id);
      if (!ELEMENT_TYPES.has(item.type)) throw new Error(`Type de bloc inconnu : ${item.type}`);
      if (item.settings !== undefined && (!item.settings || typeof item.settings !== 'object' || Array.isArray(item.settings))) {
        throw new Error(`Réglages invalides pour le bloc ${item.id}.`);
      }
      for (const value of Object.values(item.settings || {})) {
        if (!['string', 'boolean', 'number'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value))) {
          throw new Error(`Valeur de réglage invalide pour le bloc ${item.id}.`);
        }
      }
      if (item.children !== undefined && !Array.isArray(item.children)) {
        throw new Error(`Enfants invalides pour le bloc ${item.id}.`);
      }
      if (item.children?.length && !['section', 'row', 'column'].includes(item.type)) {
        throw new Error(`Le bloc ${item.id} ne peut pas contenir de blocs enfants.`);
      }
      visit(item.children || [], depth + 1);
    }
  }
  visit(data);
  return sanitizeBuilderData(data);
}
