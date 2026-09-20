import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

// Mock the administrative Dashboard to avoid loading ES modules dependencies like @google/genai in Jest tests
jest.mock('./components/Dashboard', () => {
  return function MockDashboard() {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'mock-dashboard' }, 'Mock Dashboard');
  };
});

// Mock firebase/auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { email: 'admin@anjou-edition.fr' } })),
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { email: 'admin@anjou-edition.fr' } })),
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

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock_doc' })),
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  orderBy: jest.fn(),
  where: jest.fn(),
  limit: jest.fn()
}));

// Mock SpeechSynthesis if it doesn't exist
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

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'location', {
    value: {
      pathname: '/',
      search: ''
    },
    writable: true
  });
});

const renderApp = async () => {
  let utils;
  await act(async () => {
    utils = render(<App />);
  });
  return utils;
};

test('renders app header and checks welcome message', async () => {
  await renderApp();
  // Check that the title "Anjou Édition" is rendered
  const titleElements = screen.getAllByText(/Anjou Édition/i);
  expect(titleElements.length).toBeGreaterThan(0);
  
  // Check welcome section text
  const welcomeText = screen.getByText(/Bienvenue sur Anjou Édition/i);
  expect(welcomeText).toBeInTheDocument();
});

test('navigates to flipbooks view when clicking flipbooks button', async () => {
  await renderApp();
  
  // Find "Voir les Flipbooks" button and click it
  const btn = screen.getByRole('button', { name: /Voir les Flipbooks/i });
  await act(async () => {
    fireEvent.click(btn);
  });
  
  // Should display the flipbooks section title
  const flipbooksTitle = screen.getByRole('heading', { name: /Nos Flipbooks Interactifs/i });
  expect(flipbooksTitle).toBeInTheDocument();
});

test('toggles dark mode class on html document', async () => {
  await renderApp();
  
  const toggleBtn = screen.getByRole('button', { name: /Activer le mode sombre/i });
  expect(toggleBtn).toBeInTheDocument();
  
  // Initially should not have dark-mode
  expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
  
  // Toggle dark mode
  fireEvent.click(toggleBtn);
  expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
  
  // Toggle back
  const toggleLightBtn = screen.getByRole('button', { name: /Activer le mode clair/i });
  fireEvent.click(toggleLightBtn);
  expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
});

