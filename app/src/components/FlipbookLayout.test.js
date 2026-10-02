import React from 'react';
import { render, screen } from '@testing-library/react';
import FlipbookLayout from './FlipbookLayout';

describe('FlipbookLayout component', () => {
  const mockChildren = <div data-testid="mock-flipbook-reader">Lecteur Flipbook Central</div>;

  test('renders 3-column layout when both left and right sidebars have active blocks', () => {
    const bookWithBothSidebars = {
      id: 'book-1',
      title: 'Guide d\'Anjou',
      leftSidebar: [
        { id: 'b1', type: 'heading', text: 'Colonne Gauche', enabled: true }
      ],
      rightSidebar: [
        { id: 'b2', type: 'text', content: '<p>Colonne Droite</p>', enabled: true }
      ]
    };

    render(
      <FlipbookLayout book={bookWithBothSidebars}>
        {mockChildren}
      </FlipbookLayout>
    );

    const layout = screen.getByTestId('flipbook-layout-wrapper');
    expect(layout).toHaveClass('has-both-sidebars');

    expect(screen.getByTestId('flipbook-left-sidebar-col')).toBeInTheDocument();
    expect(screen.getByTestId('flipbook-right-sidebar-col')).toBeInTheDocument();
    expect(screen.getByTestId('flipbook-main-stage')).toBeInTheDocument();
    expect(screen.getByTestId('mock-flipbook-reader')).toBeInTheDocument();

    expect(screen.getByText('Colonne Gauche')).toBeInTheDocument();
    expect(screen.getByText('Colonne Droite')).toBeInTheDocument();
  });

  test('adapts layout when only left sidebar is active', () => {
    const bookWithLeftOnly = {
      id: 'book-2',
      title: 'Secrets du Val',
      leftSidebar: [
        { id: 'b1', type: 'heading', text: 'Sommaire rapide', enabled: true }
      ],
      rightSidebar: []
    };

    render(
      <FlipbookLayout book={bookWithLeftOnly}>
        {mockChildren}
      </FlipbookLayout>
    );

    const layout = screen.getByTestId('flipbook-layout-wrapper');
    expect(layout).toHaveClass('has-left-only');
    expect(screen.getByTestId('flipbook-left-sidebar-col')).toBeInTheDocument();
    expect(screen.queryByTestId('flipbook-right-sidebar-col')).not.toBeInTheDocument();
  });

  test('adapts layout when only right sidebar is active', () => {
    const bookWithRightOnly = {
      id: 'book-3',
      title: 'Poésies Angevines',
      leftSidebar: [],
      rightSidebar: [
        { id: 'b2', type: 'button', buttonText: 'Acheter le livre', buttonUrl: '/boutique', enabled: true }
      ]
    };

    render(
      <FlipbookLayout book={bookWithRightOnly}>
        {mockChildren}
      </FlipbookLayout>
    );

    const layout = screen.getByTestId('flipbook-layout-wrapper');
    expect(layout).toHaveClass('has-right-only');
    expect(screen.queryByTestId('flipbook-left-sidebar-col')).not.toBeInTheDocument();
    expect(screen.getByTestId('flipbook-right-sidebar-col')).toBeInTheDocument();
  });

  test('renders full width central flipbook when no sidebars exist', () => {
    const bookWithoutSidebars = {
      id: 'book-4',
      title: 'Livre Simple',
      leftSidebar: [],
      rightSidebar: []
    };

    render(
      <FlipbookLayout book={bookWithoutSidebars}>
        {mockChildren}
      </FlipbookLayout>
    );

    const layout = screen.getByTestId('flipbook-layout-wrapper');
    expect(layout).toHaveClass('has-no-sidebars');
    expect(screen.queryByTestId('flipbook-left-sidebar-col')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flipbook-right-sidebar-col')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-flipbook-reader')).toBeInTheDocument();
  });

  test('ignores disabled blocks when determining layout columns', () => {
    const bookWithDisabledBlocks = {
      id: 'book-5',
      title: 'Livre avec blocs inactifs',
      leftSidebar: [
        { id: 'b1', type: 'heading', text: 'Bloc inactif', enabled: false }
      ],
      rightSidebar: [
        { id: 'b2', type: 'text', content: 'Bloc actif', enabled: true }
      ]
    };

    render(
      <FlipbookLayout book={bookWithDisabledBlocks}>
        {mockChildren}
      </FlipbookLayout>
    );

    const layout = screen.getByTestId('flipbook-layout-wrapper');
    expect(layout).toHaveClass('has-right-only');
    expect(screen.queryByText('Bloc inactif')).not.toBeInTheDocument();
    expect(screen.getByText('Bloc actif')).toBeInTheDocument();
  });
});
