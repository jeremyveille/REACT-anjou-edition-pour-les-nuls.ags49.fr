import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

    const ratioContainer = document.querySelector('.flipbook-image-ratio-container');
    expect(ratioContainer).toBeInTheDocument();
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
    expect(iframe.getAttribute('allow')).toContain('fullscreen');
    expect(iframe).toHaveAttribute('allowFullScreen');
    expect(screen.getByText('Reportage exclusif en 4K')).toBeInTheDocument();

    const fsBtn = screen.getByTestId('video-fullscreen-btn');
    expect(fsBtn).toBeInTheDocument();

    // 1er clic : ouverture en plein écran -> le bouton disparaît immédiatement du DOM
    fireEvent.click(fsBtn);
    expect(screen.queryByTestId('video-fullscreen-btn')).toBeNull();
    const videoContainer = document.querySelector('.flipbook-video-ratio-container');
    expect(videoContainer).toHaveClass('ae-video-is-fullscreen');

    // Touche Échap : retour à l'affichage normal -> le bouton réapparaît automatiquement
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(videoContainer).not.toHaveClass('ae-video-is-fullscreen');
    const restoredBtn = screen.getByTestId('video-fullscreen-btn');
    expect(restoredBtn).toBeInTheDocument();

    // Second cycle : ouverture puis sortie via l'événement fullscreenchange du lecteur
    fireEvent.click(restoredBtn);
    expect(screen.queryByTestId('video-fullscreen-btn')).toBeNull();
    expect(videoContainer).toHaveClass('ae-video-is-fullscreen');

    fireEvent(document, new Event('fullscreenchange'));
    expect(videoContainer).not.toHaveClass('ae-video-is-fullscreen');
    expect(screen.getByTestId('video-fullscreen-btn')).toBeInTheDocument();
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

  test('applies custom border and shadow CSS styles to sidebar card', () => {
    const styledBlock = {
      id: 'styled-1',
      type: 'text',
      title: 'Bloc Stylé',
      content: 'Contenu avec contour et ombre',
      enabled: true,
      style: {
        borderWidth: 3,
        borderStyle: 'dashed',
        borderColor: '#1e3a8a',
        borderRadius: 18,
        shadowEnabled: true,
        shadowOffsetX: 2,
        shadowOffsetY: 8,
        shadowBlur: 16,
        shadowSpread: -2,
        shadowOpacity: 15,
        shadowColor: '#0f172a',
        shadowInset: false
      }
    };

    const { container } = render(<FlipbookSidebarBlock block={styledBlock} />);
    const card = container.querySelector('.flipbook-sidebar-card');
    expect(card).toBeInTheDocument();
    expect(card.style.borderWidth).toBe('3px');
    expect(card.style.borderStyle).toBe('dashed');
    expect(card.style.borderColor).toBe('#1e3a8a');
    expect(card.style.borderRadius).toBe('18px');
    expect(card.style.boxShadow).toContain('2px 8px 16px -2px');
    expect(card.style.boxShadow).toContain('rgba(15, 23, 42, 0.15)');
  });

  test('media blocks CSS rules enforce full width, zero internal padding, auto height and object-fit contain without cropping across images and videos', () => {
    const fs = require('fs');
    const path = require('path');
    const sidebarsCss = fs.readFileSync(
      path.resolve(__dirname, '../styles/flipbook-sidebars.css'),
      'utf8'
    );
    const appCss = fs.readFileSync(
      path.resolve(__dirname, '../App.css'),
      'utf8'
    );

    expect(sidebarsCss).toMatch(/\.flipbook-sidebar-card\.flipbook-block-image,\s*\.flipbook-sidebar-card\.flipbook-block-video\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*auto;[\s\S]*?padding:\s*0;[\s\S]*?overflow:\s*hidden;[\s\S]*?box-sizing:\s*border-box;/);
    expect(sidebarsCss).toMatch(/\.flipbook-responsive-img\s*\{[\s\S]*?display:\s*block;[\s\S]*?width:\s*100%;[\s\S]*?height:\s*auto;[\s\S]*?max-width:\s*100%;[\s\S]*?object-fit:\s*contain;[\s\S]*?object-position:\s*center;/);
    expect(sidebarsCss).toMatch(/\.flipbook-responsive-video\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*auto;[\s\S]*?max-width:\s*100%;[\s\S]*?object-fit:\s*contain;/);
    expect(appCss).toMatch(/\.ae-media-container[\s\S]*?\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?height:\s*auto;[\s\S]*?padding:\s*0;[\s\S]*?overflow:\s*hidden;[\s\S]*?box-sizing:\s*border-box;/);
    expect(appCss).toMatch(/\.ae-media-container--video\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*9;/);
  });
});


