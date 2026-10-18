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

  test('resolves and displays global sidebar when sidebarMode is "global"', () => {
    const globalSidebarMock = {
      name: 'Modèle global — Anjou Édition',
      styles: {
        leftWidth: 25,
        rightWidth: 22,
        visibility: {
          left: { desktop: true, tablet: true, mobile: false },
          right: { desktop: true, tablet: false, mobile: false }
        }
      },
      leftSidebar: [
        { id: 'gb1', type: 'heading', text: 'Titre Global Gauche', enabled: true }
      ],
      rightSidebar: [
        { id: 'gb2', type: 'text', content: '<p>Contenu Global Droit</p>', enabled: true }
      ]
    };

    const bookWithGlobalMode = {
      id: 'book-global',
      title: 'Livre Global',
      sidebarMode: 'global',
      leftSidebar: [], // Empty individual sidebars
      rightSidebar: []
    };

    render(
      <FlipbookLayout book={bookWithGlobalMode} globalSidebar={globalSidebarMock}>
        {mockChildren}
      </FlipbookLayout>
    );

    const layout = screen.getByTestId('flipbook-layout-wrapper');
    expect(layout).toHaveAttribute('data-sidebar-mode', 'global');
    expect(layout).toHaveClass('has-both-sidebars');

    expect(screen.getByText('Titre Global Gauche')).toBeInTheDocument();
    expect(screen.getByText('Contenu Global Droit')).toBeInTheDocument();

    const leftCol = screen.getByTestId('flipbook-left-sidebar-col');
    expect(leftCol).toHaveClass('ae-hide-mobile');
    expect(leftCol).not.toHaveClass('ae-hide-tablet');

    const rightCol = screen.getByTestId('flipbook-right-sidebar-col');
    expect(rightCol).toHaveClass('ae-hide-mobile');
    expect(rightCol).toHaveClass('ae-hide-tablet');
  });

  test('prioritizes custom individual sidebar when sidebarMode is "custom"', () => {
    const globalSidebarMock = {
      leftSidebar: [{ id: 'g1', type: 'heading', text: 'Titre Global', enabled: true }],
      rightSidebar: []
    };

    const bookCustom = {
      id: 'book-custom',
      title: 'Livre Spécifique',
      sidebarMode: 'custom',
      leftSidebar: [{ id: 'c1', type: 'heading', text: 'Titre Spécifique Individuel', enabled: true }],
      rightSidebar: []
    };

    render(
      <FlipbookLayout book={bookCustom} globalSidebar={globalSidebarMock}>
        {mockChildren}
      </FlipbookLayout>
    );

    const layout = screen.getByTestId('flipbook-layout-wrapper');
    expect(layout).toHaveAttribute('data-sidebar-mode', 'custom');
    expect(screen.getByText('Titre Spécifique Individuel')).toBeInTheDocument();
    expect(screen.queryByText('Titre Global')).not.toBeInTheDocument();
  });

  test('resolves right sidebar from aliases (rightBlocks, sidebarRight)', () => {
    const bookWithAlias = {
      id: 'book-alias',
      title: 'Livre avec Alias',
      leftSidebar: [{ id: 'l1', type: 'heading', text: 'Titre Gauche Standard', enabled: true }],
      rightBlocks: [{ id: 'r1', type: 'heading', text: 'Titre Droit via rightBlocks', enabled: true }]
    };

    render(
      <FlipbookLayout book={bookWithAlias}>
        {mockChildren}
      </FlipbookLayout>
    );

    const layout = screen.getByTestId('flipbook-layout-wrapper');
    expect(layout).toHaveClass('has-both-sidebars');
    expect(screen.getByTestId('flipbook-left-sidebar-col')).toBeInTheDocument();
    expect(screen.getByTestId('flipbook-right-sidebar-col')).toBeInTheDocument();
    expect(screen.getByText('Titre Droit via rightBlocks')).toBeInTheDocument();
  });

  test('inherits right sidebar from global template when flipbook only defines leftSidebar', () => {
    const globalSidebarMock = {
      leftSidebar: [{ id: 'g_left', type: 'heading', text: 'Global Gauche', enabled: true }],
      rightSidebar: [{ id: 'g_right', type: 'text', content: '<p>Global Droit Hérité</p>', enabled: true }]
    };

    const bookLeftOnlyNoRight = {
      id: 'book-half-custom',
      title: 'Livre avec seulement barre gauche définie',
      leftSidebar: [{ id: 'l_custom', type: 'heading', text: 'Gauche Custom', enabled: true }]
      // rightSidebar is undefined -> should inherit from global
    };

    render(
      <FlipbookLayout book={bookLeftOnlyNoRight} globalSidebar={globalSidebarMock}>
        {mockChildren}
      </FlipbookLayout>
    );

    const layout = screen.getByTestId('flipbook-layout-wrapper');
    expect(layout).toHaveClass('has-both-sidebars');
    expect(screen.getByText('Gauche Custom')).toBeInTheDocument();
    expect(screen.getByText('Global Droit Hérité')).toBeInTheDocument();
  });
});
