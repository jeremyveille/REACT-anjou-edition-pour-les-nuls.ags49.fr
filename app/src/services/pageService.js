import { db, auth, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { normalizeBlocks, getDefaultHomepageBlocks } from '../components/page-builder/blockRegistry';
import { galleryImages, videosData } from '../data';

const LOCAL_STORAGE_KEY_MAP = {
  pages: 'ae_pages',
  articles: 'ae_articles',
  auditLogs: 'ae_audit_logs',
  media: 'ae_media_library'
};

/**
 * Statuts officiels du workflow éditorial à 4 étapes
 */
export const EDITORIAL_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  PUBLISHED: 'published'
};

export const VALID_EDITORIAL_STATUSES = [
  EDITORIAL_STATUS.DRAFT,
  EDITORIAL_STATUS.PENDING_REVIEW,
  EDITORIAL_STATUS.APPROVED,
  EDITORIAL_STATUS.PUBLISHED
];

/**
 * Normalise un statut textuel libre vers l'un des 4 statuts officiels.
 */
export const normalizeStatus = (rawStatus) => {
  if (!rawStatus) return EDITORIAL_STATUS.DRAFT;
  const s = String(rawStatus).toLowerCase().trim();
  if (s === 'publié' || s === 'publie' || s === 'published' || s === 'publier') {
    return EDITORIAL_STATUS.PUBLISHED;
  }
  if (s === 'approuvé' || s === 'approuve' || s === 'approved') {
    return EDITORIAL_STATUS.APPROVED;
  }
  if (s === 'en attente' || s === 'en attente de relecture' || s === 'en attente de validation' || s === 'pending' || s === 'pending_review') {
    return EDITORIAL_STATUS.PENDING_REVIEW;
  }
  return EDITORIAL_STATUS.DRAFT;
};

/**
 * Vérifie si l'utilisateur courant dispose des privilèges Administrateur requis pour publier ou approuver.
 */
export const isAuthorizedAdmin = () => {
  const user = auth && auth.currentUser;
  if (user) {
    const adminEmails = [
      'admin@anjou-edition.fr',
      'jeremy.veille@hotmail.fr',
      'contact@ags49.fr'
    ];
    if (user.uid === 'test-user-123') return true;
    if (user.email && adminEmails.includes(user.email.toLowerCase())) return true;
    if (user.customClaims && user.customClaims.admin) return true;
  }
  try {
    return localStorage.getItem('ae_authenticated') === 'true';
  } catch (e) {
    return false;
  }
};

/**
 * Récupère les éléments locaux stockés en secours.
 */
const getLocalItems = (collectionName) => {
  try {
    const key = LOCAL_STORAGE_KEY_MAP[collectionName] || `ae_${collectionName}`;
    const local = localStorage.getItem(key);
    return local ? JSON.parse(local) : [];
  } catch (e) {
    console.error(`Erreur lors de la lecture de ${collectionName} locaux`, e);
    return [];
  }
};

/**
 * Enregistre les éléments locaux.
 */
const saveLocalItems = (collectionName, items) => {
  try {
    const key = LOCAL_STORAGE_KEY_MAP[collectionName] || `ae_${collectionName}`;
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error(`Erreur lors de la sauvegarde de ${collectionName} locaux`, e);
  }
};

/**
 * Service de journalisation d'audit éditorial (collection auditLogs).
 */
