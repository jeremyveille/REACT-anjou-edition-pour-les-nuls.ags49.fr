import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  signInWithEmailAndPassword
} from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

// Liste blanche des adresses e-mail autorisées en tant qu'administrateurs
export const AUTHORIZED_ADMIN_EMAILS = [
  'jeremy.veille@hotmail.fr',
  'admin@anjou-edition.fr',
  'pveille@ymail.com'
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
    case 'auth/user-not-found':
      return "Identifiants ou mot de passe incorrects.";
    case 'auth/too-many-requests':
      return "Trop de tentatives infructueuses. Veuillez patienter un instant avant de réessayer.";
    case 'auth/operation-not-allowed':
      return "Le mode de connexion demandé n'est pas activé sur le projet.";
    default:
      return "Impossible de s'authentifier : " + (error.message || "erreur inconnue.");
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
 * Lance la connexion via Google avec popup ou bascule sur redirection si la popup est bloquée
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user };
  } catch (error) {
    if (error.code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return { redirect: true };
      } catch (redirectError) {
        throw redirectError;
      }
    }
    throw error;
  }
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
