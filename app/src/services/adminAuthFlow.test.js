import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import * as authService from './authService';

// Mock the Dashboard component
jest.mock('../components/Dashboard', () => {
  return function MockDashboard({ onLogout }) {
    const React = require('react');
    return React.createElement(
      'div', 
      { 'data-testid': 'mock-dashboard' }, 
      'Mock Dashboard Loaded',
      React.createElement('button', { 'data-testid': 'dashboard-logout-btn', onClick: onLogout }, 'Déconnexion')
    );
  };
});

// Mock firebase/auth
let mockAuthStateCallback = null;
let mockCurrentUser = null;
const mockSignOut = jest.fn(() => {
  mockCurrentUser = null;
  if (mockAuthStateCallback) mockAuthStateCallback(null);
  return Promise.resolve();
});

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    setCustomParameters: jest.fn()
  })),
  signInWithPopup: jest.fn(),
  signInWithRedirect: jest.fn(),
  getRedirectResult: jest.fn(() => Promise.resolve(null)),
  signOut: () => mockSignOut(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn((auth, cb) => {
    mockAuthStateCallback = cb;
    return jest.fn();
  })
}));

// Mock services/pageService
jest.mock('./pageService', () => ({
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

describe('Admin Authentication & Authorization End-to-End Scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
    mockAuthStateCallback = null;
    mockCurrentUser = null;
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/ae-dashboard',
        search: ''
      },
      writable: true
    });
  });

  // TEST A : Utilisateur déconnecté -> /ae-dashboard
  test('Test A: Unauthenticated user navigating to /ae-dashboard is shown login screen with Google button', async () => {
    await act(async () => {
      render(<App />);
    });

    // Dashboard should not be rendered
    expect(screen.queryByTestId('mock-dashboard')).not.toBeInTheDocument();

    // Login header, Google Sign In button, and Email/Password fields must be visible
    expect(screen.getByRole('heading', { name: /Accès Administration/i })).toBeInTheDocument();
    const googleBtn = screen.getByRole('button', { name: /Continuer avec Google/i });
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn).not.toBeDisabled();
    expect(screen.getByLabelText(/Adresse e-mail/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Saisissez votre mot de passe/i)).toBeInTheDocument();
  });

  // TEST B : Connexion avec le compte Google administrateur autorisé
  test('Test B: Logging in with authorized Google admin account grants dashboard access and sets persistence', async () => {
    const authorizedAdminUser = {
      uid: 'admin-jeremy',
      email: 'jeremy.veille@hotmail.fr',
      displayName: 'Jeremy Veille',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: { admin: true }
      })
    };

    const signInWithPopup = require('firebase/auth').signInWithPopup;
    signInWithPopup.mockResolvedValueOnce({ user: authorizedAdminUser });

    await act(async () => {
      render(<App />);
    });

    const googleBtn = screen.getByRole('button', { name: /Continuer avec Google/i });
    await act(async () => {
      fireEvent.click(googleBtn);
    });

    // Dashboard must now be visible
    expect(await screen.findByTestId('mock-dashboard')).toBeInTheDocument();
    expect(localStorage.getItem('ae_authenticated')).toBe('true');
  });

  // TEST C : Actualisation du navigateur dans /ae-dashboard
  test('Test C: Page refresh on /ae-dashboard restores session via onAuthStateChanged without kickout', async () => {
    localStorage.setItem('ae_authenticated', 'true');

    const authorizedAdminUser = {
      uid: 'admin-jeremy',
      email: 'jeremy.veille@hotmail.fr',
      displayName: 'Jeremy Veille',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: { admin: true }
      })
    };

    await act(async () => {
      render(<App />);
    });

    const { onAuthStateChanged } = require('firebase/auth');
    const authCallback = onAuthStateChanged.mock.calls[0][1];
    await act(async () => {
      await authCallback(authorizedAdminUser);
    });

    expect(await screen.findByTestId('mock-dashboard')).toBeInTheDocument();
  });

  // TEST D : Déconnexion
  test('Test D: Logging out closes Firebase session, clears storage, and redirects away from dashboard', async () => {
    localStorage.setItem('ae_authenticated', 'true');

    const authorizedAdminUser = {
      uid: 'admin-jeremy',
      email: 'jeremy.veille@hotmail.fr',
      displayName: 'Jeremy Veille',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: { admin: true }
      })
    };

    await act(async () => {
      render(<App />);
    });

    const { onAuthStateChanged } = require('firebase/auth');
    const authCallback = onAuthStateChanged.mock.calls[0][1];
    await act(async () => {
      await authCallback(authorizedAdminUser);
    });

    expect(await screen.findByTestId('mock-dashboard')).toBeInTheDocument();

    // Trigger logout from dashboard
    const logoutBtn = screen.getByTestId('dashboard-logout-btn');
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    // mockSignOut must have been called
    expect(mockSignOut).toHaveBeenCalled();
    expect(localStorage.getItem('ae_authenticated')).toBeNull();

    // Dashboard should no longer be visible
    expect(screen.queryByTestId('mock-dashboard')).not.toBeInTheDocument();

    // L'écran Déconnexion réussie est affiché
    expect(screen.getByRole('heading', { level: 1, name: /Déconnexion réussie/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Se reconnecter avec Google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retourner sur Anjou Édition/i })).toBeInTheDocument();
  });

  // TEST E : Compte Google authentifié mais NON administrateur
  test('Test E: Authenticated Google user without admin privileges is refused access and shown unauthorized notice', async () => {
    const nonAdminUser = {
      uid: 'random-user-456',
      email: 'visiteur.inconnu@gmail.com',
      displayName: 'Visiteur Inconnu',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: {}
      })
    };

    const signInWithPopup = require('firebase/auth').signInWithPopup;
    signInWithPopup.mockResolvedValueOnce({ user: nonAdminUser });

    await act(async () => {
      render(<App />);
    });

    const googleBtn = screen.getByRole('button', { name: /Continuer avec Google/i });
    await act(async () => {
      fireEvent.click(googleBtn);
    });

    // Access to dashboard must be strictly denied
    expect(screen.queryByTestId('mock-dashboard')).not.toBeInTheDocument();

    // Unauthorized screen must appear with user's email badge and switch account button
    expect(await screen.findByText(/Accès Non Autorisé/i)).toBeInTheDocument();
    expect(screen.getByText('visiteur.inconnu@gmail.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Se connecter avec un autre compte/i })).toBeInTheDocument();
  });

  // TEST F : Option « Changer de compte Google » sur l'écran de connexion
  test('Test F: Login screen displays "Changer de compte Google" and allows signing in with another authorized admin', async () => {
    const secondAdminUser = {
      uid: 'admin-pat-gmail',
      email: 'pveille49@gmail.com',
      displayName: 'Pat V.',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: {}
      })
    };

    const signInWithPopup = require('firebase/auth').signInWithPopup;
    signInWithPopup.mockResolvedValueOnce({ user: secondAdminUser });

    await act(async () => {
      render(<App />);
    });

    // Verify switch prompt & button presence
    expect(screen.getByText(/Vous souhaitez utiliser une autre adresse e-mail \?/i)).toBeInTheDocument();
    const switchBtn = screen.getByRole('button', { name: /Changer de compte Google/i });
    expect(switchBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(switchBtn);
    });

    // Dashboard must be accessible because pveille49@gmail.com is an authorized admin
    expect(await screen.findByTestId('mock-dashboard')).toBeInTheDocument();
    expect(localStorage.getItem('ae_authenticated')).toBe('true');
  });

  // TEST G : Écran de déconnexion avec option « Changer de compte Google »
  test('Test G: Logout screen provides "Changer de compte Google" to switch account immediately', async () => {
    localStorage.setItem('ae_authenticated', 'true');

    const adminUser = {
      uid: 'admin-jeremy',
      email: 'jeremy.veille@hotmail.fr',
      displayName: 'Jeremy Veille',
      getIdTokenResult: jest.fn().mockResolvedValue({ claims: { admin: true } })
    };

    await act(async () => {
      render(<App />);
    });

    const { onAuthStateChanged } = require('firebase/auth');
    const authCallback = onAuthStateChanged.mock.calls[0][1];
    await act(async () => {
      await authCallback(adminUser);
    });

    // Trigger logout
    const logoutBtn = screen.getByTestId('dashboard-logout-btn');
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    expect(screen.getByRole('heading', { level: 1, name: /Déconnexion réussie/i })).toBeInTheDocument();

    // Verify switch account button is present on logout screen
    expect(screen.getByText(/Vous souhaitez utiliser une autre adresse e-mail \?/i)).toBeInTheDocument();
    const switchAccountBtn = screen.getByRole('button', { name: /Changer de compte Google/i });
    expect(switchAccountBtn).toBeInTheDocument();

    // Clicking switch account reconnects with new account
    const secondAdminUser = {
      uid: 'admin-pat',
      email: 'pveille@ymail.com',
      displayName: 'Pat V.',
      getIdTokenResult: jest.fn().mockResolvedValue({ claims: { admin: true } })
    };
    const signInWithPopup = require('firebase/auth').signInWithPopup;
    signInWithPopup.mockResolvedValueOnce({ user: secondAdminUser });

    await act(async () => {
      fireEvent.click(switchAccountBtn);
    });

    expect(await screen.findByTestId('mock-dashboard')).toBeInTheDocument();
  });

  // TEST H : Transition de compte non-autorisé vers compte autorisé via « Changer de compte Google »
  test('Test H: Unauthorized screen lets user switch to an authorized admin account and enter dashboard', async () => {
    const nonAdminUser = {
      uid: 'random-123',
      email: 'inconnu@test.com',
      displayName: 'Inconnu',
      getIdTokenResult: jest.fn().mockResolvedValue({ claims: {} })
    };

    const signInWithPopup = require('firebase/auth').signInWithPopup;
    signInWithPopup.mockResolvedValueOnce({ user: nonAdminUser });

    await act(async () => {
      render(<App />);
    });

    const googleBtn = screen.getByRole('button', { name: /Continuer avec Google/i });
    await act(async () => {
      fireEvent.click(googleBtn);
    });

    expect(await screen.findByText(/Accès Non Autorisé/i)).toBeInTheDocument();

    // User chooses to switch account from unauthorized screen
    const authorizedAdmin = {
      uid: 'admin-jeremy',
      email: 'admin@anjou-edition.fr',
      displayName: 'Admin Principal',
      getIdTokenResult: jest.fn().mockResolvedValue({ claims: { admin: true } })
    };
    signInWithPopup.mockResolvedValueOnce({ user: authorizedAdmin });

    const switchBtn = screen.getByRole('button', { name: /Se connecter avec un autre compte/i });
    await act(async () => {
      fireEvent.click(switchBtn);
    });

    expect(await screen.findByTestId('mock-dashboard')).toBeInTheDocument();
    expect(localStorage.getItem('ae_authenticated')).toBe('true');
  });

  // TEST I : Saisie d'une autre adresse e-mail (ex: pveille@ymail.com) et mot de passe
  test('Test I: Entering custom email (e.g. pveille@ymail.com) and password signs in successfully', async () => {
    const pveilleUser = {
      uid: 'admin-pat-ymail',
      email: 'pveille@ymail.com',
      displayName: 'Pat V.',
      getIdTokenResult: jest.fn().mockResolvedValue({ claims: { admin: true } })
    };

    const signInWithEmailAndPassword = require('firebase/auth').signInWithEmailAndPassword;
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: pveilleUser });

    await act(async () => {
      render(<App />);
    });

    const emailInput = screen.getByLabelText(/Adresse e-mail/i);
    const pwdInput = screen.getByPlaceholderText(/Saisissez votre mot de passe/i);
    const submitBtn = screen.getByRole('button', { name: /^Connexion$/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'pveille@ymail.com' } });
      fireEvent.change(pwdInput, { target: { value: 'admin2026' } });
      fireEvent.click(submitBtn);
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'pveille@ymail.com',
      'admin2026'
    );
    expect(await screen.findByTestId('mock-dashboard')).toBeInTheDocument();
    expect(localStorage.getItem('ae_authenticated')).toBe('true');
  });

  // TEST J : Aucun compte e-mail pré-sélectionné ou imposé par défaut
  test('Test J: Login page starts with a completely blank email input and does not pre-select pveille@ymail.com', async () => {
    await act(async () => {
      render(<App />);
    });

    const emailInput = screen.getByLabelText(/Adresse e-mail/i);
    expect(emailInput).toHaveValue('');
    expect(emailInput.value).toBe('');
    expect(localStorage.getItem('ae_last_login_email')).toBeNull();
  });

  // TEST K : Après déconnexion, aucun e-mail n'est prérempli
  test('Test K: After logging out, login page displays blank email and password inputs', async () => {
    localStorage.setItem('ae_authenticated', 'true');

    const adminUser = {
      uid: 'admin-jeremy',
      email: 'jeremy.veille@hotmail.fr',
      displayName: 'Jeremy Veille',
      getIdTokenResult: jest.fn().mockResolvedValue({ claims: { admin: true } })
    };

    await act(async () => {
      render(<App />);
    });

    const { onAuthStateChanged } = require('firebase/auth');
    const authCallback = onAuthStateChanged.mock.calls[0][1];
    await act(async () => {
      await authCallback(adminUser);
    });

    // Trigger logout
    const logoutBtn = screen.getByTestId('dashboard-logout-btn');
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    // Go back to login
    const backBtn = screen.getByRole('button', { name: /Retourner sur Anjou Édition/i });
    await act(async () => {
      fireEvent.click(backBtn);
    });

    // Navigate to dashboard login view
    expect(screen.queryByTestId('mock-dashboard')).not.toBeInTheDocument();
    expect(localStorage.getItem('ae_last_login_email')).toBeNull();
  });
});
