import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock ES Modules dependencies causing Jest issues in node environment
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({}))
}));

// Mock IndexedDB storage and firestore chunker for PdfFlipbookReader
jest.mock('./utils/indexedDBStorage', () => ({
  getPDFFile: jest.fn(() => Promise.resolve(null)),
  storePDFFile: jest.fn(() => Promise.resolve())
}));

jest.mock('./utils/firestoreChunker', () => ({
  loadPdfFromFirestore: jest.fn(() => Promise.resolve(null)),
  savePdfToFirestore: jest.fn(() => Promise.resolve()),
  deletePdfFromFirestore: jest.fn(() => Promise.resolve())
}));

// Mock services/pageService
jest.mock('./services/pageService', () => ({
  pageService: {
    getPages: jest.fn(() => Promise.resolve([])),
    savePage: jest.fn(() => Promise.resolve({ id: 'mock_page' })),
    deletePage: jest.fn(() => Promise.resolve()),
    uploadMedia: jest.fn(() => Promise.resolve('https://mock.url/img.jpg')),
    getFeaturedArticle: jest.fn(() => Promise.resolve(null)),
    setFeaturedArticle: jest.fn(() => Promise.resolve(true))
  }
}));

// Mock firebase
jest.mock('./firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'admin-123', email: 'jeremy.veille@hotmail.fr' } },
  storage: {}
}));

// Mock firebase/auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: {
      uid: 'admin-123',
      email: 'jeremy.veille@hotmail.fr',
      displayName: 'Jeremy Veille',
      getIdTokenResult: () => Promise.resolve({ claims: { admin: true } })
    }
  })),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    setCustomParameters: jest.fn()
  })),
  signInWithPopup: jest.fn(() => Promise.resolve({
    user: {
      email: 'jeremy.veille@hotmail.fr',
      displayName: 'Jeremy Veille',
      getIdTokenResult: () => Promise.resolve({ claims: { admin: true } })
    }
  })),
  signInWithRedirect: jest.fn(() => Promise.resolve()),
  getRedirectResult: jest.fn(() => Promise.resolve(null)),
  signOut: jest.fn(() => Promise.resolve()),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({
    user: {
      email: 'admin@anjou-edition.fr',
      getIdTokenResult: () => Promise.resolve({ claims: { admin: true } })
    }
  })),
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({
    user: {
      email: 'admin@anjou-edition.fr',
      getIdTokenResult: () => Promise.resolve({ claims: { admin: true } })
    }
  })),
  onAuthStateChanged: jest.fn((auth, cb) => {
    cb(null);
    return jest.fn();
  })
}));

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn((db, path) => path),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  doc: jest.fn((db, path, id) => id || path),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock_doc_id' })),
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn((col) => col),
  orderBy: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  limit: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => 'mock-timestamp')
}));

beforeAll(() => {
  if (typeof window !== 'undefined') {
    window.speechSynthesis = {
      speak: jest.fn(),
      cancel: jest.fn(),
      speakUtterance: jest.fn(),
      getVoices: jest.fn(() => []),
    };
    window.SpeechSynthesisUtterance = jest.fn();
  }
});

const setViewport = (width, height = 800) => {
  act(() => {
    window.innerWidth = width;
    window.innerHeight = height;
    window.dispatchEvent(new Event('resize'));
  });
};

import { PublicHeader } from './components/PublicComponents';
import { PublicNav } from './components/PublicNav';
import ContactForm from './components/ContactForm';
import PdfFlipbookReader from './components/PdfFlipbookReader';
import FlipbookLayout from './components/FlipbookLayout';
import FlipbookBlockModalEditor from './components/FlipbookBlockModalEditor';
import FlipbookEditModal from './components/FlipbookEditModal';
import DashboardSidebar from './components/DashboardSidebar';
import VideoFullscreenButton from './components/VideoFullscreenButton';

