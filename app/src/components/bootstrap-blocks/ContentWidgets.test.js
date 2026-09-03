import React from 'react';
import { render, screen } from '@testing-library/react';
import { Heading, Text, Image, Button, Card, Alert, Video } from './ContentWidgets';

describe('ContentWidgets component tests', () => {
  test('renders Heading with custom level and content', () => {
    render(<Heading settings={{ level: 'h3', content: 'Sous-titre Personnalisé' }} />);
    const headingEl = screen.getByRole('heading', { level: 3, name: 'Sous-titre Personnalisé' });
    expect(headingEl).toBeInTheDocument();
  });

  test('renders Text widget with HTML sanitization', () => {
    const malicious = 'Texte normal <script>alert("hack")</script><strong>Gras</strong>';
    render(<Text settings={{ content: malicious }} />);
    expect(screen.getByText('Texte normal')).toBeInTheDocument();
    expect(screen.getByText('Gras')).toBeInTheDocument();
    // Verify script tag is sanitized
    expect(document.querySelector('script')).toBeNull();
  });

  test('renders Image with alt text and secure URL', () => {
    render(<Image settings={{ src: 'https://example.com/photo.jpg', alt: 'Château d Angers' }} />);
    const img = screen.getByAltText('Château d Angers');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe('https://example.com/photo.jpg');
  });

  test('renders Button with secure link and text', () => {
    render(<Button settings={{ text: 'Découvrir', link: 'https://anjou-edition.fr', buttonStyle: 'btn-primary' }} />);
    const link = screen.getByRole('link', { name: /Découvrir/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('https://anjou-edition.fr');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('renders Alert widget with alert role', () => {
    render(<Alert settings={{ type: 'alert-success', content: 'Opération réussie avec succès !' }} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Opération réussie avec succès !');
  });

  test('renders Card with title and text', () => {
    render(<Card settings={{ title: 'Titre Carte', text: 'Description de la carte' }} />);
    expect(screen.getByText('Titre Carte')).toBeInTheDocument();
    expect(screen.getByText('Description de la carte')).toBeInTheDocument();
  });

  test('renders Video iframe with converted embed URL', () => {
    render(<Video settings={{ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }} />);
    const iframe = screen.getByTitle('Widget Vidéo');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });
});
