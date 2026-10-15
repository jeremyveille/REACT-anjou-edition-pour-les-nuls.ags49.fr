import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Clé de stockage LocalStorage pour le modèle global
 */
export const GLOBAL_SIDEBAR_STORAGE_KEY = 'ae_flipbook_global_sidebar';

/**
 * Événement personnalisé pour synchronisation instantanée inter-composants
 */
export const GLOBAL_SIDEBAR_EVENT = 'ae_global_sidebar_updated';

/**
 * Modèle par défaut « Modèle global — Anjou Édition »
 * Respecte strictement l'identité du projet : aucune donnée patrimoniale/touristique fictive,
 * orientation 100% littéraire, créations inédites et consultation interactive.
 */
export const DEFAULT_GLOBAL_SIDEBAR = {
  id: "global-flipbook-sidebars",
  name: "Modèle global — Anjou Édition",
  description: "Modèle commun de barres latérales partagé par l'ensemble des flipbooks du portail.",
  updatedAt: new Date().toISOString(),
  styles: {
    leftWidth: 20, // en pourcentage (15% à 30%)
    rightWidth: 20, // en pourcentage (15% à 30%)
    maxWidth: 1680,
    backgroundColor: '',
    cardBackground: '',
    cardBorderColor: '',
    cardShadow: 'default', // 'none' | 'subtle' | 'default' | 'elevated'
    primaryColor: '#1e3a8a',
    textColor: '',
    fontFamily: 'inherit', // 'inherit' | 'serif' | 'sans-serif' | 'system'
    fontSize: 'normal', // 'compact' | 'normal' | 'relaxed'
    gap: 'normal', // 'compact' | 'normal' | 'relaxed'
    cardPadding: 'normal', // 'compact' | 'normal' | 'relaxed'
    borderRadius: 'normal', // 'rounded' (8px) | 'normal' (14px) | 'pill' (20px)
    visibility: {
      left: {
        desktop: true,
        tablet: true,
        mobile: true
      },
      right: {
        desktop: true,
        tablet: true,
        mobile: true
      }
    }
  },
  leftSidebar: [
    {
      id: "global_left_1",
      type: "heading",
      level: "h3",
      text: "Édition & Créations",
      enabled: true
    },
    {
      id: "global_left_2",
      type: "image",
      title: "Anjou Édition",
      imageUrl: "/images/featured-article-book.jpg",
      imageAlt: "Ouvrage et publication littéraire Anjou Édition",
      caption: "Maison d'édition dédiée aux créations et écrits inédits",
      linkUrl: "/flipbooks",
      openNewTab: false,
      enabled: true
    },
    {
      id: "global_left_3",
      type: "text",
      title: "Note de lecture",
      content: "<p>Consultez nos ouvrages au format numérique interactif avec expérience de feuilletage immersive et accès immédiat aux documents complémentaires.</p>",
      enabled: true
    }
  ],
  rightSidebar: [
    {
      id: "global_right_1",
      type: "heading",
      level: "h3",
      text: "Ressources & Échanges",
      enabled: true
    },
    {
      id: "global_right_2",
      type: "video",
      title: "Présentation de l'ouvrage",
      videoUrl: "https://www.youtube.com/watch?v=bO2tOaFf-1I",
      videoSourceType: "youtube",
      caption: "Découverte des publications et de l'univers éditorial",
      enabled: true
    },
    {
      id: "global_right_3",
      type: "button",
      title: "Nous contacter",
      buttonText: "Contacter l'auteur ou l'éditeur",
      buttonUrl: "/contact",
      buttonStyle: "primary",
      openNewTab: false,
      enabled: true
    },
    {
      id: "global_right_4",
      type: "pdf",
      title: "Fiche complémentaire",
      pdfTitle: "Guide d'accompagnement de lecture (PDF)",
      pdfUrl: "secrets_vignoble_angevin.pdf",
      description: "Téléchargez la notice de lecture au format PDF.",
      enabled: true
    }
  ]
};

/**
 * Récupère le modèle global synchrone depuis le localStorage ou la valeur par défaut
 */
export const getLocalGlobalSidebar = () => {
  try {
    const raw = localStorage.getItem(GLOBAL_SIDEBAR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_GLOBAL_SIDEBAR,
          ...parsed,
          styles: {
            ...DEFAULT_GLOBAL_SIDEBAR.styles,
            ...(parsed.styles || {}),
            visibility: {
              left: {
                ...DEFAULT_GLOBAL_SIDEBAR.styles.visibility.left,
                ...((parsed.styles && parsed.styles.visibility && parsed.styles.visibility.left) || {})
              },
              right: {
                ...DEFAULT_GLOBAL_SIDEBAR.styles.visibility.right,
                ...((parsed.styles && parsed.styles.visibility && parsed.styles.visibility.right) || {})
              }
            }
          },
          leftSidebar: Array.isArray(parsed.leftSidebar) ? parsed.leftSidebar : DEFAULT_GLOBAL_SIDEBAR.leftSidebar,
          rightSidebar: Array.isArray(parsed.rightSidebar) ? parsed.rightSidebar : DEFAULT_GLOBAL_SIDEBAR.rightSidebar
        };
      }
    }
  } catch (e) {
    console.warn("Erreur lecture local global sidebar:", e);
  }
  return DEFAULT_GLOBAL_SIDEBAR;
};

/**
 * Charge le modèle global depuis Firestore avec fallback LocalStorage
 */
