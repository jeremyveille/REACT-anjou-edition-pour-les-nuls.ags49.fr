import { 
  verifyAdminStatus, 
  normalizeEmail, 
  getFriendlyAuthErrorMessage, 
  AUTHORIZED_ADMIN_EMAILS,
  logoutAdmin,
  loginWithGoogle
} from './authService';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';

jest.mock('../firebase', () => ({
  auth: { currentUser: null },
  googleProvider: {},
  db: {}
}));

jest.mock('firebase/auth', () => ({
  signInWithPopup: jest.fn(),
  signInWithRedirect: jest.fn(),
  getRedirectResult: jest.fn(),
  signOut: jest.fn(),
  signInWithEmailAndPassword: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn()
}));

describe('authService - Email Normalization & Error Messages', () => {
  test('normalizes emails cleanly', () => {
    expect(normalizeEmail('  JEREMY.VEILLE@Hotmail.FR  ')).toBe('jeremy.veille@hotmail.fr');
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
  });

  test('translates Firebase auth error codes to user-friendly French messages', () => {
    expect(getFriendlyAuthErrorMessage({ code: 'auth/popup-closed-by-user' }))
      .toContain('fermée');
    expect(getFriendlyAuthErrorMessage({ code: 'auth/popup-blocked' }))
      .toContain('bloquée');
    expect(getFriendlyAuthErrorMessage({ code: 'auth/invalid-credential' }))
      .toContain('incorrects');
    expect(getFriendlyAuthErrorMessage({ code: 'auth/network-request-failed' }))
      .toContain('Internet');
  });
});

describe('authService - verifyAdminStatus', () => {
  test('returns unauthenticated when user is null or missing email', async () => {
    const res1 = await verifyAdminStatus(null);
    expect(res1.isAdmin).toBe(false);
    expect(res1.reason).toBe('unauthenticated');

    const res2 = await verifyAdminStatus({});
    expect(res2.isAdmin).toBe(false);
    expect(res2.reason).toBe('unauthenticated');
  });

  test('authorizes admin via custom claims token', async () => {
    const mockUser = {
      email: 'custom@domain.com',
      displayName: 'Admin Custom',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: { admin: true }
      })
    };

    const res = await verifyAdminStatus(mockUser);
    expect(res.isAdmin).toBe(true);
    expect(res.source).toBe('claims');
    expect(res.role).toBe('Administrateur');
  });

  test('authorizes admin via official whitelist email', async () => {
    const mockUser = {
      email: 'jeremy.veille@hotmail.fr',
      displayName: 'Jeremy Veille',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: {}
      })
    };

    const res = await verifyAdminStatus(mockUser);
    expect(res.isAdmin).toBe(true);
    expect(res.source).toBe('whitelist');
  });

  test('authorizes admin via accounts collection in Firestore', async () => {
    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'acc1',
          data: () => ({
            email: 'admin.invite@anjou.fr',
            name: 'Invite Admin',
            role: 'Administrateur',
            status: 'Actif'
          })
        }
      ]
    });

    const mockUser = {
      email: 'admin.invite@anjou.fr',
      displayName: 'Invite Admin',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: {}
      })
    };

    const res = await verifyAdminStatus(mockUser);
    expect(res.isAdmin).toBe(true);
    expect(res.source).toBe('firestore_account');
  });

  test('refuses access to standard non-admin users', async () => {
    const mockUser = {
      email: 'visiteur@gmail.com',
      displayName: 'Visiteur Inconnu',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: {}
      })
    };

    const res = await verifyAdminStatus(mockUser);
    expect(res.isAdmin).toBe(false);
    expect(res.reason).toBe('unauthorized_account');
  });
});

describe('authService - Actions login & logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('loginWithGoogle uses signInWithPopup by default', async () => {
    const mockUser = { email: 'jeremy.veille@hotmail.fr' };
    signInWithPopup.mockResolvedValueOnce({ user: mockUser });

    const result = await loginWithGoogle();
    expect(signInWithPopup).toHaveBeenCalled();
    expect(result.user).toBe(mockUser);
  });

  test('loginWithGoogle falls back to signInWithRedirect when popup is blocked', async () => {
    signInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    signInWithRedirect.mockResolvedValueOnce();

    const result = await loginWithGoogle();
    expect(signInWithRedirect).toHaveBeenCalled();
    expect(result.redirect).toBe(true);
  });

  test('logoutAdmin signs out from Firebase and purges localStorage', async () => {
    localStorage.setItem('ae_authenticated', 'true');
    signOut.mockResolvedValueOnce();

    await logoutAdmin();
    expect(signOut).toHaveBeenCalled();
    expect(localStorage.getItem('ae_authenticated')).toBeNull();
  });
});
