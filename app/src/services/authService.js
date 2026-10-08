import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  signInWithEmailAndPassword,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider
} from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

// Liste blanche des adresses e-mail autorisées en tant qu'administrateurs
export const AUTHORIZED_ADMIN_EMAILS = [
  'jeremy.veille@hotmail.fr',
  'admin@anjou-edition.fr',
  'pveille@ymail.com',
  'pveille49@gmail.com'
];

/**
 * Nettoie et normalise une adresse email pour comparaison sécurisée
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Traduit les codes d'erreurs Firebase Authentication en messages compréhensibles et conviviaux
 */
export function getFriendlyAuthErrorMessage(error) {
  if (!error) return "Une erreur inattendue est survenue.";
  
  const code = error.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return "La fenêtre de connexion Google a été fermée avant la validation.";
    case 'auth/cancelled-popup-request':
      return "Une seule tentative de connexion peut être traitée à la fois.";
    case 'auth/popup-blocked':
      return "La fenêtre de connexion a été bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up.";
    case 'auth/network-request-failed':
      return "Impossible de joindre les serveurs d'authentification. Vérifiez votre connexion Internet.";
    case 'auth/user-disabled':
      return "Ce compte utilisateur a été désactivé.";
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return "Identifiants ou mot de passe incorrects.";
    case 'auth/user-not-found':
      return "Aucun compte correspondant à cette adresse n'a été trouvé.";
    case 'auth/requires-recent-login':
      return "Pour des raisons de sécurité, cette modification sensible requiert une reconnexion récente. Veuillez vous reconnecter puis réessayer.";
    case 'auth/weak-password':
      return "Le mot de passe choisi est trop faible. Il doit comporter au moins 6 caractères variés.";
    case 'auth/invalid-email':
      return "L'adresse e-mail renseignée n'est pas valide.";
    case 'auth/missing-password':
      return "Veuillez saisir votre mot de passe.";
    case 'auth/email-already-in-use':
      return "Cette adresse e-mail est déjà utilisée par un autre compte.";
    case 'auth/too-many-requests':
      return "Trop de tentatives infructueuses. Veuillez patienter un instant avant de réessayer.";
    case 'auth/operation-not-allowed':
      return "Le mode de connexion demandé n'est pas activé sur le projet.";
    default:
      return "Impossible de traiter l'opération : " + (error.message || "erreur inconnue.");
  }
}

/**
 * Vérifie si un utilisateur dispose des droits administrateur :
 * 1. Via les custom claims du token Firebase Auth (claims.admin === true)
 * 2. Via la collection Firestore 'accounts' (rôle === 'Administrateur' et statut === 'Actif')
 * 3. Via la liste blanche officielle des administrateurs du projet
 */
export async function verifyAdminStatus(user) {
  if (!user || !user.email) {
    return { isAdmin: false, reason: 'unauthenticated' };
  }

  const email = normalizeEmail(user.email);

  // 1. Contrôle des Custom Claims Firebase
  try {
    if (typeof user.getIdTokenResult === 'function') {
      const tokenResult = await user.getIdTokenResult();
      if (tokenResult?.claims && (tokenResult.claims.admin === true || tokenResult.claims.role === 'admin')) {
        return { 
          isAdmin: true, 
          role: 'Administrateur', 
          source: 'claims',
          email,
          displayName: user.displayName || user.email
        };
      }
    }
  } catch (claimErr) {
    console.warn("[Auth] Vérification token claims non concluante :", claimErr?.message || claimErr);
  }

  // 2. Contrôle de la collection Firestore 'accounts'
  try {
    const snap = await getDocs(collection(db, "accounts"));
    if (snap && !snap.empty && snap.docs) {
      const match = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(acc => normalizeEmail(acc.email) === email);

      if (match) {
        const isAdminRole = (match.role || '').toLowerCase() === 'administrateur';
        const isActive = match.status === 'Actif' || match.isActive === true || match.status === 'active';
        if (isAdminRole && isActive) {
          return { 
            isAdmin: true, 
            role: 'Administrateur', 
            source: 'firestore_account',
            account: match,
            email,
            displayName: match.name || user.displayName || user.email
          };
        }
      }
    }
  } catch (firestoreErr) {
    // Si la lecture échoue (ex: hors ligne ou règles strictes), on continue sur la liste blanche
    console.warn("[Auth] Vérification collection accounts non concluante :", firestoreErr?.message || firestoreErr);
  }

  // 3. Contrôle de la liste blanche autorisée
  if (AUTHORIZED_ADMIN_EMAILS.includes(email)) {
    return { 
      isAdmin: true, 
      role: 'Administrateur', 
      source: 'whitelist',
      email,
      displayName: user.displayName || user.email
    };
  }

  // Compte connecté mais non autorisé
  return { 
    isAdmin: false, 
    reason: 'unauthorized_account',
    email,
    displayName: user.displayName || user.email
  };
}

