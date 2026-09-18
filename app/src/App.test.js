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

test('renders app header and checks welcome message', () => {
  render(<App />);
  // Check that the title "Anjou Édition" is rendered
  const titleElements = screen.getAllByText(/Anjou Édition/i);
  expect(titleElements.length).toBeGreaterThan(0);
  
  // Check welcome section text
  const welcomeText = screen.getByText(/Bienvenue sur Anjou Édition/i);
  expect(welcomeText).toBeInTheDocument();
});

test('navigates to flipbooks view when clicking flipbooks button', () => {
  render(<App />);
  
  // Find "Voir les Flipbooks" button and click it
  const btn = screen.getByRole('button', { name: /Voir les Flipbooks/i });
  fireEvent.click(btn);
  
  // Should display the flipbooks section title
  const flipbooksTitle = screen.getByRole('heading', { name: /Nos Flipbooks Interactifs/i });
  expect(flipbooksTitle).toBeInTheDocument();
});

test('toggles dark mode class on html document', () => {
  render(<App />);
  
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
  render(<App />);
  
  // Click contact button in header navigation
  const contactNavBtns = screen.getAllByText(/Contact/i);
  // Find the one in navigation actions
  const contactNavBtn = contactNavBtns.find(el => el.classList.contains('contact-btn'));
  if (contactNavBtn) {
    fireEvent.click(contactNavBtn);
  } else {
    // Fallback if not found
    fireEvent.click(contactNavBtns[0]);
  }
  
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
  render(<App />);
  
  // Navigate to contact form
  const contactNavBtns = screen.getAllByText(/Contact/i);
  const contactNavBtn = contactNavBtns.find(el => el.classList.contains('contact-btn'));
  if (contactNavBtn) {
    fireEvent.click(contactNavBtn);
  } else {
    fireEvent.click(contactNavBtns[0]);
  }
  
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
  render(<App />);
  
  // Find privacy footer link
  const privacyLink = screen.getByText(/Mentions Légales & RGPD/i);
  expect(privacyLink).toBeInTheDocument();
  
  // Click the privacy policy link
  fireEvent.click(privacyLink);
  
  // Verify privacy policy title is displayed
  const privacyHeader = screen.getByRole('heading', { name: /Politique de Confidentialité & Mentions Légales/i });
  expect(privacyHeader).toBeInTheDocument();
  
  // Verify return to home
  const backBtn = screen.getByRole('button', { name: /Retour à l'accueil/i });
  fireEvent.click(backBtn);
  
  const welcomeText = screen.getByText(/Bienvenue sur Anjou Édition/i);
  expect(welcomeText).toBeInTheDocument();
});

test('renders dynamic menu items and handles clicks', () => {
  const mockMenus = [
    { id: "m1", title: "Mon Dynamic Accueil", label: "Mon Dynamic Accueil", icon: "Home", url: "/", shortcode: "", status: "Actif", enabled: true, type: "internal-link", parentId: null, order: 1 },
    { id: "m2", title: "Dynamic Contact", label: "Dynamic Contact", icon: "HelpCircle", url: "", shortcode: "[open_contact_modal]", status: "Actif", enabled: true, type: "shortcode", parentId: null, order: 2 }
  ];
  localStorage.setItem("ae_menus", JSON.stringify(mockMenus));

  render(<App />);

  // Check that the dynamic menu item is rendered in the header
  const welcomeBtns = screen.getAllByRole('button', { name: "Mon Dynamic Accueil" });
  const contactBtns = screen.getAllByRole('button', { name: "Dynamic Contact" });
  
  expect(welcomeBtns.length).toBeGreaterThan(0);
  expect(contactBtns.length).toBeGreaterThan(0);

  // Click on the dynamic contact shortcode button
  fireEvent.click(contactBtns[0]);

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
  render(<App />);
  
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

test('ensures "Vidéos Populaires", "Actualités 2026", "Galerie" and "Chaîne YouTube" sidebar blocks are not rendered on homepage', () => {
  render(<App />);

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

test('ensures "À la une : Flipbooks Interactifs" cards and "Feuilleter l\'ouvrage" buttons are not rendered on homepage', () => {
  render(<App />);

  // Verify that "À la une : Flipbooks Interactifs" heading is absent from homepage
  expect(screen.queryByRole('heading', { name: /À la une : Flipbooks Interactifs/i })).not.toBeInTheDocument();

  // Verify that "Feuilleter l'ouvrage" buttons are absent from homepage
  expect(screen.queryAllByRole('button', { name: /Feuilleter l'ouvrage/i }).length).toBe(0);
});

test('ensures "Poésies et Fables Phares" section and cards are not rendered on homepage', () => {
  render(<App />);

  // Verify that "Poésies et Fables Phares" heading is absent from homepage
  expect(screen.queryByRole('heading', { name: /Poésies et Fables Phares/i })).not.toBeInTheDocument();

  // Verify that buttons and links for fable/poem are absent from homepage
  expect(screen.queryByRole('button', { name: /Lire la fable Ma pomme/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Lire la poésie Rappel d'Anjou/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/LIRE LA FABLE/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/LIRE LA POÉSIE/i)).not.toBeInTheDocument();

  // Verify that the interactive flipbook reader remains present
  expect(screen.getByRole('heading', { name: /Lecteur de Flipbook Interactif/i })).toBeInTheDocument();
});







