import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { compressBase64ImageIfNeeded } from "../utils/imageOptimizer";

/**
 * Limite de sécurité en octets pour un document Firestore (limite stricte Firestore : 1 048 576 octets)
 */
export const FIRESTORE_SAFE_DOC_LIMIT = 750 * 1024;
const SIDEBAR_CHUNK_SIZE = 700 * 1024;

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
 * Compresse automatiquement les images Data URL (Base64) volumineuses présentes dans une liste de blocs
 * afin de prévenir le dépassement de la limite de 1 Mo de Firestore.
 */
export const optimizeSidebarBlocks = async (blocks = []) => {
  if (!Array.isArray(blocks)) return [];
  const optimized = [];
  for (const b of blocks) {
    if (!b || typeof b !== 'object') {
      optimized.push(b);
      continue;
    }
    const cloned = { ...b };
    if (typeof cloned.imageUrl === 'string' && cloned.imageUrl.startsWith('data:image/')) {
      cloned.imageUrl = await compressBase64ImageIfNeeded(cloned.imageUrl, {
        thresholdBytes: 90 * 1024,
        maxWidth: 850,
        maxHeight: 850,
        quality: 0.78
      });
    }
    if (typeof cloned.url === 'string' && cloned.url.startsWith('data:image/')) {
      cloned.url = await compressBase64ImageIfNeeded(cloned.url, {
        thresholdBytes: 90 * 1024,
        maxWidth: 850,
        maxHeight: 850,
        quality: 0.78
      });
    }
    optimized.push(cloned);
  }
  return optimized;
};

/**
 * Charge le modèle global depuis Firestore avec fallback LocalStorage et support du découpage (chunks)
 */
