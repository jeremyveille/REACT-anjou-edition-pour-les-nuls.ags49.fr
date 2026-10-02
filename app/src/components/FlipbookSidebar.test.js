import React from 'react';
import { render, screen } from '@testing-library/react';
import FlipbookSidebar from './FlipbookSidebar';

describe('FlipbookSidebar component', () => {
  test('returns null when blocks array is empty or all disabled', () => {
    const { container: c1 } = render(<FlipbookSidebar position="left" blocks={[]} />);
    expect(c1.firstChild).toBeNull();

    const disabledList = [
      { id: '1', type: 'heading', text: 'Invisible', enabled: false }
    ];
    const { container: c2 } = render(<FlipbookSidebar position="right" blocks={disabledList} />);
    expect(c2.firstChild).toBeNull();
  });

  test('renders accessible aside element with correct orientation label', () => {
    const blocks = [
      { id: '1', type: 'heading', text: 'Notes de l\'auteur', enabled: true },
      { id: '2', type: 'text', content: '<p>Contenu littéraire</p>', enabled: true }
    ];

    render(
      <FlipbookSidebar 
        position="left" 
        blocks={blocks} 
        bookTitle="Secrets du Vignoble" 
      />
    );

    const aside = screen.getByRole('complementary', { name: /Barre latérale gauche d'informations : Secrets du Vignoble/i });
    expect(aside).toBeInTheDocument();
    expect(aside).toHaveClass('flipbook-sidebar-left');

    expect(screen.getByText('Notes de l\'auteur')).toBeInTheDocument();
    expect(screen.getByText('Contenu littéraire')).toBeInTheDocument();
  });
});
