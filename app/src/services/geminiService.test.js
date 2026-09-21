import {
  getGeminiApiKey,
  isGeminiConfigured,
  saveGeminiApiKey,
  generateGeminiContent,
  generateAiArticle,
  generateAiFlipbookPages
} from './geminiService';

describe('geminiService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getGeminiApiKey and saveGeminiApiKey', () => {
    test('retrieves empty string when no key is set', () => {
      expect(getGeminiApiKey()).toBe('');
      expect(isGeminiConfigured()).toBe(false);
    });

    test('saves and retrieves key from localStorage', () => {
      saveGeminiApiKey('test-api-key-123');
      expect(getGeminiApiKey()).toBe('test-api-key-123');
      expect(isGeminiConfigured()).toBe(true);
      expect(isGeminiConfigured('custom-key')).toBe(true);
    });

    test('removes key if empty string passed', () => {
      saveGeminiApiKey('test-key');
      expect(getGeminiApiKey()).toBe('test-key');
      saveGeminiApiKey('');
      expect(getGeminiApiKey()).toBe('');
    });
  });

  describe('generateGeminiContent', () => {
    test('throws error if no API key is configured', async () => {
      await expect(
        generateGeminiContent({ prompt: 'Bonjour' })
      ).rejects.toThrow(/Clé API Gemini non configurée/);
    });

    test('calls fetch with correct endpoint, headers and payload', async () => {
      const mockResponseData = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Réponse générée par Gemini' }]
            }
          }
        ]
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponseData)
      });

      const result = await generateGeminiContent({
        prompt: 'Présente la Loire',
        model: 'gemini-2.5-flash',
        apiKey: 'fake-key-abc'
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=fake-key-abc');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Présente la Loire' }]
          }
        ]
      });
      expect(result.text).toBe('Réponse générée par Gemini');
    });

    test('handles API errors properly', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'API key not valid' } })
      });

      await expect(
        generateGeminiContent({
          prompt: 'Test',
          apiKey: 'invalid-key'
        })
      ).rejects.toThrow('API key not valid');
    });
  });

  describe('generateAiArticle', () => {
    test('generates article using formatted prompt', async () => {
      const mockResponseData = {
        candidates: [
          {
            content: {
              parts: [{ text: '# Histoire de l\'Anjou\n\nVoici le texte.' }]
            }
          }
        ]
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponseData)
      });

      const articleText = await generateAiArticle({
        topic: 'Château d\'Angers',
        style: 'Historique',
        apiKey: 'fake-key'
      });

      expect(articleText).toContain('Histoire de l\'Anjou');
    });
  });

  describe('generateAiFlipbookPages', () => {
    test('parses and returns structured pages', async () => {
      const mockPages = [
        { pageNum: 1, title: 'Couverture', content: 'Page 1' },
        { pageNum: 2, title: 'Intro', content: 'Page 2' }
      ];

      const mockResponseData = {
        candidates: [
          {
            content: {
              parts: [{ text: '```json\n' + JSON.stringify(mockPages) + '\n```' }]
            }
          }
        ]
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponseData)
      });

      const pages = await generateAiFlipbookPages({
        title: 'Livre des Rois',
        description: 'Histoire royale',
        fileName: 'rois.pdf',
        apiKey: 'fake-key'
      });

      expect(pages).toEqual(mockPages);
    });

    test('returns null if response is invalid JSON', async () => {
      const mockResponseData = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Invalid non-json response' }]
            }
          }
        ]
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponseData)
      });

      const pages = await generateAiFlipbookPages({
        title: 'Test',
        description: 'Desc',
        fileName: 'test.pdf',
        apiKey: 'fake-key'
      });

      expect(pages).toBeNull();
    });
  });
});