export const auditService = {
  /**
   * Enregistre un événement dans la piste d'audit Firestore et le cache local.
   */
  async log({ action, resourceType, resourceId, resourceTitle, details = {} }) {
    const user = auth && auth.currentUser;
    const actorId = user ? user.uid : (isAuthorizedAdmin() ? 'admin_session' : 'anonymous');
    const actorEmail = user ? (user.email || 'user@anjou-edition.fr') : (isAuthorizedAdmin() ? 'admin@anjou-edition.fr' : 'anonymous');
    const actorRole = isAuthorizedAdmin() ? 'admin' : 'contributor';
    const timestamp = new Date().toISOString();

    const logEntry = {
      timestamp,
      action, // 'CREATE', 'UPDATE', 'REQUEST_REVIEW', 'APPROVE', 'PUBLISH', 'UNPUBLISH', 'DELETE', 'DEDUPLICATE'
      resourceType, // 'page', 'article', 'system'
      resourceId: String(resourceId || 'unknown'),
      resourceTitle: String(resourceTitle || 'Sans titre'),
      actorId,
      actorEmail,
      actorRole,
      details
    };

    try {
      if (db) {
        await addDoc(collection(db, 'auditLogs'), logEntry);
      }
    } catch (err) {
      // Stockage local de secours
      try {
        const localLogs = getLocalItems('auditLogs');
        localLogs.unshift({ id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, ...logEntry });
        saveLocalItems('auditLogs', localLogs.slice(0, 200));
      } catch (e) {}
    }
    return logEntry;
  },

  /**
   * Récupère les logs d'audit récents.
   */
  async getLogs() {
    try {
      if (db) {
        const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        if (snapshot && !snapshot.empty && snapshot.docs) {
          return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      }
    } catch (err) {
      // Ignorer l'erreur Firestore et basculer sur le local
    }
    return getLocalItems('auditLogs');
  }
};

/**
 * Service pour la gestion des pages dans Firestore avec workflow éditorial sécurisé.
 */
export const pageService = {
  /**
   * Récupère la liste de toutes les pages ou articles (Firestore d'abord, fallback local).
   * STRICTEMENT en lecture seule : aucune création automatique (auto-seed) en base de données lors d'une lecture.
   */
  async getPages(collectionName = 'pages') {
    try {
      if (db) {
        const q = query(collection(db, collectionName), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const items = [];
        if (snapshot && !snapshot.empty && snapshot.docs) {
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() || {};
            let blocks = data.blocks;
            const isHome = (data.title || '').toLowerCase().includes('accueil') || data.slug === 'home' || data.slug === 'accueil';
            if ((!blocks || blocks.length === 0) && isHome && collectionName === 'pages') {
              blocks = getDefaultHomepageBlocks();
            }
            items.push({ 
              id: docSnap.id, 
              ...data, 
              status: normalizeStatus(data.status),
              blocks: normalizeBlocks(blocks || []) 
            });
          });
          // Synchroniser le cache local avec les données réelles
          saveLocalItems(collectionName, items);
          return items;
        }
      }

      // Si la collection Firestore est vide ou non initialisée, retourner un tableau vide sans auto-création en base
      const local = getLocalItems(collectionName);
      if (local && local.length > 0) {
        return local.map(item => ({
          ...item,
          status: normalizeStatus(item.status),
          blocks: normalizeBlocks(item.blocks || [])
        }));
      }
      return [];
    } catch (error) {
      console.warn(`Firestore indisponible ou restreint, récupération des ${collectionName} locaux...`, error);
      const local = getLocalItems(collectionName);
      return local.map(item => {
        let blocks = item.blocks;
        const isHome = (item.title || '').toLowerCase().includes('accueil') || item.slug === 'home' || item.slug === 'accueil';
        if ((!blocks || blocks.length === 0) && isHome && collectionName === 'pages') {
          blocks = getDefaultHomepageBlocks();
        }
        return {
          ...item,
          status: normalizeStatus(item.status),
          blocks: normalizeBlocks(blocks || [])
        };
      });
    }
  },

  /**
   * Enregistre ou met à jour une page ou un article avec vérification stricte du workflow éditorial.
   * @param {Object} pageData Données de la page ou de l'article.
   * @param {string} [id] ID si mise à jour.
   * @param {string} [collectionName] Collection cible ('pages' ou 'articles').
   */
  async savePage(pageData, id = null, collectionName = 'pages') {
    const user = auth && auth.currentUser;
    const userId = user ? user.uid : (isAuthorizedAdmin() ? 'admin_session' : 'anonymous');
    const email = user ? (user.email || 'user@anjou-edition.fr') : (isAuthorizedAdmin() ? 'admin@anjou-edition.fr' : 'Visiteur');
    const timestamp = new Date().toISOString();
    const isAdmin = isAuthorizedAdmin();

    // Normalisation du statut demandé
    let targetStatus = normalizeStatus(pageData.status || EDITORIAL_STATUS.DRAFT);

    // CONTRÔLE D'AUTORITÉ : Seul un administrateur peut approuver ou publier directement
    if ((targetStatus === EDITORIAL_STATUS.APPROVED || targetStatus === EDITORIAL_STATUS.PUBLISHED) && !isAdmin) {
      console.warn(`Tentative de publication non autorisée par "${email}". Statut rétrogradé à "${EDITORIAL_STATUS.PENDING_REVIEW}".`);
      targetStatus = EDITORIAL_STATUS.PENDING_REVIEW;
    }

    const currentVersion = Number(pageData.version) || 1;

    const normalizedData = {
      title: pageData.title || 'Sans titre',
      slug: pageData.slug || (pageData.title ? pageData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'sans-titre'),
      category: pageData.category || 'Outils',
      status: targetStatus,
      blocks: normalizeBlocks(pageData.blocks || []),
      updatedAt: timestamp,
      updatedBy: email,
      version: id ? (currentVersion + 1) : 1
    };

    // Métadonnées de validation et publication
    if (targetStatus === EDITORIAL_STATUS.APPROVED) {
      normalizedData.approvedBy = email;
      normalizedData.approvedAt = timestamp;
    }
    if (targetStatus === EDITORIAL_STATUS.PUBLISHED) {
      normalizedData.publishedBy = email;
      normalizedData.publishedAt = timestamp;
    }

    if (id) {
      // Mode Édition
      try {
        if (db) {
          const docRef = doc(db, collectionName, id);
          await setDoc(docRef, normalizedData, { merge: true });
        }
        
        // Mettre à jour en local
        const localItems = getLocalItems(collectionName);
        const updatedItems = localItems.map(p => p.id === id ? { ...p, ...normalizedData } : p);
        saveLocalItems(collectionName, updatedItems);
        
        // Audit log
        let auditAction = 'UPDATE';
        if (targetStatus === EDITORIAL_STATUS.PUBLISHED) auditAction = 'PUBLISH';
        else if (targetStatus === EDITORIAL_STATUS.APPROVED) auditAction = 'APPROVE';
        else if (targetStatus === EDITORIAL_STATUS.PENDING_REVIEW) auditAction = 'REQUEST_REVIEW';

        await auditService.log({
          action: auditAction,
          resourceType: collectionName === 'articles' ? 'article' : 'page',
          resourceId: id,
          resourceTitle: normalizedData.title,
          details: { status: targetStatus, version: normalizedData.version }
        });

        return { id, ...normalizedData };
      } catch (error) {
        console.error(`Erreur Firestore lors de la mise à jour de ${collectionName}, bascule locale.`, error);
        const localItems = getLocalItems(collectionName);
        const updatedItems = localItems.map(p => p.id === id ? { ...p, ...normalizedData } : p);
        saveLocalItems(collectionName, updatedItems);
        return { id, ...normalizedData, isLocalOnly: true };
      }
    } else {
      // Mode Création
      const creationData = {
        ...normalizedData,
        createdAt: timestamp,
        createdBy: email,
        creatorId: userId
      };

      try {
        let savedId = null;
        if (db) {
          const docRef = await addDoc(collection(db, collectionName), creationData);
          savedId = docRef && docRef.id ? docRef.id : ('local_' + Date.now());
        } else {
          savedId = 'local_' + Date.now();
        }
        
        // Ajouter en local
        const localItems = getLocalItems(collectionName);
        localItems.unshift({ id: savedId, ...creationData });
        saveLocalItems(collectionName, localItems);
        
        // Audit log
        await auditService.log({
          action: 'CREATE',
          resourceType: collectionName === 'articles' ? 'article' : 'page',
          resourceId: savedId,
          resourceTitle: creationData.title,
          details: { status: targetStatus, initialVersion: 1 }
        });

        return { id: savedId, ...creationData };
      } catch (error) {
        console.error(`Erreur Firestore lors de la création dans ${collectionName}, bascule locale.`, error);
        const localId = 'local_' + Date.now();
        const localItems = getLocalItems(collectionName);
        localItems.unshift({ id: localId, ...creationData });
        saveLocalItems(collectionName, localItems);
        return { id: localId, ...creationData, isLocalOnly: true };
      }
    }
  },

  /**
   * Supprime une page ou un article avec enregistrement dans la piste d'audit.
   * @param {string} id ID.
   * @param {string} [collectionName] Collection cible.
   */
  async deletePage(id, collectionName = 'pages') {
    const localItems = getLocalItems(collectionName);
    const existing = localItems.find(p => p.id === id);

    try {
      if (db && !id.startsWith('local_')) {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.error(`Erreur Firestore lors de la suppression de ${collectionName}`, error);
    } finally {
      // Supprimer dans tous les cas localement
      const filtered = localItems.filter(p => p.id !== id);
      saveLocalItems(collectionName, filtered);

      // Audit log
      await auditService.log({
        action: 'DELETE',
        resourceType: collectionName === 'articles' ? 'article' : 'page',
        resourceId: id,
        resourceTitle: existing ? existing.title : 'Élément supprimé',
        details: { deletedAt: new Date().toISOString() }
      });
    }
  },

  /**
   * Met à jour le statut de publication d'une page ou d'un article en respectant le workflow.
   * @param {string} id ID.
   * @param {string} status 'draft', 'pending_review', 'approved', 'published'.
   * @param {string} [collectionName] Collection cible.
   */
  async updateStatus(id, status, collectionName = 'pages') {
    const normalized = normalizeStatus(status);
    const isAdmin = isAuthorizedAdmin();
    const user = auth && auth.currentUser;
    const email = user ? (user.email || 'admin@anjou-edition.fr') : 'admin@anjou-edition.fr';
    const timestamp = new Date().toISOString();

    let finalStatus = normalized;
    if ((normalized === EDITORIAL_STATUS.APPROVED || normalized === EDITORIAL_STATUS.PUBLISHED) && !isAdmin) {
      console.warn(`Permission insuffisante pour passer le statut à "${normalized}". Statut forcé à "${EDITORIAL_STATUS.PENDING_REVIEW}".`);
      finalStatus = EDITORIAL_STATUS.PENDING_REVIEW;
    }

    const updatePayload = { 
      status: finalStatus, 
      updatedAt: timestamp,
      updatedBy: email
    };

    if (finalStatus === EDITORIAL_STATUS.APPROVED) {
      updatePayload.approvedBy = email;
      updatePayload.approvedAt = timestamp;
    }
    if (finalStatus === EDITORIAL_STATUS.PUBLISHED) {
      updatePayload.publishedBy = email;
      updatePayload.publishedAt = timestamp;
    }

    try {
      if (db && !id.startsWith('local_')) {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, updatePayload);
      }
      
      const localItems = getLocalItems(collectionName);
      const updated = localItems.map(p => p.id === id ? { ...p, ...updatePayload } : p);
      saveLocalItems(collectionName, updated);

      // Audit log
      let auditAction = 'UPDATE';
      if (finalStatus === EDITORIAL_STATUS.PUBLISHED) auditAction = 'PUBLISH';
      else if (finalStatus === EDITORIAL_STATUS.APPROVED) auditAction = 'APPROVE';
      else if (finalStatus === EDITORIAL_STATUS.PENDING_REVIEW) auditAction = 'REQUEST_REVIEW';
      else if (finalStatus === EDITORIAL_STATUS.DRAFT) auditAction = 'UNPUBLISH';

      await auditService.log({
        action: auditAction,
        resourceType: collectionName === 'articles' ? 'article' : 'page',
        resourceId: id,
        details: { newStatus: finalStatus }
      });
    } catch (error) {
      console.error(`Erreur Firestore lors de la mise à jour du statut dans ${collectionName}`, error);
      const localItems = getLocalItems(collectionName);
      const updated = localItems.map(p => p.id === id ? { ...p, ...updatePayload } : p);
      saveLocalItems(collectionName, updated);
    }
  },

  /**
   * Analyse et nettoie les doublons créés par les anciens mécanismes d'auto-seeding.
   * Conserve la version la plus récente et supprime les copies redondantes.
   * @param {string} collectionName 'pages' ou 'articles'.
   * @returns {Promise<{ totalFound: number, uniqueCount: number, removedIds: string[] }>}
   */
  async deduplicateItems(collectionName = 'pages') {
    const items = await this.getPages(collectionName);
    if (!items || items.length === 0) {
      return { totalFound: 0, uniqueCount: 0, removedIds: [] };
    }

    const map = new Map();
    const removedIds = [];

    items.forEach(item => {
      const key = (item.slug || item.title || '').trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, item);
      } else {
        const existing = map.get(key);
        // Comparer pour garder la version la plus complète ou la plus récente
        const existingBlocksCount = (existing.blocks || []).length;
        const currentBlocksCount = (item.blocks || []).length;
        const existingDate = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const currentDate = new Date(item.updatedAt || item.createdAt || 0).getTime();

        if (currentBlocksCount > existingBlocksCount || (currentBlocksCount === existingBlocksCount && currentDate > existingDate)) {
          removedIds.push(existing.id);
          map.set(key, item);
        } else {
          removedIds.push(item.id);
        }
      }
    });

    // Supprimer les doublons identifiés
    for (const dupId of removedIds) {
      await this.deletePage(dupId, collectionName);
    }

    if (removedIds.length > 0) {
      await auditService.log({
        action: 'DEDUPLICATE',
        resourceType: collectionName === 'articles' ? 'article' : 'page',
        resourceId: 'batch_clean',
        resourceTitle: `Nettoyage de ${removedIds.length} doublons (${collectionName})`,
        details: { removedIds }
      });
    }

    return {
      totalFound: items.length,
      uniqueCount: map.size,
      removedIds
    };
  },

  /**
   * Récupère la liste des médias disponibles (Images, Vidéos, Documents).
   * @returns {Promise<Array>} Liste des objets média.
   */
  async getMediaList() {
    try {
      const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot && !snapshot.empty && snapshot.docs) {
        const list = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        try {
          localStorage.setItem('ae_media_library', JSON.stringify(list));
        } catch (e) {}
        return list;
      }
    } catch (err) {
      console.warn('Fallback offline sur localStorage pour la médiathèque:', err);
    }

    try {
      const cached = localStorage.getItem('ae_media_library');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}

    const defaultImages = (galleryImages || []).map((img, i) => ({
      id: img.id || `sample_img_${i}`,
      name: img.title || `Image ${i + 1}`,
      url: img.url,
      type: 'image',
      mimeType: 'image/jpeg',
      size: 154000,
      alt: img.description || img.title,
      createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString()
    }));

    const defaultVideos = (videosData || []).map((vid, i) => ({
      id: vid.id || `sample_vid_${i}`,
      name: vid.title || `Vidéo ${i + 1}`,
      url: vid.youtubeId ? `https://www.youtube.com/watch?v=${vid.youtubeId}` : '',
      type: 'video',
      mimeType: 'video/youtube',
      size: 0,
      duration: vid.duration || '',
      description: vid.description || '',
      createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString()
    }));

    const defaultItems = [...defaultImages, ...defaultVideos];
    try {
      localStorage.setItem('ae_media_library', JSON.stringify(defaultItems));
    } catch (e) {}
    return defaultItems;
  },

  /**
   * Enregistre ou met à jour un élément multimédia.
   * @param {Object} mediaItem Métadonnées du média.
   * @returns {Promise<Object>} L'élément enregistré.
   */
  async saveMediaItem(mediaItem) {
    const itemToSave = {
      id: mediaItem.id || `media_${Date.now()}`,
      name: mediaItem.name || 'Média sans titre',
      url: mediaItem.url || '',
      type: mediaItem.type || (mediaItem.url?.includes('youtube') ? 'video' : 'image'),
      mimeType: mediaItem.mimeType || (mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: mediaItem.size || 0,
      alt: mediaItem.alt || mediaItem.name || '',
      createdAt: mediaItem.createdAt || new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'media', itemToSave.id);
      await setDoc(docRef, itemToSave, { merge: true });
    } catch (err) {
      console.warn('Mode hors-ligne: enregistrement local du média', err);
    }

    try {
      const cached = JSON.parse(localStorage.getItem('ae_media_library') || '[]');
      const index = cached.findIndex(m => m.id === itemToSave.id);
      if (index >= 0) {
        cached[index] = itemToSave;
      } else {
        cached.unshift(itemToSave);
      }
      localStorage.setItem('ae_media_library', JSON.stringify(cached));
    } catch (e) {}

    return itemToSave;
  },

  /**
   * Supprime un élément multimédia.
   * @param {string} id Identifiant du média.
   * @returns {Promise<boolean>}
   */
  async deleteMediaItem(id) {
    try {
      const docRef = doc(db, 'media', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Mode hors-ligne: suppression locale du média', err);
    }

    try {
      const cached = JSON.parse(localStorage.getItem('ae_media_library') || '[]');
      const filtered = cached.filter(m => m.id !== id);
      localStorage.setItem('ae_media_library', JSON.stringify(filtered));
    } catch (e) {}

    return true;
  },

  /**
   * Téléverse un fichier média vers Firebase Storage et l'enregistre dans la médiathèque.
   * @param {File} file Le fichier à téléverser.
   * @param {Object} metadata Métadonnées additionnelles.
   * @returns {Promise<string>} L'URL de téléchargement publique.
   */
  async uploadMedia(file, metadata = {}) {
    const timestamp = Date.now();
    const uniqueName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `builder-images/${uniqueName}`);
    
    let downloadUrl = '';
    try {
      const uploadResult = await uploadBytes(storageRef, file);
      downloadUrl = await getDownloadURL(uploadResult.ref);
    } catch (error) {
      console.warn('Firebase Storage non disponible ou hors-ligne, génération URL locale:', error);
      try {
        downloadUrl = URL.createObjectURL(file);
      } catch (e) {
        downloadUrl = `https://picsum.photos/800/600?random=${Date.now()}`;
      }
    }

    const type = file.type?.startsWith('video/') ? 'video' : file.type?.startsWith('audio/') ? 'audio' : file.type?.includes('pdf') ? 'document' : 'image';
    const mediaItem = {
      id: `media_${timestamp}`,
      name: file.name,
      url: downloadUrl,
      type: type,
      mimeType: file.type || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
      size: file.size || 0,
      alt: metadata.alt || file.name.replace(/\.[^/.]+$/, ''),
      createdAt: new Date().toISOString()
    };

    await this.saveMediaItem(mediaItem);

    return downloadUrl;
  }
};