/**
 * Lance la connexion via Google avec sélection explicite du compte (prompt: 'select_account')
 * Bascule sur redirection si la popup est bloquée par le navigateur.
 */
export async function loginWithGoogle(options = {}) {
  try {
    const provider = typeof GoogleAuthProvider === 'function' 
      ? new GoogleAuthProvider() 
      : (googleProvider || {});

    if (provider && typeof provider.setCustomParameters === 'function') {
      provider.setCustomParameters({ 
        prompt: 'select_account',
        ...(options.customParameters || {})
      });
    }
    const result = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (error) {
    if (error.code === 'auth/popup-blocked') {
      try {
        const provider = typeof GoogleAuthProvider === 'function' 
          ? new GoogleAuthProvider() 
          : (googleProvider || {});

        if (provider && typeof provider.setCustomParameters === 'function') {
          provider.setCustomParameters({ 
            prompt: 'select_account',
            ...(options.customParameters || {})
          });
        }
        await signInWithRedirect(auth, provider);
        return { redirect: true };
      } catch (redirectError) {
        throw redirectError;
      }
    }
    throw error;
  }
}

/**
 * Permet à l'administrateur de changer de compte Google :
 * 1. Déconnecte la session Firebase active éventuelle pour éviter toute réutilisation automatique
 * 2. Force l'affichage de l'écran de sélection de compte Google ('select_account')
 * 3. Réalise la connexion OAuth Google
 */
export async function switchGoogleAccount() {
  await logoutAdmin();
  return await loginWithGoogle({ customParameters: { prompt: 'select_account' } });
}

/**
 * Vérifie le résultat éventuel d'un signInWithRedirect
 */
export async function checkRedirectAuthResult() {
  try {
    if (typeof getRedirectResult === 'function') {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        return result.user;
      }
    }
  } catch (err) {
    console.warn("[Auth] Erreur getRedirectResult :", err);
  }
  return null;
}

/**
 * Connexion de secours avec identifiants email / mot de passe
 */
export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Déconnexion Firebase et suppression du stockage local
 */
export async function logoutAdmin() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("[Auth] Erreur lors de signOut Firebase :", err);
  } finally {
    try {
      localStorage.removeItem('ae_authenticated');
    } catch (e) {}
  }
}

/**
 * Détermine si un utilisateur ou un compte utilise l'authentification Google OAuth
 */
export function isGoogleUser(userOrAccount) {
  if (!userOrAccount) return false;

  // Contrôle du tableau providerData (objet User Firebase)
  if (Array.isArray(userOrAccount.providerData)) {
    if (userOrAccount.providerData.some(p => p && (p.providerId === 'google.com' || p.providerId === 'google'))) {
      return true;
    }
  }

  // Contrôle de la propriété provider directe
  if (userOrAccount.provider === 'google' || userOrAccount.providerId === 'google.com') {
    return true;
  }

  // Contrôle des adresses connues associées à Google dans ce projet
  const email = normalizeEmail(userOrAccount.email);
  if (email === 'jeremy.veille@hotmail.fr' || email === 'pveille49@gmail.com') {
    return true;
  }

  return false;
}