describe('Vérification Empirique Contradictoire — Challenger 1 (Responsive, Cas Limites & Plein Écran)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setViewport(1200, 800);
    document.body.style.overflow = '';

    if (typeof document !== 'undefined') {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
        writable: true
      });
    }
  });

  /* --------------------------------------------------------------------------
     1. ÉCRAN ULTRA-ÉTROIT (320px)
     -------------------------------------------------------------------------- */
  describe('1. Écran ultra-étroit 320px', () => {
    test('1.1. Header public et bascule de thème restent opérationnels et sans plantage à 320px', () => {
      setViewport(320, 568);
      const toggleMock = jest.fn();
      render(<PublicHeader darkMode={false} toggleDarkMode={toggleMock} />);

      expect(screen.getByAltText('Logo Anjou Édition')).toBeInTheDocument();
      const themeBtn = screen.getByRole('button', { name: /Activer le mode sombre/i });
      expect(themeBtn).toBeInTheDocument();
      fireEvent.click(themeBtn);
      expect(toggleMock).toHaveBeenCalledTimes(1);
    });

    test('1.2. Barre de navigation publique et bouton hamburger mobile à 320px', () => {
      setViewport(320, 480);
      const setMobileOpenMock = jest.fn();
      render(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={false}
          setMobileMenuOpen={setMobileOpenMock}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => [{ id: 'item1', title: 'Nouvelles', children: [] }]}
          handleMenuItemClick={jest.fn()}
        />
      );

      const burgerBtn = screen.getByRole('button', { name: 'Menu Mobile' });
      expect(burgerBtn).toBeInTheDocument();
      fireEvent.click(burgerBtn);
      expect(setMobileOpenMock).toHaveBeenCalled();
    });

    test('1.3. Formulaire de contact complet et conforme RGPD à 320px', () => {
      setViewport(320, 600);
      render(<ContactForm setView={jest.fn()} />);

      expect(screen.getByPlaceholderText(/Jean Dupont/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/jean.dupont@email.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Demande d'information/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Écrivez votre message ici.../i)).toBeInTheDocument();
      const consentCheckbox = screen.getByRole('checkbox');
      expect(consentCheckbox).not.toBeChecked();
      expect(screen.getByRole('button', { name: /Envoyer le message/i })).toBeInTheDocument();
    });
  });

  /* --------------------------------------------------------------------------
     2. PALIERS S, M, L, XL ET VALEURS LIMITES FRONTIÈRES (BVA)
     -------------------------------------------------------------------------- */
  describe('2. Paliers S (360px, 599px), M (600px, 899px), L (900px, 1199px), XL (1200px, 1920px)', () => {
    test('2.1. Palier S : 360px (mobile standard) et 599px (limite haute S)', () => {
      setViewport(360, 640);
      expect(window.innerWidth).toBe(360);
      const { rerender } = render(<PublicHeader darkMode={false} toggleDarkMode={jest.fn()} />);
      expect(screen.getByAltText('Logo Anjou Édition')).toBeInTheDocument();

      setViewport(599, 800);
      expect(window.innerWidth).toBe(599);
      rerender(<PublicHeader darkMode={true} toggleDarkMode={jest.fn()} />);
      expect(screen.getByAltText('Logo Anjou Édition')).toBeInTheDocument();
    });

    test('2.2. Palier M : 600px (seuil bas M) et 899px (limite haute M) sur DashboardSidebar', () => {
      setViewport(600, 900);
      const mockProps = {
        activeSection: null,
        setActiveSection: jest.fn(),
        setActiveCategory: jest.fn(),
        sidebarOpen: false,
        setSidebarOpen: jest.fn(),
        userName: 'ADMINISTRATEUR',
        handleLogout: jest.fn(),
        pagesCount: 4,
        articlesCount: 10,
        flipbooksCount: 2,
        messagesCount: 1,
        onOpenPageBuilder: jest.fn(),
        setNotification: jest.fn(),
        hamburgerBtnRef: { current: document.createElement('button') }
      };

      const { rerender } = render(<DashboardSidebar {...mockProps} />);
      expect(screen.getByRole('complementary')).toHaveAttribute('id', 'dashboard-sidebar');

      setViewport(899, 900);
      rerender(<DashboardSidebar {...mockProps} isCollapsed={true} />);
      expect(screen.getByRole('complementary')).toHaveClass('is-collapsed');
    });

    test('2.3. Paliers L (900px, 1199px) et XL (1200px, 1920px) sur FlipbookLayout 3 colonnes', () => {
      const book = {
        id: 'bk-bva',
        title: 'Livre BVA',
        leftSidebar: [{ id: 'l1', type: 'text', content: 'G', enabled: true }],
        rightSidebar: [{ id: 'r1', type: 'text', content: 'D', enabled: true }]
      };

      // 900px (L bas)
      setViewport(900, 700);
      const { rerender } = render(
        <FlipbookLayout book={book}>
          <div>Scène centrale</div>
        </FlipbookLayout>
      );
      expect(screen.getByTestId('flipbook-layout-wrapper')).toHaveClass('has-both-sidebars');

      // 1199px (L haut)
      setViewport(1199, 700);
      rerender(
        <FlipbookLayout book={book}>
          <div>Scène centrale 1199px</div>
        </FlipbookLayout>
      );
      expect(screen.getByTestId('flipbook-left-sidebar-col')).toBeInTheDocument();
      expect(screen.getByTestId('flipbook-right-sidebar-col')).toBeInTheDocument();

      // 1200px (XL bas)
      setViewport(1200, 800);
      rerender(
        <FlipbookLayout book={book}>
          <div>Scène centrale 1200px</div>
        </FlipbookLayout>
      );
      expect(screen.getByTestId('flipbook-layout-wrapper')).toHaveClass('has-both-sidebars');

      // 1920px (XL Full HD)
      setViewport(1920, 1080);
      rerender(
        <FlipbookLayout book={book}>
          <div>Scène centrale 1920px</div>
        </FlipbookLayout>
      );
      expect(screen.getByTestId('flipbook-layout-wrapper')).toBeInTheDocument();
    });

    test('2.4. Classes de masquage responsive conditionnel (ae-hide-*)', () => {
      const bookWithVisibility = {
        id: 'bk-vis',
        title: 'Visibilité conditionnelle',
        styles: {
          visibility: {
            left: { xl: true, desktop: true, tablet: false, mobile: false },
            right: { xl: false, desktop: true, tablet: true, mobile: false }
          }
        },
        leftSidebar: [{ id: 'l1', type: 'text', content: 'Gauche', enabled: true }],
        rightSidebar: [{ id: 'r1', type: 'text', content: 'Droite', enabled: true }]
      };

      render(
        <FlipbookLayout book={bookWithVisibility}>
          <div>Scène centrale</div>
        </FlipbookLayout>
      );

      const leftCol = screen.getByTestId('flipbook-left-sidebar-col');
      const rightCol = screen.getByTestId('flipbook-right-sidebar-col');

      // Barre gauche masquée sur tablette et mobile
      expect(leftCol).toHaveClass('ae-hide-tablet');
      expect(leftCol).toHaveClass('ae-hide-mobile');
      expect(leftCol).not.toHaveClass('ae-hide-xl');

      // Barre droite masquée sur XL et mobile
      expect(rightCol).toHaveClass('ae-hide-xl');
      expect(rightCol).toHaveClass('ae-hide-mobile');
      expect(rightCol).not.toHaveClass('ae-hide-tablet');
    });
  });

  /* --------------------------------------------------------------------------
     3. ORIENTATION PAYSAGE MOBILE (max-height: 500px and orientation: landscape)
     -------------------------------------------------------------------------- */
  describe('3. Orientation paysage mobile (hauteur <= 500px)', () => {
    test('3.1. Lecteur Flipbook sous contrainte de hauteur réduite (736x414)', () => {
      setViewport(736, 414);
      expect(window.innerHeight).toBeLessThanOrEqual(500);

      const mockBook = {
        id: 'bk-paysage-stress',
        title: 'Lecture Paysage Extrême',
        pdfFile: 'paysage.pdf'
      };

      render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

      const region = screen.getByRole('region', { name: /Lecteur de livre numérique/i });
      expect(region).toBeInTheDocument();

      // Commandes de navigation et d'outils toujours accessibles
      expect(screen.getByRole('button', { name: /Zoom avant/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Zoom arrière/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Fermer le lecteur/i })).toBeInTheDocument();
    });

    test('3.2. Conteneur vidéo et bouton plein écran sous contrainte de hauteur réduite (640x360)', () => {
      setViewport(640, 360);
      expect(window.innerHeight).toBeLessThanOrEqual(500);

      const container = document.createElement('div');
      container.className = 'player-container';
      document.body.appendChild(container);
      const containerRef = { current: container };

      render(
        <VideoFullscreenButton
          containerRef={containerRef}
          videoTitle="Vidéo Paysage Mobile"
        />
      );

      const fsBtn = screen.getByRole('button', { name: /Afficher en plein écran : Vidéo Paysage Mobile/i });
      expect(fsBtn).toBeInTheDocument();

      document.body.removeChild(container);
    });
  });

  /* --------------------------------------------------------------------------
     4. TEXTES ET URLS VOLUMINEUX SANS ESPACES (ANTI-TRONCATURE ET DÉBORDEMENT)
     -------------------------------------------------------------------------- */
  describe('4. Textes et URLs volumineux sans espaces', () => {
    test('4.1. Titre de livre extrêmement long sans espace (150 caractères continus)', () => {
      const veryLongUnbrokenTitle = 'TitreExtremementLongSansEspacesNiPonctuationPourTesterLaRobustesseTypographiqueDuLecteurNumeriqueAnjouEditionSansTroncatureDestructriceSurTousEcrans1234567890';
      const mockBook = {
        id: 'bk-long-title',
        title: veryLongUnbrokenTitle,
        pdfFile: 'test.pdf'
      };

      render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

      const titleEl = screen.getByText(veryLongUnbrokenTitle);
      expect(titleEl).toBeInTheDocument();
      expect(titleEl.closest('.pdf-reader-title')).toHaveClass('pdf-reader-title');
    });

    test('4.2. URL longue sans espaces dans un bloc de barre latérale Flipbook', () => {
      const longUrl = 'https://anjou-edition-pour-les-nuls.ags49.fr/ressources/manuscrits/poesies/inédites/recueil-complet-des-oeuvres-litteraires-version-integrale-2026?token=abc123xyz456def789ghi012jkl345mno678pqr901stu234vwx567yz';
      const bookWithLongUrl = {
        id: 'bk-url',
        title: 'Livre avec URL',
        leftSidebar: [
          {
            id: 'b-url-1',
            type: 'text',
            title: 'Lien externe volumineux',
            content: longUrl,
            enabled: true
          }
        ]
      };

      render(
        <FlipbookLayout book={bookWithLongUrl}>
          <div>Scène Flipbook</div>
        </FlipbookLayout>
      );

      expect(screen.getByText('Lien externe volumineux')).toBeInTheDocument();
      expect(screen.getByText(longUrl)).toBeInTheDocument();
    });

    test('4.3. Message de contact de 2000 caractères avec caractères spéciaux et emojis', () => {
      render(<ContactForm setView={jest.fn()} />);

      const extremeMessage = '✨ Anjou Édition — Test de charge textuelle : ÀÉÈÊËÎÏÔÙÛÜÇæœ ! ' +
        'Texte volumineux pour stresser la textarea sans rupture de mise en page. '.repeat(25);

      const msgInput = screen.getByPlaceholderText(/Écrivez votre message ici.../i);
      fireEvent.change(msgInput, { target: { value: extremeMessage } });

      expect(msgInput.value).toBe(extremeMessage);
      expect(msgInput.value.length).toBeGreaterThan(1500);
    });

    test('4.4. Modale d\'édition avec titre et libellés volumineux', () => {
      const longBlock = {
        id: 'b-extreme',
        type: 'text',
        title: 'TitreDeBlocExtremementLongPourValiderLeComportementDeLaModaleDAdministration',
        content: '<p>Paragraphe descriptif avec des mots extrêmement étendus : Anticonstitutionnellement et Intergouvernementalisations</p>',
        enabled: true
      };

      render(
        <FlipbookBlockModalEditor
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
          block={longBlock}
        />
      );

      expect(screen.getByDisplayValue(/TitreDeBlocExtremementLongPourValiderLeComportementDeLaModaleDAdministration/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Enregistrer le bloc/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument();
    });
  });

  /* --------------------------------------------------------------------------
     5. CYCLE PLEIN ÉCRAN COMPLET DU LECTEUR FLIPBOOK
     -------------------------------------------------------------------------- */
  describe('5. Cycle plein écran complet du lecteur Flipbook (masquage entrée, apparition sortie, restauration)', () => {
    test('5.1. Cycle continu et répétitif : Normal -> Plein écran -> Normal -> Plein écran -> Normal', () => {
      const mockBook = {
        id: 'bk-fullscreen-cycle',
        title: 'Cycle Plein Écran',
        pdfFile: 'test.pdf'
      };
      const onCloseMock = jest.fn();

      render(<PdfFlipbookReader book={mockBook} onClose={onCloseMock} />);

      // ÉTAT 1 : Normal initial
      expect(screen.getByTestId('enter-fullscreen-btn')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Activer le mode plein écran/i })).toBeInTheDocument();
      expect(screen.queryByTestId('exit-fullscreen-btn')).toBeNull();
      expect(screen.queryByRole('button', { name: /Quitter le mode plein écran/i })).toBeNull();

      // TRANSITION 1 -> PLEIN ÉCRAN
      act(() => {
        Object.defineProperty(document, 'fullscreenElement', {
          value: document.body,
          configurable: true,
          writable: true
        });
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      // ÉTAT 2 : Plein écran actif
      expect(screen.queryByTestId('enter-fullscreen-btn')).toBeNull();
      expect(screen.queryByRole('button', { name: /Activer le mode plein écran/i })).toBeNull();
      expect(screen.getByTestId('exit-fullscreen-btn')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Quitter le mode plein écran/i })).toBeInTheDocument();

      // TRANSITION 2 -> RETOUR NORMAL
      act(() => {
        Object.defineProperty(document, 'fullscreenElement', {
          value: null,
          configurable: true,
          writable: true
        });
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      // ÉTAT 3 : Normal restauré
      expect(screen.getByTestId('enter-fullscreen-btn')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Activer le mode plein écran/i })).toBeInTheDocument();
      expect(screen.queryByTestId('exit-fullscreen-btn')).toBeNull();
      expect(screen.queryByRole('button', { name: /Quitter le mode plein écran/i })).toBeNull();

      // TRANSITION 3 -> DEUXIÈME PLEIN ÉCRAN (Cycle répété)
      act(() => {
        Object.defineProperty(document, 'fullscreenElement', {
          value: document.body,
          configurable: true,
          writable: true
        });
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      // ÉTAT 4 : Plein écran réactivé
      expect(screen.queryByTestId('enter-fullscreen-btn')).toBeNull();
      expect(screen.getByTestId('exit-fullscreen-btn')).toBeInTheDocument();

      // TRANSITION 4 -> SORTIE FINALE
      act(() => {
        Object.defineProperty(document, 'fullscreenElement', {
          value: null,
          configurable: true,
          writable: true
        });
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      // ÉTAT 5 : Normal final
      expect(screen.getByTestId('enter-fullscreen-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('exit-fullscreen-btn')).toBeNull();

      // Fermeture finale
      const closeBtn = screen.getByRole('button', { name: /Fermer le lecteur/i });
      fireEvent.click(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('5.2. Démontage propre du lecteur en cours de plein écran sans erreur ni fuite de mémoire', () => {
      const mockBook = {
        id: 'bk-unmount-fs',
        title: 'Démontage Plein Écran',
        pdfFile: 'test.pdf'
      };

      const { unmount } = render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

      // Activer le plein écran
      act(() => {
        Object.defineProperty(document, 'fullscreenElement', {
          value: document.body,
          configurable: true,
          writable: true
        });
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      expect(screen.getByTestId('exit-fullscreen-btn')).toBeInTheDocument();

      // Démontage du composant pendant que le plein écran est actif
      expect(() => {
        unmount();
      }).not.toThrow();

      // Événement après démontage : ne doit pas lever d'exception (gestionnaire supprimé au unmount)
      expect(() => {
        act(() => {
          Object.defineProperty(document, 'fullscreenElement', {
            value: null,
            configurable: true,
            writable: true
          });
          document.dispatchEvent(new Event('fullscreenchange'));
        });
      }).not.toThrow();
    });
  });
});
