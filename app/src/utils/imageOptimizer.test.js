import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  getOptimizedImageUrl,
  getThumbnailUrl,
  generateSrcSet,
  generateWebPThumbnail,
  OptimizedImage
} from './imageOptimizer';

describe('imageOptimizer', () => {
  describe('getOptimizedImageUrl', () => {
    it('returns empty string for null, undefined, or empty inputs', () => {
      expect(getOptimizedImageUrl(null)).toBe('');
      expect(getOptimizedImageUrl(undefined)).toBe('');
      expect(getOptimizedImageUrl('')).toBe('');
    });

    it('neutralizes malicious javascript: URLs', () => {
      expect(getOptimizedImageUrl('javascript:alert(1)')).toBe('');
    });

    it('optimizes Unsplash image URLs with webp format and dimensions', () => {
      const unsplashUrl = 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=600';
      const optimized = getOptimizedImageUrl(unsplashUrl, { width: 400, height: 300, format: 'webp', quality: 75 });
      
      expect(optimized).toContain('images.unsplash.com');
      expect(optimized).toContain('fm=webp');
      expect(optimized).toContain('w=400');
      expect(optimized).toContain('h=300');
      expect(optimized).toContain('q=75');
      expect(optimized).toContain('fit=crop');
    });

    it('optimizes Picsum image URLs to WebP format', () => {
      const picsumUrl = 'https://picsum.photos/800/600?random=11';
      const optimized = getOptimizedImageUrl(picsumUrl, { width: 400, height: 300, format: 'webp' });
      
      expect(optimized).toBe('https://picsum.photos/400/300.webp?random=11');
    });

    it('optimizes Picsum ID-based image URLs to WebP format', () => {
      const picsumIdUrl = 'https://picsum.photos/id/237/800/600';
      const optimized = getOptimizedImageUrl(picsumIdUrl, { width: 400, height: 300, format: 'webp' });
      
      expect(optimized).toBe('https://picsum.photos/id/237/400/300.webp');
    });

    it('optimizes Cloudinary image URLs', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const optimized = getOptimizedImageUrl(cloudinaryUrl, { width: 400, height: 300, format: 'webp', quality: 80 });
      
      expect(optimized).toContain('/upload/f_webp,q_80,w_400,h_300,c_fill/sample.jpg');
    });

    it('appends query params to generic image URLs', () => {
      const genericUrl = 'https://example.com/image.jpg';
      const optimized = getOptimizedImageUrl(genericUrl, { width: 400, format: 'webp', quality: 80 });
      
      expect(optimized).toContain('fm=webp');
      expect(optimized).toContain('w=400');
      expect(optimized).toContain('q=80');
    });
  });

  describe('getThumbnailUrl', () => {
    it('generates a lightweight 400x300 WebP miniature by default', () => {
      const picsumUrl = 'https://picsum.photos/800/600?random=1';
      const thumb = getThumbnailUrl(picsumUrl);
      
      expect(thumb).toBe('https://picsum.photos/400/300.webp?random=1');
    });
  });

  describe('generateSrcSet', () => {
    it('returns empty string for empty URLs', () => {
      expect(generateSrcSet('')).toBe('');
      expect(generateSrcSet(null)).toBe('');
    });

    it('generates responsive srcset string for multiple widths', () => {
      const unsplashUrl = 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6';
      const srcset = generateSrcSet(unsplashUrl, [320, 640]);
      
      expect(srcset).toContain('w=320 320w');
      expect(srcset).toContain('w=640 640w');
    });
  });

  describe('generateWebPThumbnail', () => {
    it('handles image source and creates WebP thumbnail or fallback', async () => {
      const result = await generateWebPThumbnail('https://picsum.photos/400/300.webp', {
        maxWidth: 200,
        maxHeight: 150
      });
      expect(result).toBeDefined();
    });
  });

  describe('<OptimizedImage /> component', () => {
    it('renders picture and img elements with lazy loading', () => {
      render(
        <OptimizedImage
          src="https://images.unsplash.com/photo-1506880018603-83d5b814b5a6"
          alt="Test Image"
          className="test-class"
        />
      );

      const img = screen.getByAltText('Test Image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveClass('test-class');
    });

    it('renders fallback placeholder when src is missing or on image error', () => {
      const { rerender } = render(
        <OptimizedImage src="" alt="Placeholder Image" />
      );

      expect(screen.getByText('Placeholder Image')).toBeInTheDocument();

      rerender(
        <OptimizedImage src="https://example.com/broken.jpg" alt="Broken Image" />
      );
      const img = screen.getByAltText('Broken Image');
      fireEvent.error(img);

      expect(screen.getByText('Broken Image')).toBeInTheDocument();
    });

    it('renders thumbnail version when useThumbnail is true', () => {
      render(
        <OptimizedImage
          src="https://picsum.photos/800/600?random=1"
          alt="Thumb Image"
          useThumbnail={true}
        />
      );

      const img = screen.getByAltText('Thumb Image');
      expect(img.getAttribute('src')).toContain('400/300.webp');
    });
  });
});
