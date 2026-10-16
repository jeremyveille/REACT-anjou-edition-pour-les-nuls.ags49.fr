import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Clé de stockage LocalStorage pour le modèle global
 */
export const GLOBAL_SIDEBAR_STORAGE_KEY = 'ae_flipbook_global_sidebar';

/**
 * Clé de stockage LocalStorage pour la version précédente enregistrée (restauration)
 */
export const GLOBAL_SIDEBAR_PREV_STORAGE_KEY = 'ae_flipbook_global_sidebar_previous';

/**
 * Événement personnalisé pour synchronisation instantanée inter-composants
 */
export const GLOBAL_SIDEBAR_EVENT = 'ae_global_sidebar_updated';

/**
 * Configuration de style par défaut pour une barre individuelle (gauche ou droite)
 */
export const DEFAULT_SIDEBAR_SIDE_STYLE = {
  backgroundColor: '',
  cardBackground: '',
  cardBorderColor: '',
  cardShadow: 'inherit', // 'inherit' | 'none' | 'subtle' | 'default' | 'elevated'
  primaryColor: '',
  textColor: '',
  textAlign: 'left', // 'left' | 'center' | 'right'
  gap: 'inherit', // 'inherit' | 'compact' | 'normal' | 'relaxed'
  cardPadding: 'inherit', // 'inherit' | 'compact' | 'normal' | 'relaxed'
  borderRadius: 'inherit' // 'inherit' | 'none' | 'rounded' | 'normal' | 'pill'
};

/**
 * Modèle par défaut « Modèle global — Anjou Édition »
 * Respecte strictement l'identité du projet : aucune donnée patrimoniale/touristique fictive,
 * orientation 100% littéraire, créations inédites et consultation interactive.
 */
export const DEFAULT_GLOBAL_SIDEBAR = {
  id: "global-flipbook-sidebars",
  name: "Modèle global — Anjou Édition",
  description: "Modèle commun de barres latérales partagé par l'ensemble des flipbooks du portail.",
  version: 1,
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
    textAlign: 'left', // 'left' | 'center' | 'right'
    fontFamily: 'inherit', // 'inherit' | 'serif' | 'sans-serif' | 'system'
    fontSize: 'normal', // 'compact' | 'normal' | 'relaxed'
    gap: 'normal', // 'compact' | 'normal' | 'relaxed'
    cardPadding: 'normal', // 'compact' | 'normal' | 'relaxed'
    borderRadius: 'normal', // 'none' (0px) | 'rounded' (8px) | 'normal' (14px) | 'pill' (20px)
    left: { ...DEFAULT_SIDEBAR_SIDE_STYLE },
    right: { ...DEFAULT_SIDEBAR_SIDE_STYLE },
    visibility: {
      left: {
        xl: true,
        desktop: true,
        tablet: true,
        mobile: true
      },
      right: {
        xl: true,
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
 * Normalise un modèle de barres latérales en garantissant toutes ses sous-structures
 */
export const normalizeSidebarTemplate = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return JSON.parse(JSON.stringify(DEFAULT_GLOBAL_SIDEBAR));
  }

  const rawStyles = raw.styles || {};
  const rawVisibility = rawStyles.visibility || {};

  return {
    ...DEFAULT_GLOBAL_SIDEBAR,
    ...raw,
    id: "global-flipbook-sidebars",
    name: raw.name || "Modèle global — Anjou Édition",
    version: Number(raw.version) || 1,
    styles: {
      ...DEFAULT_GLOBAL_SIDEBAR.styles,
      ...rawStyles,
      left: {
        ...DEFAULT_SIDEBAR_SIDE_STYLE,
        ...(rawStyles.left || {})
      },
      right: {
        ...DEFAULT_SIDEBAR_SIDE_STYLE,
        ...(rawStyles.right || {})
      },
      visibility: {
        left: {
          ...DEFAULT_GLOBAL_SIDEBAR.styles.visibility.left,
          ...(rawVisibility.left || {})
        },
        right: {
          ...DEFAULT_GLOBAL_SIDEBAR.styles.visibility.right,
          ...(rawVisibility.right || {})
        }
      }
    },
    leftSidebar: Array.isArray(raw.leftSidebar) ? raw.leftSidebar : DEFAULT_GLOBAL_SIDEBAR.leftSidebar,
    rightSidebar: Array.isArray(raw.rightSidebar) ? raw.rightSidebar : DEFAULT_GLOBAL_SIDEBAR.rightSidebar
  };
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
        return normalizeSidebarTemplate(parsed);
      }
    }
  } catch (e) {
    console.warn("Erreur lecture local global sidebar:", e);
  }
  return normalizeSidebarTemplate(DEFAULT_GLOBAL_SIDEBAR);
};

