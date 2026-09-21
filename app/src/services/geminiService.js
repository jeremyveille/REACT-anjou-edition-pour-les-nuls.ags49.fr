/**
 * Service d'intégration avec l'API Google Gemini
 * 
 * Utilise l'API REST native de Google Generative Language pour garantir une
 * exécution légère, rapide et sans dépendances lourdes côté client, évitant ainsi
 * tout problème de chargement de chunks Webpack (ChunkLoadError).
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Récupère la clé API Gemini configurée (dans le localStorage ou les variables d'environnement)
 * @returns {string} La clé API ou chaîne vide
 */
export const getGeminiApiKey = () => {
  return (
    localStorage.getItem('gemini_api_key') ||
    process.env.REACT_APP_GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
  );
};

/**
 * Vérifie si une clé API Gemini est disponible
 * @param {string} [customKey] Clé optionnelle à vérifier
 * @returns {boolean}
 */
export const isGeminiConfigured = (customKey) => {
  const key = customKey || getGeminiApiKey();
  return Boolean(key && key.trim().length > 0);
};

/**
 * Sauvegarde la clé API Gemini dans le localStorage
 * @param {string} key 
 */
export const saveGeminiApiKey = (key) => {
  if (key && key.trim()) {
    localStorage.setItem('gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('gemini_api_key');
  }
};

/**
 * Génère du contenu texte avec le modèle Gemini
 * @param {Object} options
 * @param {string} options.prompt - Le prompt utilisateur
 * @param {string} [options.model='gemini-2.5-flash'] - Le modèle Gemini à utiliser
 * @param {string} [options.apiKey] - La clé API (si non fournie, récupérée automatiquement)
 * @param {string} [options.systemInstruction] - Instructions système optionnelles
 * @returns {Promise<{ text: string, raw: Object }>}
 */
export const generateGeminiContent = async ({
  prompt,
  model = DEFAULT_MODEL,
  apiKey = null,
  systemInstruction = null
}) => {
  const key = apiKey || getGeminiApiKey();
  if (!key) {
    throw new Error("Clé API Gemini non configurée. Veuillez renseigner votre clé dans les paramètres.");
  }

  const endpoint = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Erreur HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts;
  const text = parts && parts.length > 0 ? parts.map(p => p.text || '').join('') : '';

  return {
    text: text.trim(),
    raw: data
  };
};

/**
 * Rédige un article littéraire ou culturel assisté par IA
 * @param {Object} params
 * @param {string} params.topic
 * @param {string} params.style
 * @param {string} [params.apiKey]
 * @returns {Promise<string>}
 */
export const generateAiArticle = async ({ topic, style, apiKey }) => {
  const prompt = `Rédige un court article littéraire ou historique sur le sujet suivant lié à l'Anjou : "${topic}". Le style doit être "${style}". Écris l'article en français, avec environ 3 paragraphes et un titre captivant au début.`;
  
  const result = await generateGeminiContent({
    prompt,
    model: DEFAULT_MODEL,
    apiKey
  });

  return result.text;
};

/**
 * Génère la structure de pages d'un flipbook à partir de son titre et de sa description
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} params.fileName
 * @param {string} [params.apiKey]
 * @returns {Promise<Array<{ pageNum: number, title: string, content: string }> | null>}
 */
export const generateAiFlipbookPages = async ({ title, description, fileName, apiKey }) => {
  const prompt = `Génère un tableau JSON contenant exactement 5 pages pour un flipbook interactif sur le sujet : "${title}". La description est : "${description}".
Le fichier d'origine s'appelle : "${fileName}".
Chaque page doit avoir une propriété 'pageNum' (nombre de 1 à 5), 'title' (titre de la page court) et 'content' (contenu textuel en français sur le sujet d'environ 3 ou 4 phrases, sans sauts de ligne ni markdown).
La réponse doit être uniquement un tableau JSON valide respectant précisément cette structure, sans balise de code markdown. Exemple:
[
  {"pageNum": 1, "title": "Couverture", "content": "Titre du livre..."},
  {"pageNum": 2, "title": "Introduction", "content": "..."}
]`;

  try {
    const result = await generateGeminiContent({
      prompt,
      model: DEFAULT_MODEL,
      apiKey
    });

    const cleanText = (result.text || '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error("Échec de la génération Gemini pour les pages du flipbook:", err);
  }

  return null;
};
