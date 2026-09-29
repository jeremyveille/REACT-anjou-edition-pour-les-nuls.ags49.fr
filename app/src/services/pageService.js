import { db, auth, storage } from '../firebase';
import { hasAdminClaim } from '../hooks/useAdminSession';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { galleryImages, videosData, flipbooksData, articlesData } from '../data';
import { normalizeBlocks, getDefaultHomepageBlocks } from '../components/page-builder/blockRegistry';

/**
 * Purge récursivement les anciens blocs de flipbook reader et le bloc d'introduction de la page d'accueil.
 */
export const sanitizeHomePageBlocks = (blocksList) => {
  if (!Array.isArray(blocksList)) return [];
  
  const isExcludedHomeBlock = (block) => {
    if (!block || typeof block !== 'object') return false;
    if (block.type === 'flipbookFeatured') {
      const mode = block.settings?.mode;
      const title = block.settings?.title || '';
      const selectedId = block.settings?.selectedBookId;
      if (mode === 'reader' || title.toLowerCase().includes('lecteur de flipbook') || title.toLowerCase().includes('guide historique') || selectedId === '3322') {
        return true;
      }
    }
    if (block.type === 'heading') {
      const content = (block.settings?.content || '').toLowerCase();
      if (content.includes('bienvenue sur le portail')) return true;
    }
    if (block.type === 'text') {
      const content = (block.settings?.content || '').toLowerCase();
      if (content.includes('explorez le patrimoine')) return true;
    }
    return false;
  };

  const sanitizeTree = (list) => {
    return list
      .filter(block => !isExcludedHomeBlock(block))
      .map(block => {
        if (Array.isArray(block.children)) {
          const filteredChildren = sanitizeTree(block.children);
          return { ...block, children: filteredChildren };
        }
        return block;
      })
      .filter(block => {
        // Supprimer les sections ou conteneurs devenus vides après suppression
        if ((block.type === 'section' || block.type === 'container' || block.type === 'row' || block.type === 'column') && Array.isArray(block.children) && block.children.length === 0) {
          return false;
        }
        return true;
      });
  };

  return sanitizeTree(blocksList);
};

/**
 * Récupère la liste synchronisée des flipbooks (LocalStorage d'abord, fallback sur les données initiales).
 */
export const getLocalFlipbooksSync = () => {
  try {
    const local = localStorage.getItem('ae_flipbooks');
    if (local !== null) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        return parsed.filter(fb => 
          fb && fb.id !== '3322' && 
          !(fb.title || '').toLowerCase().includes('guide historique') &&
          !(fb.pdfFile || '').toLowerCase().includes('guide_historique')
        ).map((fb) => ({
          ...fb,
          pdfFile: fb.pdfFile || (fb.id === '4455' ? 'secrets_vignoble_angevin.pdf' : 'Seraphin-le-marin.pdf')
        }));
      }
    }
  } catch (e) {
    console.warn("Erreur lors de la lecture des flipbooks locaux", e);
  }
  return flipbooksData.filter(
    fb => fb && fb.id !== '3322' && !(fb.title || '').toLowerCase().includes('guide historique')
  ).map((fb) => ({
    ...fb,
    pdfFile: fb.pdfFile || (fb.id === '4455' ? 'secrets_vignoble_angevin.pdf' : 'Seraphin-le-marin.pdf')
  }));
};

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
export const isAuthorizedAdmin = async () => hasAdminClaim(auth && auth.currentUser);

const requireAdmin = async () => {
  if (!(await isAuthorizedAdmin())) {
    const error = new Error('Cette action nécessite un compte administrateur.');
    error.code = 'permission-denied';
    throw error;
  }
  if (!db) {
    const error = new Error('Enregistrement indisponible : connexion au service requise.');
    error.code = 'unavailable';
    throw error;
  }
};

