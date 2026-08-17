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


const LOCAL_STORAGE_KEY_MAP = {
  pages: 'ae_pages',
  articles: 'ae_articles'
};

/**
 * Récupère les éléments locaux stockés en secours.
 */
const getLocalItems = (collectionName) => {
  try {
    const key = LOCAL_STORAGE_KEY_MAP[collectionName] || 'ae_pages';
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
    const key = LOCAL_STORAGE_KEY_MAP[collectionName] || 'ae_pages';
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error(`Erreur lors de la sauvegarde de ${collectionName} locaux`, e);
  }
};

/**
 * Service pour la gestion des pages dans Firestore avec fallback local.
 */
export const pageService = {
  /**
   * Récupère la liste de toutes les pages ou articles (Firestore d'abord, fallback local).
   */
  async getPages(collectionName = 'pages') {
    try {
      const q = query(collection(db, collectionName), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const items = [];
      if (snapshot && snapshot.docs) {
        snapshot.docs.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
      }

      // Synchroniser avec le local
      saveLocalItems(collectionName, items);
      return items;
    } catch (error) {
      console.warn(`Firestore indisponible, récupération des ${collectionName} locaux...`, error);
      return getLocalItems(collectionName);
    }
  },

  /**
   * Enregistre ou met à jour une page ou un article.
   * @param {Object} pageData Données de la page ou de l'article.
   * @param {string} [id] ID si mise à jour.
   * @param {string} [collectionName] Collection cible ('pages' ou 'articles').
   */
  async savePage(pageData, id = null, collectionName = 'pages') {
    const userId = auth.currentUser ? auth.currentUser.uid : 'anonymous';
    const email = auth.currentUser ? auth.currentUser.email : 'Visiteur anonyme';
    const timestamp = new Date().toISOString();

    const normalizedData = {
      title: pageData.title || 'Sans titre',
      slug: pageData.slug || (pageData.title ? pageData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'sans-titre'),
      category: pageData.category || 'Outils',
      status: pageData.status || 'draft',
      blocks: pageData.blocks || [],
      updatedAt: timestamp,
      updatedBy: email,
    };

    if (id) {
      // Mode Édition
      try {
        const docRef = doc(db, collectionName, id);
        await setDoc(docRef, normalizedData, { merge: true });
        
        // Mettre à jour en local
        const localItems = getLocalItems(collectionName);
        const updatedItems = localItems.map(p => p.id === id ? { ...p, ...normalizedData } : p);
        saveLocalItems(collectionName, updatedItems);
        
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
        const docRef = await addDoc(collection(db, collectionName), creationData);
        
        // Ajouter en local
        const localItems = getLocalItems(collectionName);
        localItems.unshift({ id: docRef.id, ...creationData });
        saveLocalItems(collectionName, localItems);
        
        return { id: docRef.id, ...creationData };
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
   * Supprime une page ou un article.
   * @param {string} id ID.
   * @param {string} [collectionName] Collection cible.
   */
  async deletePage(id, collectionName = 'pages') {
    try {
      if (!id.startsWith('local_')) {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.error(`Erreur Firestore lors de la suppression de ${collectionName}`, error);
    } finally {
      // Supprimer dans tous les cas localement
      const localItems = getLocalItems(collectionName);
      const filtered = localItems.filter(p => p.id !== id);
      saveLocalItems(collectionName, filtered);
    }
  },

  /**
   * Met à jour le statut de publication d'une page ou d'un article.
   * @param {string} id ID.
   * @param {string} status 'draft' ou 'published'.
   * @param {string} [collectionName] Collection cible.
   */
  async updateStatus(id, status, collectionName = 'pages') {
    const timestamp = new Date().toISOString();
    try {
      if (!id.startsWith('local_')) {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, { status, updatedAt: timestamp });
      }
      
      const localItems = getLocalItems(collectionName);
      const updated = localItems.map(p => p.id === id ? { ...p, status, updatedAt: timestamp } : p);
      saveLocalItems(collectionName, updated);
    } catch (error) {
      console.error(`Erreur Firestore lors de la mise à jour du statut dans ${collectionName}`, error);
      const localItems = getLocalItems(collectionName);
      const updated = localItems.map(p => p.id === id ? { ...p, status, updatedAt: timestamp } : p);
      saveLocalItems(collectionName, updated);
    }
  },

  /**
   * Téléverse un fichier média vers Firebase Storage et retourne son URL de téléchargement.
   * @param {File} file Le fichier à téléverser.
   * @returns {Promise<string>} L'URL de téléchargement publique.
   */
  async uploadMedia(file) {
    const timestamp = Date.now();
    const uniqueName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `builder-images/${uniqueName}`);
    
    try {
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      return downloadUrl;
    } catch (error) {
      console.error('Erreur Firebase Storage lors du téléversement du média', error);
      throw error;
    }
  }
};