export const fetchGlobalSidebarTemplate = async () => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return getLocalGlobalSidebar();
  }
  try {
    if (db) {
      const docRef = doc(db, "settings", "flipbook_global_sidebar");
      const snap = await getDoc(docRef);
      if (snap && snap.exists()) {
        const data = snap.data() || {};
        let rawData = { ...data };

        // Si les barres latérales ont été découpées en chunks pour respecter la limite de 1 Mo Firestore
        if (data.isChunked && Number(data.chunkCount) > 0) {
          try {
            const chunkPromises = [];
            for (let i = 0; i < Number(data.chunkCount); i++) {
              chunkPromises.push(getDoc(doc(db, "settings", `flipbook_global_sidebar_chunk_${i}`)));
            }
            const chunkSnaps = await Promise.all(chunkPromises);
            const orderedChunks = chunkSnaps
              .filter(cs => cs && typeof cs.exists === 'function' && cs.exists())
              .map(cs => cs.data())
              .sort((a, b) => (a.index || 0) - (b.index || 0))
              .map(c => c.data || '');
            const joinedJson = orderedChunks.join('');
            if (joinedJson) {
              const parsedSidebars = JSON.parse(joinedJson);
              if (Array.isArray(parsedSidebars.leftSidebar)) {
                rawData.leftSidebar = parsedSidebars.leftSidebar;
              }
              if (Array.isArray(parsedSidebars.rightSidebar)) {
                rawData.rightSidebar = parsedSidebars.rightSidebar;
              }
            }
          } catch (chunkErr) {
            console.warn("Erreur lors de la recomposition des chunks du modèle global:", chunkErr);
          }
        }

        const fullTemplate = normalizeSidebarTemplate(rawData);
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
 * Intègre :
 * - La séparation de `previousVersion` hors du document principal (évitant de doubler sa taille)
 * - La compression automatique des images Base64 volumineuses
 * - Le découpage automatique en documents chunks si le modèle dépasse 750 Ko
 */
export const saveGlobalSidebarTemplate = async (template) => {
  const currentSaved = getLocalGlobalSidebar();
  const cleanPrevious = { ...currentSaved };
  delete cleanPrevious.previousVersion;

  const normalized = normalizeSidebarTemplate(template);
  const optimizedLeft = await optimizeSidebarBlocks(normalized.leftSidebar);
  const optimizedRight = await optimizeSidebarBlocks(normalized.rightSidebar);
  const nextVersion = (Number(currentSaved.version) || 1) + 1;

  const dataToSave = {
    ...normalized,
    leftSidebar: optimizedLeft,
    rightSidebar: optimizedRight,
    id: "global-flipbook-sidebars",
    name: "Modèle global — Anjou Édition",
    version: nextVersion,
    updatedAt: new Date().toISOString()
  };
  delete dataToSave.previousVersion;

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

  // 3. Sauvegarde distante Firestore si disponible (avec protection stricte contre la limite de 1 Mo)
  let firestoreSuccess = false;
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (!isOffline && db) {
    try {
      const docRef = doc(db, "settings", "flipbook_global_sidebar");
      const serializedPayload = JSON.stringify(dataToSave);

      if (serializedPayload.length <= FIRESTORE_SAFE_DOC_LIMIT) {
        await setDoc(docRef, {
          ...dataToSave,
          isChunked: false,
          chunkCount: 0
        });
        firestoreSuccess = true;
      } else {
        // Découpage automatique des barres latérales en tranches de 700 Ko dans settings/flipbook_global_sidebar_chunk_i
        const sidebarsJson = JSON.stringify({
          leftSidebar: dataToSave.leftSidebar || [],
          rightSidebar: dataToSave.rightSidebar || []
        });
        const chunks = [];
        for (let i = 0; i < sidebarsJson.length; i += SIDEBAR_CHUNK_SIZE) {
          chunks.push(sidebarsJson.substring(i, i + SIDEBAR_CHUNK_SIZE));
        }

        await Promise.all(
          chunks.map((chunkData, index) =>
            setDoc(doc(db, "settings", `flipbook_global_sidebar_chunk_${index}`), {
              index,
              data: chunkData,
              updatedAt: dataToSave.updatedAt
            })
          )
        );

        await setDoc(docRef, {
          ...dataToSave,
          leftSidebar: [],
          rightSidebar: [],
          isChunked: true,
          chunkCount: chunks.length
        });
        firestoreSuccess = true;
      }
    } catch (err) {
      console.warn("Échec sauvegarde Firestore modèle global:", err);
    }
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
 * Extrait de façon tolérante les blocs configurés pour une barre latérale ('left' ou 'right')
 * en prenant en charge toutes les conventions et alias de propriétés :
 * leftSidebar / rightSidebar, leftBlocks / rightBlocks, sidebarLeft / sidebarRight, etc.
 * Renvoie un tableau ou null si la propriété n'est pas définie.
 */
export const extractSidebarBlocks = (flipbook, side = 'left') => {
  if (!flipbook || typeof flipbook !== 'object') return null;

  if (side === 'left') {
    if (Array.isArray(flipbook.leftSidebar)) return flipbook.leftSidebar;
    if (Array.isArray(flipbook.leftBlocks)) return flipbook.leftBlocks;
    if (Array.isArray(flipbook.sidebarLeft)) return flipbook.sidebarLeft;
    if (Array.isArray(flipbook.left)) return flipbook.left;
    if (flipbook.sidebars && Array.isArray(flipbook.sidebars.left)) return flipbook.sidebars.left;
    if (Array.isArray(flipbook.blocks)) {
      const filtered = flipbook.blocks.filter(b => b && (b.position === 'left' || b.side === 'left'));
      if (filtered.length > 0) return filtered;
    }
    return null;
  }

  if (side === 'right') {
    if (Array.isArray(flipbook.rightSidebar)) return flipbook.rightSidebar;
    if (Array.isArray(flipbook.rightBlocks)) return flipbook.rightBlocks;
    if (Array.isArray(flipbook.sidebarRight)) return flipbook.sidebarRight;
    if (Array.isArray(flipbook.right)) return flipbook.right;
    if (flipbook.sidebars && Array.isArray(flipbook.sidebars.right)) return flipbook.sidebars.right;
    if (Array.isArray(flipbook.blocks)) {
      const filtered = flipbook.blocks.filter(b => b && (b.position === 'right' || b.side === 'right'));
      if (filtered.length > 0) return filtered;
    }
    return null;
  }

  return null;
};

/**
 * Résout les barres latérales d'un flipbook selon son mode :
 * - Mode 'global' : utilise une référence dynamique au modèle global partagé
 * - Mode 'custom' : utilise la configuration propre au flipbook
 * - Héritage intelligent : si une barre latérale est indéfinie ou non transmise,
 *   elle hérite automatiquement de la barre correspondante du modèle global.
 * - Rétro-compatibilité : support des alias (rightSidebar, rightBlocks, sidebarRight, etc.)
 *   et des styles (styles, sidebarStyles).
 */
export const resolveFlipbookSidebar = (flipbook, globalTemplate = null) => {
  const currentGlobal = globalTemplate ? normalizeSidebarTemplate(globalTemplate) : getLocalGlobalSidebar();
  const globalLeft = Array.isArray(currentGlobal.leftSidebar) ? currentGlobal.leftSidebar : (DEFAULT_GLOBAL_SIDEBAR.leftSidebar || []);
  const globalRight = Array.isArray(currentGlobal.rightSidebar) ? currentGlobal.rightSidebar : (DEFAULT_GLOBAL_SIDEBAR.rightSidebar || []);
  const globalStyles = currentGlobal.styles || DEFAULT_GLOBAL_SIDEBAR.styles || {};

  if (!flipbook) {
    return {
      mode: 'global',
      isGlobal: true,
      leftSidebar: globalLeft,
      rightSidebar: globalRight,
      styles: globalStyles
    };
  }

  const explicitMode = flipbook.sidebarMode;
  const bookStyles = flipbook.styles || flipbook.sidebarStyles || {};
  const mergedStyles = {
    ...globalStyles,
    ...bookStyles
  };

  if (explicitMode === 'global') {
    return {
      mode: 'global',
      isGlobal: true,
      leftSidebar: globalLeft,
      rightSidebar: globalRight,
      styles: mergedStyles
    };
  }

  const rawLeft = extractSidebarBlocks(flipbook, 'left');
  const rawRight = extractSidebarBlocks(flipbook, 'right');

  if (explicitMode === 'custom') {
    return {
      mode: 'custom',
      isGlobal: false,
      leftSidebar: rawLeft !== null ? rawLeft : globalLeft,
      rightSidebar: rawRight !== null ? rawRight : globalRight,
      styles: mergedStyles
    };
  }

  // Si le mode n'est pas explicite (anciens flipbooks existants) :
  // Si le flipbook possède au moins une barre définie, on conserve sa configuration
  // et on complète la barre non transmise par le modèle global.
  if (rawLeft !== null || rawRight !== null) {
    return {
      mode: 'custom',
      isGlobal: false,
      leftSidebar: rawLeft !== null ? rawLeft : globalLeft,
      rightSidebar: rawRight !== null ? rawRight : globalRight,
      styles: mergedStyles
    };
  }

  // Par défaut pour tout nouveau flipbook ou sans barres définies : modèle global
  return {
    mode: 'global',
    isGlobal: true,
    leftSidebar: globalLeft,
    rightSidebar: globalRight,
    styles: mergedStyles
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
          const backupStr = JSON.stringify(fb.customSidebarBackup);
          if (backupStr.length <= 350 * 1024) {
            payload.customSidebarBackup = fb.customSidebarBackup;
          } else {
            // Si le backup personnalisé est volumineux, le stocker dans la sous-collection dédiée
            try {
              await setDoc(doc(db, `flipbooks/${String(fb.id)}/backups`, 'custom_sidebar'), fb.customSidebarBackup);
              payload.hasCustomSidebarBackupDoc = true;
            } catch (subErr) {
              // ignore
            }
          }
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