test('renders contact form and allows input typing', async () => {
  await renderApp();
  
  // Click contact button in header navigation
  const contactNavBtns = screen.getAllByText(/Contact/i);
  // Find the one in navigation actions
  const contactNavBtn = contactNavBtns.find(el => el.classList.contains('contact-btn'));
  await act(async () => {
    if (contactNavBtn) {
      fireEvent.click(contactNavBtn);
    } else {
      // Fallback if not found
      fireEvent.click(contactNavBtns[0]);
    }
  });
  
  // Form header should show
  const formHeader = screen.getByRole('heading', { name: /Formulaire de Contact/i });
  expect(formHeader).toBeInTheDocument();
  
  // Input fields check
  const nameInput = screen.getByPlaceholderText(/Jean Dupont/i);
  const emailInput = screen.getByPlaceholderText(/jean.dupont@email.com/i);
  const subjectInput = screen.getByPlaceholderText(/Demande d'information/i);
  const messageInput = screen.getByPlaceholderText(/Écrivez votre message ici.../i);
  
  expect(nameInput).toBeInTheDocument();
  expect(emailInput).toBeInTheDocument();
  expect(subjectInput).toBeInTheDocument();
  expect(messageInput).toBeInTheDocument();
  
  // Type in input fields
  fireEvent.change(nameInput, { target: { value: 'Jeremie' } });
  fireEvent.change(emailInput, { target: { value: 'jeremie@email.com' } });
  fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
  fireEvent.change(messageInput, { target: { value: 'This is a test message.' } });
  
  expect(nameInput.value).toBe('Jeremie');
  expect(emailInput.value).toBe('jeremie@email.com');
  expect(subjectInput.value).toBe('Test Subject');
  expect(messageInput.value).toBe('This is a test message.');
});

test('renders contact form and checks GDPR checkbox validation', async () => {
  await renderApp();
  
  // Navigate to contact form
  const contactNavBtns = screen.getAllByText(/Contact/i);
  const contactNavBtn = contactNavBtns.find(el => el.classList.contains('contact-btn'));
  await act(async () => {
    if (contactNavBtn) {
      fireEvent.click(contactNavBtn);
    } else {
      fireEvent.click(contactNavBtns[0]);
    }
  });
  
  // Verify that the GDPR checkbox is present and is not checked by default
  const gdprCheckbox = screen.getByRole('checkbox', { name: /En cochant cette case/i });
  expect(gdprCheckbox).toBeInTheDocument();
  expect(gdprCheckbox.checked).toBe(false);
  expect(gdprCheckbox.required).toBe(true);
  
  // Toggle the GDPR checkbox
  fireEvent.click(gdprCheckbox);
  expect(gdprCheckbox.checked).toBe(true);
});

test('navigates to privacy policy from footer link', async () => {
  await renderApp();
  
  // Find privacy footer link
  const privacyLink = screen.getByText(/Mentions Légales & RGPD/i);
  expect(privacyLink).toBeInTheDocument();
  
  // Click the privacy policy link
  await act(async () => {
    fireEvent.click(privacyLink);
  });
  
  // Verify privacy policy title is displayed
  const privacyHeader = screen.getByRole('heading', { name: /Politique de Confidentialité & Mentions Légales/i });
  expect(privacyHeader).toBeInTheDocument();
  
  // Verify return to home
  const backBtn = screen.getByRole('button', { name: /Retour à l'accueil/i });
  await act(async () => {
    fireEvent.click(backBtn);
  });
  
  const welcomeText = screen.getByText(/Bienvenue sur Anjou Édition/i);
  expect(welcomeText).toBeInTheDocument();
});

test('renders dynamic menu items and handles clicks', async () => {
  const mockMenus = [
    { id: "m1", title: "Mon Dynamic Accueil", label: "Mon Dynamic Accueil", icon: "Home", url: "/", shortcode: "", status: "Actif", enabled: true, type: "internal-link", parentId: null, order: 1 },
    { id: "m2", title: "Dynamic Contact", label: "Dynamic Contact", icon: "HelpCircle", url: "", shortcode: "[open_contact_modal]", status: "Actif", enabled: true, type: "shortcode", parentId: null, order: 2 }
  ];
  localStorage.setItem("ae_menus", JSON.stringify(mockMenus));

  await renderApp();

  // Check that the dynamic menu item is rendered in the header
  const welcomeBtns = screen.getAllByRole('button', { name: "Mon Dynamic Accueil" });
  const contactBtns = screen.getAllByRole('button', { name: "Dynamic Contact" });
  
  expect(welcomeBtns.length).toBeGreaterThan(0);
  expect(contactBtns.length).toBeGreaterThan(0);

  // Click on the dynamic contact shortcode button
  await act(async () => {
    fireEvent.click(contactBtns[0]);
  });

  // It should execute the open_contact_modal action and route to the Contact form
  const formHeader = screen.getByRole('heading', { name: /Formulaire de Contact/i });
  expect(formHeader).toBeInTheDocument();
});

test('navigates to admin dashboard and attempts login', async () => {
  // Set location before render so the initial state is dashboard
  Object.defineProperty(window, 'location', {
    value: {
      pathname: '/ae-dashboard',
      search: ''
    },
    writable: true
  });
  await renderApp();
  
  // We should see the login card since we are not authenticated
  const loginHeader = screen.getByRole('heading', { name: /Accès Administration/i });
  expect(loginHeader).toBeInTheDocument();
  
  // Find password input
  const passwordInput = screen.getByPlaceholderText(/Mot de passe/i);
  expect(passwordInput).toBeInTheDocument();
  
  // Enter password and submit
  fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
  
  const submitBtn = screen.getByRole('button', { name: /Connexion/i });
  await act(async () => {
    fireEvent.click(submitBtn);
  });
});

test('ensures "Vidéos Populaires", "Actualités 2026", "Galerie" and "Chaîne YouTube" sidebar blocks are not rendered on homepage', async () => {
  await renderApp();

  // Verify that Vidéos Populaires heading is absent from homepage
  expect(screen.queryByRole('heading', { name: /Vidéos Populaires/i })).not.toBeInTheDocument();
  expect(screen.queryAllByRole('button', { name: /Lire la vidéo/i }).length).toBe(0);

  // Verify that the News widget heading is absent from homepage
  expect(screen.queryByRole('heading', { name: /Actualités 2026/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/Salon du Livre de Saumur/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Nouvelle parution fables/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Mise à jour portail/i)).not.toBeInTheDocument();

  // Verify that Galerie sidebar widget heading & button are absent from homepage
  expect(screen.queryByRole('heading', { name: /Galerie/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Voir toutes les photos/i })).not.toBeInTheDocument();

  // Verify that Chaîne YouTube sidebar widget is absent from homepage
  expect(screen.queryByRole('heading', { name: /Chaîne YouTube/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/Conférence Anjou 2026 - Extrait/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Lire la conférence Anjou 2026/i })).not.toBeInTheDocument();
});

test('ensures "Lecteur de Flipbook Interactif", "Guide Historique de l\'Anjou" and welcome introduction block are not rendered on homepage', async () => {
  await renderApp();

  // Verify that "Lecteur de Flipbook Interactif" heading is absent from homepage
  expect(screen.queryByRole('heading', { name: /Lecteur de Flipbook Interactif/i })).not.toBeInTheDocument();

  // Verify that "Guide Historique de l'Anjou" is absent from homepage
  expect(screen.queryByText(/Guide Historique/i)).not.toBeInTheDocument();

  // Verify that the welcome introduction title and text are absent from homepage
  expect(screen.queryByText(/Bienvenue sur le portail littéraire et culturel d'Anjou Édition/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Explorez le patrimoine littéraire, historique, poétique et scientifique/i)).not.toBeInTheDocument();

  // Verify that "À la une : Flipbooks Interactifs" heading is absent from homepage
  expect(screen.queryByRole('heading', { name: /À la une : Flipbooks Interactifs/i })).not.toBeInTheDocument();

  // Verify that "Feuilleter l'ouvrage" buttons are absent from homepage
  expect(screen.queryAllByRole('button', { name: /Feuilleter l'ouvrage/i }).length).toBe(0);
});

describe('Anjou Édition Presentation Article & Homepage Integration', () => {
  test('renders homepage with new positioning hero, 3 pillars and featured article card', async () => {
    await renderApp();

    // Verify Hero title and positioning
    expect(screen.getByRole('heading', { level: 1, name: /Anjou Édition, la maison d['’]édition ouverte à tous/i })).toBeInTheDocument();
    expect(screen.getByText(/Des livres, des histoires, des connaissances et des projets accessibles à chacun/i)).toBeInTheDocument();

    // Verify 3 pillars: Accueillir, Expliquer, Guider
    expect(screen.getByRole('heading', { name: /Accueillir/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Expliquer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Guider/i })).toBeInTheDocument();

    // Verify featured article card on homepage
    expect(screen.getByRole('heading', { level: 3, name: /Anjou Édition : une maison d['’]édition ouverte à tous/i })).toBeInTheDocument();
    expect(screen.getByText(/rendre l['’]édition, la culture et la transmission accessibles à tous/i)).toBeInTheDocument();
  });

  test('clicking featured article card or hero CTA navigates to full article reader view', async () => {
    await renderApp();

    // Find and click the Hero primary CTA "Découvrir Anjou Édition"
    const heroCta = screen.getByRole('button', { name: /Découvrir Anjou Édition/i });
    expect(heroCta).toBeInTheDocument();
    fireEvent.click(heroCta);

    // Verify article reader view is rendered
    expect(await screen.findByRole('heading', { level: 1, name: /Anjou Édition : une maison d['’]édition ouverte à tous/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Bienvenue chez Anjou Édition/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Pourquoi « pour les nuls » \?/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Une maison d['’]édition ouverte à tous/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Vous aimez écrire \?/i })).toBeInTheDocument();

    // Verify article tools: speech synthesis button, font size buttons, back button
    expect(screen.getByRole('button', { name: /Écouter l['’]article par synthèse vocale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Taille de texte normale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Taille de texte grande/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retour à l['’]accueil/i })).toBeInTheDocument();

    // Verify footer CTA buttons
    expect(screen.getByRole('button', { name: /Découvrir nos publications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Proposer votre projet/i })).toBeInTheDocument();
  });

  test('clicking back button returns to homepage', async () => {
    await renderApp();

    // Open article via featured article card
    const readBtn = screen.getByRole('button', { name: /Lire l['’]article/i });
    fireEvent.click(readBtn);

    expect(await screen.findByRole('heading', { level: 1, name: /Anjou Édition : une maison d['’]édition ouverte à tous/i })).toBeInTheDocument();

    // Click back button
    const backBtn = screen.getByRole('button', { name: /Retour à l['’]accueil/i });
    fireEvent.click(backBtn);

    // Should return to homepage
    expect(await screen.findByRole('heading', { level: 1, name: /Anjou Édition, la maison d['’]édition ouverte à tous/i })).toBeInTheDocument();
  });
});








