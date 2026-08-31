import { sanitizeHtml, sanitizeUrl, escapeHtml } from './sanitize';

describe('Sanitize Utilities Security Tests', () => {
  describe('sanitizeHtml', () => {
    test('removes script tags and body scripts', () => {
      const input = '<p>Bienvenue</p><script>alert("hack")</script>';
      const result = sanitizeHtml(input);
      expect(result).toBe('<p>Bienvenue</p>');
    });

    test('strips javascript: pseudo-protocol in links and attributes', () => {
      const input = '<a href="javascript:alert(1)">Cliquez ici</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
      expect(result).toContain('Cliquez ici');
    });

    test('strips dangerous inline DOM event handlers', () => {
      const input = '<img src="valid.jpg" onerror="alert(1)" onload="evil()" />';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('onload');
    });
  });

  describe('sanitizeUrl', () => {
    test('allows safe http, https, mailto and internal URLs', () => {
      expect(sanitizeUrl('https://anjou.fr')).toBe('https://anjou.fr');
      expect(sanitizeUrl('http://example.org/page')).toBe('http://example.org/page');
      expect(sanitizeUrl('/contact')).toBe('/contact');
      expect(sanitizeUrl('#section')).toBe('#section');
      expect(sanitizeUrl('mailto:contact@anjou.fr')).toBe('mailto:contact@anjou.fr');
    });

    test('blocks and neutralizes dangerous javascript: and data: URLs', () => {
      // eslint-disable-next-line no-script-url
      expect(sanitizeUrl('javascript:alert(document.cookie)')).toBe('#');
      expect(sanitizeUrl('JAVASCRIPT:evil()')).toBe('#');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('#');
    });
  });

  describe('escapeHtml', () => {
    test('escapes HTML special characters for safe literal text interpolation', () => {
      expect(escapeHtml('<h1>Titre & "Sous-titre"</h1>')).toBe('&lt;h1&gt;Titre &amp; &quot;Sous-titre&quot;&lt;/h1&gt;');
    });
  });
});