export const fetchGlobalSidebarTemplate = async () => {
  try {
    if (db) {
      const docRef = doc(db, "settings", "flipbook_global_sidebar");
      const snap = await getDoc(docRef);
      if (snap && snap.exists()) {
        const data = snap.data();
        const fullTemplate = {
          ...DEFAULT_GLOBAL_SIDEBAR,
          ...data,
          styles: {
            ...DEFAULT_GLOBAL_SIDEBAR.styles,
            ...(data.styles || {}),
            visibility: {
              left: {
                ...DEFAULT_GLOBAL_SIDEBAR.styles.visibility.left,
                ...((data.styles && data.styles.visibility && data.styles.visibility.left) || {})
              },
              right: {
                ...DEFAULT_GLOBAL_SIDEBAR.styles.visibility.right,
                ...((data.styles && data.styles.visibility && data.styles.visibility.right) || {})
              }
            }
          },
          leftSidebar: Array.isArray(data.leftSidebar) ? data.leftSidebar : DEFAULT_GLOBAL_SIDEBAR.leftSidebar,
          rightSidebar: Array.isArray(data.rightSidebar) ? data.rightSidebar : DEFAULT_GLOBAL_SIDEBAR.rightSidebar
        };
        try {
          localStorage.setItem(GLOBAL_SIDEBAR_STORAGE_KEY, JSON.stringify(fullTemplate));
        } catch (e) {
          // ignore quota
        }
        return fullTemplate;
      }
    }
  } catch (err) {
    console.warn("Firestore flipbook_global_sidebar non disponible, fallback local:", err);
  }
  return getLocalGlobalSidebar();
};

/**
 * Enregistre le modèle global de barres latérales (Firestore + LocalStorage)
 */
export const saveGlobalSidebarTemplate = async (template) => {
  const dataToSave = {
    ...template,
    id: "global-flipbook-sidebars",
    name: "Modèle global — Anjou Édition",
    updatedAt: new Date().toISOString()
  };

  // 1. Sauvegarde locale immédiate (Offline-First)
  try {
    localStorage.setItem(GLOBAL_SIDEBAR_STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (e) {
    console.warn("Impossible d'écrire le modèle global dans localStorage:", e);
  }

  // 2. Émission d'événement de synchronisation réactive
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    try {
      window.dispatchEvent(new CustomEvent(GLOBAL_SIDEBAR_EVENT, { detail: dataToSave }));
    } catch (e) {
      // ignore
    }
  }

  // 3. Sauvegarde distante Firestore si disponible
  let firestoreSuccess = false;
  try {
    if (db) {
      const docRef = doc(db, "settings", "flipbook_global_sidebar");
      await setDoc(docRef, dataToSave);
      firestoreSuccess = true;
    }
  } catch (err) {
    console.warn("Échec sauvegarde Firestore modèle global:", err);
  }

  return { success: true, firestore: firestoreSuccess, data: dataToSave };
};

/**
 * Résout les barres latérales d'un flipbook selon son mode :
 * - Mode 'global' : utilise le modèle global partagé
 * - Mode 'custom' : utilise la configuration propre au flipbook
 * - Rétro-compatibilité : si non spécifié, un flipbook existant avec des blocs configurés
 *   reste en mode 'custom', tandis qu'un flipbook sans blocs utilise le modèle global.
 */
export const resolveFlipbookSidebar = (flipbook, globalTemplate = null) => {
  const currentGlobal = globalTemplate || getLocalGlobalSidebar();
  if (!flipbook) {
    return {
      mode: 'global',
      isGlobal: true,
      leftSidebar: currentGlobal.leftSidebar || [],
      rightSidebar: currentGlobal.rightSidebar || [],
      styles: currentGlobal.styles || {}
    };
  }

  const explicitMode = flipbook.sidebarMode;

  if (explicitMode === 'global') {
    return {
      mode: 'global',
      isGlobal: true,
      leftSidebar: currentGlobal.leftSidebar || [],
      rightSidebar: currentGlobal.rightSidebar || [],
      styles: currentGlobal.styles || {}
    };
  }

  if (explicitMode === 'custom') {
    return {
      mode: 'custom',
      isGlobal: false,
      leftSidebar: Array.isArray(flipbook.leftSidebar) ? flipbook.leftSidebar : [],
      rightSidebar: Array.isArray(flipbook.rightSidebar) ? flipbook.rightSidebar : [],
      styles: flipbook.styles || currentGlobal.styles || {}
    };
  }

  // Si le mode n'est pas explicite (anciens flipbooks existants) :
  // Si le flipbook possède explicitement leftSidebar ou rightSidebar (tableau),
  // on conserve sa configuration existante (mode 'custom').
  if (Array.isArray(flipbook.leftSidebar) || Array.isArray(flipbook.rightSidebar)) {
    return {
      mode: 'custom',
      isGlobal: false,
      leftSidebar: flipbook.leftSidebar || [],
      rightSidebar: flipbook.rightSidebar || [],
      styles: flipbook.styles || currentGlobal.styles || {}
    };
  }

  // Par défaut pour tout nouveau flipbook ou sans barres définies : modèle global
  return {
    mode: 'global',
    isGlobal: true,
    leftSidebar: currentGlobal.leftSidebar || [],
    rightSidebar: currentGlobal.rightSidebar || [],
    styles: currentGlobal.styles || {}
  };
};

/**
 * Applique le modèle global à tous les flipbooks fournis
 */
export const applyGlobalTemplateToAll = (flipbooks = []) => {
  return flipbooks.map(fb => ({
    ...fb,
    sidebarMode: 'global'
  }));
};

/**
 * Applique le modèle global à un sous-ensemble de flipbooks par ID
 */
export const applyGlobalTemplateToFlipbooks = (targetIds = [], flipbooks = []) => {
  const idSet = new Set(targetIds.map(String));
  return flipbooks.map(fb => {
    if (idSet.has(String(fb.id))) {
      return {
        ...fb,
        sidebarMode: 'global'
      };
    }
    return fb;
  });
};
