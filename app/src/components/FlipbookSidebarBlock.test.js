import React from 'react';
import { render, screen } from '@testing-library/react';
import FlipbookSidebarBlock from './FlipbookSidebarBlock';

describe('FlipbookSidebarBlock component', () => {
  test('returns null when block is null or disabled', () => {
    const { container: c1 } = render(<FlipbookSidebarBlock block={null} />);
    expect(c1.firstChild).toBeNull();

    const disabledBlock = { type: 'heading', text: 'Titre masqué', enabled: false };
    const { container: c2 } = render(<FlipbookSidebarBlock block={disabledBlock} />);
    expect(c2.firstChild).toBeNull();
  });

  test('renders heading block with correct HTML tag level', () => {
    const headingBlock = {
      id: 'h1',
      type: 'heading',
      text: 'Histoire du Tuffeau',
      level: 'h2',
      enabled: true
    };

    render(<FlipbookSidebarBlock block={headingBlock} />);
    const headingEl = screen.getByRole('heading', { level: 2 });
    expect(headingEl).toBeInTheDocument();
    expect(headingEl).toHaveTextContent('Histoire du Tuffeau');
    expect(headingEl).toHaveClass('level-h2');
  });

  test('renders text block with sanitized HTML content preventing XSS', () => {
    const textBlock = {
      id: 't1',
      type: 'text',
      title: 'Guide de lecture',
      content: '<p>Bienvenue en <strong>Anjou</strong>.<script>alert("xss")</script><img src="x" onerror="evil()" /></p>',
      enabled: true
    };

    render(<FlipbookSidebarBlock block={textBlock} />);
    expect(screen.getByText('Guide de lecture')).toBeInTheDocument();
    expect(screen.getByText(/Bienvenue en/)).toBeInTheDocument();
    expect(screen.getByText('Anjou')).toBeInTheDocument();

    // Verify malicious script and event handlers were completely purged
    expect(document.querySelector('script')).toBeNull();
    const renderedHtml = document.querySelector('.flipbook-block-content')?.innerHTML || '';
    expect(renderedHtml).not.toContain('<script');
    expect(renderedHtml).not.toContain('onerror');
  });

  test('renders image block with accessible alt and caption', () => {
    const imageBlock = {
      id: 'img1',
      type: 'image',
      title: 'Vignoble de Saumur',
      imageUrl: 'https://images.unsplash.com/photo-vineyard.jpg',
      imageAlt: 'Vignes ensoleillées au pied du château',
      caption: 'Vue panoramique sur la Loire et les coteaux',
      linkUrl: 'https://anjou-tourisme.fr',
      openNewTab: true,
      enabled: true
    };

    render(<FlipbookSidebarBlock block={imageBlock} />);
    expect(screen.getByText('Vignoble de Saumur')).toBeInTheDocument();

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://images.unsplash.com/photo-vineyard.jpg');
    expect(img).toHaveAttribute('alt', 'Vignes ensoleillées au pied du château');

    expect(screen.getByText('Vue panoramique sur la Loire et les coteaux')).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://anjou-tourisme.fr');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('renders YouTube video block using responsive embed iframe', () => {
    const ytBlock = {
      id: 'v1',
      type: 'video',
      title: 'Survol d\'Angers',
      videoUrl: 'https://www.youtube.com/watch?v=bO2tOaFf-1I',
      videoSourceType: 'youtube',
      caption: 'Reportage exclusif en 4K',
      enabled: true
    };

    render(<FlipbookSidebarBlock block={ytBlock} />);
    expect(screen.getByText('Survol d\'Angers')).toBeInTheDocument();

    const iframe = screen.getByTitle('Survol d\'Angers');
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toContain('https://www.youtube.com/embed/bO2tOaFf-1I');
    expect(screen.getByText('Reportage exclusif en 4K')).toBeInTheDocument();
  });

  test('renders local / direct video block using HTML5 video tag', () => {
    const localVidBlock = {
      id: 'v2',
      type: 'video',
      title: 'Valse des Gabares',
      videoUrl: '/media/gabares_loire.mp4',
      videoSourceType: 'local',
      enabled: true
    };

    render(<FlipbookSidebarBlock block={localVidBlock} />);
    expect(screen.getByText('Valse des Gabares')).toBeInTheDocument();

    const videoEl = document.querySelector('video.flipbook-responsive-video');
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute('controls');

    const source = videoEl.querySelector('source');
    expect(source).toHaveAttribute('src', '/media/gabares_loire.mp4');
  });

  test('renders button / link block with custom style and accessible target', () => {
    const buttonBlock = {
      id: 'btn1',
      type: 'button',
      title: 'Nous rejoindre',
      buttonText: 'Visiter le musée',
      buttonUrl: '/visite',
      buttonStyle: 'gold',
      openNewTab: true,
      enabled: true
    };

    render(<FlipbookSidebarBlock block={buttonBlock} />);
    const linkBtn = screen.getByRole('button', { name: /Visiter le musée/i });
    expect(linkBtn).toBeInTheDocument();
    expect(linkBtn).toHaveAttribute('href', '/visite');
    expect(linkBtn).toHaveClass('flipbook-btn-gold');
    expect(linkBtn).toHaveAttribute('target', '_blank');
  });

  test('renders downloadable PDF document block with download button', () => {
    const pdfBlock = {
      id: 'pdf1',
      type: 'pdf',
      title: 'Fiche pédagogique',
      pdfTitle: 'Dégustation des vins d\'Anjou.pdf',
      pdfUrl: '/files/degustation.pdf',
      description: 'Document PDF officiel complet.',
      enabled: true
    };

    render(<FlipbookSidebarBlock block={pdfBlock} />);
    expect(screen.getByText('Dégustation des vins d\'Anjou.pdf')).toBeInTheDocument();
    expect(screen.getByText('Document PDF officiel complet.')).toBeInTheDocument();

    const downloadLink = screen.getByRole('link', { name: /Télécharger le document PDF/i });
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink).toHaveAttribute('href', '/files/degustation.pdf');
    expect(downloadLink).toHaveAttribute('download');
  });
});
