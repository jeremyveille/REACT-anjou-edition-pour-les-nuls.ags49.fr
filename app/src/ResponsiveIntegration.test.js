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
import DashboardSidebar from './components/DashboardSidebar';

describe('Suite de Tests d\'Intégration Responsive E2E — Anjou Édition (4-Tier)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setViewport(1200, 800); // Réinitialisation standard palier L
    document.body.style.overflow = '';
  });

  /* ==========================================================================
     TIER 1 : COUVERTURE UNITAIRE DES FONCTIONNALITÉS RESPONSIVES CLÉS
     ========================================================================== */
  describe('Tier 1 : Couverture unitaire des fonctionnalités responsives clés', () => {
    test('1.1. Header & Logo : logo officiel, titres de marque, lien d\'évitement et bouton de thème toujours rendus', () => {
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

    test('1.2. Navbar desktop : conteneur de liens de navigation présent et éléments cliquables sur grand écran', () => {
      const setViewMock = jest.fn();
      const setMobileMenuOpenMock = jest.fn();
      const setActiveDropdownMock = jest.fn();
      const handleMenuItemClickMock = jest.fn();

      const mockItems = [
        { id: '1', title: 'ARTS', label: 'ARTS', status: 'Actif', url: '/arts', children: [] },
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

      // Déclenchement du clic
      fireEvent.click(screen.getByRole('button', { name: 'ARTS' }));
      expect(handleMenuItemClickMock).toHaveBeenCalledWith(mockItems[0], expect.any(Object));
    });

    test('1.3. Drawer mobile : bascule d\'ouverture/fermeture, rôle dialog, aria-modal, inert et verrouillage scroll', () => {
      let isOpen = false;
      const setMobileMenuOpen = jest.fn((val) => { isOpen = typeof val === 'function' ? val(isOpen) : val; });

      const mockItems = [
        { id: 'm1', title: 'Catalogue Littéraire', status: 'Actif', url: '/catalogue', children: [] }
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

      // Fermeture par la touche Échap
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(setMobileMenuOpen).toHaveBeenCalledWith(false);
    });

    test('1.4. Lecteur Flipbook : région accessible, barre d\'outils et cibles tactiles de pagination/zoom', () => {
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
  });

  /* ==========================================================================
     TIER 2 : CAS LIMITES ET VALEURS FRONTIÈRES (BVA) SUR LES 4 FORMATS
     ========================================================================== */
  describe('Tier 2 : Cas limites et valeurs frontières (BVA) sur les 4 formats d\'écran', () => {
    test('2.1. Palier S : Comportement aux bornes 360px (mobile compact) et 639px (limite supérieure S)', () => {
      // 1. Borne 360px
      setViewport(360, 640);
      expect(window.innerWidth).toBe(360);

      const { rerender } = render(<PublicHeader darkMode={false} toggleDarkMode={jest.fn()} />);
      expect(screen.getByAltText('Logo Anjou Édition')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

      // 2. Borne 639px (juste avant 640px)
      setViewport(639, 700);
      expect(window.innerWidth).toBe(639);

      rerender(<PublicHeader darkMode={true} toggleDarkMode={jest.fn()} />);
      expect(screen.getByAltText('Logo Anjou Édition')).toBeInTheDocument();
    });

    test('2.2. Palier M : Comportement aux bornes 640px (seuil inférieur M) et 1023px (limite supérieure M)', () => {
      // 1. Borne inférieure 640px
      setViewport(640, 800);
      expect(window.innerWidth).toBe(640);

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

      // 2. Borne supérieure 1023px
      setViewport(1023, 900);
      expect(window.innerWidth).toBe(1023);

      rerender(<DashboardSidebar {...mockSidebarProps} isCollapsed={true} />);
      expect(screen.getByRole('complementary')).toHaveClass('is-collapsed');
    });

    test('2.3. Palier L : Comportement aux bornes 1024px (seuil inférieur L) et 1439px (limite supérieure L)', () => {
      // 1. Borne inférieure 1024px
      setViewport(1024, 800);
      expect(window.innerWidth).toBe(1024);

      const book = {
        id: 'book-bva-l',
        title: 'Ouvrage Format L',
        leftSidebar: [{ id: 'l1', type: 'text', content: 'Gauche L', enabled: true }],
        rightSidebar: [{ id: 'r1', type: 'text', content: 'Droite L', enabled: true }]
      };

      const { rerender } = render(
        <FlipbookLayout book={book}>
          <div data-testid="flipbook-reader-content">Lecteur L</div>
        </FlipbookLayout>
      );

      const layout = screen.getByTestId('flipbook-layout-wrapper');
      expect(layout).toHaveClass('has-both-sidebars');
      expect(screen.getByTestId('flipbook-main-stage')).toBeInTheDocument();

      // 2. Borne supérieure 1439px
      setViewport(1439, 900);
      expect(window.innerWidth).toBe(1439);

      rerender(
        <FlipbookLayout book={book}>
          <div data-testid="flipbook-reader-content">Lecteur L étendu</div>
        </FlipbookLayout>
      );
      expect(screen.getByTestId('flipbook-left-sidebar-col')).toBeInTheDocument();
      expect(screen.getByTestId('flipbook-right-sidebar-col')).toBeInTheDocument();
    });

    test('2.4. Palier XL : Comportement aux bornes 1440px (seuil grand écran) et 1920px (Full HD étendu)', () => {
      // 1. Borne 1440px
      setViewport(1440, 900);
      expect(window.innerWidth).toBe(1440);

      const book = {
        id: 'book-bva-xl',
        title: 'Ouvrage Grand Écran XL',
        leftSidebar: [{ id: 'xl1', type: 'heading', text: 'Titre XL Gauche', enabled: true }],
        rightSidebar: [{ id: 'xl2', type: 'heading', text: 'Titre XL Droit', enabled: true }]
      };

      const { rerender } = render(
        <FlipbookLayout book={book}>
          <div data-testid="reader-xl">Lecteur Grand Écran</div>
        </FlipbookLayout>
      );

      expect(screen.getByText('Titre XL Gauche')).toBeInTheDocument();
      expect(screen.getByText('Titre XL Droit')).toBeInTheDocument();

      // 2. Borne 1920px
      setViewport(1920, 1080);
      expect(window.innerWidth).toBe(1920);

      rerender(
        <FlipbookLayout book={book}>
          <div data-testid="reader-xl">Lecteur 1920px</div>
        </FlipbookLayout>
      );
      expect(screen.getByTestId('flipbook-layout-wrapper')).toHaveClass('has-both-sidebars');
    });

    test('2.5. Redimensionnement dynamique de viewport sans perte d\'état des composants', () => {
      const mockProps = {
        setView: jest.fn(),
        mobileMenuOpen: false,
        setMobileMenuOpen: jest.fn(),
        activeDropdown: null,
        setActiveDropdown: jest.fn(),
        getActiveMenuItems: () => [{ id: '1', title: 'ACCUEIL', children: [] }],
        handleMenuItemClick: jest.fn()
      };

      render(<PublicNav {...mockProps} />);

      // Transition successive XL (1920) -> S (360) -> M (768) -> L (1024)
      setViewport(1920);
      expect(screen.getByRole('button', { name: 'ACCUEIL' })).toBeInTheDocument();

      setViewport(360);
      expect(screen.getByRole('button', { name: 'Menu Mobile' })).toBeInTheDocument();

      setViewport(768);
      expect(screen.getByRole('button', { name: 'ACCUEIL' })).toBeInTheDocument();

      setViewport(1024);
      expect(screen.getByRole('button', { name: 'ACCUEIL' })).toBeInTheDocument();
    });

    test('2.6. Saisie sans troncature dans les formulaires sous contrainte d\'espace (360px)', () => {
      setViewport(360, 640);
      render(<ContactForm setView={jest.fn()} />);

      const longName = 'Jean-Sébastien de la Haute Vallée d\'Anjou et des Rives de Maine';
      const longEmail = 'jean-sebastien.contact.officiel.anjou.edition.developpement@plateforme-litteraire.fr';
      const longSubject = 'Demande exhaustive de publication d\'un ouvrage inédit comprenant des recueils et poèmes angevins';
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
          { id: 'b_left_1', type: 'heading', text: 'Sommaire Angevine', enabled: true }
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
      expect(screen.getByText('Sommaire Angevine')).toBeInTheDocument();
      expect(screen.getByText('Télécharger extrait')).toBeInTheDocument();
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

    test('4.2. Parcours administrateur complet sur tablette M (768px) : sidebar, gestion des flipbooks, modalité d\'édition et sauvegarde', () => {
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
});
