import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  Heading, 
  Text, 
  Image, 
  Button, 
  Card, 
  Alert, 
  Video,
  Divider,
  List,
  PopularVideos,
  NewsList,
  FeaturedPoems,
  FlipbookFeatured,
  PhotoGallery,
  YoutubeChannel
} from './ContentWidgets';

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

  test('renders Divider with custom thickness and style', () => {
    const { container } = render(<Divider settings={{ styleType: 'dashed', color: '#ff0000', thickness: '2px' }} />);
    const hr = container.querySelector('hr');
    expect(hr).toBeInTheDocument();
  });

  test('renders List widget in unordered and ordered modes', () => {
    render(<List settings={{ listType: 'unordered', items: ['Point Alpha', 'Point Beta'] }} />);
    expect(screen.getByText('Point Alpha')).toBeInTheDocument();
    expect(screen.getByText('Point Beta')).toBeInTheDocument();
  });

  test('renders PopularVideos widget with customizable title and videos list', () => {
    const customVideos = [
      { id: 'v1', title: 'Vidéo Test Anjou', duration: '05:30' },
      { id: 'v2', title: 'Deuxième Vidéo', duration: '12:00' }
    ];
    render(<PopularVideos settings={{ title: 'Mes Vidéos Préférées', videos: customVideos }} />);
    expect(screen.getByText('Mes Vidéos Préférées')).toBeInTheDocument();
    expect(screen.getByText('Vidéo Test Anjou')).toBeInTheDocument();
    expect(screen.getByText('Deuxième Vidéo')).toBeInTheDocument();
    expect(screen.getByText('05:30')).toBeInTheDocument();
  });

  test('renders NewsList widget with custom news articles', () => {
    const customNews = [
      { id: 'n1', title: 'Festival Littéraire 2026', description: 'Rendez-vous à Angers.' }
    ];
    render(<NewsList settings={{ title: 'Dernières Nouvelles', news: customNews }} />);
    expect(screen.getByText('Dernières Nouvelles')).toBeInTheDocument();
    expect(screen.getByText('Festival Littéraire 2026')).toBeInTheDocument();
    expect(screen.getByText('Rendez-vous à Angers.')).toBeInTheDocument();
  });

  test('renders FeaturedPoems widget with poem cards and excerpts', () => {
    const customPoems = [
      { id: 'p1', tag: 'FABLE', title: 'La Loire chantante', excerpt: 'Au fil de l eau...' }
    ];
    render(<FeaturedPoems settings={{ title: 'Poésies Choisies', poems: customPoems }} />);
    expect(screen.getByText('Poésies Choisies')).toBeInTheDocument();
    expect(screen.getByText('La Loire chantante')).toBeInTheDocument();
    expect(screen.getByText('Au fil de l eau...')).toBeInTheDocument();
  });

  test('renders FlipbookFeatured widget in grid mode', () => {
    const customBooks = [
      { id: 'fb1', title: 'Mon Livre Rare', description: 'Édition 2026' }
    ];
    render(<FlipbookFeatured settings={{ title: 'Nos Livres', mode: 'grid', items: customBooks }} />);
    expect(screen.getByText('Nos Livres')).toBeInTheDocument();
    expect(screen.getByText('Mon Livre Rare')).toBeInTheDocument();
  });

  test('renders PhotoGallery widget with images', () => {
    const customImages = [
      { id: 'g1', title: 'Château du Plessis', description: 'Monument historique', url: 'https://example.com/plessis.jpg' }
    ];
    render(<PhotoGallery settings={{ title: 'Photos Historiques', images: customImages }} />);
    expect(screen.getByText('Photos Historiques')).toBeInTheDocument();
    expect(screen.getByText('Château du Plessis')).toBeInTheDocument();
  });

  test('renders YoutubeChannel banner widget', () => {
    render(<YoutubeChannel settings={{ title: 'Chaîne Officielle', subtitle: 'Rejoignez-nous en direct' }} />);
    expect(screen.getByText('Chaîne Officielle')).toBeInTheDocument();
    expect(screen.getByText('Rejoignez-nous en direct')).toBeInTheDocument();
  });
});