/**
 * Analyse et évalue la robustesse d'un mot de passe (score 0 à 4, jauge et conseils)
 */
export function evaluatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return {
      score: 0,
      label: 'Non renseigné',
      percent: 0,
      color: '#94a3b8',
      feedback: ['Saisissez un mot de passe pour tester sa robustesse.'],
      isStrong: false
    };
  }

  let score = 0;
  const feedback = [];

  const hasMinLen = password.length >= 8;
  const hasLongLen = password.length >= 12;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (hasMinLen) {
    score += 1;
  } else {
    feedback.push('Au moins 8 caractères.');
  }

  if (hasLower && hasUpper) {
    score += 1;
  } else {
    feedback.push('Mélange de majuscules et de minuscules.');
  }

  if (hasNumber) {
    score += 1;
  } else {
    feedback.push('Au moins un chiffre (0-9).');
  }

  if (hasSpecial) {
    score += 1;
  } else {
    feedback.push('Au moins un symbole spécial (ex: @, #, $, !).');
  }

  if (hasLongLen && score < 4) {
    score += 1;
  }

  score = Math.min(4, Math.max(0, score));

  const levels = [
    { label: 'Très faible', percent: 20, color: '#ef4444' },
    { label: 'Faible', percent: 40, color: '#f97316' },
    { label: 'Moyen', percent: 65, color: '#eab308' },
    { label: 'Robuste', percent: 85, color: '#3b82f6' },
    { label: 'Excellent', percent: 100, color: '#10b981' }
  ];

  const currentLevel = levels[score];

  return {
    score,
    label: currentLevel.label,
    percent: currentLevel.percent,
    color: currentLevel.color,
    feedback: feedback.length > 0 ? feedback : ['Mot de passe d\'excellente robustesse.'],
    isStrong: score >= 3
  };
}

/**
 * Modifie le mot de passe du compte actuellement connecté via Firebase Auth
 * Gère la réauthentification si le mot de passe actuel est fourni.
 */
export async function changeCurrentUserPassword(currentPassword, newPassword) {
  if (!auth || !auth.currentUser) {
    const err = new Error("Aucune session utilisateur active.");
    err.code = 'auth/no-current-user';
    throw err;
  }

  const user = auth.currentUser;

  if (!newPassword || newPassword.length < 6) {
    const err = new Error("Le nouveau mot de passe doit comporter au moins 6 caractères.");
    err.code = 'auth/weak-password';
    throw err;
  }

  // Si un mot de passe actuel est renseigné, tenter une réauthentification préalable
  if (currentPassword && user.email && typeof EmailAuthProvider?.credential === 'function' && typeof reauthenticateWithCredential === 'function') {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  }

  await updatePassword(user, newPassword);
  return { success: true };
}

/**
 * Envoie un e-mail officiel Firebase pour la réinitialisation sécurisée du mot de passe
 */
export async function sendAdminPasswordResetEmail(email) {
  if (!email || typeof email !== 'string') {
    const err = new Error("Veuillez fournir une adresse e-mail valide.");
    err.code = 'auth/invalid-email';
    throw err;
  }

  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) {
    const err = new Error("L'adresse e-mail est invalide.");
    err.code = 'auth/invalid-email';
    throw err;
  }

  await sendPasswordResetEmail(auth, cleanEmail);
  return { success: true, email: cleanEmail };
}

/**
 * Met à jour les informations de profil Firebase Auth (displayName, photoURL) du compte connecté
 */
export async function updateCurrentUserProfile({ displayName, photoURL }) {
  if (!auth || !auth.currentUser) {
    return { success: false, reason: 'no_user' };
  }

  const updates = {};
  if (typeof displayName === 'string') updates.displayName = displayName.trim();
  if (typeof photoURL === 'string') updates.photoURL = photoURL.trim();

  await updateProfile(auth.currentUser, updates);
  return { success: true, user: auth.currentUser };
}

