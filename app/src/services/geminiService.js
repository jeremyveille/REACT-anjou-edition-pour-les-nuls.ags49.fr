import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';

export const isGeminiConfigured = () => process.env.REACT_APP_ENABLE_GEMINI === 'true';

export const clearLegacyGeminiKey = () => {
  try { localStorage.removeItem('gemini_api_key'); } catch (_) { /* Storage may be disabled. */ }
};

const errorMessages = {
  'functions/unauthenticated': 'Reconnectez-vous pour utiliser l’assistant.',
  'functions/permission-denied': 'Cette action est réservée aux administrateurs.',
  'functions/resource-exhausted': 'La limite de génération est atteinte. Réessayez plus tard.',
  'functions/unavailable': 'L’assistant est temporairement indisponible. Votre texte est conservé.',
  'functions/deadline-exceeded': 'La génération a pris trop de temps. Réessayez.',
  'functions/failed-precondition': 'L’assistant doit encore être activé par l’administrateur du site.'
};

export const generateGeminiContent = async ({ prompt, systemInstruction = '' }) => {
  clearLegacyGeminiKey();
  if (!auth?.currentUser) throw new Error('Reconnectez-vous pour utiliser l’assistant.');
  if (!isGeminiConfigured()) throw new Error('L’assistant doit encore être activé par l’administrateur du site.');
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('Saisissez un sujet avant de générer un texte.');
  if (prompt.length > 10000) throw new Error('Le sujet est trop long (10 000 caractères maximum).');
  try {
    const generate = httpsCallable(functions, 'generateContent', { timeout: 65000 });
    const result = await generate({ prompt: prompt.trim(), systemInstruction });
    if (typeof result.data?.text !== 'string' || !result.data.text.trim()) {
      throw new Error('L’assistant n’a pas renvoyé de texte. Réessayez avec un sujet plus précis.');
    }
    return { text: result.data.text.trim() };
  } catch (error) {
    throw new Error(errorMessages[error.code] || error.message || 'La génération a échoué.');
  }
};

export const generateAiArticle = async ({ topic, style }) => {
  if (!topic?.trim()) throw new Error('Saisissez le sujet de l’article.');
  const result = await generateGeminiContent({
    prompt: `Rédige un court article littéraire ou historique sur le sujet suivant lié à l'Anjou : "${topic}". Le style doit être "${style}". Écris en français, avec environ 3 paragraphes et un titre au début. Signale les incertitudes factuelles et n'invente pas de sources.`
  });
  return result.text;
};

export const generateAiFlipbookPages = async ({ title, description, fileName }) => {
  const result = await generateGeminiContent({
    prompt: `Propose un texte original pour un flipbook intitulé "${title}", décrit ainsi : "${description}". Le nom du fichier "${fileName}" est fourni à titre de contexte : tu n'as pas accès à son contenu. Renvoie uniquement un tableau JSON de cinq objets avec pageNum (1 à 5), title et content (3 à 4 phrases en français), sans Markdown.`
  });
  let pages;
  try { pages = JSON.parse(result.text.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim()); }
  catch (_) { throw new Error('La réponse de l’assistant ne contient pas des pages valides. Réessayez.'); }
  if (!Array.isArray(pages) || pages.length !== 5 || pages.some((page, index) =>
    page?.pageNum !== index + 1 || typeof page.title !== 'string' || !page.title.trim() ||
    typeof page.content !== 'string' || !page.content.trim())) {
    throw new Error('La réponse doit contenir cinq pages complètes et numérotées.');
  }
  return pages.map(({ pageNum, title: pageTitle, content }) => ({ pageNum, title: pageTitle, content }));
};
