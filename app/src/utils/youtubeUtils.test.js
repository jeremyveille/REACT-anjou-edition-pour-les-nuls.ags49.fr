import {
  extractYoutubeVideoId,
  isValidYoutubeUrl,
  getYoutubeEmbedUrl,
  getYoutubeWatchUrl,
  normalizeYoutubeWatchUrl
} from './youtubeUtils';

describe('youtubeUtils Unit Tests', () => {
  const TEST_ID = 'dQw4w9WgXcQ';

  test('extracts videoId from standard watch URL', () => {
    expect(extractYoutubeVideoId(`https://www.youtube.com/watch?v=${TEST_ID}`)).toBe(TEST_ID);
    expect(extractYoutubeVideoId(`http://youtube.com/watch?v=${TEST_ID}&feature=related`)).toBe(TEST_ID);
    expect(extractYoutubeVideoId(`https://www.youtube.com/watch?ab_channel=Artist&v=${TEST_ID}&t=42s`)).toBe(TEST_ID);
  });

  test('extracts videoId from short youtu.be URL', () => {
    expect(extractYoutubeVideoId(`https://youtu.be/${TEST_ID}`)).toBe(TEST_ID);
    expect(extractYoutubeVideoId(`https://youtu.be/${TEST_ID}?t=120`)).toBe(TEST_ID);
    expect(extractYoutubeVideoId(`http://youtu.be/${TEST_ID}`)).toBe(TEST_ID);
  });

  test('extracts videoId from embed and youtube-nocookie URL', () => {
    expect(extractYoutubeVideoId(`https://www.youtube.com/embed/${TEST_ID}`)).toBe(TEST_ID);
    expect(extractYoutubeVideoId(`https://www.youtube-nocookie.com/embed/${TEST_ID}?autoplay=1`)).toBe(TEST_ID);
  });

  test('extracts videoId from shorts URL', () => {
    expect(extractYoutubeVideoId(`https://youtube.com/shorts/${TEST_ID}`)).toBe(TEST_ID);
    expect(extractYoutubeVideoId(`https://www.youtube.com/shorts/${TEST_ID}?feature=share`)).toBe(TEST_ID);
  });

  test('extracts videoId from raw 11-character ID', () => {
    expect(extractYoutubeVideoId(TEST_ID)).toBe(TEST_ID);
  });

  test('extracts videoId from mobile URL', () => {
    expect(extractYoutubeVideoId(`https://m.youtube.com/watch?v=${TEST_ID}`)).toBe(TEST_ID);
  });

  test('returns null for invalid or empty inputs', () => {
    expect(extractYoutubeVideoId('')).toBeNull();
    expect(extractYoutubeVideoId(null)).toBeNull();
    expect(extractYoutubeVideoId(undefined)).toBeNull();
    expect(extractYoutubeVideoId('https://vimeo.com/12345678')).toBeNull();
    expect(extractYoutubeVideoId('https://youtube.com/watch?v=too_short')).toBeNull();
    expect(extractYoutubeVideoId('not-a-valid-youtube-link')).toBeNull();
  });

  test('isValidYoutubeUrl verifies correctly', () => {
    expect(isValidYoutubeUrl(`https://www.youtube.com/watch?v=${TEST_ID}`)).toBe(true);
    expect(isValidYoutubeUrl(`https://youtu.be/${TEST_ID}`)).toBe(true);
    expect(isValidYoutubeUrl(`https://youtube.com/shorts/${TEST_ID}`)).toBe(true);
    expect(isValidYoutubeUrl('https://google.com')).toBe(false);
  });

  test('getYoutubeEmbedUrl creates proper embed links', () => {
    expect(getYoutubeEmbedUrl(`https://www.youtube.com/watch?v=${TEST_ID}`))
      .toBe(`https://www.youtube.com/embed/${TEST_ID}`);
    expect(getYoutubeEmbedUrl('invalid_link', 'https://fallback.com'))
      .toBe('https://fallback.com');
  });

  test('getYoutubeWatchUrl and normalizeYoutubeWatchUrl', () => {
    expect(getYoutubeWatchUrl(`https://youtu.be/${TEST_ID}`))
      .toBe(`https://www.youtube.com/watch?v=${TEST_ID}`);
    expect(normalizeYoutubeWatchUrl(`https://youtube.com/shorts/${TEST_ID}`))
      .toBe(`https://www.youtube.com/watch?v=${TEST_ID}`);
  });
});