const isPermissionError = error => /permission-denied|unauthenticated|unauthorized/.test(error?.code || '');

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
  async log({ action, resourceType, resourceId, resourceTitle, details = {} }) {
    await requireAdmin();
    const user = auth.currentUser;
    const entry = {
      timestamp: new Date().toISOString(), action, resourceType,
      resourceId: String(resourceId || 'unknown'), resourceTitle: String(resourceTitle || 'Sans titre'),
      actorId: user.uid, actorEmail: user.email || '', actorRole: 'admin', details
    };
    // A failed audit write must not turn a committed content write into a false failure.
    try { await addDoc(collection(db, 'auditLogs'), entry); }
    catch (error) { console.error('Journalisation distante indisponible.', error); return { ...entry, auditStored: false }; }
    return { ...entry, auditStored: true };
  },
  async getLogs() {
    await requireAdmin();
    const snapshot = await getDocs(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc')));
    return (snapshot?.docs || []).map(d => ({ id: d.id, ...d.data() }));
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
  async getPages(collectionName = 'pages', { publishedOnly = false } = {}) {
    if (!['pages', 'articles'].includes(collectionName)) throw new Error('Collection éditoriale inconnue.');
    const isAdmin = publishedOnly ? false : await isAuthorizedAdmin();
    const publicOnly = publishedOnly || !isAdmin;
    const cacheCollection = publicOnly ? 'public_' + collectionName : collectionName;
    const prepare = items => items
      .filter(item => !publicOnly || item.status === EDITORIAL_STATUS.PUBLISHED)
      .map(item => {
        let blocks = item.blocks || [];
        const isHome = collectionName === 'pages' && ((item.title || '').toLowerCase().includes('accueil') || ['home', 'accueil'].includes(item.slug));
        if (isHome) blocks = sanitizeHomePageBlocks(blocks);
        if (isHome && blocks.length === 0) blocks = getDefaultHomepageBlocks();
        return { ...item, status: normalizeStatus(item.status), blocks: normalizeBlocks(blocks) };
      }).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    try {
      if (!db) throw Object.assign(new Error('Service indisponible'), { code: 'unavailable' });
      const constraints = publicOnly ? [where('status', '==', 'published')] : [];
      const snapshot = await getDocs(query(collection(db, collectionName), ...constraints));
      const items = prepare((snapshot?.docs || []).map(item => ({ ...item.data(), id: item.id })));
      saveLocalItems(cacheCollection, items);
      return items;
    } catch (error) {
      if (isPermissionError(error)) throw error;
      // Only published public data is cached for unauthenticated offline reading.
      const local = getLocalItems(cacheCollection);
      if (local.length) return prepare(local);
      if (collectionName === 'articles') return prepare(articlesData);
      return [];
    }
  },

  async savePage(pageData, id = null, collectionName = 'pages') {
    await requireAdmin();
    const user = auth.currentUser;
    const timestamp = new Date().toISOString();
    const status = normalizeStatus(pageData.status);
    const normalizedData = {
      ...pageData,
      title: pageData.title || 'Sans titre',
      slug: pageData.slug || (pageData.title || 'sans-titre').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: pageData.category || 'Outils', status,
      blocks: normalizeBlocks(await this.ensurePersistentBlocks(pageData.blocks || [])),
      updatedAt: timestamp, updatedBy: user.email || user.uid,
      version: id ? (Number(pageData.version) || 1) + 1 : 1
    };
    for (const field of ['image', 'thumbnailUrl']) {
      if (typeof normalizedData[field] === 'string' && normalizedData[field].startsWith('blob:')) {
        normalizedData[field] = await this.convertBlobToDataUrl(normalizedData[field]);
      }
    }
    if (!id) Object.assign(normalizedData, { createdAt: timestamp, createdBy: user.email || user.uid, creatorId: user.uid });
    if (status === EDITORIAL_STATUS.APPROVED) Object.assign(normalizedData, { approvedBy: user.email || user.uid, approvedAt: timestamp });
    if (status === EDITORIAL_STATUS.PUBLISHED) Object.assign(normalizedData, { publishedBy: user.email || user.uid, publishedAt: timestamp });
    delete normalizedData.id;
    delete normalizedData.isLocalOnly;
    Object.keys(normalizedData).forEach(key => { if (normalizedData[key] === undefined) delete normalizedData[key]; });
    let savedId = id;
    if (savedId) await setDoc(doc(db, collectionName, savedId), normalizedData, { merge: true });
    else savedId = (await addDoc(collection(db, collectionName), normalizedData)).id;
    if (!savedId) throw new Error('Le service n’a pas confirmé l’enregistrement.');
    const saved = { id: savedId, ...normalizedData };
    const local = getLocalItems(collectionName).filter(item => item.id !== savedId);
    saveLocalItems(collectionName, [saved, ...local]);
    await auditService.log({ action: id ? 'UPDATE' : 'CREATE', resourceType: collectionName === 'articles' ? 'article' : 'page', resourceId: savedId, resourceTitle: saved.title, details: { status, version: saved.version } });
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ae_content_updated', { detail: { collectionName, id: savedId, data: normalizedData } }));
    return saved;
  },

  async deletePage(id, collectionName = 'pages') {
    await requireAdmin();
    await deleteDoc(doc(db, collectionName, id));
    saveLocalItems(collectionName, getLocalItems(collectionName).filter(item => item.id !== id));
    saveLocalItems('public_' + collectionName, getLocalItems('public_' + collectionName).filter(item => item.id !== id));
    await auditService.log({ action: 'DELETE', resourceType: collectionName === 'articles' ? 'article' : 'page', resourceId: id });
  },

  async updateStatus(id, status, collectionName = 'pages') {
    await requireAdmin();
    const finalStatus = normalizeStatus(status);
    const user = auth.currentUser;
    const timestamp = new Date().toISOString();
    const updatePayload = { status: finalStatus, updatedAt: timestamp, updatedBy: user.email || user.uid };
    if (finalStatus === EDITORIAL_STATUS.APPROVED) Object.assign(updatePayload, { approvedBy: user.email || user.uid, approvedAt: timestamp });
    if (finalStatus === EDITORIAL_STATUS.PUBLISHED) Object.assign(updatePayload, { publishedBy: user.email || user.uid, publishedAt: timestamp });
    await updateDoc(doc(db, collectionName, id), updatePayload);
    saveLocalItems(collectionName, getLocalItems(collectionName).map(item => item.id === id ? { ...item, ...updatePayload } : item));
    if (finalStatus !== EDITORIAL_STATUS.PUBLISHED) saveLocalItems('public_' + collectionName, getLocalItems('public_' + collectionName).filter(item => item.id !== id));
    await auditService.log({ action: finalStatus === EDITORIAL_STATUS.PUBLISHED ? 'PUBLISH' : 'UPDATE', resourceType: collectionName === 'articles' ? 'article' : 'page', resourceId: id, details: { newStatus: finalStatus } });
    return updatePayload;
  },

  /**
   * Analyse et nettoie les doublons créés par les anciens mécanismes d'auto-seeding.
   * Conserve la version la plus récente et supprime les copies redondantes.
   * @param {string} collectionName 'pages' ou 'articles'.
   * @returns {Promise<{ totalFound: number, uniqueCount: number, removedIds: string[] }>}
   */
  async deduplicateItems(collectionName = 'pages') {
    await requireAdmin();
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
      if (isPermissionError(err)) throw err;
      console.warn('Médiathèque hors ligne : utilisation du cache.', err);
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

    const defaultImages = [
      {
        id: "media_anjou_edition_livre",
        name: "Livre Anjou Édition",
        url: "/anjou-edition-livre.png",
        type: "image",
        mimeType: "image/png",
        size: 87044,
        alt: "Anjou Édition - Une maison d’édition ouverte à tous",
        createdAt: new Date().toISOString()
      },
      ...(galleryImages || []).map((img, i) => ({
        id: img.id || `sample_img_${i}`,
        name: img.title || `Image ${i + 1}`,
        url: img.url,
        type: 'image',
        mimeType: 'image/jpeg',
        size: 154000,
        alt: img.description || img.title,
        createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString()
      }))
    ];

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
   * Convertit une URL blob: éphémère du navigateur en Data URL (Base64) permanent.
   * Si le blob ne peut pas être lu (ex: session fermée, environnement Node), bascule sur l'image persistante du projet.
   */
  async convertBlobToDataUrl(blobUrl) {
    if (!blobUrl || typeof blobUrl !== 'string') {
      return '/anjou-edition-livre.png';
    }
    if (!blobUrl.startsWith('blob:')) {
      return blobUrl;
    }
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        const response = await fetch(blobUrl);
        if (response && typeof response.blob === 'function') {
          const blob = await response.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result || '/anjou-edition-livre.png');
            reader.onerror = () => resolve('/anjou-edition-livre.png');
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch (err) {
      console.warn('Impossible de convertir le blob URL vers Data URL, fallback persistant:', err);
    }
    // Fallback systématique : Ne JAMAIS laisser une URL blob: éphémère
    return '/anjou-edition-livre.png';
  },

  /**
   * Nettoie récursivement tous les blocs pour convertir les URLs blob: en Data URLs persistants.
   */
  async ensurePersistentBlocks(blocks = []) {
    if (!Array.isArray(blocks)) return [];
    const processed = [];
    for (const b of blocks) {
      const cloned = { ...b, settings: { ...(b.settings || {}) } };
      if (cloned.settings.src && typeof cloned.settings.src === 'string' && cloned.settings.src.startsWith('blob:')) {
        cloned.settings.src = await this.convertBlobToDataUrl(cloned.settings.src);
      }
      if (cloned.children && Array.isArray(cloned.children)) {
        cloned.children = await this.ensurePersistentBlocks(cloned.children);
      }
      processed.push(cloned);
    }
    return processed;
  },

  /**
   * Enregistre ou met à jour un élément multimédia.
   * @param {Object} mediaItem Métadonnées du média.
   * @returns {Promise<Object>} L'élément enregistré.
   */
  async saveMediaItem(mediaItem) {
    await requireAdmin();
    let finalMediaUrl = mediaItem.url || '';
    if (typeof finalMediaUrl === 'string' && finalMediaUrl.startsWith('blob:')) {
      finalMediaUrl = await this.convertBlobToDataUrl(finalMediaUrl);
    }

    const itemToSave = {
      id: mediaItem.id || `media_${Date.now()}`,
      name: mediaItem.name || 'Média sans titre',
      url: finalMediaUrl,
      type: mediaItem.type || (finalMediaUrl?.includes('youtube') ? 'video' : 'image'),
      mimeType: mediaItem.mimeType || (mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: mediaItem.size || 0,
      alt: mediaItem.alt || mediaItem.name || '',
      createdAt: mediaItem.createdAt || new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'media', itemToSave.id);
      await setDoc(docRef, itemToSave, { merge: true });
    } catch (err) {
      throw err;
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
    await requireAdmin();
    try {
      const docRef = doc(db, 'media', id);
      await deleteDoc(docRef);
    } catch (err) {
      throw err;
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
   * Si Firebase Storage est indisponible ou hors-ligne, convertit le fichier/blob en Data URL (Base64) permanent.
   * @param {File|Blob|string} file Le fichier ou l'URL à téléverser.
   * @param {Object} metadata Métadonnées additionnelles.
   * @returns {Promise<string>} L'URL de téléchargement publique permanente.
   */
  async uploadMedia(file, metadata = {}) {
    await requireAdmin();
    const timestamp = Date.now();
    const fileName = (typeof file === 'string' ? 'media_upload' : (file?.name || 'media_upload'));
    const uniqueName = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    let downloadUrl = '';

    // 1. Essayer Firebase Storage si configuré et disponible
    if (storage && (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File))) {
      try {
        const storageRef = ref(storage, `builder-images/${uniqueName}`);
        const uploadResult = await uploadBytes(storageRef, file);
        downloadUrl = await getDownloadURL(uploadResult.ref);
      } catch (error) {
        if (isPermissionError(error)) throw error;
        console.warn('Firebase Storage indisponible, tentative de stockage du média dans Firestore.', error);
      }
    }

    // 2. Si Storage indisponible ou si file est un blob: URL / string, convertir en Data URL permanent (Base64)
    if (!downloadUrl) {
      try {
        if (typeof file === 'string') {
          if (file.startsWith('blob:')) {
            downloadUrl = await this.convertBlobToDataUrl(file);
          } else {
            downloadUrl = file;
          }
        } else if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
          downloadUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
        }
      } catch (e) {
        console.warn('Erreur lors de la conversion permanente du média:', e);
      }
    }

    if (!downloadUrl) {
      downloadUrl = '/anjou-edition-livre.png';
    }

    const type = (typeof file === 'object' && file.type?.startsWith('video/')) ? 'video' : 
                 (typeof file === 'object' && file.type?.startsWith('audio/')) ? 'audio' : 
                 (typeof file === 'object' && file.type?.includes('pdf')) ? 'document' : 'image';

    const mediaItem = {
      id: `media_${timestamp}`,
      name: fileName,
      url: downloadUrl,
      type: type,
      mimeType: (typeof file === 'object' ? file.type : null) || (type === 'image' ? 'image/png' : 'video/mp4'),
      size: (typeof file === 'object' ? file.size : 0) || 0,
      alt: metadata.alt || fileName.replace(/\.[^/.]+$/, ''),
      createdAt: new Date().toISOString()
    };

    await this.saveMediaItem(mediaItem);

    return downloadUrl;
  },

  /**
   * Récupère la liste synchronisée des flipbooks.
   */
  getLocalFlipbooksSync() {
    return getLocalFlipbooksSync();
  },

  /**
   * Récupère l'article mis en avant pour la page d'accueil.
   * Priorité : ID enregistré dans localStorage / Firestore > article avec isFeatured > premier article par défaut.
   */
  async getFeaturedArticle() {
    try {
      const articles = await this.getPages('articles', { publishedOnly: true });
      if (!articles || articles.length === 0) {
        return articlesData[0] || null;
      }

      // 1. Vérifier dans Firestore settings/homepage si db disponible
      if (db) {
        try {
          const snap = await getDoc(doc(db, 'settings', 'homepage'));
          if (snap && snap.exists && snap.exists()) {
            const data = snap.data();
            if (data && data.featuredArticleId) {
              const matching = articles.find(a => a.id === data.featuredArticleId || a.slug === data.featuredArticleId);
              if (matching) return matching;
            }
          }
        } catch (err) {}
      }
      
      // 2. Vérifier dans localStorage
      const savedFeaturedId = localStorage.getItem('ae_featured_article_id');
      if (savedFeaturedId) {
        const matching = articles.find(a => a.id === savedFeaturedId || a.slug === savedFeaturedId);
        if (matching) return matching;
      }

      // 3. Vérifier un article marqué isFeatured
      const explicitFeatured = articles.find(a => a.isFeatured === true || a.isHomeFeatured === true);
      if (explicitFeatured) return explicitFeatured;

      // 4. Fallback par défaut sur le nouvel article de présentation
      const defaultArticle = articles.find(a => a.slug === 'anjou-edition-maison-edition-ouverte-a-tous' || a.id === 'art_presentation_anjou_edition');
      if (defaultArticle) return defaultArticle;

      return articles[0];
    } catch (e) {
      return articlesData[0] || null;
    }
  },

  /**
   * Définit quel article est mis en avant sur la page d'accueil et persiste le choix.
   */
  async setFeaturedArticle(articleId) {
    await requireAdmin();
    const articles = await this.getPages('articles', { publishedOnly: true });
    if (!articles.some(article => article.id === articleId)) throw new Error('Seul un article publié peut être mis en avant.');
    await setDoc(doc(db, 'settings', 'homepage'), { featuredArticleId: articleId, updatedAt: new Date().toISOString() });
    localStorage.setItem('ae_featured_article_id', articleId);
    return true;
  }
};
