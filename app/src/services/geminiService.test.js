import { httpsCallable } from 'firebase/functions';
import { auth } from '../firebase';
import { isGeminiConfigured, clearLegacyGeminiKey, generateGeminiContent, generateAiArticle, generateAiFlipbookPages } from './geminiService';
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('../firebase', () => ({ auth: { currentUser: { uid: 'admin' } }, functions: {} }));
const generate = jest.fn();
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  process.env.REACT_APP_ENABLE_GEMINI = 'true';
  auth.currentUser = { uid: 'admin' };
  httpsCallable.mockReturnValue(generate);
  generate.mockResolvedValue({ data: { text: 'Texte généré.' } });
});
afterAll(() => { delete process.env.REACT_APP_ENABLE_GEMINI; });
test('service availability uses public flag, never a stored secret', () => {
  process.env.REACT_APP_ENABLE_GEMINI = 'false';
  localStorage.setItem('gemini_api_key', 'old-key');
  expect(isGeminiConfigured()).toBe(false);
  clearLegacyGeminiKey();
  expect(localStorage.getItem('gemini_api_key')).toBeNull();
});
test('calls authenticated server and does not transmit client keys', async () => {
  localStorage.setItem('gemini_api_key', 'old-key');
  expect(await generateGeminiContent({ prompt: ' Loire ', apiKey: 'unsafe' })).toEqual({ text: 'Texte généré.' });
  expect(httpsCallable).toHaveBeenCalledWith({}, 'generateContent', { timeout: 65000 });
  expect(generate).toHaveBeenCalledWith({ prompt: 'Loire', systemInstruction: '' });
  expect(localStorage.getItem('gemini_api_key')).toBeNull();
});
test('rejects unauthenticated generation', async () => {
  auth.currentUser = null;
  await expect(generateGeminiContent({ prompt: 'Loire' })).rejects.toThrow(/Reconnectez/);
  expect(generate).not.toHaveBeenCalled();
});
test('rejects disabled service or empty prompt without request', async () => {
  process.env.REACT_APP_ENABLE_GEMINI = 'false';
  await expect(generateGeminiContent({ prompt: 'Loire' })).rejects.toThrow(/activé/);
  process.env.REACT_APP_ENABLE_GEMINI = 'true';
  await expect(generateGeminiContent({ prompt: ' ' })).rejects.toThrow(/Saisissez/);
  expect(generate).not.toHaveBeenCalled();
});
test('provides useful quota errors', async () => {
  generate.mockRejectedValueOnce({ code: 'functions/resource-exhausted' });
  await expect(generateGeminiContent({ prompt: 'Loire' })).rejects.toThrow(/limite/);
});
test('does not announce success for empty responses', async () => {
  generate.mockResolvedValueOnce({ data: { text: '' } });
  await expect(generateGeminiContent({ prompt: 'Loire' })).rejects.toThrow(/renvoyé de texte/);
});
test('article generation includes topic and style', async () => {
  await expect(generateAiArticle({ topic: 'Loire', style: 'Historique' })).resolves.toBe('Texte généré.');
  expect(generate.mock.calls[0][0].prompt).toContain('Loire');
});
test('validates generated pages and propagates malformed responses', async () => {
  const pages = Array.from({ length: 5 }, (_, i) => ({ pageNum: i + 1, title: 'Page', content: 'Texte.' }));
  generate.mockResolvedValueOnce({ data: { text: JSON.stringify(pages) } });
  expect(await generateAiFlipbookPages({ title: 'Anjou' })).toEqual(pages);
  generate.mockResolvedValueOnce({ data: { text: 'Invalid JSON' } });
  await expect(generateAiFlipbookPages({ title: 'Anjou' })).rejects.toThrow(/pages valides/);
  generate.mockResolvedValueOnce({ data: { text: JSON.stringify([{ ...pages[0], pageNum: 3 }]) } });
  await expect(generateAiFlipbookPages({ title: 'Anjou' })).rejects.toThrow(/cinq pages/);
});
