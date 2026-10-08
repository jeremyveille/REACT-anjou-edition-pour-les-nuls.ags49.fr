import { 
  verifyAdminStatus, 
  normalizeEmail, 
  getFriendlyAuthErrorMessage, 
  AUTHORIZED_ADMIN_EMAILS,
  logoutAdmin,
  loginWithGoogle,
  isGoogleUser,
  evaluatePasswordStrength,
  changeCurrentUserPassword,
  sendAdminPasswordResetEmail,
  updateCurrentUserProfile
} from './authService';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithPopup, 
  signInWithRedirect, 
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';

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
  signInWithEmailAndPassword: jest.fn(),
  updatePassword: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn((email, pass) => ({ email, pass }))
  },
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn()
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

describe('authService - isGoogleUser detection', () => {
  test('detects Google user from providerData array', () => {
    expect(isGoogleUser({ providerData: [{ providerId: 'google.com' }] })).toBe(true);
    expect(isGoogleUser({ providerData: [{ providerId: 'password' }] })).toBe(false);
  });

  test('detects Google user from provider property', () => {
    expect(isGoogleUser({ provider: 'google' })).toBe(true);
    expect(isGoogleUser({ providerId: 'google.com' })).toBe(true);
  });

  test('detects Google user from known emails in project', () => {
    expect(isGoogleUser({ email: 'jeremy.veille@hotmail.fr' })).toBe(true);
    expect(isGoogleUser({ email: 'pveille49@gmail.com' })).toBe(true);
    expect(isGoogleUser({ email: 'autre@domaine.fr' })).toBe(false);
    expect(isGoogleUser(null)).toBe(false);
  });
});

describe('authService - evaluatePasswordStrength', () => {
  test('returns default non renseigné for empty password', () => {
    const res = evaluatePasswordStrength('');
    expect(res.score).toBe(0);
    expect(res.isStrong).toBe(false);
    expect(res.label).toBe('Non renseigné');
  });

  test('evaluates weak passwords', () => {
    const res = evaluatePasswordStrength('abc');
    expect(res.score).toBe(0);
    expect(res.isStrong).toBe(false);
    expect(res.feedback).toContain('Au moins 8 caractères.');
  });

  test('evaluates strong passwords with mixed case, digits and special chars', () => {
    const res = evaluatePasswordStrength('AnjouEd!tion49#2026');
    expect(res.score).toBeGreaterThanOrEqual(3);
    expect(res.isStrong).toBe(true);
    expect(res.label).toMatch(/Robuste|Excellent/);
  });
});

describe('authService - Password & Profile Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('changeCurrentUserPassword throws error when no user logged in', async () => {
    auth.currentUser = null;
    await expect(changeCurrentUserPassword('old', 'newpass123')).rejects.toThrow('Aucune session');
  });

  test('changeCurrentUserPassword rejects passwords shorter than 6 characters', async () => {
    auth.currentUser = { email: 'test@anjou.fr' };
    await expect(changeCurrentUserPassword('old', '123')).rejects.toThrow('au moins 6 caractères');
  });

  test('changeCurrentUserPassword re-authenticates and updates password', async () => {
    auth.currentUser = { email: 'test@anjou.fr' };
    updatePassword.mockResolvedValueOnce();
    reauthenticateWithCredential.mockResolvedValueOnce();

    const result = await changeCurrentUserPassword('oldPass123', 'newPassSecure49!');
    expect(EmailAuthProvider.credential).toHaveBeenCalledWith('test@anjou.fr', 'oldPass123');
    expect(reauthenticateWithCredential).toHaveBeenCalled();
    expect(updatePassword).toHaveBeenCalledWith(auth.currentUser, 'newPassSecure49!');
    expect(result.success).toBe(true);
  });

  test('sendAdminPasswordResetEmail validates email and sends reset email', async () => {
    sendPasswordResetEmail.mockResolvedValueOnce();
    const result = await sendAdminPasswordResetEmail(' Pat.V@ymail.com ');
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'pat.v@ymail.com');
    expect(result.success).toBe(true);
    expect(result.email).toBe('pat.v@ymail.com');
  });

  test('sendAdminPasswordResetEmail rejects empty email', async () => {
    await expect(sendAdminPasswordResetEmail('')).rejects.toThrow('adresse e-mail');
  });

  test('updateCurrentUserProfile updates profile in Firebase Auth', async () => {
    auth.currentUser = { displayName: 'Old', photoURL: '' };
    updateProfile.mockResolvedValueOnce();

    const res = await updateCurrentUserProfile({ displayName: 'Nouveau Nom', photoURL: 'https://img.fr/avatar.jpg' });
    expect(updateProfile).toHaveBeenCalledWith(auth.currentUser, {
      displayName: 'Nouveau Nom',
      photoURL: 'https://img.fr/avatar.jpg'
    });
    expect(res.success).toBe(true);
  });
});

