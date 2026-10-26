/**
 * Constantes officielles de marque et d'appellation pour Anjou Édition.
 *
 * Règle R1 :
 * - Header principal du site public : BRAND_HEADER = "Anjou Édition" (exception unique)
 * - Partout ailleurs sur le site public et le tableau de bord d'administration : BRAND_NAME = "Anjou Édition, pour les nuls"
 */

export const BRAND_HEADER = "Anjou Édition";
export const BRAND_NAME = "Anjou Édition, pour les nuls";
export const BRAND_NAME_CAPITALIZED = "Anjou Édition, Pour les Nuls";
export const BRAND_NAME_UPPERCASE = "ANJOU ÉDITION, POUR LES NULS";

/**
 * Assainit et normalise toute chaîne pour éviter tout doublon syntaxique
 * du type "pour les nuls, pour les nuls".
 * @param {string} text - Chaîne à assainir
 * @returns {string} Chaîne normalisée sans duplication
 */
export function sanitizeBrandName(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;
  // Dédupliquer les répétitions successives de "pour les nuls" avec n'importe quelle ponctuation ou espacement
  cleaned = cleaned.replace(/(?:[,\s.—–-]*pour\s+les\s+nuls){2,}/gi, ', pour les nuls');
  // Normaliser "Anjou Édition pour les nuls" (avec ou sans accent, avec séparateur tiret/deux-points/espace) vers "Anjou Édition, pour les nuls"
  cleaned = cleaned.replace(/Anjou\s+[eé]dition\s*[:—–-]?\s*pour\s+les\s+nuls/gi, 'Anjou Édition, pour les nuls');
  // Éliminer toute duplication résiduelle
  cleaned = cleaned.replace(/(?:,\s*pour\s+les\s+nuls)+/gi, ', pour les nuls');
  return cleaned;
}

/**
 * Formate un libellé de marque en garantissant l'appellation officielle
 * complète et l'absence totale de redondance.
 * @param {string} input - Titre ou nom brut
 * @returns {string} Nom de marque harmonisé
 */
export function formatBrandName(input) {
  if (!input || typeof input !== 'string') return BRAND_NAME;
  const sanitized = sanitizeBrandName(input.trim());
  if (/^anjou\s+[eé]dition[.\s]*$/i.test(sanitized)) {
    return BRAND_NAME;
  }
  return sanitized;
}

export default BRAND_NAME;