/**
 * Récupère la dernière version enregistrée (ou la version précédente sauvegardée)
 */
export const getPreviousSavedGlobalSidebar = () => {
  try {
    const prevRaw = localStorage.getItem(GLOBAL_SIDEBAR_PREV_STORAGE_KEY);
    if (prevRaw) {
      const parsed = JSON.parse(prevRaw);
      if (parsed && typeof parsed === 'object') {
        return normalizeSidebarTemplate(parsed);
      }
    }
  } catch (e) {
    // ignore
  }
  return getLocalGlobalSidebar();
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
        const fullTemplate = normalizeSidebarTemplate(data);
        try {
          localStorage.setItem(GLOBAL_SIDEBAR_STORAGE_KEY, JSON.stringify(fullTemplate));
          if (data.previousVersion && typeof data.previousVersion === 'object') {
            localStorage.setItem(
              GLOBAL_SIDEBAR_PREV_STORAGE_KEY,
              JSON.stringify(normalizeSidebarTemplate(data.previousVersion))
            );
          }
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
 * et conserve une sauvegarde de la version précédente pour restauration.
 */
export const saveGlobalSidebarTemplate = async (template) => {
  const currentSaved = getLocalGlobalSidebar();
  const cleanPrevious = { ...currentSaved };
  delete cleanPrevious.previousVersion;

  const normalized = normalizeSidebarTemplate(template);
  const nextVersion = (Number(currentSaved.version) || 1) + 1;

  const dataToSave = {
    ...normalized,
    id: "global-flipbook-sidebars",
    name: "Modèle global — Anjou Édition",
    version: nextVersion,
    updatedAt: new Date().toISOString(),
    previousVersion: cleanPrevious
  };

  // 1. Sauvegarde de la version précédente + version courante dans LocalStorage (Offline-First)
  try {
    localStorage.setItem(GLOBAL_SIDEBAR_PREV_STORAGE_KEY, JSON.stringify(cleanPrevious));
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
 * Restaure la dernière version enregistrée (ou la version précédente sauvegardée) du modèle global
 */
export const restoreLastSavedGlobalSidebar = async () => {
  const prevRaw = localStorage.getItem(GLOBAL_SIDEBAR_PREV_STORAGE_KEY);
  if (prevRaw) {
    try {
      const parsedPrev = JSON.parse(prevRaw);
      if (parsedPrev && typeof parsedPrev === 'object') {
        const res = await saveGlobalSidebarTemplate(parsedPrev);
        return { success: true, data: res.data };
      }
    } catch (e) {
      // ignore
    }
  }
  const latestSaved = await fetchGlobalSidebarTemplate();
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    try {
      window.dispatchEvent(new CustomEvent(GLOBAL_SIDEBAR_EVENT, { detail: latestSaved }));
    } catch (e) {
      // ignore
    }
  }
  return { success: true, data: latestSaved };
};

/**
 * Résout les barres latérales d'un flipbook selon son mode :
 * - Mode 'global' : utilise une référence dynamique au modèle global partagé
 * - Mode 'custom' : utilise la configuration propre au flipbook
 * - Rétro-compatibilité : si non spécifié, un flipbook existant avec des blocs configurés
 *   reste en mode 'custom', tandis qu'un flipbook sans blocs utilise le modèle global.
 */
export const resolveFlipbookSidebar = (flipbook, globalTemplate = null) => {
  const currentGlobal = globalTemplate ? normalizeSidebarTemplate(globalTemplate) : getLocalGlobalSidebar();
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
 * Crée ou met à jour la sauvegarde de secours de la configuration personnalisée d'un Flipbook
 * afin de ne jamais perdre ses barres latérales individuelles lors du passage au modèle global.
 */
export const createCustomSidebarBackup = (flipbook) => {
  if (!flipbook) return null;
  const hasLeft = Array.isArray(flipbook.leftSidebar) && flipbook.leftSidebar.length > 0;
  const hasRight = Array.isArray(flipbook.rightSidebar) && flipbook.rightSidebar.length > 0;

  if (hasLeft || hasRight) {
    return {
      backedUpAt: new Date().toISOString(),
      leftSidebar: JSON.parse(JSON.stringify(flipbook.leftSidebar || [])),
      rightSidebar: JSON.parse(JSON.stringify(flipbook.rightSidebar || [])),
      styles: flipbook.styles ? JSON.parse(JSON.stringify(flipbook.styles)) : null
    };
  }
  return flipbook.customSidebarBackup || null;
};

/**
 * Analyse l'état actuel des Flipbooks par rapport au modèle global et aux configurations individuelles
 */
export const analyzeFlipbooksSidebarStatus = (flipbooks = [], globalTemplate = null) => {
  const list = Array.isArray(flipbooks) ? flipbooks : [];
  const globalFlipbooks = [];
  const customFlipbooks = [];
  const customWithBlocksFlipbooks = [];

  list.forEach((fb) => {
    if (!fb) return;
    const resolved = resolveFlipbookSidebar(fb, globalTemplate);
    if (resolved.mode === 'global') {
      globalFlipbooks.push(fb);
    } else {
      customFlipbooks.push(fb);
      const hasBlocks =
        (Array.isArray(fb.leftSidebar) && fb.leftSidebar.length > 0) ||
        (Array.isArray(fb.rightSidebar) && fb.rightSidebar.length > 0);
      if (hasBlocks) {
        customWithBlocksFlipbooks.push(fb);
      }
    }
  });

  return {
    totalCount: list.length,
    globalCount: globalFlipbooks.length,
    customCount: customFlipbooks.length,
    customWithBlocksCount: customWithBlocksFlipbooks.length,
    globalFlipbooks,
    customFlipbooks,
    customWithBlocksFlipbooks
  };
};

/**
 * Applique le modèle global à tous les flipbooks fournis en préservant les configurations individuelles
 */
export const applyGlobalTemplateToAll = (flipbooks = []) => {
  return flipbooks.map(fb => {
    const backup = createCustomSidebarBackup(fb);
    return {
      ...fb,
      sidebarMode: 'global',
      ...(backup ? { customSidebarBackup: backup } : {})
    };
  });
};

/**
 * Applique le modèle global à un sous-ensemble de flipbooks par ID en préservant les configurations individuelles
 */
export const applyGlobalTemplateToFlipbooks = (targetIds = [], flipbooks = []) => {
  const idSet = new Set(targetIds.map(String));
  return flipbooks.map(fb => {
    if (idSet.has(String(fb.id))) {
      const backup = createCustomSidebarBackup(fb);
      return {
        ...fb,
        sidebarMode: 'global',
        ...(backup ? { customSidebarBackup: backup } : {})
      };
    }
    return fb;
  });
};

/**
 * Applique le modèle global à tous les Flipbooks, sauvegarde les configurations individuelles
 * en backup, persiste les changements dans Firebase & LocalStorage, vérifie la résolution
 * et renvoie un bilan détaillé de l'opération.
 */
export const applyGlobalTemplateToAllAndPersist = async (flipbooks = [], globalTemplate = null) => {
  const analysis = analyzeFlipbooksSidebarStatus(flipbooks, globalTemplate);
  const updatedFlipbooks = applyGlobalTemplateToAll(flipbooks);

  // 1. Sauvegarde locale dans LocalStorage
  try {
    localStorage.setItem('ae_flipbooks', JSON.stringify(updatedFlipbooks));
  } catch (e) {
    console.warn("Impossible de mettre à jour ae_flipbooks dans localStorage:", e);
  }

  // 2. Enregistrement dans Firebase Firestore pour chaque Flipbook
  const errors = [];
  let firestoreSuccessCount = 0;

  for (const fb of updatedFlipbooks) {
    if (!fb || !fb.id) continue;
    try {
      if (db) {
        const payload = {
          sidebarMode: 'global',
          updatedAt: new Date().toISOString()
        };
        if (fb.customSidebarBackup) {
          payload.customSidebarBackup = fb.customSidebarBackup;
        }
        await setDoc(doc(db, "flipbooks", String(fb.id)), payload, { merge: true });
        firestoreSuccessCount++;
      }
    } catch (err) {
      console.warn(`Erreur Firebase lors du passage en mode global pour le flipbook ${fb.id}:`, err);
      errors.push({
        id: fb.id,
        title: fb.title || `Flipbook #${fb.id}`,
        message: err?.message || "Erreur d'écriture Firestore"
      });
    }
  }

  // 3. Vérification effective que chaque Flipbook résout bien sur le modèle global
  let verifiedCount = 0;
  for (const fb of updatedFlipbooks) {
    const resolved = resolveFlipbookSidebar(fb, globalTemplate);
    if (resolved.mode === 'global' && resolved.isGlobal === true) {
      verifiedCount++;
    } else {
      errors.push({
        id: fb?.id,
        title: fb?.title || 'Flipbook',
        message: "La vérification du mode global a échoué après application."
      });
    }
  }

  const allSucceeded = errors.length === 0 && verifiedCount === updatedFlipbooks.length;

  return {
    success: allSucceeded,
    partial: errors.length > 0 && verifiedCount > 0,
    totalCount: analysis.totalCount,
    alreadyGlobalCount: analysis.globalCount,
    replacedCustomCount: analysis.customCount,
    backedUpCount: analysis.customWithBlocksCount,
    verifiedCount,
    firestoreSuccessCount,
    errorCount: errors.length,
    errors,
    updatedFlipbooks
  };
};

