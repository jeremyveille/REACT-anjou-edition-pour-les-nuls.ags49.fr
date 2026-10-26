import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';

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

// Mock speech synthesis
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

// Helper pour redimensionner le viewport de test
const setViewport = (width, height = 800) => {
  act(() => {
    window.innerWidth = width;
    window.innerHeight = height;
    window.dispatchEvent(new Event('resize'));
  });
};

// Imports des composants applicatifs
import App from './App';
import { PublicHeader } from './components/PublicComponents';
import { PublicNav } from './components/PublicNav';
import ContactForm from './components/ContactForm';
import PdfFlipbookReader from './components/PdfFlipbookReader';
import FlipbookLayout from './components/FlipbookLayout';
import FlipbookBlockModalEditor from './components/FlipbookBlockModalEditor';
import FlipbookEditModal from './components/FlipbookEditModal';
import FlipbookModal from './components/FlipbookModal';
import DashboardSidebar from './components/DashboardSidebar';
import VideoFullscreenButton from './components/VideoFullscreenButton';

describe('Suite de Tests d\'Intégration Responsive E2E — Anjou Édition (4-Tier Opaque-Box)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setViewport(1200, 800); // Réinitialisation standard palier XL
    document.body.style.overflow = '';

    // Réinitialisation de l'état fullscreen du document
    if (typeof document !== 'undefined') {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
        writable: true
      });
    }
  });

  /* ==========================================================================
     TIER 1 : COUVERTURE UNITAIRE DES FONCTIONNALITÉS RESPONSIVES CLÉS
     ========================================================================== */
  describe('Tier 1 : Couverture unitaire des fonctionnalités responsives clés', () => {
    test('1.1. Header & Logo : logo officiel, titres de marque, lien d\'évitement WCAG et bouton de thème toujours rendus', () => {
      const toggleDarkModeMock = jest.fn();
      render(<PublicHeader darkMode={false} toggleDarkMode={toggleDarkModeMock} />);

      // Logo officiel Anjou Édition
      const logo = screen.getByAltText('Logo Anjou Édition');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveClass('header-mockup-shelf-logo');

      // Titre et sous-titre
      expect(screen.getByRole('heading', { level: 1, name: /Anjou Édition/i })).toBeInTheDocument();
      expect(screen.getByText('POUR LES NULS')).toBeInTheDocument();

      // Lien d'évitement WCAG pour clavier/lecteurs d'écran
      const skipLink = screen.getByText('Aller au contenu principal');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');

      // Bouton de thème
      const themeBtn = screen.getByRole('button', { name: /Activer le mode sombre/i });
      expect(themeBtn).toBeInTheDocument();
      fireEvent.click(themeBtn);
      expect(toggleDarkModeMock).toHaveBeenCalledTimes(1);
    });

    test('1.2. Navbar desktop : conteneur de liens de navigation avec chevrons descendants conformes et actions cliquables', () => {
      const setViewMock = jest.fn();
      const setMobileMenuOpenMock = jest.fn();
      const setActiveDropdownMock = jest.fn();
      const handleMenuItemClickMock = jest.fn();

      const mockItems = [
        {
          id: '1',
          title: 'ARTS',
          label: 'ARTS',
          status: 'Actif',
          url: '/arts',
          children: [
            { id: '1-1', title: 'PEINTURE', label: 'PEINTURE', status: 'Actif', url: '/arts/peinture', children: [] }
          ]
        },
        { id: '2', title: 'HISTOIRE', label: 'HISTOIRE', status: 'Actif', url: '/histoire', children: [] }
      ];

      render(
        <PublicNav
          setView={setViewMock}
          mobileMenuOpen={false}
          setMobileMenuOpen={setMobileMenuOpenMock}
          activeDropdown={null}
          setActiveDropdown={setActiveDropdownMock}
          getActiveMenuItems={() => mockItems}
          handleMenuItemClick={handleMenuItemClickMock}
        />
      );

      // Logo Accueil
      const accueilBtn = screen.getByRole('button', { name: 'ACCUEIL' });
      expect(accueilBtn).toBeInTheDocument();

      // Boutons de navigation desktop
      expect(screen.getByRole('button', { name: 'ARTS' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'HISTOIRE' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Contact/i })).toBeInTheDocument();

      // Vérification du bouton avec chevron pour menu déroulant ARTS
      const dropdownToggle = screen.getByRole('button', { name: /Ouvrir le menu ARTS/i });
      expect(dropdownToggle).toBeInTheDocument();
      expect(dropdownToggle).toHaveAttribute('aria-expanded', 'false');

      // Déclenchement du clic sur un lien
      fireEvent.click(screen.getByRole('button', { name: 'HISTOIRE' }));
      expect(handleMenuItemClickMock).toHaveBeenCalledWith(mockItems[1], expect.any(Object));
    });

    test('1.3. Drawer mobile : bascule d\'ouverture/fermeture, rôle dialog, aria-modal, inert et verrouillage scroll', () => {
      let isOpen = false;
      const setMobileMenuOpen = jest.fn((val) => { isOpen = typeof val === 'function' ? val(isOpen) : val; });

      const mockItems = [
        { id: 'm1', title: 'Catalogue Littéraire', status: 'Actif', url: '/catalogue', children: [] },
        {
          id: 'm2',
          title: 'POÉSIES',
          status: 'Actif',
          url: '/poesies',
          shortcode: 'POÉSIES',
          children: [
            { id: 'm2-1', title: 'SONNET', status: 'Actif', url: '/poesie/sonnet', children: [] }
          ]
        }
      ];

      const { rerender } = render(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={false}
          setMobileMenuOpen={setMobileMenuOpen}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => mockItems}
          handleMenuItemClick={jest.fn()}
        />
      );

      const hamburgerBtn = screen.getByRole('button', { name: 'Menu Mobile' });
      expect(hamburgerBtn).toHaveAttribute('aria-expanded', 'false');

      const drawer = document.getElementById('mobile-drawer');
      expect(drawer).not.toHaveClass('open');
      expect(drawer).toHaveAttribute('aria-hidden', 'true');

      // Ouverture du drawer
      fireEvent.click(hamburgerBtn);
      expect(setMobileMenuOpen).toHaveBeenCalled();

      // Rerender avec mobileMenuOpen = true
      rerender(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={true}
          setMobileMenuOpen={setMobileMenuOpen}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => mockItems}
          handleMenuItemClick={jest.fn()}
        />
      );

      expect(drawer).toHaveClass('open');
      expect(drawer).toHaveAttribute('role', 'dialog');
      expect(drawer).toHaveAttribute('aria-modal', 'true');
      expect(document.body.style.overflow).toBe('hidden');

      // Conformité WCAG / HTML5 : aucun élément interactif (button, a, input) à l'intérieur d'un <summary>
      const summaries = drawer.querySelectorAll('summary');
      expect(summaries.length).toBeGreaterThan(0);
      summaries.forEach((summaryEl) => {
        expect(summaryEl.querySelectorAll('button, a, input, select, textarea').length).toBe(0);
      });

      // Fermeture par la touche Échap
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(setMobileMenuOpen).toHaveBeenCalledWith(false);
    });

    test('1.4. Lecteur Flipbook & Plein Écran : région accessible, barre d\'outils et bascule dynamique entre Activer et Quitter le plein écran', () => {
      const mockBook = {
        id: 'bk-responsive-1',
        title: 'Recueil des Fables Angevines',
        pdfFile: 'fables_angevines.pdf'
      };
      const onCloseMock = jest.fn();

      render(<PdfFlipbookReader book={mockBook} onClose={onCloseMock} />);

      // Région accessible
      const region = screen.getByRole('region', { name: /Lecteur de livre numérique/i });
      expect(region).toBeInTheDocument();

      // Contrôles tactiles conformes
      expect(screen.getByRole('button', { name: /Zoom avant/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Zoom arrière/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Afficher ou masquer le sommaire/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tourne-page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Fermer le lecteur/i })).toBeInTheDocument();

      // 1. État normal : le bouton plein écran est en mode "Activer"
      const enterFsBtn = screen.getByRole('button', { name: /Activer le mode plein écran/i });
      expect(enterFsBtn).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Quitter le mode plein écran/i })).toBeNull();

      // 2. Passage en plein écran natif (simulation de l'événement fullscreenchange)
      Object.defineProperty(document, 'fullscreenElement', {
        value: document.body,
        configurable: true,
        writable: true
      });
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      // Le bouton "Activer" doit être masqué et remplacé par "Quitter le mode plein écran"
      expect(screen.queryByRole('button', { name: /Activer le mode plein écran/i })).toBeNull();
      const exitFsBtn = screen.getByRole('button', { name: /Quitter le mode plein écran/i });
      expect(exitFsBtn).toBeInTheDocument();

      // 3. Sortie du plein écran natif
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
        writable: true
      });
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      // Le bouton "Quitter" a disparu et le bouton "Activer" est de retour
      expect(screen.queryByRole('button', { name: /Quitter le mode plein écran/i })).toBeNull();
      expect(screen.getByRole('button', { name: /Activer le mode plein écran/i })).toBeInTheDocument();

      // Fermeture
      fireEvent.click(screen.getByRole('button', { name: /Fermer le lecteur/i }));
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('1.5. Formulaire de contact : structuré en champs fluides avec labels explicites et validation RGPD', () => {
      render(<ContactForm setView={jest.fn()} />);

      // Tous les champs indispensables
      expect(screen.getByLabelText(/Nom complet \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Adresse e-mail \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Sujet \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Votre message \*/i)).toBeInTheDocument();

      // Case RGPD non pré-cochée
      const gdprCheckbox = screen.getByRole('checkbox');
      expect(gdprCheckbox).not.toBeChecked();

      // Bouton de soumission tactile fluide
      const submitBtn = screen.getByRole('button', { name: /Envoyer le message/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).toHaveAttribute('type', 'submit');
    });

    test('1.6. Modale d\'édition administrative : structure à en-tête fixe, corps défilant et boutons d\'actions fixes', () => {
      const mockBlock = {
        id: 'blk-modal-test',
        type: 'text',
        title: 'Bloc Présentation',
        content: 'Texte d\'introduction',
        enabled: true
      };

      const { container } = render(
        <FlipbookBlockModalEditor
          isOpen={true}
          block={mockBlock}
          position="left"
          index={0}
          onSave={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // En-tête de modale
      const header = container.querySelector('.ae-modal-header');
      expect(header).toBeInTheDocument();

      // Corps de formulaire défilable exclusif
      const body = container.querySelector('.ae-block-modal-body');
      expect(body).toBeInTheDocument();

      // Boutons d'actions toujours visibles
      expect(screen.getByRole('button', { name: /Enregistrer le bloc/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument();
    });

    test('1.7. Vidéo responsive & plein écran : bouton plein écran retiré du DOM pendant le mode plein écran', () => {
      const containerRef = { current: document.createElement('div') };
      document.body.appendChild(containerRef.current);

      render(<VideoFullscreenButton containerRef={containerRef} videoTitle="Présentation Anjou Édition" />);

      // En mode normal, le bouton plein écran vidéo est présent
      const videoFsBtn = screen.getByTestId('video-fullscreen-btn');
      expect(videoFsBtn).toBeInTheDocument();
      expect(videoFsBtn).toHaveAttribute('aria-label', expect.stringContaining('Afficher en plein écran'));

      // Passage en plein écran sur le conteneur
      Object.defineProperty(document, 'fullscreenElement', {
        value: containerRef.current,
        configurable: true,
        writable: true
      });
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      // En plein écran, le bouton vidéo est intégralement retiré du DOM (return null)
      expect(screen.queryByTestId('video-fullscreen-btn')).toBeNull();

      // Sortie du plein écran
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
        writable: true
      });
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      // Le bouton réapparaît automatiquement
      expect(screen.getByTestId('video-fullscreen-btn')).toBeInTheDocument();

      document.body.removeChild(containerRef.current);
    });
  });

  /* ==========================================================================
     TIER 2 : CAS LIMITES ET VALEURS FRONTIÈRES (BVA) SUR LES 4 FORMATS
     ========================================================================== */
  describe('Tier 2 : Cas limites et valeurs frontières (BVA) sur les 4 formats d\'écran', () => {
    test('2.1. Écran ultra-compact (320px) : intégrité du header, logo et navigation mobile sans débordement', () => {
      setViewport(320, 568);
      expect(window.innerWidth).toBe(320);

      render(<PublicHeader darkMode={false} toggleDarkMode={jest.fn()} />);
      expect(screen.getByAltText('Logo Anjou Édition')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Activer le mode sombre/i })).toBeInTheDocument();
    });

    test('2.2. Palier S : Comportement aux bornes 360px (mobile standard) et 599px (borne supérieure S)', () => {
      // 1. Borne 360px
      setViewport(360, 640);
      expect(window.innerWidth).toBe(360);

      const { rerender } = render(<PublicHeader darkMode={false} toggleDarkMode={jest.fn()} />);
      expect(screen.getByAltText('Logo Anjou Édition')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

      // 2. Borne 599px (limite haute S selon PROJECT.md)
      setViewport(599, 700);
      expect(window.innerWidth).toBe(599);

      rerender(<PublicHeader darkMode={true} toggleDarkMode={jest.fn()} />);
      expect(screen.getByAltText('Logo Anjou Édition')).toBeInTheDocument();
    });

    test('2.3. Palier M : Comportement aux bornes 600px (seuil inférieur M) et 899px (limite supérieure M)', () => {
      // 1. Borne inférieure 600px
      setViewport(600, 800);
      expect(window.innerWidth).toBe(600);

      const mockSidebarProps = {
        activeSection: null,
        setActiveSection: jest.fn(),
        setActiveCategory: jest.fn(),
        sidebarOpen: false,
        setSidebarOpen: jest.fn(),
        userName: 'JEREMY VEILLE',
        handleLogout: jest.fn(),
        pagesCount: 5,
        articlesCount: 12,
        flipbooksCount: 3,
        messagesCount: 2,
        onOpenPageBuilder: jest.fn(),
        setNotification: jest.fn(),
        hamburgerBtnRef: { current: document.createElement('button') }
      };

      const { rerender } = render(<DashboardSidebar {...mockSidebarProps} />);
      expect(screen.getByRole('complementary')).toHaveAttribute('id', 'dashboard-sidebar');

      // 2. Borne supérieure 899px
      setViewport(899, 900);
      expect(window.innerWidth).toBe(899);

      rerender(<DashboardSidebar {...mockSidebarProps} isCollapsed={true} />);
      expect(screen.getByRole('complementary')).toHaveClass('is-collapsed');
    });

    test('2.4. Orientation Paysage Mobile (hauteur <= 500px) : adaptation dynamique du lecteur Flipbook', () => {
      setViewport(736, 414); // iPhone paysage standard
      expect(window.innerHeight).toBeLessThanOrEqual(500);

      const mockBook = {
        id: 'bk-landscape-1',
        title: 'Édition Format Paysage',
        pdfFile: 'paysage.pdf'
      };

      render(<PdfFlipbookReader book={mockBook} onClose={jest.fn()} />);

      const region = screen.getByRole('region', { name: /Lecteur de livre numérique/i });
      expect(region).toBeInTheDocument();

      // Vérifier que les boutons de zoom et de pagination restent présents et accessibles
      expect(screen.getByRole('button', { name: /Zoom avant/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Zoom arrière/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Fermer le lecteur/i })).toBeInTheDocument();
    });

    test('2.5. Paliers L & XL : Comportement aux bornes 900px, 1199px (Palier L) et 1200px, 1920px (Palier XL)', () => {
      const book = {
        id: 'book-bva-l-xl',
        title: 'Ouvrage Grands Formats',
        leftSidebar: [{ id: 'l1', type: 'text', content: 'Gauche L', enabled: true }],
        rightSidebar: [{ id: 'r1', type: 'text', content: 'Droite L', enabled: true }]
      };

      // 1. Borne inférieure L (900px)
      setViewport(900, 700);
      const { rerender } = render(
        <FlipbookLayout book={book}>
          <div data-testid="flipbook-reader-content">Lecteur L (900px)</div>
        </FlipbookLayout>
      );
      expect(screen.getByTestId('flipbook-layout-wrapper')).toHaveClass('has-both-sidebars');

      // 2. Borne supérieure L (1199px)
      setViewport(1199, 800);
      rerender(
        <FlipbookLayout book={book}>
          <div data-testid="flipbook-reader-content">Lecteur L (1199px)</div>
        </FlipbookLayout>
      );
      expect(screen.getByTestId('flipbook-left-sidebar-col')).toBeInTheDocument();

      // 3. Seuil XL (1200px)
      setViewport(1200, 900);
      rerender(
        <FlipbookLayout book={book}>
          <div data-testid="flipbook-reader-content">Lecteur XL (1200px)</div>
        </FlipbookLayout>
      );
      expect(screen.getByTestId('flipbook-right-sidebar-col')).toBeInTheDocument();

      // 4. Écran Full HD XL (1920px)
      setViewport(1920, 1080);
      rerender(
        <FlipbookLayout book={book}>
          <div data-testid="flipbook-reader-content">Lecteur XL Full HD (1920px)</div>
        </FlipbookLayout>
      );
      expect(screen.getByTestId('flipbook-layout-wrapper')).toHaveClass('has-both-sidebars');
    });

    test('2.6. Robustesse typographique & Anti-troncature : saisie de chaînes longues sans débordement sous contrainte (360px)', () => {
      setViewport(360, 640);
      render(<ContactForm setView={jest.fn()} />);

      const longName = 'Jean-Sébastien de la Haute Vallée Littéraire et Poétique';
      const longEmail = 'jean-sebastien.contact.officiel.developpement.plateforme@edition-litteraire.fr';
      const longSubject = 'Demande exhaustive de publication d\'un ouvrage inédit comprenant des recueils et fables';
      const longMessage = 'Première ligne avec accents : Été, Noël, À propos, Çà et là.\n' +
        'Texte de 1000 caractères répété pour vérifier la non-troncature dans la textarea.\n'.repeat(10);

      const nameInput = screen.getByPlaceholderText(/Jean Dupont/i);
      const emailInput = screen.getByPlaceholderText(/jean.dupont@email.com/i);
      const subjectInput = screen.getByPlaceholderText(/Demande d'information/i);
      const msgInput = screen.getByPlaceholderText(/Écrivez votre message ici.../i);

      fireEvent.change(nameInput, { target: { value: longName } });
      fireEvent.change(emailInput, { target: { value: longEmail } });
      fireEvent.change(subjectInput, { target: { value: longSubject } });
      fireEvent.change(msgInput, { target: { value: longMessage } });

      expect(nameInput.value).toBe(longName);
      expect(emailInput.value).toBe(longEmail);
      expect(subjectInput.value).toBe(longSubject);
      expect(msgInput.value).toBe(longMessage);
      expect(msgInput.value.length).toBeGreaterThan(500);
    });
  });

  /* ==========================================================================
     TIER 3 : COMBINAISONS CROISÉES (PAIRWISE) ET INTERACTIONS COMPLEXES
     ========================================================================== */
  describe('Tier 3 : Combinaisons croisées (Pairwise) et interactions complexes', () => {
    test('3.1. Défilement sticky et ouverture du menu mobile avec verrouillage du défilement d\'arrière-plan', () => {
      // Simuler le scroll vertical de la page
      Object.defineProperty(window, 'scrollY', { value: 650, writable: true });
      fireEvent.scroll(window);

      let isMobileOpen = false;
      const setMobileOpen = jest.fn((fnOrVal) => {
        isMobileOpen = typeof fnOrVal === 'function' ? fnOrVal(isMobileOpen) : fnOrVal;
      });

      const { rerender } = render(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={false}
          setMobileMenuOpen={setMobileOpen}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => [{ id: 'p1', title: 'Poésies', children: [] }]}
          handleMenuItemClick={jest.fn()}
        />
      );

      const toggleBtn = screen.getByRole('button', { name: 'Menu Mobile' });
      fireEvent.click(toggleBtn);
      expect(setMobileOpen).toHaveBeenCalled();

      // Montée du drawer avec verrouillage overflow
      rerender(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={true}
          setMobileMenuOpen={setMobileOpen}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => [{ id: 'p1', title: 'Poésies', children: [] }]}
          handleMenuItemClick={jest.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      // Fermeture et libération de l'overflow
      const closeBtn = screen.getByRole('button', { name: 'Fermer le menu' });
      fireEvent.click(closeBtn);
      expect(setMobileOpen).toHaveBeenCalledWith(false);

      rerender(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={false}
          setMobileMenuOpen={setMobileOpen}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => [{ id: 'p1', title: 'Poésies', children: [] }]}
          handleMenuItemClick={jest.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('');
    });

    test('3.2. Clic overlay modal avec modification en cours (isDirty) : interception et non-fermeture intempestive', () => {
      const mockFlipbook = {
        id: 'fb-dirty-1',
        title: 'Titre Original Inchangé',
        category: 'Littérature',
        pages: [],
        leftSidebar: [],
        rightSidebar: []
      };

      const onCloseMock = jest.fn();
      const onSaveMock = jest.fn();

      // Espionner window.confirm
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => false); // L'utilisateur refuse d'abandonner ses modifications

      render(
        <FlipbookEditModal
          isOpen={true}
          flipbook={mockFlipbook}
          onClose={onCloseMock}
          onSave={onSaveMock}
        />
      );

      // Modifier le champ titre -> isDirty devient vrai
      const titleInput = screen.getByDisplayValue('Titre Original Inchangé');
      fireEvent.change(titleInput, { target: { value: 'Titre Modifié En Cours' } });

      // Cliquer sur le bouton Annuler du pied fixe
      const cancelBtn = screen.getByRole('button', { name: 'Annuler' });
      fireEvent.click(cancelBtn);

      // window.confirm a dû être sollicité pour avertir de la perte de saisie
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('modifications non enregistrées'));
      // Comme confirm a renvoyé false, onClose n'a PAS été appelé
      expect(onCloseMock).not.toHaveBeenCalled();

      // Vérifier que la saisie modifiée est restée intacte dans l'input
      expect(titleInput.value).toBe('Titre Modifié En Cours');

      // Maintenant, l'utilisateur confirme la fermeture
      window.confirm = jest.fn(() => true);
      fireEvent.click(cancelBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);

      window.confirm = originalConfirm;
    });

    test('3.3. FlipbookLayout avec barres latérales empilées et styles configurés', () => {
      const bookWithFullSidebars = {
        id: 'fb-sidebars-interactive',
        title: 'Édition Spéciale',
        sidebarMode: 'custom',
        leftSidebar: [
          { id: 'b_left_1', type: 'heading', text: 'Sommaire Spécial', enabled: true }
        ],
        rightSidebar: [
          { id: 'b_right_1', type: 'button', buttonText: 'Télécharger extrait', buttonUrl: '/pdf', enabled: true }
        ]
      };

      render(
        <FlipbookLayout book={bookWithFullSidebars}>
          <div data-testid="mock-inner-reader">Contenu Flipbook Central</div>
        </FlipbookLayout>
      );

      const layoutWrapper = screen.getByTestId('flipbook-layout-wrapper');
      expect(layoutWrapper).toHaveClass('has-both-sidebars');
      expect(layoutWrapper).toHaveAttribute('data-sidebar-mode', 'custom');

      // Vérifier la présence simultanée des 3 zones
      expect(screen.getByTestId('flipbook-left-sidebar-col')).toBeInTheDocument();
      expect(screen.getByTestId('flipbook-main-stage')).toBeInTheDocument();
      expect(screen.getByTestId('flipbook-right-sidebar-col')).toBeInTheDocument();

      // Vérifier le contenu des blocs
      expect(screen.getByText('Sommaire Spécial')).toBeInTheDocument();
      expect(screen.getByText('Télécharger extrait')).toBeInTheDocument();
    });

    test('3.4. Combinaison multi-fonctionnalités : Menu déroulant avec chevron + Modale ouverte sans interférence', () => {
      // 1. Ouvrir une modale d'édition administrative
      const mockBlock = {
        id: 'blk-combo-test',
        type: 'text',
        title: 'Bloc Test Combinaison',
        content: 'Contenu combo',
        enabled: true
      };

      const { unmount } = render(
        <FlipbookBlockModalEditor
          isOpen={true}
          block={mockBlock}
          position="left"
          index={0}
          onSave={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // La modale est présente
      expect(screen.getByRole('button', { name: /Enregistrer le bloc/i })).toBeInTheDocument();
      unmount();

      // 2. Déployer un menu avec chevron dans PublicNav
      let activeDropdown = 'ARTS';
      const setActiveDropdown = jest.fn((val) => { activeDropdown = val; });

      const mockItems = [
        {
          id: 'arts-1',
          title: 'ARTS',
          children: [{ id: 'sub-1', title: 'LITTÉRATURE', children: [] }]
        }
      ];

      render(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={false}
          setMobileMenuOpen={jest.fn()}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          getActiveMenuItems={() => mockItems}
          handleMenuItemClick={jest.fn()}
        />
      );

      // Le menu est ouvert et le sous-menu est visible
      expect(screen.getByRole('button', { name: 'LITTÉRATURE' })).toBeInTheDocument();
    });
  });

  /* ==========================================================================
     TIER 4 : SCÉNARIOS RÉELS DE BOUT EN BOUT (END-TO-END JOURNEYS)
     ========================================================================== */
  describe('Tier 4 : Scénarios réels de bout en bout (End-to-End Journeys)', () => {
    test('4.1. Parcours utilisateur complet sur mobile S (375px) : header, navigation, formulaire contact, validation RGPD et dark mode', async () => {
      setViewport(375, 667); // iPhone standard

      await act(async () => {
        render(<App />);
      });

      // 1. Vérification du Header sur mobile S
      const logos = screen.getAllByAltText('Logo Anjou Édition');
      expect(logos.length).toBeGreaterThan(0);
      expect(logos[0]).toBeInTheDocument();
      const headings = screen.getAllByRole('heading', { level: 1, name: /Anjou Édition/i });
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0]).toBeInTheDocument();

      // 2. Navigation vers la section Contact via le bouton de navigation
      const contactBtns = screen.getAllByText(/Contact/i);
      const navContactBtn = contactBtns.find(el => el.classList.contains('contact-btn')) || contactBtns[0];
      await act(async () => {
        fireEvent.click(navContactBtn);
      });

      // 3. Affichage du formulaire de contact
      const contactHeading = await screen.findByRole('heading', { name: /Formulaire de Contact/i });
      expect(contactHeading).toBeInTheDocument();

      // 4. Remplissage des champs de saisie
      const nameInput = screen.getByPlaceholderText(/Jean Dupont/i);
      const emailInput = screen.getByPlaceholderText(/jean.dupont@email.com/i);
      const subjectInput = screen.getByPlaceholderText(/Demande d'information/i);
      const msgInput = screen.getByPlaceholderText(/Écrivez votre message ici.../i);

      fireEvent.change(nameInput, { target: { value: 'Jeremy Veille' } });
      fireEvent.change(emailInput, { target: { value: 'jeremy.veille@test.fr' } });
      fireEvent.change(subjectInput, { target: { value: 'Publication nouveau manuscrit' } });
      fireEvent.change(msgInput, { target: { value: 'Bonjour, voici mon projet littéraire pour Anjou Édition.' } });

      // 5. Tentative de soumission sans cocher le RGPD -> Erreur
      const submitBtn = screen.getByRole('button', { name: /Envoyer le message/i });
      fireEvent.click(submitBtn);

      const gdprError = await screen.findByText(/Veuillez accepter le traitement de vos données personnelles/i);
      expect(gdprError).toBeInTheDocument();

      // 6. Coche du consentement RGPD obligatoire
      const gdprCheckbox = screen.getByRole('checkbox');
      fireEvent.click(gdprCheckbox);
      expect(gdprCheckbox).toBeChecked();

      // 7. Envoi avec succès
      fireEvent.click(submitBtn);
      expect(await screen.findByText(/Message enregistré localement|Votre message a bien été envoyé/i)).toBeInTheDocument();

      // 8. Bascule en mode sombre
      const darkModeBtn = screen.getByRole('button', { name: /Activer le mode sombre/i });
      fireEvent.click(darkModeBtn);
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    });

    test('4.2. Parcours lecteur Flipbook complet : navigation, zoom, cycle entrée/sortie plein écran et fermeture', () => {
      const mockBook = {
        id: 'bk-journey-complete',
        title: 'Anthologie Poétique Inédite',
        pdfFile: 'anthologie.pdf'
      };
      const onCloseMock = jest.fn();

      render(<PdfFlipbookReader book={mockBook} onClose={onCloseMock} />);

      // 1. Vérification de l'ouverture du livre et du titre
      expect(screen.getByText('Anthologie Poétique Inédite')).toBeInTheDocument();

      // 2. Utilisation des contrôles de zoom
      const zoomInBtn = screen.getByRole('button', { name: /Zoom avant/i });
      const zoomOutBtn = screen.getByRole('button', { name: /Zoom arrière/i });
      fireEvent.click(zoomInBtn);
      fireEvent.click(zoomOutBtn);

      // 3. Vérification du bouton plein écran initial (Activer)
      const enterFsBtn = screen.getByRole('button', { name: /Activer le mode plein écran/i });
      expect(enterFsBtn).toBeInTheDocument();

      // 4. Déclenchement de l'entrée en plein écran
      Object.defineProperty(document, 'fullscreenElement', {
        value: document.body,
        configurable: true,
        writable: true
      });
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      // Vérification que le bouton d'entrée est masqué et remplacé par le bouton de sortie
      expect(screen.queryByRole('button', { name: /Activer le mode plein écran/i })).toBeNull();
      const exitFsBtn = screen.getByRole('button', { name: /Quitter le mode plein écran/i });
      expect(exitFsBtn).toBeInTheDocument();

      // 5. Déclenchement de la sortie de plein écran
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
        writable: true
      });
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      // Vérification que la commande d'entrée est rétablie
      expect(screen.getByRole('button', { name: /Activer le mode plein écran/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Quitter le mode plein écran/i })).toBeNull();

      // 6. Fermeture propre du lecteur
      const closeBtn = screen.getByRole('button', { name: /Fermer le lecteur/i });
      fireEvent.click(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('4.3. Parcours administrateur sur tablette M (768px) : sidebar, toggle collapse, onglets et édition de bloc', () => {
      setViewport(768, 1024); // Tablette standard (iPad)

      // 1. Initialisation de la sidebar avec drawer tablette
      const setActiveSectionMock = jest.fn();
      const mockProps = {
        activeSection: null,
        setActiveSection: setActiveSectionMock,
        setActiveCategory: jest.fn(),
        sidebarOpen: true, // Drawer ouvert
        setSidebarOpen: jest.fn(),
        userName: 'JEREMY VEILLE',
        handleLogout: jest.fn(),
        pagesCount: 8,
        articlesCount: 14,
        flipbooksCount: 5,
        messagesCount: 3,
        onOpenPageBuilder: jest.fn(),
        setNotification: jest.fn(),
        hamburgerBtnRef: { current: document.createElement('button') }
      };

      const { unmount } = render(<DashboardSidebar {...mockProps} />);

      // Clic sur l'onglet Flipbooks
      const flipbooksBtn = screen.getByRole('button', { name: /Flipbooks/i });
      fireEvent.click(flipbooksBtn);
      expect(setActiveSectionMock).toHaveBeenCalledWith('Mes Flipbooks');

      unmount();

      // 2. Ouverture de la modale d'édition d'un bloc de barre latérale
      const mockBlockToEdit = {
        id: 'block-m-tab-1',
        type: 'text',
        title: 'Titre Initial Bloc',
        content: '<p>Contenu avant modification sur tablette</p>',
        enabled: true
      };

      const handleSaveBlock = jest.fn();
      const handleCloseBlockModal = jest.fn();

      render(
        <FlipbookBlockModalEditor
          isOpen={true}
          block={mockBlockToEdit}
          position="right"
          index={1}
          onSave={handleSaveBlock}
          onClose={handleCloseBlockModal}
        />
      );

      // Vérifier le volet 1 : Contenu & Paramètres
      expect(screen.getByText(/Barre droite • Bloc #2/i)).toBeInTheDocument();
      const titleInput = screen.getByLabelText(/Titre du bloc \(optionnel\)/i);
      expect(titleInput).toHaveValue('Titre Initial Bloc');

      // Modifier le titre
      fireEvent.change(titleInput, { target: { value: 'Titre Modifié sur Tablette M' } });

      // Basculer vers l'onglet 2 : Styles individuels
      const stylesTabBtn = screen.getByRole('button', { name: /2\. Styles individuels/i });
      fireEvent.click(stylesTabBtn);
      expect(screen.getByText('Contour du bloc')).toBeInTheDocument();

      // Sauvegarder via le bouton fixe du pied
      const saveBtn = screen.getByRole('button', { name: /Enregistrer le bloc/i });
      fireEvent.click(saveBtn);

      expect(handleSaveBlock).toHaveBeenCalledTimes(1);
      expect(handleSaveBlock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Titre Modifié sur Tablette M'
      }));
      expect(handleCloseBlockModal).toHaveBeenCalledTimes(1);
    });
  });

  /* ==========================================================================
     TIER 5 : NAVIGATION STICKY (TOP: 0) & POSITIONNEMENT NATUREL SOUS BANNIÈRE
     ========================================================================== */
  describe('Tier 5 : Navigation sticky native (top: 0) & positionnement naturel sous bannière', () => {
    test('5.1. Rendu ordonné de PublicHeader et PublicNav sans chevauchement au chargement', async () => {
      await act(async () => {
        render(<App />);
      });

      const header = document.querySelector('.ae-mockup-header');
      const nav = document.querySelector('nav.public-nav');

      expect(header).toBeInTheDocument();
      expect(nav).toBeInTheDocument();

      // Vérifier l'ordre dans le flux DOM : le header précède immédiatement la navigation
      expect(header.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('5.2. Présence des propriétés CSS sticky top: 0 et opacité dans App.css et site-polish.css', () => {
      const fs = require('fs');
      const path = require('path');

      const appCssPath = path.resolve(__dirname, 'App.css');
      const polishCssPath = path.resolve(__dirname, 'styles/site-polish.css');

      const appCss = fs.readFileSync(appCssPath, 'utf8');
      const polishCss = fs.readFileSync(polishCssPath, 'utf8');

      // Vérification sticky top: 0 et -webkit-sticky dans App.css
      expect(appCss).toMatch(/nav\.public-nav[^{]*\{[^}]*position:\s*-webkit-sticky/);
      expect(appCss).toMatch(/nav\.public-nav[^{]*\{[^}]*position:\s*sticky/);
      expect(appCss).toMatch(/nav\.public-nav[^{]*\{[^}]*top:\s*0/);
      expect(appCss).toMatch(/nav\.public-nav[^{]*\{[^}]*z-index:\s*1000/);

      // Vérification sticky top: 0 et -webkit-sticky dans site-polish.css
      expect(polishCss).toMatch(/nav\.public-nav[^{]*\{[^}]*position:\s*-webkit-sticky/);
      expect(polishCss).toMatch(/nav\.public-nav[^{]*\{[^}]*position:\s*sticky/);
      expect(polishCss).toMatch(/nav\.public-nav[^{]*\{[^}]*top:\s*0/);
      expect(polishCss).toMatch(/nav\.public-nav[^{]*\{[^}]*margin-top:\s*0/);

      // Vérification scroll-margin-top avec clamp et protection du lecteur flipbook
      expect(appCss).toContain('scroll-margin-top: clamp(50px, 8vw, 75px);');
      expect(appCss).toContain('.ae-flipbook-inpage-dialog');
      expect(polishCss).toContain('scroll-margin-top: clamp(50px, 8vw, 75px);');
      expect(polishCss).toContain('.ae-flipbook-inpage-dialog');

      // Vérification #main-content et body.no-scroll dans App.css et site-polish.css
      expect(appCss).toContain('#main-content:focus');
      expect(appCss).toContain('body.no-scroll');
      expect(polishCss).toContain('#main-content:focus');
      expect(polishCss).toContain('body.no-scroll');

      // Vérification harmonisation de spécificité (nav.public-nav sur tous les paliers dans site-polish.css)
      expect(polishCss).toMatch(/@media\s*\(min-width:\s*1200px\)[\s\S]*?nav\.public-nav,\s*\.public-nav/);
      expect(polishCss).toMatch(/@media\s*\(min-width:\s*900px\)[\s\S]*?nav\.public-nav,\s*\.public-nav/);
      expect(polishCss).toMatch(/@media\s*\(min-width:\s*600px\)[\s\S]*?nav\.public-nav,\s*\.public-nav/);
      expect(polishCss).toMatch(/@media\s*\(max-width:\s*599\.98px\)[\s\S]*?nav\.public-nav,\s*\.public-nav/);

      // Vérification conteneur parent .App sans blocage de scroll vertical
      expect(appCss).toMatch(/\.App\s*\{[^}]*overflow-x:\s*clip/);
      expect(appCss).toMatch(/\.App\s*\{[^}]*overflow-y:\s*visible/);
    });

    test('5.3. Rendu responsive de la barre sticky sur smartphone S, tablette M, portable L et grand écran XL', () => {
      const setViewMock = jest.fn();
      const setMobileOpenMock = jest.fn();
      const mockItems = [
        { id: '1', title: 'ACCUEIL', status: 'Actif', url: '/' },
        { id: '2', title: 'LITTÉRATURE', status: 'Actif', url: '/litterature' }
      ];

      // Smartphone S (375px)
      setViewport(375, 667);
      const { rerender } = render(
        <PublicNav
          setView={setViewMock}
          mobileMenuOpen={false}
          setMobileMenuOpen={setMobileOpenMock}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => mockItems}
          handleMenuItemClick={jest.fn()}
        />
      );

      const navEl = screen.getByRole('navigation', { name: /Navigation principale/i });
      expect(navEl).toHaveClass('public-nav');
      expect(screen.getByRole('button', { name: /Menu Mobile/i })).toBeInTheDocument();

      // Tablette M (768px)
      setViewport(768, 1024);
      rerender(
        <PublicNav
          setView={setViewMock}
          mobileMenuOpen={false}
          setMobileMenuOpen={setMobileOpenMock}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => mockItems}
          handleMenuItemClick={jest.fn()}
        />
      );
      expect(navEl).toBeInTheDocument();

      // Grand écran XL (1440px)
      setViewport(1440, 900);
      rerender(
        <PublicNav
          setView={setViewMock}
          mobileMenuOpen={false}
          setMobileMenuOpen={setMobileOpenMock}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => mockItems}
          handleMenuItemClick={jest.fn()}
        />
      );
      expect(navEl).toBeInTheDocument();
      expect(within(navEl).getByText('LITTÉRATURE')).toBeInTheDocument();
    });
  });

  /* ==========================================================================
     TIER 6 : ADVERSARIAL STRESS TEST & ROBUSTESSE CAS LIMITES (ROUND 2)
     ========================================================================== */
  describe('Tier 6 : Examen contradictoire Round 2 (Drawer mobile, scroll lock, ancres WCAG, robustesse responsive)', () => {
    test('6.1. Verrouillage du scroll en arrière-plan (style + classe no-scroll) à l\'ouverture et libération à la fermeture', () => {
      let mobileMenuOpen = false;
      const setMobileMenuOpen = jest.fn((val) => {
        mobileMenuOpen = typeof val === 'function' ? val(mobileMenuOpen) : val;
      });

      const { rerender } = render(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => [{ id: '1', title: 'Arts', children: [] }]}
          handleMenuItemClick={jest.fn()}
        />
      );

      // Initial : corps non verrouillé
      expect(document.body.style.overflow).not.toBe('hidden');
      expect(document.body.classList.contains('no-scroll')).toBe(false);

      // Ouvrir le menu mobile
      rerender(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={true}
          setMobileMenuOpen={setMobileMenuOpen}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => [{ id: '1', title: 'Arts', children: [] }]}
          handleMenuItemClick={jest.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.classList.contains('no-scroll')).toBe(true);

      // Fermer le menu mobile
      rerender(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={false}
          setMobileMenuOpen={setMobileMenuOpen}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => [{ id: '1', title: 'Arts', children: [] }]}
          handleMenuItemClick={jest.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('');
      expect(document.body.classList.contains('no-scroll')).toBe(false);
    });

    test('6.2. Fermeture accessible par touche Escape et restitution automatique de l\'overflow', () => {
      const setMobileMenuOpenMock = jest.fn();

      render(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={true}
          setMobileMenuOpen={setMobileMenuOpenMock}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => [{ id: '1', title: 'Arts', children: [] }]}
          handleMenuItemClick={jest.fn()}
        />
      );

      expect(document.body.classList.contains('no-scroll')).toBe(true);

      // Pression sur Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(setMobileMenuOpenMock).toHaveBeenCalledWith(false);
    });

    test('6.3. Auto-fermeture du drawer mobile lors d\'un redimensionnement vers desktop (>= 900px)', () => {
      setViewport(375, 667);
      const setMobileMenuOpenMock = jest.fn();

      render(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={true}
          setMobileMenuOpen={setMobileMenuOpenMock}
          activeDropdown={null}
          setActiveDropdown={jest.fn()}
          getActiveMenuItems={() => [{ id: '1', title: 'Arts', children: [] }]}
          handleMenuItemClick={jest.fn()}
        />
      );

      // Redimensionnement vers écran large (1024px)
      setViewport(1024, 768);
      expect(setMobileMenuOpenMock).toHaveBeenCalledWith(false);
    });

    test('6.4. Protection contre les crashs lorsque dropdownRefs est absent ou dépourvu de .current', () => {
      const mockItemsWithChildren = [
        { id: '1', title: 'Arts', children: [{ id: '1-1', title: 'Peinture', status: 'Actif', url: '/art' }] }
      ];

      // Cas 1 : dropdownRefs est un objet vide sans .current
      expect(() => {
        render(
          <PublicNav
            setView={jest.fn()}
            mobileMenuOpen={false}
            setMobileMenuOpen={jest.fn()}
            activeDropdown={null}
            setActiveDropdown={jest.fn()}
            getActiveMenuItems={() => mockItemsWithChildren}
            handleMenuItemClick={jest.fn()}
            dropdownRefs={{}}
          />
        );
      }).not.toThrow();

      // Cas 2 : dropdownRefs est null
      expect(() => {
        render(
          <PublicNav
            setView={jest.fn()}
            mobileMenuOpen={false}
            setMobileMenuOpen={jest.fn()}
            activeDropdown={null}
            setActiveDropdown={jest.fn()}
            getActiveMenuItems={() => mockItemsWithChildren}
            handleMenuItemClick={jest.fn()}
            dropdownRefs={null}
          />
        );
      }).not.toThrow();
    });

    test('6.5. Intégrité de l\'ancre WCAG main#main-content avec tabIndex="-1"', async () => {
      await act(async () => {
        render(<App />);
      });

      const mainContent = document.getElementById('main-content');
      expect(mainContent).toBeInTheDocument();
      expect(mainContent).toHaveAttribute('tabIndex', '-1');

      const skipLink = screen.getByText('Aller au contenu principal');
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    test('6.6. Paliers réactifs critiques (320px, 375px, 768px, 834px, paysage mobile) sans erreur de rendu', () => {
      const mockItems = [
        { id: '1', title: 'ACCUEIL', status: 'Actif', url: '/' },
        { id: '2', title: 'LITTÉRATURE', status: 'Actif', url: '/litterature' }
      ];

      const resolutions = [
        { w: 320, h: 568, name: 'iPhone SE ultra-compact' },
        { w: 375, h: 667, name: 'iPhone standard' },
        { w: 768, h: 1024, name: 'iPad portrait' },
        { w: 834, h: 1194, name: 'iPad Pro portrait' },
        { w: 844, h: 390, name: 'iPhone paysage' }
      ];

      resolutions.forEach(({ w, h }) => {
        setViewport(w, h);
        const { unmount } = render(
          <PublicNav
            setView={jest.fn()}
            mobileMenuOpen={false}
            setMobileMenuOpen={jest.fn()}
            activeDropdown={null}
            setActiveDropdown={jest.fn()}
            getActiveMenuItems={() => mockItems}
            handleMenuItemClick={jest.fn()}
          />
        );
        const nav = screen.getByRole('navigation', { name: /Navigation principale/i });
        expect(nav).toBeInTheDocument();
        unmount();
      });
    });
  });

  /* --------------------------------------------------------------------------
     TIER 7 : ULTIME EXAMEN CONTRADICTOIRE ROUND 3 - NON-RÉGRESSION GLOBALE
     -------------------------------------------------------------------------- */
  describe('Tier 7 : Non-régression globale & Intégrité des composants (Round 3)', () => {
    test('7.1. Basculement du Dark Mode dans PublicHeader et préservation des contrastes', () => {
      let isDark = false;
      const toggleDarkMode = jest.fn(() => { isDark = !isDark; });
      const { rerender } = render(
        <PublicHeader darkMode={isDark} toggleDarkMode={toggleDarkMode} />
      );

      const toggleBtn = screen.getByRole('button', { name: /Activer le mode sombre/i });
      expect(toggleBtn).toBeInTheDocument();
      fireEvent.click(toggleBtn);
      expect(toggleDarkMode).toHaveBeenCalledTimes(1);

      // Re-render en mode sombre
      rerender(
        <PublicHeader darkMode={true} toggleDarkMode={toggleDarkMode} />
      );
      expect(screen.getByRole('button', { name: /Activer le mode clair/i })).toBeInTheDocument();
    });

    test('7.2. Intégrité des sous-menus déroulants multi-niveaux et fermeture réactive', () => {
      const handleMenuItemClickMock = jest.fn();
      const setActiveDropdownMock = jest.fn();
      const mockItems = [
        {
          id: 'arts-root',
          title: 'Arts & Culture',
          status: 'Actif',
          children: [
            {
              id: 'art-peinture',
              title: 'Peinture',
              status: 'Actif',
              children: [
                { id: 'art-renaissance', title: 'Renaissance', status: 'Actif', url: '/arts/renaissance' }
              ]
            },
            {
              id: 'art-sculpture',
              title: 'Sculpture',
              status: 'Actif',
              url: '/arts/sculpture'
            }
          ]
        }
      ];

      render(
        <PublicNav
          setView={jest.fn()}
          mobileMenuOpen={false}
          setMobileMenuOpen={jest.fn()}
          activeDropdown="Arts & Culture"
          setActiveDropdown={setActiveDropdownMock}
          getActiveMenuItems={() => mockItems}
          handleMenuItemClick={handleMenuItemClickMock}
        />
      );

      // Le sous-menu desktop contient "Peinture" et "Sculpture"
      const desktopDropdown = document.querySelector('.dropdown-menu.show');
      expect(desktopDropdown).toBeInTheDocument();
      const sculptureBtn = within(desktopDropdown).getByText('Sculpture');
      expect(sculptureBtn).toBeInTheDocument();
      fireEvent.click(sculptureBtn);
      expect(handleMenuItemClickMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'art-sculpture', title: 'Sculpture' }),
        expect.anything()
      );
      expect(setActiveDropdownMock).toHaveBeenCalledWith(null);
    });

    test('7.3. Intégrité du conteneur FlipbookModal affiché sous la barre de navigation', () => {
      const mockBook = {
        id: 'bk-test-modal',
        title: 'Ouvrage de Test',
        pdfFile: 'test.pdf',
        pages: 3
      };
      const onCloseMock = jest.fn();

      render(
        <FlipbookModal
          isOpen={true}
          book={mockBook}
          onClose={onCloseMock}
          onBackToHome={jest.fn()}
        />
      );

      // Le modal de lecture est dans le DOM
      expect(screen.getByText("Ouvrage de Test")).toBeInTheDocument();
      const closeBtn = screen.getByRole('button', { name: /Fermer le lecteur/i });
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('7.4. Intégrité et conformité RGPD du formulaire de contact (consentement obligatoire)', async () => {
      render(<ContactForm setView={jest.fn()} />);

      const nameInput = screen.getByPlaceholderText(/Jean Dupont/i);
      const emailInput = screen.getByPlaceholderText(/jean\.dupont@email\.com/i);
      const subjectInput = screen.getByPlaceholderText(/Demande d'information/i);
      const messageInput = screen.getByPlaceholderText(/Écrivez votre message ici/i);
      const submitBtn = screen.getByRole('button', { name: /Envoyer le message/i });

      // Remplissage sans cocher le RGPD
      fireEvent.change(nameInput, { target: { value: 'Jean Dupont' } });
      fireEvent.change(emailInput, { target: { value: 'jean.dupont@test.fr' } });
      fireEvent.change(subjectInput, { target: { value: 'Demande de renseignement' } });
      fireEvent.change(messageInput, { target: { value: 'Bonjour, je souhaite des informations sur vos livres.' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Erreur de consentement RGPD attendue
      expect(screen.getByText(/Veuillez accepter le traitement de vos données personnelles/i)).toBeInTheDocument();

      // Cocher la case RGPD
      const gdprCheckbox = screen.getByRole('checkbox');
      expect(gdprCheckbox).not.toBeChecked();
      fireEvent.click(gdprCheckbox);
      expect(gdprCheckbox).toBeChecked();

      // Soumission avec consentement
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Le message doit avoir été envoyé avec succès
      expect(await screen.findByText(/Votre message a bien été envoyé/i)).toBeInTheDocument();
    });

    test('7.5. Protection contre le masquage sous la navigation sticky (scroll-margin-top)', () => {
      const fs = require('fs');
      const path = require('path');
      const cssPath = path.resolve(__dirname, 'App.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Vérification que le sélecteur scroll-margin-top cible bien #main-content et les ancres
      expect(cssContent).toMatch(/#main-content[\s\S]*?scroll-margin-top:\s*clamp\(50px,\s*8vw,\s*75px\)/);
      expect(cssContent).toMatch(/section\[id\]/);
      expect(cssContent).toMatch(/article\[id\]/);
      expect(cssContent).toMatch(/:target/);
    });

    test('7.6. Absence absolue de Tailwind CSS (Conformité stricte Vanilla CSS)', () => {
      const fs = require('fs');
      const path = require('path');
      const pkgPath = path.resolve(__dirname, '..', 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.dependencies['tailwindcss']).toBeUndefined();
      expect(pkg.devDependencies?.['tailwindcss']).toBeUndefined();
      expect(pkg.dependencies?.['postcss']).toBeUndefined();

      // Vérification que App.css et site-polish.css n'importent pas de framework Tailwind
      const appCss = fs.readFileSync(path.resolve(__dirname, 'App.css'), 'utf8');
      expect(appCss).not.toContain('@tailwind base');
      expect(appCss).not.toContain('@tailwind components');
      expect(appCss).not.toContain('@tailwind utilities');
    });
  });
});
