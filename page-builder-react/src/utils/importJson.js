import { sanitizeBuilderData } from './sanitize';

/**
 * Handles reading and parsing a JSON file.
 * @param {File} file 
 * @returns {Promise<Array>} Promise resolving to the validated, sanitized elements tree
 */
export default function importJson(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Aucun fichier fourni'));
      return;
    }

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      reject(new Error('Veuillez sélectionner un fichier JSON valide'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawData = JSON.parse(e.target.result);
        const sanitized = sanitizeBuilderData(rawData);
        resolve(sanitized);
      } catch (err) {
        reject(new Error('Erreur lors de la lecture ou du parsing du fichier JSON'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Erreur de lecture du fichier'));
    };
    reader.readAsText(file);
  });
}
