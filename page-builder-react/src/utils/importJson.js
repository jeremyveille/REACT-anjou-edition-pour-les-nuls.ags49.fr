import validateLayout from './validateLayout.js';

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

    if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
      reject(new Error('Veuillez sélectionner un fichier JSON valide'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawData = JSON.parse(e.target.result);
        const sanitized = validateLayout(rawData);
        resolve(sanitized);
      } catch (err) {
        reject(err instanceof SyntaxError ? new Error('Le fichier ne contient pas un JSON valide. Le contenu actuel est conservé.') : err);
      }
    };
    reader.onerror = () => {
      reject(new Error('Erreur de lecture du fichier'));
    };
    reader.readAsText(file);
  });
}
