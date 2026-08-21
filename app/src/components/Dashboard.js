import React, { useState, useEffect, useRef } from "react";
import DashboardHeader from "./DashboardHeader";
import InfoCard from "./InfoCard";
import { 
  ArrowLeft, FileText, Image, Newspaper, Play, 
  Settings, Users, Layers, MessageSquare, Plus, 
  Trash2, ShieldCheck, Sparkles, BookOpen,
  LayoutDashboard, Megaphone, FolderOpen, LogOut, X,
  Copy, Edit3, Eye, UploadCloud, Menu,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, GripVertical
} from "lucide-react";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storePDFFile } from "../utils/indexedDBStorage";
import PdfFlipbookReader from "./PdfFlipbookReader";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc 
} from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import { flipbooksData, textsData } from "../data";
import { PageBuilder } from "./page-builder/PageBuilder";
import '../styles/page-builder.css';


const normalizeParentId = (id) => {
  if (!id || id === "null" || id === "") return null;
  return id;
};

const getShortcodeDisplayValue = (shortcode) => {
  if (!shortcode) return "";
  let clean = shortcode.trim();
  
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1).trim();
  }
  
  if (clean.includes("PdfFlipbookReader")) {
    const idMatch = clean.match(/id\s*(?:===|==|=)\s*["']?(\d+)["']?/);
    if (idMatch && idMatch[1]) {
      return `ID: ${idMatch[1]}`;
    }
    const genericIdMatch = clean.match(/\b\d{4,}\b/);
    if (genericIdMatch) {
      return `ID: ${genericIdMatch[0]}`;
    }
    return "ID: Inconnu";
  }
  
  if (/^\d+$/.test(clean)) {
    return `ID: ${clean}`;
  }
  
  return `Shortcode: ${clean}`;
};

const reindexMenuOrders = (list) => {
  const groups = {};
  list.forEach(item => {
    const pId = normalizeParentId(item.parentId) || "root";
    if (!groups[pId]) groups[pId] = [];
    groups[pId].push(item);
  });
  
  const result = [];
  Object.keys(groups).forEach(pId => {
    const sortedGroup = groups[pId].sort((a, b) => (a.order || 0) - (b.order || 0));
    sortedGroup.forEach((item, index) => {
      item.order = index + 1;
      result.push(item);
    });
  });
  return result.sort((a, b) => (a.order || 0) - (b.order || 0));
};

function buildMenuTree(items, parentId = null) {
  const targetParent = normalizeParentId(parentId);
  return items
    .filter(item => normalizeParentId(item.parentId) === targetParent)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(item => ({
      ...item,
      children: buildMenuTree(items, item.id)
    }));
}

const getFlattenedMenuTree = (menuItems) => {
  const tree = buildMenuTree(menuItems, null);
  
  const flatten = (nodes, depth = 0, result = []) => {
    nodes.forEach(node => {
      const { children, ...rest } = node;
      result.push({ ...rest, depth });
      if (children && children.length > 0) {
        flatten(children, depth + 1, result);
      }
    });
    return result;
  };
  
  return flatten(tree);
};


export default function Dashboard({ onBackToSite, flipbooks: propFlipbooks, setFlipbooks: propSetFlipbooks }) {
  // Local fallback state if props are not provided
  const [localFlipbooks, setLocalFlipbooks] = useState(() => {
    const local = localStorage.getItem("ae_flipbooks");
    const parsed = local ? JSON.parse(local) : flipbooksData;
    return parsed.map((fb, idx) => ({
      ...fb,
      category: fb.category || (idx === 0 ? "Sciences" : idx === 1 ? "Outils" : "Poésies"),
      date: fb.date || (fb.id === "3322" ? "08/06/2026 à 14h30" : fb.id === "4455" ? "14/04/2026 à 20h02" : "15/06/2026 à 10h51"),
      pdfFile: fb.pdfFile || (fb.id === "3322" ? "guide_historique_anjou.pdf" : fb.id === "4455" ? "secrets_vignoble_angevin.pdf" : "Seraphin-le-marin.pdf")
    }));
  });

  const flipbooks = propFlipbooks || localFlipbooks;
  const setFlipbooks = propSetFlipbooks || setLocalFlipbooks;

  const [userName, setUserName] = useState("JEREMY VEILLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Accueil");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newPageCategory, setNewPageCategory] = useState("Outils");
  const [newArticleCategory, setNewArticleCategory] = useState("Outils");

  // Modal states for adding a flipbook
  const [showAddFlipbookModal, setShowAddFlipbookModal] = useState(false);
  const [newFlipbookTitle, setNewFlipbookTitle] = useState("");
  const [newFlipbookDesc, setNewFlipbookDesc] = useState("");
  const [newFlipbookCategory, setNewFlipbookCategory] = useState("Outils");
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState(0); // 0: input, 1: uploading, 2: success
  const [useGeminiForPages, setUseGeminiForPages] = useState(false);
  const [geminiProgressMsg, setGeminiProgressMsg] = useState("");
  const [newGeneratedId, setNewGeneratedId] = useState("");

  // States for Editing a flipbook
  const [showEditFlipbookModal, setShowEditFlipbookModal] = useState(false);
  const [editingFlipbook, setEditingFlipbook] = useState(null);
  const [editPdfFile, setEditPdfFile] = useState(null);
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  // States for Reading/Viewing a flipbook
  const [showViewFlipbookModal, setShowViewFlipbookModal] = useState(false);
  const [viewingFlipbook, setViewingFlipbook] = useState(null);

  // States for batch actions and filters
  const [selectedFlipbookIds, setSelectedFlipbookIds] = useState([]);
  const [tempDate, setTempDate] = useState("0");
  const [filterDate, setFilterDate] = useState("0");
  const [bulkActionTop, setBulkActionTop] = useState("-1");
  const [bulkActionBottom, setBulkActionBottom] = useState("-1");

  const fileInputRef = useRef(null);
  
  // Custom navigation state mimicking router path transitions
  const [activeSection, setActiveSection] = useState(null);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [notification, setNotification] = useState(
    "Connexion à la base de données Firebase en cours..."
  );

  // Firestore & local states
  const [pagesList, setPagesList] = useState([]);
  const [newPageTitle, setNewPageTitle] = useState("");

  const [articlesList, setArticlesList] = useState([]);
  const [newArticleTitle, setNewArticleTitle] = useState("");

  const [messagesList, setMessagesList] = useState([]);

  const [settings, setSettings] = useState({
    siteName: "Anjou Edition – Pour les Nuls",
    contactEmail: "contact@anjou-edition-nuls.fr",
    enableComments: true,
    maintenanceMode: false
  });

  // Gemini API client configuration
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem("gemini_api_key") || "");
  const [aiTopic, setAiTopic] = useState("");
  const [aiStyle, setAiStyle] = useState("Historique");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // --- New Interactive States ---
  // Navigation Menus & Reusable Shortcodes
  const [menusList, setMenusList] = useState([]);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [newMenuItemTitle, setNewMenuItemTitle] = useState("");
  const [newMenuItemIcon, setNewMenuItemIcon] = useState("Layers");
  const [newMenuItemUrl, setNewMenuItemUrl] = useState("");
  const [newMenuItemShortcode, setNewMenuItemShortcode] = useState("");
  const [newMenuItemStatus, setNewMenuItemStatus] = useState("Actif");
  const [newMenuItemDescription, setNewMenuItemDescription] = useState("");
  const [editingMenuItemId, setEditingMenuItemId] = useState(null);
  const [newMenuItemType, setNewMenuItemType] = useState("internal-link");
  const [newMenuItemParentId, setNewMenuItemParentId] = useState("");
  const [menuAriaAnnouncement, setMenuAriaAnnouncement] = useState("");
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [newlyAddedMenuItemId, setNewlyAddedMenuItemId] = useState(null);

  // Search, Preview & Focus tracking
  const [menusSearchQuery, setMenusSearchQuery] = useState("");
  const [showPreviewShortcodeModal, setShowPreviewShortcodeModal] = useState(false);
  const [previewingShortcodeItem, setPreviewingShortcodeItem] = useState(null);
  
  // Current active editor field focus tracker
  const [lastFocusedField, setLastFocusedField] = useState(null);

  // Page Builder
  const [builderEditingId, setBuilderEditingId] = useState(null);
  const [builderEditingType, setBuilderEditingType] = useState(null); // "page" or "article"

  // Médiathèque
  const [mediaList, setMediaList] = useState([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [showMediaPreviewModal, setShowMediaPreviewModal] = useState(false);
  const [previewingMedia, setPreviewingMedia] = useState(null);

  // Galerie
  const [galleryList, setGalleryList] = useState([]);
  const [newPhotoTitle, setNewPhotoTitle] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoCategory, setNewPhotoCategory] = useState("Loire");
  const [newPhotoDesc, setNewPhotoDesc] = useState("");
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [showPhotoLightboxModal, setShowPhotoLightboxModal] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Vidéos
  const [videoList, setVideoList] = useState([]);
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoDesc, setNewVideoDesc] = useState("");
  const [newVideoCategory, setNewVideoCategory] = useState("Loire");
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [showVideoPlayerModal, setShowVideoPlayerModal] = useState(false);
  const [playerVideo, setPlayerVideo] = useState(null);

  // Actualités
  const [newsList, setNewsList] = useState([]);
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");
  const [newNewsType, setNewNewsType] = useState("Info");
  const [showAddNewsModal, setShowAddNewsModal] = useState(false);

  // Mes Comptes
  const [accountsList, setAccountsList] = useState([]);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountRole, setNewAccountRole] = useState("Écrivain");
  const [newAccountStatus, setNewAccountStatus] = useState("Actif");
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // Initial Loading State
  const [isInitializing, setIsInitializing] = useState(true);

  const getGeminiClient = () => {
    const key = geminiApiKey || process.env.REACT_APP_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
  };

  // Fetch all databases on load
  useEffect(() => {
    const initData = async () => {
      try {
        await Promise.all([
          fetchPages(),
          fetchArticles(),
          fetchMessages(),
          fetchSettings(),
          fetchFlipbooks(),
          fetchMedias(),
          fetchGallery(),
          fetchVideos(),
          fetchNews(),
          fetchAccounts(),
          fetchMenus()
        ]);
        setNotification("Données synchronisées avec Firestore.");
      } catch (err) {
        console.error("Initialization error:", err);
        setNotification("Erreur lors de la synchronisation Firestore. Utilisation du stockage local.");
      } finally {
        setIsInitializing(false);
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchPages = async () => {
    try {
      const snap = await getDocs(collection(db, "pages"));
      if (snap.empty) {
        const defaults = [
          { id: "1", title: "Accueil - Anjou Edition", author: "Jeremy Veille", date: "2026-05-12", status: "Publié" },
          { id: "2", title: "À Propos de nous", author: "Sylvie Gautier", date: "2026-06-01", status: "Brouillon" },
          { id: "3", title: "Nos Collections Littéraires", author: "Jeremy Veille", date: "2026-06-07", status: "Publié" }
        ];
        for (const p of defaults) {
          const { id, ...pageData } = p;
          await addDoc(collection(db, "pages"), pageData);
        }
        setPagesList(defaults);
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPagesList(list);
      }
    } catch (e) {
      console.error("Pages error:", e);
      // Fallback
      setPagesList([
        { id: "1", title: "Accueil - Anjou Edition", author: "Jeremy Veille", date: "2026-05-12", status: "Publié" },
        { id: "2", title: "À Propos de nous", author: "Sylvie Gautier", date: "2026-06-01", status: "Brouillon" }
      ]);
    }
  };

  const fetchArticles = async () => {
    try {
      const snap = await getDocs(collection(db, "articles"));
      if (snap.empty) {
        const defaults = [
          { id: "1", title: "Les secrets de l'écriture romanesque pour les Nuls", views: 245, date: "2026-05-30" },
          { id: "2", title: "La poésie angevine contemporaine au XXIe siècle", views: 189, date: "2026-06-03" }
        ];
        for (const a of defaults) {
          const { id, ...artData } = a;
          await addDoc(collection(db, "articles"), artData);
        }
        setArticlesList(defaults);
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setArticlesList(list);
      }
    } catch (e) {
      console.error("Articles error:", e);
      setArticlesList([
        { id: "1", title: "Les secrets de l'écriture romanesque pour les Nuls", views: 245, date: "2026-05-30" }
      ]);
    }
  };

  const fetchMessages = async () => {
    try {
      const snap = await getDocs(collection(db, "contacts"));
      const list = snap.docs.map(doc => {
        const data = doc.data();
        let formattedDate = "";
        if (data.timestamp) {
          if (data.timestamp.toDate) {
            formattedDate = data.timestamp.toDate().toLocaleDateString("fr-FR");
          } else {
            formattedDate = new Date(data.timestamp).toLocaleDateString("fr-FR");
          }
        } else {
          formattedDate = new Date().toLocaleDateString("fr-FR");
        }
        return {
          id: doc.id,
          ...data,
          date: formattedDate
        };
      });
      setMessagesList(list);
    } catch (e) {
      console.error("Messages error:", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, "settings", "global");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setSettings(snap.data());
      } else {
        const defaultSettings = {
          siteName: "Anjou Edition – Pour les Nuls",
          contactEmail: "contact@anjou-edition-nuls.fr",
          enableComments: true,
          maintenanceMode: false
        };
        await setDoc(docRef, defaultSettings);
        setSettings(defaultSettings);
      }
    } catch (e) {
      console.error("Settings error:", e);
    }
  };

  // Fetch New Interactive Collections
  const fetchMedias = async () => {
    try {
      const snap = await getDocs(collection(db, "medias"));
      if (snap.empty) {
        const defaults = [
          { id: "m1", name: "couverture_luxe.jpg", type: "image/jpeg", size: 1258291, date: "12/05/2026 à 10h12", url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600" },
          { id: "m2", name: "nouvelle_legende.epub", type: "application/epub+zip", size: 4529124, date: "24/05/2026 à 16h45", url: "#" },
          { id: "m3", name: "poeme_musical.mp3", type: "audio/mpeg", size: 8912048, date: "02/06/2026 à 09h30", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
          { id: "m4", name: "logo_court.png", type: "image/png", size: 104857, date: "08/06/2026 à 11h15", url: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=400" },
          { id: "m5", name: "chateau_angers.jpg", type: "image/jpeg", size: 3452912, date: "14/06/2026 à 15h20", url: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=600" }
        ];
        for (const m of defaults) {
          await setDoc(doc(db, "medias", m.id), m);
        }
        setMediaList(defaults);
        localStorage.setItem("ae_medias", JSON.stringify(defaults));
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMediaList(list);
        localStorage.setItem("ae_medias", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Medias error:", e);
      const local = localStorage.getItem("ae_medias");
      if (local) {
        setMediaList(JSON.parse(local));
      } else {
        setMediaList([
          { id: "m1", name: "couverture_luxe.jpg", type: "image/jpeg", size: 1258291, date: "12/05/2026 à 10h12", url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600" },
          { id: "m2", name: "nouvelle_legende.epub", type: "application/epub+zip", size: 4529124, date: "24/05/2026 à 16h45", url: "#" },
          { id: "m3", name: "poeme_musical.mp3", type: "audio/mpeg", size: 8912048, date: "02/06/2026 à 09h30", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }
        ]);
      }
    }
  };

  const fetchGallery = async () => {
    try {
      const snap = await getDocs(collection(db, "gallery"));
      if (snap.empty) {
        const defaults = [
          { id: "g1", title: "Château d'Angers", category: "Châteaux", url: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=600", description: "L'impressionnante forteresse médiévale d'Angers et ses 17 tours de schiste et de tuffeau.", date: "12/05/2026" },
          { id: "g2", title: "Bords de Loire", category: "Loire", url: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=600", description: "Coucher de soleil poétique sur le plus long fleuve sauvage de France en Maine-et-Loire.", date: "20/05/2026" },
          { id: "g3", title: "Vignobles de Savennières", category: "Vignobles", url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600", description: "Les célèbres coteaux de Chenin blanc surplombant la Loire sous la douceur angevine.", date: "01/06/2026" },
          { id: "g4", title: "Abbaye de Fontevraud", category: "Châteaux", url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600", description: "La plus grande cité monastique héritée du Moyen Âge, nécropole des Plantagenêt.", date: "10/06/2026" }
        ];
        for (const g of defaults) {
          await setDoc(doc(db, "gallery", g.id), g);
        }
        setGalleryList(defaults);
        localStorage.setItem("ae_gallery", JSON.stringify(defaults));
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGalleryList(list);
        localStorage.setItem("ae_gallery", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Gallery error:", e);
      const local = localStorage.getItem("ae_gallery");
      if (local) {
        setGalleryList(JSON.parse(local));
      } else {
        setGalleryList([
          { id: "g1", title: "Château d'Angers", category: "Châteaux", url: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=600", description: "L'impressionnante forteresse médiévale d'Angers.", date: "12/05/2026" },
          { id: "g2", title: "Bords de Loire", category: "Loire", url: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=600", description: "Coucher de soleil poétique sur le plus long fleuve.", date: "20/05/2026" }
        ]);
      }
    }
  };

  const fetchVideos = async () => {
    try {
      const snap = await getDocs(collection(db, "videos"));
      if (snap.empty) {
        const defaults = [
          { id: "v1", title: "Visite guidée du Château d'Angers", url: "https://www.youtube.com/watch?v=kGgY9fG3g80", youtubeId: "kGgY9fG3g80", description: "Découvrez l'histoire de la forteresse des Ducs d'Anjou et la célèbre tenture de l'Apocalypse.", category: "Châteaux", date: "15/05/2026" },
          { id: "v2", title: "La douceur angevine en images", url: "https://www.youtube.com/watch?v=0kG7R0oK5J0", youtubeId: "0kG7R0oK5J0", description: "Un poème visuel le long de la Loire et à travers les rues historiques d'Angers et de Saumur.", category: "Loire", date: "02/06/2026" }
        ];
        for (const v of defaults) {
          await setDoc(doc(db, "videos", v.id), v);
        }
        setVideoList(defaults);
        localStorage.setItem("ae_videos", JSON.stringify(defaults));
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVideoList(list);
        localStorage.setItem("ae_videos", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Videos error:", e);
      const local = localStorage.getItem("ae_videos");
      if (local) {
        setVideoList(JSON.parse(local));
      } else {
        setVideoList([
          { id: "v1", title: "Visite guidée du Château d'Angers", url: "https://www.youtube.com/watch?v=kGgY9fG3g80", youtubeId: "kGgY9fG3g80", description: "Découvrez l'histoire de la forteresse.", category: "Châteaux", date: "15/05/2026" }
        ]);
      }
    }
  };

  const fetchNews = async () => {
    try {
      const snap = await getDocs(collection(db, "news"));
      if (snap.empty) {
        const defaults = [
          { id: "n1", title: "Festival l'Anjou Littéraire 2026", content: "Le festival aura lieu le 10 Septembre 2026 à Saumur ! Préparez vos manuscrits et venez rencontrer les éditeurs de la région.", type: "Urgent", date: "2026-06-08" },
          { id: "n2", title: "Lancement officiel du portail", content: "Le nouveau site Anjou Édition est en ligne. Les écrivains peuvent s'inscrire pour publier leurs flipbooks numériques.", type: "Info", date: "2026-06-01" },
          { id: "n3", title: "Mise à jour des filtres de recherche", content: "Nous avons ajouté une recherche par date et par mot-clé pour faciliter la consultation de notre bibliothèque historique.", type: "Important", date: "2026-06-15" }
        ];
        for (const n of defaults) {
          await setDoc(doc(db, "news", n.id), n);
        }
        setNewsList(defaults);
        localStorage.setItem("ae_news", JSON.stringify(defaults));
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNewsList(list);
        localStorage.setItem("ae_news", JSON.stringify(list));
      }
    } catch (e) {
      console.error("News error:", e);
      const local = localStorage.getItem("ae_news");
      if (local) {
        setNewsList(JSON.parse(local));
      } else {
        setNewsList([
          { id: "n1", title: "Festival l'Anjou Littéraire 2026", content: "Le festival aura lieu le 10 Septembre 2026 !", type: "Urgent", date: "2026-06-08" }
        ]);
      }
    }
  };

  const fetchAccounts = async () => {
    try {
      const snap = await getDocs(collection(db, "accounts"));
      if (snap.empty) {
        const defaults = [
          { id: "u1", name: "JEREMY VEILLE", email: "jeremy.veille@hotmail.fr", role: "Administrateur", status: "Actif", color: "#004b7a" },
          { id: "u2", name: "Sylvie Gautier", email: "sylvie.gautier@anjou-lettres.fr", role: "Écrivain", status: "Actif", color: "#336ddc" },
          { id: "u3", name: "Pierre Bougier", email: "p.bougier@maine-loire.fr", role: "Éditeur", status: "Inactif", color: "#64748b" }
        ];
        for (const u of defaults) {
          await setDoc(doc(db, "accounts", u.id), u);
        }
        setAccountsList(defaults);
        localStorage.setItem("ae_accounts", JSON.stringify(defaults));
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAccountsList(list);
        localStorage.setItem("ae_accounts", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Accounts error:", e);
      const local = localStorage.getItem("ae_accounts");
      if (local) {
        setAccountsList(JSON.parse(local));
      } else {
        setAccountsList([
          { id: "u1", name: "JEREMY VEILLE", email: "jeremy.veille@hotmail.fr", role: "Administrateur", status: "Actif", color: "#004b7a" },
          { id: "u2", name: "Sylvie Gautier", email: "sylvie.gautier@anjou-lettres.fr", role: "Écrivain", status: "Actif", color: "#336ddc" }
        ]);
      }
    }
  };

  const saveAllMenusToFirebase = async (list) => {
    setMenusList(list);
    localStorage.setItem("ae_menus", JSON.stringify(list));

    try {
      await Promise.all(list.map(async (m) => {
        const { id, ...menuData } = m;
        const dataToSave = {
          ...menuData,
          parentId: normalizeParentId(menuData.parentId),
          order: menuData.order || 0,
          updatedAt: new Date()
        };
        await setDoc(doc(db, "menus", id), dataToSave);
      }));
    } catch (err) {
      console.error("Firebase save menus error:", err);
    }
  };

  const fetchMenus = async () => {
    const defaults = [
      { id: "m1", title: "Accueil", label: "Accueil", icon: "Home", url: "/", shortcode: "", status: "Actif", enabled: true, type: "internal-link", parentId: null, order: 1, description: "Lien vers la page d'accueil." },
      { id: "m2", title: "Flipbooks", label: "Flipbooks", icon: "Layers", url: "", shortcode: "show_flipbooks", status: "Actif", enabled: true, type: "shortcode", parentId: null, order: 2, description: "Ouvre la section flipbooks." },
      { id: "m3", title: "Vidéos", label: "Vidéos", icon: "Layers", url: "", shortcode: "show_videos", status: "Actif", enabled: true, type: "shortcode", parentId: null, order: 3, description: "Ouvre la section des vidéos." },
      { id: "m4", title: "Galerie Photos", label: "Galerie Photos", icon: "Layers", url: "", shortcode: "show_gallery", status: "Actif", enabled: true, type: "shortcode", parentId: null, order: 4, description: "Ouvre la galerie photos." },
      { id: "m5", title: "Contact", label: "Contact", icon: "HelpCircle", url: "", shortcode: "open_contact_modal", status: "Actif", enabled: true, type: "shortcode", parentId: null, order: 5, description: "Ouvre le formulaire de contact." }
    ];

    try {
      const snap = await getDocs(collection(db, "menus"));
      if (snap.empty) {
        // Enregistrer les défauts au format propre
        const formattedDefaults = defaults.map(d => ({
          ...d,
          slug: d.url,
          isActive: d.enabled,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        for (const m of formattedDefaults) {
          const { id, ...menuData } = m;
          await setDoc(doc(db, "menus", id), menuData);
        }
        setMenusList(formattedDefaults);
        localStorage.setItem("ae_menus", JSON.stringify(formattedDefaults));
      } else {
        const list = snap.docs.map(doc => {
          const data = doc.data();
          let title = data.title || data.label || "Sans titre";
          if (title === "PoésiesParent" || title === "PoesiesParent") {
            title = "Poésies";
          }
          const isActive = data.isActive !== undefined ? data.isActive : (data.enabled !== undefined ? data.enabled : (data.status === "Actif"));
          
          const rawType = data.type || (data.shortcode ? "shortcode" : "internal-link");
          let type = "internal";
          if (rawType === "external" || rawType === "external-link") {
            type = "external";
          } else if (rawType === "shortcode") {
            type = "shortcode";
          }

          let safeShortcode = data.shortcode || "";
          if (safeShortcode && (safeShortcode.includes("===") || safeShortcode.includes("<") || safeShortcode.includes("PdfFlipbookReader"))) {
             const genericIdMatch = safeShortcode.match(/\b\d{4,}\b/);
             if (genericIdMatch) {
               safeShortcode = `[PdfFlipbookReader id="${genericIdMatch[0]}"]`;
             } else if (title.toLowerCase().includes("mention")) {
               safeShortcode = "legal-notice";
             } else {
               safeShortcode = "";
             }
          }

          return {
            id: doc.id,
            title: title,
            label: title,
            icon: data.icon || "Layers",
            url: data.url || data.slug || "",
            slug: data.slug || data.url || "",
            shortcode: safeShortcode,
            status: isActive ? "Actif" : "Inactif",
            enabled: isActive,
            isActive: isActive,
            type: type,
            parentId: normalizeParentId(data.parentId),
            order: data.order || 0,
            description: data.description || "",
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null
          };
        });
        const sorted = list.sort((a, b) => a.order - b.order);
        setMenusList(sorted);
        localStorage.setItem("ae_menus", JSON.stringify(sorted));
      }
    } catch (e) {
      console.error("Menus error:", e);
      const local = localStorage.getItem("ae_menus");
      if (local) {
        const parsed = JSON.parse(local).map(data => {
          let title = data.title || data.label || "Sans titre";
          if (title === "PoésiesParent" || title === "PoesiesParent") {
            title = "Poésies";
          }
          const isActive = data.isActive !== undefined ? data.isActive : (data.enabled !== undefined ? data.enabled : (data.status === "Actif"));
          
          const rawType = data.type || (data.shortcode ? "shortcode" : "internal-link");
          let type = "internal";
          if (rawType === "external" || rawType === "external-link") {
            type = "external";
          } else if (rawType === "shortcode") {
            type = "shortcode";
          }

          return {
            ...data,
            title: title,
            label: title,
            status: isActive ? "Actif" : "Inactif",
            enabled: isActive,
            isActive: isActive,
            type: type,
            slug: data.slug || data.url || "",
            url: data.url || data.slug || "",
            parentId: normalizeParentId(data.parentId)
          };
        });
        setMenusList(parsed.sort((a, b) => a.order - b.order));
      } else {
        const formattedDefaults = defaults.map(d => ({
          ...d,
          slug: d.url,
          isActive: d.enabled,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        setMenusList(formattedDefaults);
        localStorage.setItem("ae_menus", JSON.stringify(formattedDefaults));
      }
    }
  };

  // Add handlers
  const fetchFlipbooks = async () => {
    try {
      const snap = await getDocs(collection(db, "flipbooks"));
      if (snap.empty) {
        const defaults = flipbooksData.map((fb, idx) => ({
          ...fb,
          category: fb.category || (idx === 0 ? "Sciences" : "Outils"),
          date: fb.date || (fb.id === "3322" ? "08/06/2026 à 14h30" : "14/04/2026 à 20h02"),
          pdfFile: fb.pdfFile || (fb.id === "3322" ? "guide_historique_anjou.pdf" : "secrets_vignoble_angevin.pdf")
        }));
        for (const fb of defaults) {
          await setDoc(doc(db, "flipbooks", fb.id), fb);
        }
        setFlipbooks(defaults);
        localStorage.setItem("ae_flipbooks", JSON.stringify(defaults));
      } else {
        const list = snap.docs.map((doc, idx) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            category: data.category || (idx === 0 ? "Sciences" : idx === 1 ? "Outils" : "Poésies"),
            date: data.date || "08/06/2026 à 14h30",
            pdfFile: data.pdfFile || "guide_historique_anjou.pdf"
          };
        });
        setFlipbooks(list);
        localStorage.setItem("ae_flipbooks", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Flipbooks fetch error:", e);
      const local = localStorage.getItem("ae_flipbooks");
      if (local) {
        setFlipbooks(JSON.parse(local));
      } else {
        const defaults = flipbooksData.map((fb, idx) => ({
          ...fb,
          category: idx === 0 ? "Sciences" : "Outils",
          date: fb.id === "3322" ? "08/06/2026 à 14h30" : "14/04/2026 à 20h02",
          pdfFile: fb.id === "3322" ? "guide_historique_anjou.pdf" : "secrets_vignoble_angevin.pdf"
        }));
        setFlipbooks(defaults);
      }
    }
  };

  const handleAddFlipbookState = async (newFb) => {
    const updated = [...flipbooks, newFb];
    setFlipbooks(updated);
    localStorage.setItem("ae_flipbooks", JSON.stringify(updated));
    try {
      await setDoc(doc(db, "flipbooks", newFb.id), newFb);
      setNotification(`Flipbook "${newFb.title}" ajouté avec succès sur Firebase.`);
    } catch (err) {
      console.error("Error saving flipbook to Firestore:", err);
      setNotification(`Flipbook "${newFb.title}" créé localement.`);
    }
  };

  const handleDeleteFlipbook = async (id, title) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le flipbook "${title}" ?`)) {
      return;
    }
    const updated = flipbooks.filter(fb => fb.id !== id);
    setFlipbooks(updated);
    localStorage.setItem("ae_flipbooks", JSON.stringify(updated));
    setSelectedFlipbookIds(prev => prev.filter(item => item !== id));
    try {
      await deleteDoc(doc(db, "flipbooks", id));
      setNotification(`Flipbook "${title}" supprimé avec succès de Firebase.`);
    } catch (err) {
      console.error("Error deleting flipbook:", err);
      setNotification(`Flipbook "${title}" supprimé localement.`);
    }
  };

  // Editing handlers
  const handleEditFlipbookClick = (fb) => {
    setEditingFlipbook(JSON.parse(JSON.stringify(fb))); // Deep copy
    setShowEditFlipbookModal(true);
  };

  const handleAddPageToEditing = () => {
    const nextPageNum = editingFlipbook.pages.length + 1;
    const newPages = [...editingFlipbook.pages, { pageNum: nextPageNum, title: `Page ${nextPageNum}`, content: "" }];
    setEditingFlipbook({ ...editingFlipbook, pages: newPages });
  };

  const handleEditFlipbookSubmit = async (e) => {
    e.preventDefault();
    if (!editingFlipbook.title.trim() || !editingFlipbook.description.trim()) {
      alert("Le titre et la description ne peuvent pas être vides.");
      return;
    }

    setIsEditingSaving(true);
    let finalPdfFile = editingFlipbook.pdfFile;
    let finalPdfUrl = editingFlipbook.pdfUrl;

    if (editPdfFile) {
      setGeminiProgressMsg("Enregistrement du nouveau fichier PDF...");
      try {
        await storePDFFile(editingFlipbook.id, editPdfFile);
        finalPdfFile = editPdfFile.name;

        let pdfUrl = null;
        try {
          const storageRef = ref(storage, `flipbooks/${editingFlipbook.id}/${editPdfFile.name}`);
          const uploadResult = await uploadBytes(storageRef, editPdfFile);
          pdfUrl = await getDownloadURL(uploadResult.ref);
          finalPdfUrl = pdfUrl;
        } catch (storageErr) {
          console.warn("Firebase Storage upload failed for edit:", storageErr);
        }
      } catch (err) {
        console.error("Error storing new PDF:", err);
      }
    }

    const updatedFlipbook = { 
      ...editingFlipbook, 
      pdfFile: finalPdfFile, 
      pdfUrl: finalPdfUrl 
    };

    const updatedList = flipbooks.map(fb => fb.id === editingFlipbook.id ? updatedFlipbook : fb);
    setFlipbooks(updatedList);
    localStorage.setItem("ae_flipbooks", JSON.stringify(updatedList));

    try {
      await setDoc(doc(db, "flipbooks", editingFlipbook.id), updatedFlipbook);
      setNotification(`Flipbook "${editingFlipbook.title}" mis à jour sur Firebase.`);
    } catch (err) {
      console.error("Error updating flipbook on Firebase:", err);
      setNotification(`Flipbook "${editingFlipbook.title}" mis à jour localement.`);
    }

    setShowEditFlipbookModal(false);
    setEditingFlipbook(null); setEditPdfFile(null);
    setGeminiProgressMsg("");
    setIsEditingSaving(false);
  };

  // Viewer handlers
  const handleViewFlipbookClick = (fb) => {
    setViewingFlipbook(fb);
    setShowViewFlipbookModal(true);
  };

  // Bulk actions handler
  const handleBulkAction = async (action) => {
    if (action === "-1") {
      alert("Veuillez sélectionner une action groupée.");
      return;
    }
    if (selectedFlipbookIds.length === 0) {
      alert("Aucun flipbook sélectionné.");
      return;
    }

    if (action === "trash") {
      if (window.confirm(`Voulez-vous vraiment supprimer les ${selectedFlipbookIds.length} flipbooks sélectionnés ?`)) {
        const updated = flipbooks.filter(fb => !selectedFlipbookIds.includes(fb.id));
        setFlipbooks(updated);
        localStorage.setItem("ae_flipbooks", JSON.stringify(updated));
        
        const count = selectedFlipbookIds.length;
        const idsToDelete = [...selectedFlipbookIds];
        setSelectedFlipbookIds([]);
        setBulkActionTop("-1");
        setBulkActionBottom("-1");
        
        try {
          for (const id of idsToDelete) {
            await deleteDoc(doc(db, "flipbooks", id));
          }
          setNotification(`${count} flipbooks supprimés avec succès de Firebase.`);
        } catch (err) {
          console.error("Error batch deleting flipbooks:", err);
          setNotification(`${count} flipbooks supprimés localement.`);
        }
      }
    } else if (action === "edit") {
      alert("La modification groupée n'est pas supportée. Veuillez modifier les flipbooks individuellement.");
    }
  };

  // Filter Date handler
  const handleFilterDate = () => {
    setFilterDate(tempDate);
    if (tempDate === "0") {
      setNotification("Filtre réinitialisé : Tous les flipbooks sont affichés.");
    } else {
      const monthLabel = tempDate === "202606" ? "Juin 2026" : tempDate === "202605" ? "Mai 2026" : "Avril 2026";
      setNotification(`Filtre activé : Flipbooks publiés en ${monthLabel}.`);
    }
  };

  const handlePdfDragOver = (e) => {
    e.preventDefault();
    setIsDraggingPdf(true);
  };

  const handlePdfDragLeave = () => {
    setIsDraggingPdf(false);
  };

  const handlePdfDrop = (e) => {
    e.preventDefault();
    setIsDraggingPdf(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedPdfFile(file);
      } else {
        alert("Veuillez sélectionner un fichier PDF valide.");
      }
    }
  };

  const handlePdfFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedPdfFile(file);
      } else {
        alert("Veuillez sélectionner un fichier PDF valide.");
      }
    }
  };

  const handleCloseModal = () => {
    if (uploadStep === 1) return;
    setShowAddFlipbookModal(false);
    setNewFlipbookTitle("");
    setNewFlipbookDesc("");
    setSelectedPdfFile(null);
    setUploadStep(0);
    setUploadProgress(0);
  };

  const handleCreateFlipbookSubmit = async (e) => {
    e.preventDefault();
    if (!newFlipbookTitle.trim() || !newFlipbookDesc.trim() || !selectedPdfFile) {
      return;
    }

    setUploadStep(1);
    setUploadProgress(0);
    setGeminiProgressMsg("Envoi du fichier PDF...");

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      if (currentProgress < 80) {
        currentProgress += Math.floor(Math.random() * 5) + 3;
        if (currentProgress > 80) currentProgress = 80;
        setUploadProgress(currentProgress);

        if (currentProgress < 25) {
          setGeminiProgressMsg("Envoi du fichier PDF en cours...");
        } else if (currentProgress < 50) {
          setGeminiProgressMsg("Analyse du document PDF et extraction du texte...");
        } else if (currentProgress < 85) {
          setGeminiProgressMsg("Création des structures de page...");
        }
      }
    }, 150);

    let generatedPages = [];
    const fileName = selectedPdfFile.name;
    const cleanTitle = newFlipbookTitle.trim();
    const cleanDesc = newFlipbookDesc.trim();

    const fetchPagesWithGemini = async () => {
      const client = getGeminiClient();
      if (useGeminiForPages && client) {
        try {
          const prompt = `Génère un tableau JSON contenant exactement 5 pages pour un flipbook interactif sur le sujet : "${cleanTitle}". La description est : "${cleanDesc}".
Le fichier d'origine s'appelle : "${fileName}".
Chaque page doit avoir une propriété 'pageNum' (nombre de 1 à 5), 'title' (titre de la page court) et 'content' (contenu textuel en français sur le sujet d'environ 3 ou 4 phrases, sans sauts de ligne ni markdown).
La réponse doit être uniquement un tableau JSON valide respectant précisément cette structure, sans balise de code markdown. Exemple:
[
  {"pageNum": 1, "title": "Couverture", "content": "Titre du livre..."},
  {"pageNum": 2, "title": "Introduction", "content": "..."}
]`;

          const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });

          const responseText = response.text || "";
          const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (err) {
          console.error("Gemini failed to generate flipbook pages:", err);
        }
      }
      return null;
    };

    try {
      const geminiPages = await fetchPagesWithGemini();
      
      if (geminiPages) {
        generatedPages = geminiPages;
      } else {
        generatedPages = [
          { 
            pageNum: 1, 
            title: "Couverture", 
            content: `${cleanTitle.toUpperCase()}\n\nAnjou Édition\n\nDocument : ${fileName}` 
          },
          { 
            pageNum: 2, 
            title: "Introduction", 
            content: `Cet ouvrage est issu du document '${fileName}'. ${cleanDesc} Il s'inscrit dans la collection d'ouvrages culturels et historiques d'Anjou Édition, visant à promouvoir le patrimoine de notre belle région de la Loire.` 
          },
          { 
            pageNum: 3, 
            title: "Chapitre 1: Histoire locale", 
            content: `L'Anjou possède un patrimoine historique exceptionnel. Des premiers châteaux en pierre construits par Foulques Nerra au XIe siècle, aux splendides demeures de la Renaissance, chaque village de la région conserve la trace de cette riche histoire fluviale et royale.` 
          },
          { 
            pageNum: 4, 
            title: "Chapitre 2: Terroirs d'Anjou", 
            content: `Façonné par la Loire et ses affluents, le terroir angevin est mondialement réputé pour sa douceur et sa diversité. C'est ici que s'épanouissent des cépages uniques, créant des vins de caractère allant de la fraîcheur du Chenin blanc à la rondeur du Cabernet franc.` 
          },
          { 
            pageNum: 5, 
            title: "Conclusion", 
            content: "En refermant ce flipbook numérique, nous espérons avoir éveillé votre curiosité pour l'Anjou. Ce document témoigne de l'attachement indéfectible d'Anjou Édition à la transmission de nos récits et de nos savoirs." 
          }
        ];
      }

      clearInterval(progressInterval);
      setGeminiProgressMsg("Enregistrement du fichier PDF...");
      setUploadProgress(85);

      const newId = String(Math.floor(Math.random() * 9000) + 1000);
      setNewGeneratedId(newId);

      // 1. Store in local IndexedDB
      await storePDFFile(newId, selectedPdfFile);

      // 2. Upload to Firebase Storage if online
      let pdfUrl = null;
      try {
        setGeminiProgressMsg("Envoi du PDF vers Firebase Storage...");
        setUploadProgress(90);
        const storageRef = ref(storage, `flipbooks/${newId}/${selectedPdfFile.name}`);
        const uploadResult = await uploadBytes(storageRef, selectedPdfFile);
        pdfUrl = await getDownloadURL(uploadResult.ref);
        console.log("PDF uploaded successfully to Firebase Storage:", pdfUrl);
      } catch (storageErr) {
        console.warn("Firebase Storage upload failed, using IndexedDB local storage fallback:", storageErr);
      }

      setGeminiProgressMsg("Finalisation du flipbook...");
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 300));

      const newFlipbookObj = {
        id: newId,
        title: cleanTitle,
        description: cleanDesc,
        category: newFlipbookCategory,
        pdfFile: fileName,
        pdfUrl: pdfUrl,
        date: new Date().toLocaleDateString("fr-FR") + " à " + new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
        pages: generatedPages
      };

      await handleAddFlipbookState(newFlipbookObj);
      setUploadStep(2);
    } catch (error) {
      console.error(error);
      clearInterval(progressInterval);
      alert("Une erreur est survenue lors de la création du flipbook.");
      setUploadStep(0);
    }
  };

  const handleAddPage = async (e) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;
    const newPage = {
      title: newPageTitle,
      author: userName,
      date: new Date().toISOString().split('T')[0],
      status: "Brouillon",
      category: newPageCategory
    };

    try {
      const docRef = await addDoc(collection(db, "pages"), newPage);
      setPagesList([...pagesList, { id: docRef.id, ...newPage }]);
      setNewPageTitle("");
      setNotification(`Page "${newPage.title}" ajoutée avec succès.`);
    } catch (err) {
      console.error("Error adding page:", err);
      // fallback local state
      setPagesList([...pagesList, { id: String(Date.now()), ...newPage }]);
      setNewPageTitle("");
      setNotification(`Page "${newPage.title}" ajoutée localement.`);
    }
  };

  const handleAddArticle = async (e) => {
    e.preventDefault();
    if (!newArticleTitle.trim()) return;
    const newArt = {
      title: newArticleTitle,
      views: 0,
      date: new Date().toISOString().split('T')[0],
      category: newArticleCategory
    };

    try {
      const docRef = await addDoc(collection(db, "articles"), newArt);
      setArticlesList([...articlesList, { id: docRef.id, ...newArt }]);
      setNewArticleTitle("");
      setNotification(`Nouvel article "${newArt.title}" créé.`);
    } catch (err) {
      console.error("Error adding article:", err);
      setArticlesList([...articlesList, { id: String(Date.now()), ...newArt }]);
      setNewArticleTitle("");
      setNotification(`Article "${newArt.title}" créé localement.`);
    }
  };

  // Delete handlers
  const handleDeletePage = async (id) => {
    try {
      await deleteDoc(doc(db, "pages", id));
      setPagesList(pagesList.filter(p => p.id !== id));
      setNotification("Page supprimée avec succès.");
    } catch (err) {
      console.error("Error deleting page:", err);
      setPagesList(pagesList.filter(p => p.id !== id));
    }
  };

  const handleDeleteArticle = async (id) => {
    try {
      await deleteDoc(doc(db, "articles", id));
      setArticlesList(articlesList.filter(a => a.id !== id));
      setNotification("Article supprimé avec succès.");
    } catch (err) {
      console.error("Error deleting article:", err);
      setArticlesList(articlesList.filter(a => a.id !== id));
    }
  };

  const handleDeleteMessage = async (id) => {
    try {
      await deleteDoc(doc(db, "contacts", id));
      setMessagesList(messagesList.filter(m => m.id !== id));
      setNotification("Message de contact supprimé avec succès.");
    } catch (err) {
      console.error("Error deleting message:", err);
      setMessagesList(messagesList.filter(m => m.id !== id));
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "global"), settings);
      setNotification("Paramètres sauvegardés avec succès dans Firestore.");
    } catch (err) {
      console.error("Error updating settings:", err);
      setNotification("Paramètres sauvegardés localement (mode hors ligne).");
    }
  };

  const handleSaveGeminiKey = (e) => {
    e.preventDefault();
    localStorage.setItem("gemini_api_key", geminiApiKey);
    setNotification("Clé API Gemini configurée avec succès.");
  };

  const handleGenerateArticle = async () => {
    const aiClient = getGeminiClient();
    if (!aiClient) {
      setNotification("Clé API Gemini non disponible.");
      return;
    }

    setAiLoading(true);
    setAiResult("");
    try {
      const prompt = `Rédige un court article littéraire ou historique sur le sujet suivant lié à l'Anjou : "${aiTopic}". Le style doit être "${aiStyle}". Écris l'article en français, avec environ 3 paragraphes et un titre captivant au début.`;
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text || "";
      setAiResult(text);
      setNotification("Article rédigé avec succès par l'IA Gemini !");
    } catch (err) {
      console.error("Gemini generation error:", err);
      setNotification(`Erreur Gemini : ${err.message || err}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handlePublishAiArticle = async () => {
    if (!aiResult.trim()) return;
    
    const lines = aiResult.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    let title = lines[0] || `Article sur ${aiTopic}`;
    title = title.replace(/^#+\s*/, ""); // Strip markdown title tags
    
    let cat = "Outils";
    if (aiStyle === "Poétique") cat = "Poésies";
    else if (aiStyle === "Historique") cat = "Sciences";
    else cat = "Essais";

    const newArt = {
      title: title,
      views: 0,
      date: new Date().toISOString().split('T')[0],
      content: aiResult,
      category: cat
    };

    try {
      const docRef = await addDoc(collection(db, "articles"), newArt);
      setArticlesList([...articlesList, { id: docRef.id, ...newArt }]);
      setAiTopic("");
      setAiResult("");
      setNotification(`L'article IA "${title}" a été publié dans la catégorie ${cat}.`);
    } catch (err) {
      console.error("Error publishing AI article:", err);
      setArticlesList([...articlesList, { id: String(Date.now()), ...newArt }]);
      setAiTopic("");
      setAiResult("");
    }
  };

  const handleLogout = () => {
    setIsLoggedOut(true);
    setNotification(null);
  };

  const handleRestartSession = () => {
    setIsLoggedOut(false);
    setActiveSection(null);
    setSearchQuery("");
    setActiveCategory("Accueil");
    setNotification("Session restaurée avec Jeremy Veille.");
  };

  // --- New Handlers for Section Interactions ---
  // 1. Page Builder (Note: add/remove/move handlers are managed inside the PageBuilder component itself)

  const handleLoadPageToBuilder = (p) => {
    setBuilderEditingId(p.id);
    setBuilderEditingType("page");
    setActiveSection("Constructeur de Page");
  };

  const handleLoadArticleToBuilder = (a) => {
    setBuilderEditingId(a.id);
    setBuilderEditingType("article");
    setActiveSection("Constructeur de Page");
  };


  // 2. Médiathèque
  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMediaUploading(true);
    setMediaProgress(0);

    let progress = 0;
    const interval = setInterval(async () => {
      progress += 10;
      setMediaProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        
        let url = "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=600";
        if (file.type.startsWith("image/")) {
          try {
            url = URL.createObjectURL(file);
          } catch (err) {
            console.warn("Could not create object URL:", err);
          }
        } else if (file.type.startsWith("audio/")) {
          url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
        }

        const newMedia = {
          id: "m" + Date.now(),
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          date: new Date().toLocaleDateString("fr-FR") + " à " + new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
          url: url
        };

        try {
          await setDoc(doc(db, "medias", newMedia.id), newMedia);
          const updated = [...mediaList, newMedia];
          setMediaList(updated);
          localStorage.setItem("ae_medias", JSON.stringify(updated));
          setNotification(`Fichier "${file.name}" importé avec succès.`);
        } catch (err) {
          console.error("Error storing media:", err);
          const updated = [...mediaList, newMedia];
          setMediaList(updated);
          localStorage.setItem("ae_medias", JSON.stringify(updated));
          setNotification(`Fichier "${file.name}" importé localement.`);
        } finally {
          setMediaUploading(false);
        }
      }
    }, 100);
  };

  const handleDeleteMedia = async (id, name) => {
    if (!window.confirm(`Supprimer définitivement le fichier "${name}" ?`)) return;

    const updated = mediaList.filter(m => m.id !== id);
    setMediaList(updated);
    localStorage.setItem("ae_medias", JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, "medias", id));
      setNotification(`Fichier "${name}" supprimé.`);
    } catch (err) {
      console.error("Delete media error:", err);
      setNotification(`Fichier "${name}" supprimé localement.`);
    }
  };

  // 3. Galerie
  const handleAddPhotoSubmit = async (e) => {
    e.preventDefault();
    if (!newPhotoTitle.trim() || !newPhotoUrl.trim()) return;

    const newPhoto = {
      id: "g" + Date.now(),
      title: newPhotoTitle,
      url: newPhotoUrl,
      category: newPhotoCategory,
      description: newPhotoDesc || "Illustration de la douceur de l'Anjou.",
      date: new Date().toLocaleDateString("fr-FR")
    };

    const updated = [...galleryList, newPhoto];
    setGalleryList(updated);
    localStorage.setItem("ae_gallery", JSON.stringify(updated));

    try {
      await setDoc(doc(db, "gallery", newPhoto.id), newPhoto);
      setNotification(`Photo "${newPhotoTitle}" ajoutée avec succès.`);
    } catch (err) {
      console.error("Error saving photo:", err);
      setNotification(`Photo "${newPhotoTitle}" enregistrée localement.`);
    }

    setNewPhotoTitle("");
    setNewPhotoUrl("");
    setNewPhotoDesc("");
    setShowAddPhotoModal(false);
  };

  const handleDeletePhoto = async (id, title) => {
    if (!window.confirm(`Retirer "${title}" de la galerie ?`)) return;

    const updated = galleryList.filter(g => g.id !== id);
    setGalleryList(updated);
    localStorage.setItem("ae_gallery", JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, "gallery", id));
      setNotification(`Photo "${title}" retirée de la galerie.`);
    } catch (err) {
      console.error("Error deleting photo:", err);
      setNotification(`Photo "${title}" retirée localement.`);
    }
  };

  // 4. Vidéos
  const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddVideoSubmit = async (e) => {
    e.preventDefault();
    if (!newVideoTitle.trim() || !newVideoUrl.trim()) return;

    const yId = getYoutubeId(newVideoUrl);
    if (!yId) {
      alert("Veuillez saisir un lien YouTube valide (ex: https://www.youtube.com/watch?v=kGgY9fG3g80).");
      return;
    }

    const newVideo = {
      id: "v" + Date.now(),
      title: newVideoTitle,
      url: newVideoUrl,
      youtubeId: yId,
      description: newVideoDesc || "Lecture vidéo d'œuvres classiques ou récits historiques angevins.",
      category: newVideoCategory,
      date: new Date().toLocaleDateString("fr-FR")
    };

    const updated = [...videoList, newVideo];
    setVideoList(updated);
    localStorage.setItem("ae_videos", JSON.stringify(updated));

    try {
      await setDoc(doc(db, "videos", newVideo.id), newVideo);
      setNotification(`Vidéo "${newVideoTitle}" publiée.`);
    } catch (err) {
      console.error("Error publishing video:", err);
      setNotification(`Vidéo "${newVideoTitle}" publiée localement.`);
    }

    setNewVideoTitle("");
    setNewVideoUrl("");
    setNewVideoDesc("");
    setShowAddVideoModal(false);
  };

  const handleDeleteVideo = async (id, title) => {
    if (!window.confirm(`Supprimer la vidéo "${title}" ?`)) return;

    const updated = videoList.filter(v => v.id !== id);
    setVideoList(updated);
    localStorage.setItem("ae_videos", JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, "videos", id));
      setNotification(`Vidéo "${title}" supprimée.`);
    } catch (err) {
      console.error(err);
      setNotification(`Vidéo "${title}" supprimée localement.`);
    }
  };

  // 5. Actualités
  const handleAddNewsSubmit = async (e) => {
    e.preventDefault();
    if (!newNewsTitle.trim() || !newNewsContent.trim()) return;

    const newNews = {
      id: "n" + Date.now(),
      title: newNewsTitle,
      content: newNewsContent,
      type: newNewsType,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [...newsList, newNews];
    setNewsList(updated);
    localStorage.setItem("ae_news", JSON.stringify(updated));

    try {
      await setDoc(doc(db, "news", newNews.id), newNews);
      setNotification(`Annonce "${newNewsTitle}" publiée.`);
    } catch (err) {
      console.error(err);
      setNotification(`Annonce "${newNewsTitle}" publiée localement.`);
    }

    setNewNewsTitle("");
    setNewNewsContent("");
    setNewNewsType("Info");
    setShowAddNewsModal(false);
  };

  const handleDeleteNews = async (id, title) => {
    if (!window.confirm(`Supprimer l'actualité "${title}" ?`)) return;

    const updated = newsList.filter(n => n.id !== id);
    setNewsList(updated);
    localStorage.setItem("ae_news", JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, "news", id));
      setNotification(`Actualité "${title}" supprimée.`);
    } catch (err) {
      console.error(err);
      setNotification(`Actualité "${title}" retirée localement.`);
    }
  };

  // 5b. Navigation Menus & Reusable Shortcodes
  const sanitizeInput = (val) => {
    if (typeof val !== "string") return "";
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .trim();
  };

  const sanitizeUrl = (val) => {
    if (typeof val !== "string") return "";
    const cleaned = val.trim();
    // eslint-disable-next-line no-script-url
    if (cleaned.toLowerCase().startsWith("javascript:")) {
      return "#";
    }
    return cleaned;
  };

  const ALLOWED_SHORTCODE_TAGS = [
    "open_contact_modal",
    "toggle_theme",
    "play_speech",
    "increase_font",
    "show_flipbooks",
    "show_videos",
    "show_gallery",
    "alert_hello"
  ];

  const validateShortcode = (shortcode) => {
    if (!shortcode) return true;
    let clean = shortcode.trim();
    
    // Si c'est une clé de textsData directement
    if (textsData[clean]) {
      return true;
    }
    
    // Enlever les crochets s'il y en a pour valider contre textsData
    let unbracketed = clean;
    if (clean.startsWith("[") && clean.endsWith("]")) {
      unbracketed = clean.slice(1, -1).trim();
    }
    if (textsData[unbracketed]) {
      return true;
    }

    // Autorise les shortcodes de composants (e.g. PdfFlipbookReader), les tags HTML/JSX, ou les formats libres [CODE]
    if (clean.includes("PdfFlipbookReader") || clean.startsWith("<") || (clean.startsWith("[") && clean.endsWith("]"))) {
      return true;
    }
    
    // Sinon, valide par rapport à la liste autorisée
    const tagName = unbracketed.split(/\s+/)[0].toLowerCase();
    return ALLOWED_SHORTCODE_TAGS.includes(tagName);
  };

  const handleAddMenuSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validation and Sanitization
    const sanitizedTitle = sanitizeInput(newMenuItemTitle);
    if (!sanitizedTitle) {
      alert("L'intitulé est obligatoire.");
      return;
    }
    
    let sanitizedShortcode = "";
    if (newMenuItemType === "shortcode" || newMenuItemShortcode) {
      let rawSc = newMenuItemShortcode.trim();
      
      const isShortcodeValid = validateShortcode(rawSc);
      if (!isShortcodeValid) {
        alert("Erreur de validation : Le shortcode saisi n'est pas autorisé.");
        return;
      }
      
      // Si c'est du JSX contenant PdfFlipbookReader
      if (rawSc.includes("PdfFlipbookReader")) {
        const idMatch = rawSc.match(/id\s*(?:===|==|=)\s*["']?(\d+)["']?/);
        if (idMatch && idMatch[1]) {
          sanitizedShortcode = idMatch[1];
        } else {
          const genericIdMatch = rawSc.match(/\b\d{4,}\b/);
          if (genericIdMatch) {
            sanitizedShortcode = genericIdMatch[0];
          } else {
            sanitizedShortcode = rawSc;
          }
        }
      } else {
        // Enlever les crochets s'il y en a
        if (rawSc.startsWith('[') && rawSc.endsWith(']')) {
          rawSc = rawSc.slice(1, -1).trim();
        }
        sanitizedShortcode = sanitizeInput(rawSc);
      }
    }

    const sanitizedUrl = newMenuItemType === "shortcode" ? "" : sanitizeUrl(newMenuItemUrl);
    const parentId = newMenuItemParentId || null;
    const now = new Date();

    const isActive = newMenuItemStatus === "Actif";

    let updatedList = [];

    if (editingMenuItemId) {
      // Edit mode
      const originalItem = menusList.find(m => m.id === editingMenuItemId);
      updatedList = menusList.map(m => {
        if (m.id === editingMenuItemId) {
          return {
            ...m,
            title: sanitizedTitle,
            label: sanitizedTitle,
            icon: newMenuItemIcon,
            url: sanitizedUrl,
            slug: sanitizedUrl,
            shortcode: sanitizedShortcode || "",
            status: newMenuItemStatus,
            enabled: isActive,
            isActive: isActive,
            type: newMenuItemType,
            parentId: parentId,
            description: sanitizeInput(newMenuItemDescription),
            updatedAt: now,
            createdAt: originalItem?.createdAt || now
          };
        }
        return m;
      });
      setNotification(`Élément "${sanitizedTitle}" modifié avec succès.`);
    } else {
      // Add mode
      const maxOrder = menusList.reduce((max, item) => Math.max(max, item.order || 0), 0);

      const newMenuItem = {
        id: "m" + Date.now(),
        title: sanitizedTitle,
        label: sanitizedTitle,
        icon: newMenuItemIcon,
        url: sanitizedUrl,
        slug: sanitizedUrl,
        shortcode: sanitizedShortcode || "",
        status: newMenuItemStatus,
        enabled: isActive,
        isActive: isActive,
        type: newMenuItemType,
        parentId: parentId,
        order: maxOrder + 1,
        description: sanitizeInput(newMenuItemDescription),
        createdAt: now,
        updatedAt: now
      };

      updatedList = [...menusList, newMenuItem];
      setNotification(`Élément "${newMenuItem.title}" créé.`);
      setNewlyAddedMenuItemId(newMenuItem.id);
      setTimeout(() => setNewlyAddedMenuItemId(null), 3000);
    }

    const reindexed = reindexMenuOrders(updatedList);
    await saveAllMenusToFirebase(reindexed);

    setShowAddMenuModal(false);
    setEditingMenuItemId(null);
  };

  // Keyboard navigation & drag-and-drop helpers
  // Keyboard navigation & drag-and-drop helpers
  const getDescendantIds = (itemId, items) => {
    const children = items.filter(item => normalizeParentId(item.parentId) === itemId);
    let ids = children.map(c => c.id);
    children.forEach(c => {
      ids = ids.concat(getDescendantIds(c.id, items));
    });
    return ids;
  };

  // Keyboard navigation & drag-and-drop helpers
  const handleMoveUp = async (id) => {
    const item = menusList.find(m => m.id === id);
    if (!item) return;
    const targetParentId = normalizeParentId(item.parentId);
    const siblings = menusList
      .filter(m => normalizeParentId(m.parentId) === targetParentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = siblings.findIndex(m => m.id === id);
    if (idx <= 0) return; // Already first sibling

    const prevItem = siblings[idx - 1];

    // Swap order
    const tempOrder = item.order;
    item.order = prevItem.order;
    prevItem.order = tempOrder;

    const updated = menusList.map(m => {
      if (m.id === item.id) return { ...m, order: item.order };
      if (m.id === prevItem.id) return { ...m, order: prevItem.order };
      return m;
    });

    const reindexed = reindexMenuOrders(updated);
    await saveAllMenusToFirebase(reindexed);

    const msg = `Élément "${item.title}" monté.`;
    setMenuAriaAnnouncement(msg);
    setNotification(`Élément "${item.title}" déplacé.`);
  };

  const handleMoveDown = async (id) => {
    const item = menusList.find(m => m.id === id);
    if (!item) return;
    const targetParentId = normalizeParentId(item.parentId);
    const siblings = menusList
      .filter(m => normalizeParentId(m.parentId) === targetParentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = siblings.findIndex(m => m.id === id);
    if (idx === -1 || idx >= siblings.length - 1) return; // Already last sibling

    const nextItem = siblings[idx + 1];

    // Swap order
    const tempOrder = item.order;
    item.order = nextItem.order;
    nextItem.order = tempOrder;

    const updated = menusList.map(m => {
      if (m.id === item.id) return { ...m, order: item.order };
      if (m.id === nextItem.id) return { ...m, order: nextItem.order };
      return m;
    });

    const reindexed = reindexMenuOrders(updated);
    await saveAllMenusToFirebase(reindexed);

    const msg = `Élément "${item.title}" descendu.`;
    setMenuAriaAnnouncement(msg);
    setNotification(`Élément "${item.title}" déplacé.`);
  };

  const handleMakeSubItem = async (id) => {
    const targetItem = menusList.find(m => m.id === id);
    if (!targetItem) return;

    // Find siblings (sharing the same parent)
    const targetParentId = normalizeParentId(targetItem.parentId);
    const siblings = menusList
      .filter(m => normalizeParentId(m.parentId) === targetParentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const idx = siblings.findIndex(m => m.id === id);
    if (idx <= 0) {
      setNotification("Impossible de créer un sous-menu : pas d'élément précédent à ce niveau.");
      return;
    }

    // New parent is the sibling preceding this item
    const newParent = siblings[idx - 1];
    const newParentId = newParent.id;
    const existingChildren = menusList.filter(m => normalizeParentId(m.parentId) === newParentId);
    const newOrder = existingChildren.length + 1;

    // Update item
    const updated = menusList.map(m => {
      if (m.id === id) {
        return {
          ...m,
          parentId: newParentId,
          order: newOrder
        };
      }
      return m;
    });

    const reindexed = reindexMenuOrders(updated);
    await saveAllMenusToFirebase(reindexed);

    const msg = `Élément "${targetItem.title}" défini comme sous-menu de "${newParent.title}".`;
    setMenuAriaAnnouncement(msg);
    setNotification(`"${targetItem.title}" est maintenant un sous-menu.`);
  };

  const handleMakeTopItem = async (id) => {
    const targetItem = menusList.find(m => m.id === id);
    if (!targetItem) return;
    const targetParentId = normalizeParentId(targetItem.parentId);
    if (!targetParentId) return;

    // Parent of current item
    const parentItem = menusList.find(m => m.id === targetParentId);
    const newParentId = parentItem ? normalizeParentId(parentItem.parentId) : null;
    const parentOrder = parentItem ? (parentItem.order || 0) : 0;
    const newOrder = parentOrder + 1;

    // Update parentId and shift orders of items that come after parent
    const updated = menusList.map(m => {
      if (m.id === id) {
        return {
          ...m,
          parentId: newParentId,
          order: newOrder
        };
      }
      if (normalizeParentId(m.parentId) === newParentId && m.order >= newOrder && m.id !== id) {
        return { ...m, order: m.order + 1 };
      }
      return m;
    });

    const reindexed = reindexMenuOrders(updated);
    await saveAllMenusToFirebase(reindexed);

    const msg = `Élément "${targetItem.title}" sorti du sous-menu.`;
    setMenuAriaAnnouncement(msg);
    setNotification(`"${targetItem.title}" a été remonté.`);
  };

  const handleMoveItemDragAndDrop = async (draggedId, targetId) => {
    if (draggedId === targetId) return;

    // Avoid cyclical parenting (dragging into own children)
    const descendantIds = getDescendantIds(draggedId, menusList);
    if (descendantIds.includes(targetId)) {
      setNotification("Opération impossible : impossible de déplacer un élément dans ses propres sous-menus.");
      return;
    }

    const draggedItem = menusList.find(m => m.id === draggedId);
    const targetItem = menusList.find(m => m.id === targetId);
    if (!draggedItem || !targetItem) return;

    const targetParentId = normalizeParentId(targetItem.parentId);

    // Get siblings under target parent (excluding the dragged item)
    const siblings = menusList
      .filter(m => normalizeParentId(m.parentId) === targetParentId && m.id !== draggedId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const targetSiblingsIdx = siblings.findIndex(m => m.id === targetId);

    const updatedSiblings = [...siblings];
    updatedSiblings.splice(targetSiblingsIdx, 0, { ...draggedItem, parentId: targetParentId });

    // Re-assign orders
    updatedSiblings.forEach((sib, index) => {
      sib.order = index + 1;
    });

    const updatedList = menusList.map(m => {
      if (m.id === draggedId) {
        return { ...m, parentId: targetParentId, order: updatedSiblings.find(sib => sib.id === draggedId).order };
      }
      const sibMatch = updatedSiblings.find(sib => sib.id === m.id);
      if (sibMatch) {
        return { ...m, order: sibMatch.order };
      }
      return m;
    });

    const reindexed = reindexMenuOrders(updatedList);
    await saveAllMenusToFirebase(reindexed);

    const msg = `Élément "${draggedItem.title}" déplacé.`;
    setMenuAriaAnnouncement(msg);
    setNotification("Ordre du menu mis à jour.");
  };

  const handleDeleteMenu = async (id, title) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'élément "${title}" ?`)) return;

    const targetItem = menusList.find(m => m.id === id);
    const parentId = targetItem ? normalizeParentId(targetItem.parentId) : null;

    const updated = menusList
      .filter(m => m.id !== id)
      .map(m => {
        if (normalizeParentId(m.parentId) === id) {
          return { ...m, parentId: parentId };
        }
        return m;
      });

    const reindexed = reindexMenuOrders(updated);
    setMenusList(reindexed);
    localStorage.setItem("ae_menus", JSON.stringify(reindexed));

    try {
      await deleteDoc(doc(db, "menus", id));
      await Promise.all(reindexed.map(async (m) => {
        const { id: docId, ...menuData } = m;
        const dataToSave = {
          ...menuData,
          parentId: normalizeParentId(menuData.parentId),
          order: menuData.order || 0,
          updatedAt: new Date()
        };
        await setDoc(doc(db, "menus", docId), dataToSave);
      }));
      setNotification(`Élément "${title}" supprimé.`);
    } catch (err) {
      console.error(err);
      setNotification(`Élément "${title}" retiré localement.`);
    }
  };

  const handleCopyShortcode = (shortcode) => {
    if (!shortcode) return;
    navigator.clipboard.writeText(shortcode);
    setNotification("Shortcode copié dans le presse-papiers.");
  };

  const handleInsertShortcode = (shortcode) => {
    if (!shortcode) return;
    if (!lastFocusedField) {
      // Fallback: Copy to clipboard
      handleCopyShortcode(shortcode);
      return;
    }

    const { type, field, pageIdx } = lastFocusedField;

    if (type === "page" && field === "title") {
      setNewPageTitle(prev => prev + shortcode);
      setNotification("Shortcode inséré avec succès.");
    } else if (type === "article" && field === "title") {
      setNewArticleTitle(prev => prev + shortcode);
      setNotification("Shortcode inséré avec succès.");
    } else if (type === "gemini" && field === "result") {
      setAiResult(prev => prev + shortcode);
      setNotification("Shortcode inséré avec succès.");
    } else if (type === "flipbook" && editingFlipbook && editingFlipbook.pages) {
      const newPages = [...editingFlipbook.pages];
      if (newPages[pageIdx]) {
        const currentVal = newPages[pageIdx][field] || "";
        newPages[pageIdx][field] = currentVal + shortcode;
        setEditingFlipbook({ ...editingFlipbook, pages: newPages });
        setNotification("Shortcode inséré avec succès.");
      } else {
        handleCopyShortcode(shortcode);
      }
    } else if (type === "news") {
      if (field === "title") {
        setNewNewsTitle(prev => prev + shortcode);
      } else if (field === "content") {
        setNewNewsContent(prev => prev + shortcode);
      }
      setNotification("Shortcode inséré avec succès.");
    } else {
      handleCopyShortcode(shortcode);
    }
  };

  const renderShortcodePreview = (item) => {
    if (!item || !item.shortcode) return "Aucun shortcode défini.";
    const sc = item.shortcode.trim();

    if (sc.startsWith("[mon_menu")) {
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Aperçu Menu Horizontal :</p>
          <div className="flex gap-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
            <span className="cursor-pointer hover:underline">Accueil</span>
            <span className="cursor-pointer hover:underline">Poésies</span>
            <span className="cursor-pointer hover:underline">À Propos</span>
            <span className="cursor-pointer hover:underline">Contact</span>
          </div>
        </div>
      );
    }

    if (sc.startsWith("[article_liste")) {
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
          <p className="text-[10px] uppercase font-bold text-slate-400">Aperçu Liste d'Articles :</p>
          <div className="space-y-2 text-xs">
            <div className="border-b pb-2 border-slate-200 dark:border-slate-800">
              <p className="font-bold text-slate-805 dark:text-slate-200">Festival l'Anjou Littéraire 2026</p>
              <p className="text-slate-400 text-[10px]">Publié le 08/06/2026</p>
            </div>
            <div className="border-b pb-2 border-slate-200 dark:border-slate-800">
              <p className="font-bold text-slate-805 dark:text-slate-200">La poésie angevine contemporaine au XXIe siècle</p>
              <p className="text-slate-400 text-[10px]">Publié le 03/06/2026</p>
            </div>
          </div>
        </div>
      );
    }

    if (sc.startsWith("[bouton")) {
      const textMatch = sc.match(/texte="([^"]+)"/) || sc.match(/text="([^"]+)"/);
      const text = textMatch ? textMatch[1] : "Bouton";
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400 text-left mb-3">Aperçu Bouton d'Action :</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-lg cursor-pointer border-none shadow-sm transition-colors">
            {text}
          </button>
        </div>
      );
    }

    if (sc.startsWith("[bloc_contenu")) {
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Aperçu Bloc de Contenu :</p>
          <div className="border-l-4 border-emerald-500 pl-3 py-1">
            <h6 className="font-bold text-sm text-slate-855 dark:text-slate-200">Bienvenue sur le portail Anjou Édition</h6>
            <p className="text-xs text-slate-550 leading-relaxed mt-1">
              Ce contenu réutilisable s'insère dynamiquement dans vos constructeurs de page et dans vos articles d'édition.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400">
        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 font-sans">Aperçu Générique :</p>
        Code court : {sc}
      </div>
    );
  };

  // 6. Mes Comptes
  const handleAddAccountSubmit = async (e) => {
    e.preventDefault();
    if (!newAccountName.trim() || !newAccountEmail.trim()) return;

    const colors = ["#336ddc", "#004b7a", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newAccount = {
      id: "u" + Date.now(),
      name: newAccountName,
      email: newAccountEmail,
      role: newAccountRole,
      status: newAccountStatus,
      color: randomColor
    };

    const updated = [...accountsList, newAccount];
    setAccountsList(updated);
    localStorage.setItem("ae_accounts", JSON.stringify(updated));

    try {
      await setDoc(doc(db, "accounts", newAccount.id), newAccount);
      setNotification(`Compte d'écrivain créé pour "${newAccountName}".`);
    } catch (err) {
      console.error(err);
      setNotification(`Compte créé localement.`);
    }

    setNewAccountName("");
    setNewAccountEmail("");
    setShowAddAccountModal(false);
  };

  const handleToggleAccountStatus = async (id) => {
    const updated = accountsList.map(u => {
      if (u.id === id) {
        const newStatus = u.status === "Actif" ? "Inactif" : "Actif";
        return { ...u, status: newStatus };
      }
      return u;
    });

    setAccountsList(updated);
    localStorage.setItem("ae_accounts", JSON.stringify(updated));

    const targetAccount = updated.find(u => u.id === id);
    try {
      await setDoc(doc(db, "accounts", id), targetAccount);
      setNotification(`Statut de "${targetAccount.name}" mis à jour.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async (id, name) => {
    if (!window.confirm(`Supprimer définitivement le compte d'écrivain de "${name}" ?`)) return;

    const updated = accountsList.filter(u => u.id !== id);
    setAccountsList(updated);
    localStorage.setItem("ae_accounts", JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, "accounts", id));
      setNotification(`Compte de "${name}" supprimé.`);
    } catch (err) {
      console.error(err);
      setNotification(`Compte retiré localement.`);
    }
  };

  const displayedPages = pagesList
    .filter(p => activeCategory === "Accueil" || p.category === activeCategory || (p.title && p.title.toLowerCase().includes(activeCategory.toLowerCase())))
    .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const displayedArticles = articlesList
    .filter(a => activeCategory === "Accueil" || a.category === activeCategory || (a.title && a.title.toLowerCase().includes(activeCategory.toLowerCase())))
    .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const displayedMessages = messagesList.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedFlipbooks = flipbooks
    .filter(fb => activeCategory === "Accueil" || fb.category === activeCategory)
    .filter(fb => {
      if (!filterDate || filterDate === "0") return true;
      const month = filterDate.substring(4, 6);
      const year = filterDate.substring(0, 4);
      const dateStr = fb.date || "";
      return dateStr.includes(`${month}/${year}`);
    })
    .filter(fb =>
      (fb.title && fb.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (fb.description && fb.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const displayedMenus = getFlattenedMenuTree(menusList)
    .filter(m => {
      const q = menusSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.shortcode && m.shortcode.toLowerCase().includes(q))
      );
    });

  if (isLoggedOut) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-amber-600 animate-bounce" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Déconnexion Réussie</h1>
          <p className="text-slate-600 text-sm mb-6">
            Votre session administrative a été fermée de manière sécurisée. À bientôt sur Anjou Edition !
          </p>
          <button
            id="btn-reconnect"
            onClick={handleRestartSession}
            className="w-full bg-[#336ddc] hover:bg-[#1e52be] text-white font-bold py-3 px-6 rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center justify-center gap-2"
          >
            Se reconnecter en tant que Jeremy
          </button>
        </div>
      </div>
    );
  }

  const renderMenuForm = (isInline = false) => (
    <form onSubmit={handleAddMenuSubmit} className={isInline ? "space-y-4" : "ae-modal-body space-y-4"}>
      <div>
        <label htmlFor="menu-item-title" className="ae-modal-label">Intitulé de l'élément <span className="text-red-500">*</span></label>
        <input 
          id="menu-item-title"
          type="text" 
          required 
          placeholder="ex: Accueil" 
          value={newMenuItemTitle} 
          onChange={(e) => setNewMenuItemTitle(e.target.value)} 
          className="db-input"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="menu-item-type" className="ae-modal-label">Type d'action</label>
          <select
            id="menu-item-type"
            value={newMenuItemType}
            onChange={(e) => setNewMenuItemType(e.target.value)}
            className="db-select w-full"
          >
            <option value="internal">Lien interne (Route)</option>
            <option value="external">Lien externe (URL)</option>
            <option value="shortcode">Contenu dynamique / Action</option>
          </select>
        </div>
        <div>
          <label htmlFor="menu-item-status" className="ae-modal-label">État de publication</label>
          <select
            id="menu-item-status"
            value={newMenuItemStatus}
            onChange={(e) => setNewMenuItemStatus(e.target.value)}
            className="db-select w-full"
          >
            <option value="Actif">Actif</option>
            <option value="Inactif">Inactif</option>
          </select>
        </div>
      </div>
      {newMenuItemType !== "shortcode" && (
        <div>
          <label htmlFor="menu-item-url" className="ae-modal-label">Adresse URL / Route / Slug <span className="text-red-500">*</span></label>
          <input 
            id="menu-item-url"
            type="text" 
            required 
            placeholder="ex: /contact" 
            value={newMenuItemUrl} 
            onChange={(e) => setNewMenuItemUrl(e.target.value)} 
            className="db-input"
          />
        </div>
      )}
      {(!editingMenuItemId || !menusList.some(m => normalizeParentId(m.parentId) === editingMenuItemId)) ? (
        <div>
          <label htmlFor="menu-item-shortcode" className="ae-modal-label">Contenu Dynamique / Action au clic</label>
          <input 
            id="menu-item-shortcode"
            type="text" 
            list="shortcode-options"
            placeholder="Sélectionnez ou saisissez un identifiant..." 
            value={newMenuItemShortcode} 
            onChange={(e) => setNewMenuItemShortcode(e.target.value)} 
            className="db-input font-mono"
          />
          <datalist id="shortcode-options">
            <option value="open_contact_modal">Action : Formulaire de contact</option>
            <option value="toggle_theme">Action : Changer de thème</option>
            <option value="play_speech">Action : Lire bienvenue</option>
            <option value="increase_font">Action : Agrandir texte</option>
            <option value="show_flipbooks">Action : Liste des flipbooks</option>
            <option value="show_videos">Action : Liste des vidéos</option>
            <option value="show_gallery">Action : Galerie photos</option>
            {pagesList && pagesList.map(p => (
              <option key={`page-${p.id}`} value={p.slug || p.title}>Page : {p.title}</option>
            ))}
            {textsData && Object.entries(textsData).map(([key, data]) => (
              <option key={`txt-${key}`} value={key}>Texte : {data.title}</option>
            ))}
            {flipbooks && flipbooks.map(fb => (
              <option key={`fb-${fb.id}`} value={`[PdfFlipbookReader id="${fb.id}"]`}>Flipbook : {fb.title}</option>
            ))}
          </datalist>
          <span className="text-[10px] text-slate-400 block mt-1">
            Choisissez un contenu dans la liste ou saisissez son identifiant. 
            {newMenuItemType === "shortcode" && " (Requis pour le type Shortcode/Contenu dynamique)"}
          </span>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-550">
          ℹ️ Le champ shortcode est masqué car cet élément possède des sous-menus (menu parent).
        </div>
      )}
      <div>
        <label htmlFor="menu-item-parent" className="ae-modal-label">Élément parent (niveaux illimités)</label>
        <select
          id="menu-item-parent"
          value={newMenuItemParentId}
          onChange={(e) => setNewMenuItemParentId(e.target.value)}
          className="db-select w-full"
        >
          <option value="">-- Aucun parent (Élément principal) --</option>
          {(() => {
            const flatTree = getFlattenedMenuTree(menusList);
            const excludedIds = editingMenuItemId ? [editingMenuItemId, ...getDescendantIds(editingMenuItemId, menusList)] : [];
            return flatTree
              .filter(m => !excludedIds.includes(m.id))
              .map(m => (
                <option key={m.id} value={m.id}>
                  {"\u00a0\u00a0".repeat(m.depth || 0) + (m.depth > 0 ? "└── " : "") + m.title}
                </option>
              ));
          })()}
        </select>
      </div>
      <div>
        <label htmlFor="menu-item-icon" className="ae-modal-label">Icône (Nom du symbole)</label>
        <select
          id="menu-item-icon"
          value={newMenuItemIcon}
          onChange={(e) => setNewMenuItemIcon(e.target.value)}
          className="db-select w-full"
        >
          <option value="Home">🏠 Accueil (Home)</option>
          <option value="Newspaper">📰 Actualités (Newspaper)</option>
          <option value="HelpCircle">❓ Aide / Contact (HelpCircle)</option>
          <option value="Layers">🧩 Blocs (Layers)</option>
          <option value="Link">🔗 Lien externe (Link)</option>
        </select>
      </div>
      <div>
        <label htmlFor="menu-item-desc" className="ae-modal-label">Description courte</label>
        <textarea 
          id="menu-item-desc"
          placeholder="Brève description de la fonction de cet élément..." 
          value={newMenuItemDescription} 
          onChange={(e) => setNewMenuItemDescription(e.target.value)} 
          rows={2}
          className="db-textarea text-xs"
        />
      </div>
      <div className={isInline ? "flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800" : "ae-modal-footer font-sans"}>
        <button type="button" onClick={() => setShowAddMenuModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none">
          Annuler
        </button>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none">
          {editingMenuItemId ? "Enregistrer" : "Créer l'élément"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="dashboard-body-wrapper">

      {/* ====================================================================
          PAGE BUILDER - Rendu en plein écran au niveau racine du Dashboard
          pour éviter les contraintes du layout (sidebar, padding, max-width)
          ==================================================================== */}
      {activeSection === "Constructeur de Page" && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#f8fafc',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <PageBuilder
            editingId={builderEditingId}
            editingType={builderEditingType}
            onClose={() => {
              const targetSection = builderEditingType === "article" ? "Article" : "Page";
              setBuilderEditingId(null);
              setBuilderEditingType(null);
              setActiveSection(targetSection);
            }}
            onSaveSuccess={async (savedItem) => {
              await fetchPages();
              await fetchArticles();
            }}
          />
        </div>
      )}

      {/* Visual background decoration banner */}
      <div className="blue-top-accent"></div>

      {/* Main Container positioned elegantly top-level */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 position-relative">
        <div className={`container-card dashboard-layout-container ${sidebarOpen ? "sidebar-open" : ""}`}>
          
          {/* Mobile sidebar overlay */}
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>

          {/* 1. Left Sidebar */}
          <aside className="dashboard-sidebar">
            <div>
              {/* Sidebar branding */}
              <div 
                className="sidebar-brand cursor-pointer"
                onClick={() => {
                  setActiveSection(null);
                  setActiveCategory("Accueil");
                  setSidebarOpen(false);
                  setNotification("Retour à l'accueil du tableau de bord.");
                }}
              >
                <div className="sidebar-brand-icon">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="sidebar-brand-text">
                  <span>ANJOU ÉDITION</span>
                  <span className="sidebar-brand-subtitle">Pour les Nuls</span>
                </div>
              </div>

              {/* Sidebar Menu */}
              <nav className="sidebar-menu">
                <div className="sidebar-section-title">Général</div>
                <button
                  onClick={() => {
                    setActiveSection(null);
                    setActiveCategory("Accueil");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${!activeSection ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <LayoutDashboard className="w-4 h-4" />
                    Vue d'ensemble
                  </span>
                </button>

                <div className="sidebar-section-title">Gestion Contenus</div>
                <button
                  onClick={() => {
                    setActiveSection("Page");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Page" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <FileText className="w-4 h-4" />
                    Pages
                  </span>
                  <span className="sidebar-badge">{pagesList.length}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("Article");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Article" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <Newspaper className="w-4 h-4" />
                    Articles
                  </span>
                  <span className="sidebar-badge">{articlesList.length}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("Mes Flipbooks");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Mes Flipbooks" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <BookOpen className="w-4 h-4" />
                    Flipbooks
                  </span>
                  <span className="sidebar-badge">{flipbooks.length}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("Constructeur de Page");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Constructeur de Page" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <Layers className="w-4 h-4" />
                    Constructeur
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("Actualités");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Actualités" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <Megaphone className="w-4 h-4" />
                    Actualités
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("Mes menus");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Mes menus" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <Menu className="w-4 h-4" />
                    Mes menus
                  </span>
                </button>

                <div className="sidebar-section-title">Médias</div>
                <button
                  onClick={() => {
                    setActiveSection("Médiathèque");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Médiathèque" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <FolderOpen className="w-4 h-4" />
                    Médiathèque
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("Galerie");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Galerie" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <Image className="w-4 h-4" />
                    Galerie Photos
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("Vidéos");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Vidéos" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <Play className="w-4 h-4" />
                    Vidéos
                  </span>
                </button>

                <div className="sidebar-section-title">Administration</div>
                <button
                  onClick={() => {
                    setActiveSection("Messages");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Messages" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <MessageSquare className="w-4 h-4" />
                    Messages
                  </span>
                  {messagesList.length > 0 && (
                    <span className="sidebar-badge sidebar-badge-red">{messagesList.length}</span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveSection("Mes Comptes");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Mes Comptes" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <Users className="w-4 h-4" />
                    Comptes / Écrivains
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("Paramètres");
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-menu-btn ${activeSection === "Paramètres" ? "active" : ""}`}
                >
                  <span className="sidebar-menu-btn-inner">
                    <Settings className="w-4 h-4" />
                    Paramètres
                  </span>
                </button>
              </nav>
            </div>

            {/* Sidebar User Footer */}
            <div className="sidebar-footer">
              <div className="sidebar-user">
                <div className="sidebar-user-avatar">
                  {userName.charAt(0)}
                </div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{userName}</span>
                  <span className="sidebar-user-role">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    Administrateur
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="sidebar-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                Déconnexion
              </button>
            </div>
          </aside>

          {/* 2. Right Content Area */}
          <div className="dashboard-content-area">
            
            {/* Topbar */}
            <DashboardHeader
              userName={userName}
              onLogoutClick={handleLogout}
              onDashboardClick={() => {
                setActiveSection(null);
                setActiveCategory("Accueil");
                setSidebarOpen(false);
                setNotification("Retour à l'accueil du tableau de bord.");
              }}
              onBackToSiteClick={onBackToSite}
              currentPage={activeSection ? "subpage" : "dashboard"}
              activeSection={activeSection}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />

            {/* Main Area Content */}
            <div className="dashboard-main p-6 relative">
              {isInitializing ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004b7a] mb-4"></div>
                  <p>Chargement des données...</p>
                </div>
              ) : activeSection ? (
                /* ======================================================== */
                /* COMPREHENSIVE DETAIL ACTIVE VIEW (SIMULATED ROUTER)     */
                /* ======================================================== */
                <div className="detail-view-container">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                    <div className="flex items-center gap-3">
                      <button
                        id="btn-back-to-home"
                        onClick={() => setActiveSection(null)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        title="Retour au Tableau de bord"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h3 className="text-xl md:text-2xl font-black text-[#004b7a]">
                          Gestion : {activeSection}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Simulated views per Section Type */}
                  {activeSection === "Page" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="db-panel-card">
                          <h4 className="db-title">
                            <FileText className="w-5 h-5 text-blue-500" />
                            Pages existantes sur le site de publication
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="db-table">
                              <thead>
                                <tr>
                                  <th>Titre de la page</th>
                                  <th>Auteur</th>
                                  <th className="hidden md:table-cell">Catégorie</th>
                                  <th>Statut</th>
                                  <th className="text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {displayedPages.map((p) => (
                                  <tr key={p.id}>
                                    <td className="font-semibold">
                                      {p.title}
                                      <span className="block text-[10px] text-slate-400 mt-0.5 md:hidden">
                                        Catégorie: {p.category || "Outils"}
                                      </span>
                                    </td>
                                    <td className="text-slate-500">{p.author}</td>
                                    <td className="hidden md:table-cell">
                                      <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                        {p.category || "Outils"}
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                        p.status === "Publié" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                      }`}>
                                        {p.status}
                                      </span>
                                    </td>
                                    <td className="text-right">
                                       <button
                                         onClick={() => handleLoadPageToBuilder(p)}
                                         className="p-1 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors cursor-pointer border-none bg-transparent me-2"
                                         title="Éditer avec le constructeur"
                                       >
                                         <Edit3 className="w-4.5 h-4.5" />
                                       </button>
                                      <button
                                        onClick={() => handleDeletePage(p.id)}
                                        className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors cursor-pointer border-none bg-transparent"
                                        title="Supprimer la page"
                                      >
                                        <Trash2 className="w-4.5 h-4.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {displayedPages.length === 0 && (
                                  <tr>
                                    <td colSpan="5" className="text-center py-6 text-slate-400 italic">
                                      Aucune page trouvée.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="db-panel-sidebar">
                          <h4 className="text-sm font-bold mb-3">Créer une nouvelle page</h4>
                          <form onSubmit={handleAddPage} className="space-y-4">
                            <div>
                              <label className="db-label">Titre de la page</label>
                              <input
                                type="text"
                                value={newPageTitle}
                                onChange={(e) => setNewPageTitle(e.target.value)}
                                onFocus={() => setLastFocusedField({ type: "page", field: "title" })}
                                placeholder="ex: Nos poésies de l'Anjou"
                                className="db-input"
                              />
                            </div>
                            <div>
                              <label className="db-label">Catégorie</label>
                              <select
                                value={newPageCategory}
                                onChange={(e) => setNewPageCategory(e.target.value)}
                                className="db-select"
                              >
                                <option value="Outils">Outils</option>
                                <option value="Poésies">Poésies</option>
                                <option value="Nouvelles">Nouvelles</option>
                                <option value="Romans">Romans</option>
                                <option value="Contes et légendes">Contes et légendes</option>
                                <option value="Essais">Essais</option>
                                <option value="Sciences">Sciences</option>
                                <option value="Cursus scolaire">Cursus scolaire</option>
                                <option value="Art">Art</option>
                              </select>
                            </div>
                            <button
                              type="submit"
                              className="db-btn-primary"
                            >
                              Ajouter aux pages
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "Article" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="db-panel-card">
                          <h4 className="db-title">
                            <Newspaper className="w-5 h-5 text-blue-500" />
                            Articles récents
                          </h4>
                          <div className="space-y-3">
                            {displayedArticles.map(a => (
                              <div key={a.id} className="p-4 border border-slate-100 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div>
                                  <h5 className="font-bold text-slate-800">{a.title}</h5>
                                  <p className="text-xs text-slate-400">
                                    Date: {a.date} | {a.views || 0} lectures | Catégorie: <span className="font-semibold text-slate-605">{a.category || "Outils"}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-badge bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">Livre d'or</span>
                                  <button
                                    onClick={() => handleLoadArticleToBuilder(a)}
                                    className="p-1.5 rounded-md hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors cursor-pointer border-none bg-transparent"
                                    title="Éditer avec le constructeur"
                                  >
                                    <Edit3 className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteArticle(a.id)}
                                    className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors cursor-pointer border-none bg-transparent"
                                    title="Supprimer l'article"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {displayedArticles.length === 0 && (
                              <div className="text-center py-6 text-slate-400 italic">
                                Aucun article trouvé.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="db-panel-sidebar">
                          <h4 className="text-sm font-bold mb-3">Rédiger un article rapide</h4>
                          <form onSubmit={handleAddArticle} className="space-y-4">
                            <div>
                              <input
                                type="text"
                                value={newArticleTitle}
                                onChange={(e) => setNewArticleTitle(e.target.value)}
                                onFocus={() => setLastFocusedField({ type: "article", field: "title" })}
                                placeholder="Titre de l'article sur la Loire"
                                className="db-input"
                              />
                            </div>
                            <div>
                              <label className="db-label">Catégorie</label>
                              <select
                                value={newArticleCategory}
                                onChange={(e) => setNewArticleCategory(e.target.value)}
                                className="db-select"
                              >
                                <option value="Outils">Outils</option>
                                <option value="Poésies">Poésies</option>
                                <option value="Nouvelles">Nouvelles</option>
                                <option value="Romans">Romans</option>
                                <option value="Contes et légendes">Contes et légendes</option>
                                <option value="Essais">Essais</option>
                                <option value="Sciences">Sciences</option>
                                <option value="Cursus scolaire">Cursus scolaire</option>
                                <option value="Art">Art</option>
                              </select>
                            </div>
                            <button
                              type="submit"
                              className="db-btn-primary"
                            >
                              Publier l'article
                            </button>
                          </form>
                        </div>

                        {/* Gemini Generator section */}
                        <div className="db-panel-sidebar gemini-generator-panel space-y-4">
                          <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5 dark-text-indigo">
                            <Sparkles className="w-4 h-4 text-indigo-650 animate-pulse" />
                            Générateur d'Article IA (Gemini)
                          </h4>
                          
                          {!getGeminiClient() ? (
                            <div className="text-xs space-y-2">
                              <p className="text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200/50 leading-relaxed">
                                Clé API Gemini manquante. Veuillez la configurer dans l'onglet <strong>Paramètres</strong> pour activer la rédaction assistée.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="db-label text-indigo-700">Sujet de l'article</label>
                                <input
                                  type="text"
                                  value={aiTopic}
                                  onChange={(e) => setAiTopic(e.target.value)}
                                  placeholder="ex: L'histoire du Château d'Angers"
                                  className="db-input"
                                />
                              </div>
                              
                              <div>
                                <label className="db-label text-indigo-700">Style d'écriture</label>
                                <select
                                  value={aiStyle}
                                  onChange={(e) => setAiStyle(e.target.value)}
                                  className="db-select"
                                >
                                  <option value="Historique">Historique (Sciences)</option>
                                  <option value="Poétique">Poétique (Poésies)</option>
                                  <option value="Journalistique">Journalistique (Essais)</option>
                                  <option value="Récit de voyage">Récit de voyage (Contes)</option>
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={handleGenerateArticle}
                                disabled={aiLoading || !aiTopic.trim()}
                                className="db-btn-primary bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350"
                              >
                                {aiLoading ? (
                                  <>
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Génération en cours...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Générer avec Gemini
                                  </>
                                )}
                              </button>
                              
                              {aiResult && (
                                <div className="space-y-2 mt-3 pt-3 border-t border-indigo-100">
                                  <label className="db-label text-indigo-700">Aperçu du texte généré</label>
                                  <textarea
                                    value={aiResult}
                                    onChange={(e) => setAiResult(e.target.value)}
                                    onFocus={() => setLastFocusedField({ type: "gemini", field: "result" })}
                                    rows={5}
                                    className="db-textarea font-mono text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={handlePublishAiArticle}
                                    className="db-btn-primary bg-emerald-600 hover:bg-emerald-700 border-none cursor-pointer"
                                  >
                                    Publier cet Article
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "Messages" && (
                    <div className="space-y-6">
                      <div className="db-panel-card">
                        <h4 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-1.5">
                          <MessageSquare className="w-5 h-5 text-blue-500" />
                          Messages de contact (Formulaires reçus)
                        </h4>
                        {displayedMessages.length === 0 ? (
                          <div className="text-center py-8 text-slate-505 italic">
                            Aucun message trouvé dans la boîte de réception.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase font-bold">
                                  <th className="pb-3 text-slate-600">Expéditeur</th>
                                  <th className="pb-3 text-slate-600">E-mail</th>
                                  <th className="pb-3 text-slate-600">Sujet</th>
                                  <th className="pb-3 text-slate-600">Message</th>
                                  <th className="pb-3 text-slate-600">Date</th>
                                  <th className="pb-3 text-slate-600 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {displayedMessages.map((m) => (
                                  <tr key={m.id} className="border-b border-slate-100 last:border-b-0 text-sm hover:bg-slate-50 transition-colors">
                                    <td className="py-3 font-semibold text-slate-805">{m.name}</td>
                                    <td className="py-3 text-slate-500">
                                      <a href={`mailto:${m.email}`} className="text-blue-600 hover:underline">{m.email}</a>
                                    </td>
                                    <td className="py-3 text-slate-700 font-bold">{m.subject}</td>
                                    <td className="py-3 text-slate-600 max-w-xs truncate" title={m.message}>{m.message}</td>
                                    <td className="py-3 text-slate-400 text-xs">{m.date}</td>
                                    <td className="py-3 text-right">
                                      <button
                                        onClick={() => handleDeleteMessage(m.id)}
                                        className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors cursor-pointer inline-flex items-center border-none bg-transparent"
                                        title="Supprimer le message"
                                      >
                                        <Trash2 className="w-4.5 h-4.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PageBuilder est rendu en mode plein écran au niveau racine du Dashboard
                      (voir le bloc fixé en haut du JSX return) - rien à afficher ici */}
                  {activeSection === "Constructeur de Page" && null}


                  {activeSection === "Mes Flipbooks" && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            Bibliothèque de Flipbooks interactifs
                          </h4>
                          <p className="text-sm text-slate-505">
                            Gérez les flipbooks PDF de la plateforme de publication en toute simplicité.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setUploadStep(0);
                            setUploadProgress(0);
                            setNewFlipbookTitle("");
                            setNewFlipbookDesc("");
                            setNewFlipbookCategory("Outils");
                            setSelectedPdfFile(null);
                            setShowAddFlipbookModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 self-start md:self-auto shadow-sm"
                        >
                          <Plus className="w-4 h-4" /> Ajouter un flipbook
                        </button>
                      </div>

                      <div className="db-panel-card">
                        {/* Filtres et actions groupées */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex flex-wrap items-center gap-2">
                            <select 
                              value={bulkActionTop}
                              onChange={(e) => setBulkActionTop(e.target.value)}
                              className="db-select text-xs py-1.5 h-auto min-w-[150px]"
                            >
                              <option value="-1">Actions groupées</option>
                              <option value="edit">Modifier</option>
                              <option value="trash">Déplacer dans la corbeille</option>
                            </select>
                            <button 
                              type="button" 
                              className="bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-slate-200 dark:border-slate-700" 
                              onClick={() => handleBulkAction(bulkActionTop)}
                            >
                              Appliquer
                            </button>

                            <select 
                              value={tempDate}
                              onChange={(e) => setTempDate(e.target.value)}
                              className="db-select text-xs py-1.5 h-auto min-w-[150px] ml-2"
                            >
                              <option value="0">Toutes les dates</option>
                              <option value="202606">Juin 2026</option>
                              <option value="202605">Mai 2026</option>
                              <option value="202604">Avril 2026</option>
                            </select>
                            <button 
                              type="button" 
                              className="bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-slate-200 dark:border-slate-700" 
                              onClick={handleFilterDate}
                            >
                              Filtrer
                            </button>
                          </div>

                          <div className="text-xs text-slate-500 font-semibold">
                            {displayedFlipbooks.length} élément{displayedFlipbooks.length > 1 ? 's' : ''} trouvé{displayedFlipbooks.length > 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Le tableau des posts (Flipbooks) */}
                        <div className="overflow-x-auto">
                          <table className="db-table">
                            <thead>
                              <tr>
                                <th className="w-10">
                                  <input 
                                    type="checkbox" 
                                    checked={displayedFlipbooks.length > 0 && selectedFlipbookIds.length === displayedFlipbooks.length}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedFlipbookIds(displayedFlipbooks.map(fb => fb.id));
                                      } else {
                                        setSelectedFlipbookIds([]);
                                      }
                                    }}
                                    className="rounded border-slate-300 accent-blue-600 cursor-pointer"
                                  />
                                </th>
                                <th>Flipbook</th>
                                <th className="hidden md:table-cell">Intégration React.js</th>
                                <th>Fichier PDF</th>
                                <th className="hidden lg:table-cell">Date de publication</th>
                                <th className="text-right">Actions</th>
                              </tr>
                            </thead>

                            <tbody>
                              {displayedFlipbooks.map((fb) => (
                                <tr key={fb.id}>
                                  <td>
                                    <input 
                                      type="checkbox" 
                                      checked={selectedFlipbookIds.includes(fb.id)}
                                      onChange={() => {
                                        setSelectedFlipbookIds(prev => 
                                          prev.includes(fb.id) ? prev.filter(id => id !== fb.id) : [...prev, fb.id]
                                        );
                                      }}
                                      className="rounded border-slate-300 accent-blue-600 cursor-pointer"
                                    />
                                  </td>
                                  <td>
                                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                                      <span>{fb.title}</span>
                                      <span className="px-2.5 py-0.5 text-[9px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/40 uppercase tracking-wider">
                                        {fb.category || "Outils"}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-505 mt-1 max-w-md line-clamp-2">{fb.description}</p>
                                  </td>
                                  <td className="hidden md:table-cell">
                                    <div className="flex items-center gap-2">
                                      <code className="text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded text-blue-605 dark:text-blue-400 font-mono select-all">
                                        {`<PdfFlipbookReader book={book} />`}
                                      </code>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(`<PdfFlipbookReader book={flipbooks.find(f => f.id === "${fb.id}")} onClose={handleClose} />`);
                                          setNotification("Snippet React copié avec succès !");
                                        }}
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-650 transition-colors cursor-pointer border-none bg-transparent"
                                        title="Copier le code d'intégration React"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                  <td>
                                    <a 
                                      href={`#pdf-${fb.id}`} 
                                      className="text-xs text-blue-650 dark:text-blue-400 hover:underline font-semibold"
                                      onClick={(e) => { 
                                        e.preventDefault(); 
                                        setNotification(`Téléchargement du PDF pour : ${fb.title}`); 
                                      }}
                                    >
                                      {fb.pdfFile || (fb.id === "3322" ? "guide_historique_anjou.pdf" : "secrets_vignoble_angevin.pdf")}
                                    </a>
                                  </td>
                                  <td className="hidden lg:table-cell text-xs text-slate-505">
                                    {fb.date || (fb.id === "3322" ? "08/06/2026 à 14h30" : "14/04/2026 à 20h02")}
                                  </td>
                                  <td className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <button
                                        onClick={() => handleViewFlipbookClick(fb)}
                                        className="p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-405 hover:text-emerald-800 transition-colors cursor-pointer border-none bg-transparent"
                                        title="Afficher le flipbook interactif"
                                      >
                                        <BookOpen className="w-4.5 h-4.5" />
                                      </button>
                                      <button
                                        onClick={() => handleEditFlipbookClick(fb)}
                                        className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-405 hover:text-blue-805 transition-colors cursor-pointer border-none bg-transparent"
                                        title="Modifier le flipbook"
                                      >
                                        <Edit3 className="w-4.5 h-4.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFlipbook(fb.id, fb.title)}
                                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 dark:text-red-405 hover:text-red-700 transition-colors cursor-pointer border-none bg-transparent"
                                        title="Supprimer le flipbook"
                                      >
                                        <Trash2 className="w-4.5 h-4.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {displayedFlipbooks.length === 0 && (
                                <tr>
                                  <td colSpan="6" className="text-center py-6 text-slate-400 italic">
                                    Aucun flipbook trouvé dans la bibliothèque.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Actions groupées en bas */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <select 
                            value={bulkActionBottom}
                            onChange={(e) => setBulkActionBottom(e.target.value)}
                            className="db-select text-xs py-1.5 h-auto min-w-[150px]"
                          >
                            <option value="-1">Actions groupées</option>
                            <option value="edit">Modifier</option>
                            <option value="trash">Déplacer dans la corbeille</option>
                          </select>
                          <button 
                            type="button" 
                            className="bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-slate-200 dark:border-slate-700" 
                            onClick={() => handleBulkAction(bulkActionBottom)}
                          >
                            Appliquer
                          </button>
                        </div>

                      </div>
                    </div>
                  )}

                  {activeSection === "Mes Comptes" && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            Comptes & Écrivains d'Anjou
                          </h4>
                          <p className="text-sm text-slate-500">
                            Gérez les profils et les permissions des auteurs de la plateforme littéraire.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setNewAccountName("");
                            setNewAccountEmail("");
                            setNewAccountRole("Écrivain");
                            setNewAccountStatus("Actif");
                            setShowAddAccountModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm border-none"
                        >
                          <Plus className="w-4 h-4" /> Créer un profil
                        </button>
                      </div>

                      <div className="accounts-grid animate-fade-in">
                        {accountsList.map((account) => (
                          <div key={account.id} className="account-card">
                            <div className="account-avatar-large" style={{ backgroundColor: account.color || "#336ddc" }}>
                              {account.name ? account.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="account-info">
                              <p className="account-name">{account.name}</p>
                              <p className="account-email" title={account.email}>{account.email}</p>
                              <div className="account-badges">
                                <span className="account-badge-role">{account.role}</span>
                                <span 
                                  className={`account-badge-status ${account.status === "Actif" ? "active" : "inactive"}`}
                                >
                                  {account.status}
                                </span>
                              </div>
                            </div>
                            
                            <div className="account-actions">
                              <button
                                onClick={() => handleToggleAccountStatus(account.id)}
                                className="account-btn border-none"
                                title="Activer / Désactiver le compte"
                              >
                                <ShieldCheck className="w-4 h-4 text-emerald-650" />
                              </button>
                              {account.name !== "JEREMY VEILLE" && (
                                <button
                                  onClick={() => handleDeleteAccount(account.id, account.name)}
                                  className="account-btn account-btn-danger border-none bg-transparent"
                                  title="Supprimer le profil"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="db-panel-card max-w-xl">
                        <h5 className="font-bold text-slate-700 dark:text-slate-200 mb-3 text-sm uppercase">Modifier mon nom administratif</h5>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 outline-none flex-grow"
                          />
                          <button 
                            onClick={() => {
                              setNotification(`Nom d'administrateur mis à jour en "${userName}".`);
                              setAccountsList(accountsList.map(a => a.email === "jeremy.veille@hotmail.fr" ? { ...a, name: userName } : a));
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer border-none"
                          >
                            Valider
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "Médiathèque" && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            Médiathèque Littéraire
                          </h4>
                          <p className="text-sm text-slate-500">
                            Centralisez tous les documents du portail : PDF, images, musiques, poèmes.
                          </p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm border-none"
                          >
                            <UploadCloud className="w-4 h-4" /> Importer un fichier
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleMediaUpload}
                            style={{ display: 'none' }}
                          />
                        </div>
                      </div>

                      {mediaUploading && (
                        <div className="db-panel-card text-center py-6 space-y-3">
                          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                          <p className="text-sm font-bold">Importation du fichier... {mediaProgress}%</p>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                            <div className="bg-blue-600 h-full transition-all" style={{ width: `${mediaProgress}%` }}></div>
                          </div>
                        </div>
                      )}

                      <div className="media-grid animate-fade-in">
                        {mediaList.map((media) => {
                          const isImg = media.type && media.type.startsWith("image/");
                          const isAudio = media.type && media.type.startsWith("audio/");
                          const isPdf = media.type && media.type.includes("pdf");

                          return (
                            <div key={media.id} className="media-card">
                              <div className="media-card-thumbnail font-sans">
                                {isImg && media.url && media.url !== "#" ? (
                                  <img src={media.url} alt={media.name} referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-3xl">
                                    {isAudio ? "🎵" : isPdf ? "📕" : "📄"}
                                  </span>
                                )}
                              </div>
                              <div className="media-card-info font-sans">
                                <p className="media-card-title" title={media.name}>{media.name}</p>
                                <p className="media-card-meta">
                                  {(media.size / (1024 * 1024)).toFixed(2)} Mo
                                </p>
                              </div>
                              <div className="media-card-actions">
                                <button
                                  onClick={() => {
                                    setPreviewingMedia(media);
                                    setShowMediaPreviewModal(true);
                                  }}
                                  className="canvas-btn"
                                  title="Visualiser"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(media.url || "");
                                    setNotification("URL du média copiée dans le presse-papier !");
                                  }}
                                  className="canvas-btn"
                                  title="Copier le lien"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMedia(media.id, media.name)}
                                  className="canvas-btn canvas-btn-danger"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {mediaList.length === 0 && (
                          <div className="col-span-full text-center py-8 text-slate-400 italic">
                            Aucun média stocké pour le moment.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === "Galerie" && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            Galerie d'Anjou
                          </h4>
                          <p className="text-sm text-slate-500">
                            Illustrations et photographies de la douceur angevine.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setNewPhotoTitle("");
                            setNewPhotoUrl("");
                            setNewPhotoDesc("");
                            setNewPhotoCategory("Loire");
                            setShowAddPhotoModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm border-none"
                        >
                          <Plus className="w-4 h-4" /> Ajouter une photo
                        </button>
                      </div>

                      <div className="gallery-grid animate-fade-in">
                        {galleryList.map((photo) => (
                          <div 
                            key={photo.id} 
                            className="gallery-card relative"
                            onClick={() => {
                              setLightboxPhoto(photo);
                              setShowPhotoLightboxModal(true);
                            }}
                          >
                            <div className="gallery-image-container">
                              <img src={photo.url} alt={photo.title} referrerPolicy="no-referrer" />
                            </div>
                            <div className="gallery-card-content font-sans">
                              <h5 className="gallery-card-title">{photo.title}</h5>
                              <div className="gallery-card-meta">
                                <span className="px-2 py-0.5 text-[9px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded uppercase tracking-wider">
                                  {photo.category}
                                </span>
                                <span>{photo.date}</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(photo.id, photo.title);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-slate-900/60 hover:bg-red-650 text-white rounded-md transition-colors border-none cursor-pointer"
                              title="Supprimer la photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {galleryList.length === 0 && (
                          <div className="col-span-full text-center py-8 text-slate-400 italic">
                            Aucune photo dans la galerie d'art.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === "Vidéos" && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            Capsules Vidéos Littéraires
                          </h4>
                          <p className="text-sm text-slate-500">
                            Lectures et documentaires audiovisuels sur le patrimoine régional d'Anjou.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setNewVideoTitle("");
                            setNewVideoUrl("");
                            setNewVideoDesc("");
                            setNewVideoCategory("Loire");
                            setShowAddVideoModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm border-none"
                        >
                          <Plus className="w-4 h-4" /> Publier une vidéo
                        </button>
                      </div>

                      <div className="video-grid animate-fade-in">
                        {videoList.map((video) => (
                          <div 
                            key={video.id} 
                            className="video-card relative"
                            onClick={() => {
                              setPlayerVideo(video);
                              setShowVideoPlayerModal(true);
                            }}
                          >
                            <div className="video-thumbnail-container">
                              <img 
                                src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} 
                                alt={video.title} 
                                referrerPolicy="no-referrer"
                              />
                              <div className="video-play-overlay">
                                <div className="video-play-btn-circle">
                                  <Play className="w-5 h-5 fill-current ml-0.5" />
                                </div>
                              </div>
                            </div>
                            <div className="video-card-content font-sans">
                              <div>
                                <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1">{video.title}</h5>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{video.description}</p>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                                <span className="font-semibold text-blue-605">{video.category}</span>
                                <span>{video.date}</span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVideo(video.id, video.title);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-slate-900/60 hover:bg-red-650 text-white rounded-md transition-colors border-none cursor-pointer"
                              style={{ zIndex: 10 }}
                              title="Supprimer la vidéo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {videoList.length === 0 && (
                          <div className="col-span-full text-center py-8 text-slate-400 italic">
                            Aucune vidéo publiée pour le moment.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === "Actualités" && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            Actualités & Annonces
                          </h4>
                          <p className="text-sm text-slate-500">
                            Publiez des informations sur les concours et les événements d'Anjou Édition.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setNewNewsTitle("");
                            setNewNewsContent("");
                            setNewNewsType("Info");
                            setShowAddNewsModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm border-none"
                        >
                          <Plus className="w-4 h-4" /> Publier une annonce
                        </button>
                      </div>

                      <div className="news-timeline animate-fade-in">
                        {newsList.map((news) => (
                          <div 
                            key={news.id} 
                            className={`news-card ${news.type ? news.type.toLowerCase() : "info"}`}
                          >
                            <div className="news-card-header font-sans">
                              <span className={`news-badge ${news.type ? news.type.toLowerCase() : "info"}`}>
                                {news.type || "Info"}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400 font-mono">{news.date}</span>
                                <button
                                  onClick={() => handleDeleteNews(news.id, news.title)}
                                  className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border-none bg-transparent cursor-pointer"
                                  title="Supprimer l'annonce"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <h5 className="font-extrabold text-slate-800 dark:text-slate-100 text-base mb-1.5">
                              {news.title}
                            </h5>
                            <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-light font-sans">
                              {news.content}
                            </p>
                          </div>
                        ))}
                        {newsList.length === 0 && (
                          <div className="text-center py-8 text-slate-400 italic">
                            Aucune actualité publiée.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === "Mes menus" && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            Menu de Navigation & Actions de Shortcode
                          </h4>
                          <p className="text-sm text-slate-500">
                            Gérez et réordonnez la structure du menu de votre site. Glissez-déposez les éléments pour les réorganiser ou les imbriquer.
                          </p>
                        </div>
                      </div>

                      {/* Screen reader aria-live region */}
                      <div className="sr-only" aria-live="polite" aria-atomic="true">
                        {menuAriaAnnouncement}
                      </div>

                      {/* Search Bar & Focus Information */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex-grow max-w-md">
                          <input 
                            type="text"
                            placeholder="Rechercher un élément ou shortcode..."
                            value={menusSearchQuery}
                            onChange={(e) => setMenusSearchQuery(e.target.value)}
                            className="db-input"
                          />
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          <span>Faites glisser les éléments ou utilisez les boutons pour réordonner</span>
                        </div>
                      </div>
                      {/* Menu Builder Drag and Drop List */}
                      <div className="menu-builder-list">
                        {displayedMenus.map((item) => {
                          const targetParentId = normalizeParentId(item.parentId);
                          const itemSiblings = menusList
                            .filter(m => normalizeParentId(m.parentId) === targetParentId)
                            .sort((a, b) => (a.order || 0) - (b.order || 0));
                          const canGoRight = itemSiblings.findIndex(m => m.id === item.id) > 0;
                          const canGoLeft = targetParentId !== null;
                          const isLeaf = !menusList.some(m => normalizeParentId(m.parentId) === item.id);

                          return (
                            <div 
                              key={item.id}
                              className={`menu-builder-item ${draggedItemId === item.id ? "dragging" : ""} ${newlyAddedMenuItemId === item.id ? "new-item-highlight" : ""}`}
                              style={{
                                marginLeft: `${(item.depth || 0) * 30}px`,
                                borderLeft: item.depth > 0 ? "3px solid var(--secondary)" : "none",
                                paddingLeft: item.depth > 0 ? "12px" : "0"
                              }}
                              draggable
                              onDragStart={(e) => {
                                setDraggedItemId(item.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => setDraggedItemId(null)}
                              onDragOver={(e) => {
                                e.preventDefault();
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (!draggedItemId || draggedItemId === item.id) return;
                                handleMoveItemDragAndDrop(draggedItemId, item.id);
                              }}
                            >
                              <div className="menu-builder-item-left">
                                <div 
                                  className="menu-drag-handle" 
                                  title="Faites glisser pour réordonner"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="menu-item-details">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">
                                      {item.icon === "Home" && "🏠"}
                                      {item.icon === "Newspaper" && "📰"}
                                      {item.icon === "HelpCircle" && "❓"}
                                      {item.icon === "Layers" && "🧩"}
                                      {item.icon === "Link" && "🔗"}
                                    </span>
                                    <span className="menu-item-title">{item.title}</span>
                                    {!isLeaf && (
                                      <span className="text-[10px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded font-sans">
                                        Parent
                                      </span>
                                    )}
                                  </div>
                                  <div className="menu-item-meta font-sans flex items-center gap-3">
                                    <span className={`menu-badge-type ${item.type === "internal" || item.type === "internal-link" ? "internal" : item.type === "external" || item.type === "external-link" ? "external" : "shortcode"}`}>
                                      {item.type === "internal" || item.type === "internal-link" ? "Lien interne" : item.type === "external" || item.type === "external-link" ? "Lien externe" : "Shortcode"}
                                    </span>
                                    <span className={`menu-badge-status ${item.status === "Actif" || item.isActive ? "active" : "inactive"}`}>
                                      {item.status || (item.isActive ? "Actif" : "Inactif")}
                                    </span>
                                    {item.url && <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 ml-1">({item.url})</span>}
                                    {isLeaf && item.shortcode && (
                                      <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded ml-1">
                                        {getShortcodeDisplayValue(item.shortcode)}
                                      </span>
                                    )}
                                    {!isLeaf && item.shortcode && (
                                      <span className="text-[11px] font-mono text-slate-400 line-through ml-1" title="Masqué car possède des enfants">
                                        {getShortcodeDisplayValue(item.shortcode)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action controls (Accessibility alternatives + standard actions) */}
                              <div className="menu-item-actions">
                                {/* Reordering buttons for keyboard/a11y users */}
                                <button
                                  type="button"
                                  onClick={() => handleMoveUp(item.id)}
                                  className="menu-action-btn"
                                  aria-label={`Monter l'élément ${item.title}`}
                                  title="Monter"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveDown(item.id)}
                                  className="menu-action-btn"
                                  aria-label={`Descendre l'élément ${item.title}`}
                                  title="Descendre"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                
                                {/* Nesting controls */}
                                {canGoLeft && (
                                  <button
                                    type="button"
                                    onClick={() => handleMakeTopItem(item.id)}
                                    className="menu-action-btn"
                                    aria-label={`Remonter l'élément d'un niveau`}
                                    title="Remonter d'un niveau (Sortir)"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {(!item.parentId || canGoRight) && (
                                  <button
                                    type="button"
                                    onClick={() => handleMakeSubItem(item.id)}
                                    className="menu-action-btn"
                                    aria-label={`Déplacer en sous-menu de l'élément précédent`}
                                    title="Déplacer en sous-menu"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMenuItemId(item.id);
                                    setNewMenuItemTitle(item.title);
                                    setNewMenuItemIcon(item.icon || "Layers");
                                    setNewMenuItemUrl(item.url || item.slug || "");
                                    setNewMenuItemShortcode(item.shortcode || "");
                                    setNewMenuItemStatus(item.status || (item.isActive ? "Actif" : "Inactif"));
                                    setNewMenuItemDescription(item.description || "");
                                    setNewMenuItemType(item.type || "internal");
                                    setNewMenuItemParentId(item.parentId || "");
                                    setShowAddMenuModal(true);
                                  }}
                                  className="menu-action-btn"
                                  aria-label={`Modifier l'élément ${item.title}`}
                                >
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMenu(item.id, item.title)}
                                  className="menu-action-btn danger"
                                  aria-label={`Supprimer l'élément ${item.title}`}
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {displayedMenus.length === 0 && (
                          <div className="text-center py-12 text-slate-400 italic bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-full">
                            Aucun élément de menu trouvé.
                          </div>
                        )}
                      </div>

                      {/* Bouton Ajouter un élément & Formulaire Inline */}
                      {(!showAddMenuModal || editingMenuItemId !== null) ? (
                        <div className="mt-4">
                          <button
                            onClick={() => {
                              setEditingMenuItemId(null);
                              setNewMenuItemTitle("");
                              setNewMenuItemIcon("Layers");
                              setNewMenuItemUrl("");
                              setNewMenuItemShortcode("");
                              setNewMenuItemStatus("Actif");
                              setNewMenuItemDescription("");
                              setNewMenuItemType("internal-link");
                              setNewMenuItemParentId("");
                              setShowAddMenuModal(true);
                              
                              setTimeout(() => {
                                const formEl = document.getElementById("inline-add-menu-form");
                                if (formEl && typeof formEl.scrollIntoView === 'function') {
                                  formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                              }, 100);
                            }}
                            className="w-full md:w-auto bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 text-sm font-bold px-6 py-3 rounded-xl cursor-pointer transition-colors inline-flex items-center justify-center gap-2 border border-blue-200 dark:border-slate-700 shadow-sm"
                          >
                            <Plus className="w-4 h-4" /> Ajouter un élément
                          </button>
                        </div>
                      ) : (
                        <div id="inline-add-menu-form" className="mt-6 inline-form-transition">
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 md:p-6 shadow-sm">
                            <h3 className="flex items-center gap-2 text-blue-600 font-bold mb-4 text-lg border-b border-slate-100 dark:border-slate-800 pb-3">
                              <Plus className="w-5 h-5" /> Ajouter un élément
                            </h3>
                            {renderMenuForm(true)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection === "Paramètres" && (
                    <div className="db-panel-card max-w-2xl space-y-6">
                      <form onSubmit={handleUpdateSettings} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-550 uppercase mb-1">Nom personnalisé du site</label>
                          <input
                            type="text"
                            value={settings.siteName}
                            onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                            className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-550 uppercase mb-1">Email de contact littéraire</label>
                          <input
                            type="email"
                            value={settings.contactEmail}
                            onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                            className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white text-slate-800"
                          />
                        </div>
                        <div className="flex items-center gap-4 pt-2">
                          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.enableComments}
                              onChange={(e) => setSettings({ ...settings, enableComments: e.target.checked })}
                            />
                            Activer les critiques littéraires/commentaires
                          </label>
                        </div>
                        <button
                          type="submit"
                          className="bg-[#336ddc] hover:bg-[#1e52be] text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer border-none"
                        >
                          Enregistrer les configurations
                        </button>
                      </form>

                      <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
                        <h4 className="text-sm font-bold text-[#004b7a] dark:text-[#3b82f6] mb-3 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-650" />
                          Configuration Assistant IA Gemini
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-550 uppercase mb-1">Clé API Gemini</label>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                value={geminiApiKey}
                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 outline-none flex-grow"
                              />
                              <button 
                                onClick={handleSaveGeminiKey}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer transition-colors border-none"
                              >
                                Enregistrer
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Obtenez une clé API gratuite sur <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>. La clé est stockée de manière sécurisée localement dans votre navigateur.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Return button */}
                  <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <button
                      onClick={() => setActiveSection(null)}
                      className="inline-flex items-center gap-2 text-[#336ddc] hover:text-[#004b7a] font-bold text-sm cursor-pointer border-none bg-transparent"
                    >
                      <span>&larr;</span> Retour au tableau d'activité principal
                    </button>
                  </div>
                </div>
              ) : searchQuery ? (
                /* ======================================================== */
                /* GLOBAL SPOTLIGHT SEARCH RESULTS VIEW                     */
                /* ======================================================== */
                <div className="space-y-6 animate-fade-in">
                  <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      Résultats de recherche globale pour "<strong>{searchQuery}</strong>"
                    </h3>
                    <p className="text-xs text-slate-500">
                      Recherche effectuée dans les pages, articles, flipbooks et messages.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Matching Pages */}
                    <div className="db-panel-card">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Pages ({displayedPages.length})
                      </h4>
                      {displayedPages.length > 0 ? (
                        <ul className="space-y-2" style={{ listStyle: "none", padding: 0 }}>
                          {displayedPages.map(p => (
                            <li key={p.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex justify-between items-center transition-colors">
                              <div>
                                <p className="text-xs font-bold text-slate-805">{p.title}</p>
                                <p className="text-[10px] text-slate-550">Statut: {p.status} | Catégorie: {p.category || "Outils"}</p>
                              </div>
                              <button 
                                onClick={() => { setActiveSection("Page"); }}
                                className="activity-item-btn"
                              >
                                Gérer
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">Aucune page correspondante.</p>
                      )}
                    </div>

                    {/* Matching Articles */}
                    <div className="db-panel-card">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <Newspaper className="w-4 h-4 text-amber-500" />
                        Articles ({displayedArticles.length})
                      </h4>
                      {displayedArticles.length > 0 ? (
                        <ul className="space-y-2" style={{ listStyle: "none", padding: 0 }}>
                          {displayedArticles.map(a => (
                            <li key={a.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex justify-between items-center transition-colors">
                              <div>
                                <p className="text-xs font-bold text-slate-805">{a.title}</p>
                                <p className="text-[10px] text-slate-550">Lectures: {a.views} | Catégorie: {a.category || "Outils"}</p>
                              </div>
                              <button 
                                onClick={() => { setActiveSection("Article"); }}
                                className="activity-item-btn"
                              >
                                Gérer
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">Aucun article correspondant.</p>
                      )}
                    </div>

                    {/* Matching Flipbooks */}
                    <div className="db-panel-card">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                        Flipbooks ({displayedFlipbooks.length})
                      </h4>
                      {displayedFlipbooks.length > 0 ? (
                        <ul className="space-y-2" style={{ listStyle: "none", padding: 0 }}>
                          {displayedFlipbooks.map(fb => (
                            <li key={fb.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex justify-between items-center transition-colors">
                              <div>
                                <p className="text-xs font-bold text-slate-805">{fb.title}</p>
                                <p className="text-[10px] text-slate-550">{fb.description}</p>
                              </div>
                              <button 
                                onClick={() => { setActiveSection("Mes Flipbooks"); }}
                                className="activity-item-btn"
                              >
                                Gérer
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">Aucun flipbook correspondant.</p>
                      )}
                    </div>

                    {/* Matching Messages */}
                    <div className="db-panel-card">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        Messages de contact ({displayedMessages.length})
                      </h4>
                      {displayedMessages.length > 0 ? (
                        <ul className="space-y-2" style={{ listStyle: "none", padding: 0 }}>
                          {displayedMessages.map(m => (
                            <li key={m.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex justify-between items-center transition-colors">
                              <div>
                                <p className="text-xs font-bold text-slate-855">{m.subject}</p>
                                <p className="text-[10px] text-slate-550 font-light">Expéditeur: {m.name} | Date: {m.date}</p>
                              </div>
                              <button 
                                onClick={() => { setActiveSection("Messages"); }}
                                className="activity-item-btn"
                              >
                                Gérer
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">Aucun message correspondant.</p>
                      )}
                    </div>
                  </div>

                  <div className="text-center py-4">
                    <button
                      onClick={() => setSearchQuery("")}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer border-none"
                    >
                      Effacer la recherche
                    </button>
                  </div>
                </div>
              ) : (
                /* ======================================================== */
                /* STANDARD TWO COLUMN DASHBOARD PRESENTATION LAYOUT       */
                /* ======================================================== */
                <div className="space-y-6">
                  
                  {/* KPI Cards Row */}
                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <div className="kpi-card-info">
                        <span className="kpi-card-label">Pages existantes</span>
                        <span className="kpi-card-value">{pagesList.length}</span>
                        <span className="kpi-card-sub">En ligne & Brouillons</span>
                      </div>
                      <div className="kpi-card-icon">
                        <FileText className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-card-info">
                        <span className="kpi-card-label">Articles de blog</span>
                        <span className="kpi-card-value">{articlesList.length}</span>
                        <span className="kpi-card-sub">Lectorat & Poésies</span>
                      </div>
                      <div className="kpi-card-icon accent-icon">
                        <Newspaper className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-card-info">
                        <span className="kpi-card-label">Boîte de Réception</span>
                        <span className="kpi-card-value">{messagesList.length}</span>
                        <span className="kpi-card-sub">Messages de contact</span>
                      </div>
                      <div className="kpi-card-icon emerald-icon">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-card-info">
                        <span className="kpi-card-label">Base de données</span>
                        <span className="kpi-card-value">Active</span>
                        <span className="kpi-card-sub">Mode Cloud Firestore</span>
                      </div>
                      <div className="kpi-card-icon emerald-icon">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Main Grid: Info & Activities */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Column: Welcome Info Card */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                      <InfoCard 
                        onLearnMore={() => {
                          setNotification("Le portail Anjou Edition est configuré avec l'API Éditeur v2.4 pour la production.");
                        }} 
                      />
                      
                      <div className="bg-[#336ddc]/5 border border-[#336ddc]/10 rounded-xl p-4 text-xs text-slate-650 dark:bg-[#336ddc]/10 dark:text-slate-300">
                        <p className="font-bold mb-1 flex items-center gap-1.5 text-blue-605">
                          <Sparkles className="w-3.5 h-3.5" />
                          Conseil d'administration :
                        </p>
                        <p className="font-light leading-relaxed">
                          Le menu latéral vous permet d'accéder instantanément à tous les modules d'administration. Vos modifications sont enregistrées en temps réel dans Firestore.
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Activities & AI generation */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                      
                      <div className="recent-activity-grid">
                        {/* Recent Pages activity */}
                        <div className="activity-card">
                          <div className="activity-card-header">
                            <h4 className="activity-card-title">
                              <FileText className="w-4 h-4 text-blue-500" />
                              Pages Récentes
                            </h4>
                            <button 
                              onClick={() => setActiveSection("Page")}
                              className="activity-card-action border-none bg-transparent cursor-pointer"
                            >
                              Gérer
                            </button>
                          </div>
                          <ul className="activity-list">
                            {pagesList.slice(-3).reverse().map(p => (
                              <li key={p.id} className="activity-item">
                                <div className="activity-item-info">
                                  <span className="activity-item-title">{p.title}</span>
                                  <span className="activity-item-meta">Auteur: {p.author} | {p.status}</span>
                                </div>
                                <button 
                                  onClick={() => setActiveSection("Page")}
                                  className="activity-item-btn"
                                >
                                  Éditer
                                </button>
                              </li>
                            ))}
                            {pagesList.length === 0 && (
                              <li className="text-center py-4 text-slate-400 text-xs italic">Aucune page créée.</li>
                            )}
                          </ul>
                        </div>

                        {/* Recent Messages activity */}
                        <div className="activity-card">
                          <div className="activity-card-header">
                            <h4 className="activity-card-title">
                              <MessageSquare className="w-4 h-4 text-emerald-500" />
                              Derniers Messages
                            </h4>
                            <button 
                              onClick={() => setActiveSection("Messages")}
                              className="activity-card-action border-none bg-transparent cursor-pointer"
                            >
                              Boîte
                            </button>
                          </div>
                          <ul className="activity-list">
                            {messagesList.slice(-3).reverse().map(m => (
                              <li key={m.id} className="activity-item">
                                <div className="activity-item-info">
                                  <span className="activity-item-title">{m.subject}</span>
                                  <span className="activity-item-meta">De: {m.name} | {m.date}</span>
                                </div>
                                <button 
                                  onClick={() => setActiveSection("Messages")}
                                  className="activity-item-btn"
                                >
                                  Lire
                                </button>
                              </li>
                            ))}
                            {messagesList.length === 0 && (
                              <li className="text-center py-4 text-slate-400 text-xs italic">Aucun message de contact.</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* Quick AI Widget */}
                      {getGeminiClient() && (
                        <div className="quick-ai-widget">
                          <div className="quick-ai-header">
                            <h4 className="quick-ai-title">
                              <Sparkles className="w-4 h-4 text-indigo-650 animate-pulse" />
                              Générateur d'Article Rapide (Gemini)
                            </h4>
                            <button 
                              onClick={() => setActiveSection("Article")}
                              className="activity-card-action border-none bg-transparent cursor-pointer"
                              style={{ color: "#4f46e5" }}
                            >
                              Aller à l'éditeur IA
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                            <div>
                              <input 
                                type="text" 
                                value={aiTopic}
                                onChange={(e) => setAiTopic(e.target.value)}
                                placeholder="Sujet (ex: Le vin angevin)..."
                                className="db-input text-xs"
                              />
                            </div>
                            <div className="flex gap-2">
                              <select
                                value={aiStyle}
                                onChange={(e) => setAiStyle(e.target.value)}
                                className="db-select text-xs"
                              >
                                <option value="Historique">Historique</option>
                                <option value="Poétique">Poétique</option>
                                <option value="Journalistique">Journalistique</option>
                              </select>
                              <button
                                onClick={handleGenerateArticle}
                                disabled={aiLoading || !aiTopic.trim()}
                                className="db-btn-primary bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 shrink-0 border-none cursor-pointer"
                                style={{ width: "auto" }}
                              >
                                {aiLoading ? "Génération..." : "Rédiger"}
                              </button>
                            </div>
                          </div>
                          {aiResult && (
                            <div className="mt-2 p-3 bg-white/70 dark:bg-slate-900/60 rounded-lg border border-indigo-150 space-y-2">
                              <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed font-light">{aiResult}</p>
                              <button
                                onClick={handlePublishAiArticle}
                                className="db-btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-1 px-3 w-auto border-none cursor-pointer"
                              >
                                Publier cet Article rédigé
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer of container */}
            <footer className="bg-slate-50 border-t border-slate-100 dark:bg-slate-900/20 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between text-xs text-slate-505 italic">
              <span>&copy; {new Date().getFullYear()} Anjou Edition – Tous droits réservés.</span>
              <span className="mt-1 md:mt-0 not-italic font-bold text-slate-400 font-mono">
                Version 2.0.0 (Propulsé par React-Vite & Firebase)
              </span>
            </footer>

            {/* Modal de création de Flipbook */}
            {showAddFlipbookModal && (
              <div className="ae-modal-overlay" onClick={handleCloseModal}>
                <div className="ae-modal-container" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      Créer un nouveau Flipbook
                    </h3>
                    <button 
                      onClick={handleCloseModal} 
                      className="ae-modal-close-btn"
                      disabled={uploadStep === 1}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="ae-modal-body">
                    {uploadStep === 0 && (
                      <form onSubmit={handleCreateFlipbookSubmit} className="space-y-4">
                        <div>
                          <label className="ae-modal-label">Titre du Flipbook <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            required 
                            placeholder="ex: Les légendes de Saumur" 
                            value={newFlipbookTitle} 
                            onChange={(e) => setNewFlipbookTitle(e.target.value)} 
                            className="db-input"
                          />
                        </div>
                        
                        <div>
                          <label className="ae-modal-label">Description <span className="text-red-500">*</span></label>
                          <textarea 
                            required 
                            rows={3} 
                            placeholder="Entrez une brève description du livre..." 
                            value={newFlipbookDesc} 
                            onChange={(e) => setNewFlipbookDesc(e.target.value)} 
                            className="db-textarea"
                          />
                        </div>

                        <div>
                          <label className="ae-modal-label">Catégorie littéraire <span className="text-red-500">*</span></label>
                          <select 
                            value={newFlipbookCategory} 
                            onChange={(e) => setNewFlipbookCategory(e.target.value)} 
                            className="db-input w-full"
                          >
                            <option value="Outils">Outils</option>
                            <option value="Poésies">Poésies</option>
                            <option value="Nouvelles">Nouvelles</option>
                            <option value="Romans">Romans</option>
                            <option value="Contes et légendes">Contes et légendes</option>
                            <option value="Essais">Essais</option>
                            <option value="Sciences">Sciences</option>
                            <option value="Cursus scolaire">Cursus scolaire</option>
                            <option value="Art">Art</option>
                          </select>
                        </div>

                        <div>
                          <label className="ae-modal-label">Fichier PDF <span className="text-red-500">*</span></label>
                          
                          {!selectedPdfFile ? (
                            <div 
                              className={`ae-upload-dropzone ${isDraggingPdf ? 'dragging' : ''}`}
                              onDragOver={handlePdfDragOver}
                              onDragLeave={handlePdfDragLeave}
                              onDrop={handlePdfDrop}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <FileText className="w-8 h-8 text-slate-400 mb-2" />
                              <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                                Glissez-déposez un PDF ici ou cliquez pour choisir
                              </p>
                              <p className="text-xs text-slate-400 mt-1">Fichiers PDF uniquement (Max 20 Mo)</p>
                            </div>
                          ) : (
                            <div className="ae-uploaded-file-card flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700">
                              <div className="flex items-center gap-2.5 truncate">
                                <span className="text-xl flex-shrink-0">📕</span>
                                <div className="truncate font-sans">
                                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate" title={selectedPdfFile.name}>
                                    {selectedPdfFile.name}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {(selectedPdfFile.size / (1024 * 1024)).toFixed(2)} Mo
                                  </p>
                                </div>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setSelectedPdfFile(null)} 
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded border-none bg-transparent cursor-pointer"
                                title="Supprimer le fichier"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept=".pdf" 
                            onChange={handlePdfFileChange} 
                            style={{ display: 'none' }}
                          />
                        </div>

                        {getGeminiClient() && (
                          <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg dark:bg-indigo-950/40 dark:border-indigo-900/50">
                            <input 
                              type="checkbox" 
                              id="use-gemini" 
                              checked={useGeminiForPages} 
                              onChange={(e) => setUseGeminiForPages(e.target.checked)} 
                              className="accent-indigo-600 cursor-pointer"
                            />
                            <label htmlFor="use-gemini" className="text-xs font-semibold text-indigo-905 dark:text-indigo-200 cursor-pointer flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                              Rédiger le contenu des pages avec l'IA Gemini
                            </label>
                          </div>
                        )}
                        
                        <div className="ae-modal-footer font-sans">
                          <button 
                            type="button" 
                            onClick={handleCloseModal} 
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm border-none"
                          >
                            Annuler
                          </button>
                          <button 
                            type="submit" 
                            disabled={!newFlipbookTitle.trim() || !newFlipbookDesc.trim() || !selectedPdfFile}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm border-none"
                          >
                            Créer le Flipbook
                          </button>
                        </div>
                      </form>
                    )}
                    
                    {uploadStep === 1 && (
                      <div className="text-center py-6 space-y-5">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl relative">
                          <span className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute"></span>
                          📖
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Traitement du document en cours...</h4>
                          <p className="text-xs text-slate-500 font-mono italic">{geminiProgressMsg}</p>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden max-w-xs mx-auto">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-blue-600 font-mono">{uploadProgress}%</span>
                      </div>
                    )}
                    
                    {uploadStep === 2 && (
                      <div className="text-center py-4 space-y-4 font-sans">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                          ✓
                        </div>
                        <div className="space-y-2 font-sans">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Flipbook créé avec succès !</h4>
                          <p className="text-xs text-slate-505">
                            Votre flipbook "{newFlipbookTitle}" est prêt à être intégré dans l'application.
                          </p>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 my-2 text-left">
                          <label className="ae-modal-label font-bold text-slate-655">Intégration React.js :</label>
                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <code className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded text-blue-600 dark:text-blue-400 font-mono select-all">
                              {`<PdfFlipbookReader book={flipbooks.find(f => f.id === "${newGeneratedId}")} onClose={handleClose} />`}
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`<PdfFlipbookReader book={flipbooks.find(f => f.id === "${newGeneratedId}")} onClose={handleClose} />`);
                                setNotification("Snippet React copié avec succès !");
                              }}
                              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1.5 rounded font-bold cursor-pointer inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                            >
                              <Copy className="w-3 h-3" /> Copier
                            </button>
                          </div>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={handleCloseModal}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg cursor-pointer transition-colors text-sm w-full border-none"
                        >
                          Fermer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Edit Flipbook Modal */}
            {showEditFlipbookModal && editingFlipbook && (
              <div className="ae-modal-overlay" onClick={() => { setShowEditFlipbookModal(false); setEditingFlipbook(null); setEditPdfFile(null); }}>
                <div className="ae-modal-container max-w-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#1e3a8a]" />
                      Modifier le Flipbook : {editingFlipbook.title}
                    </h3>
                    <button 
                      onClick={() => { setShowEditFlipbookModal(false); setEditingFlipbook(null); setEditPdfFile(null); }} 
                      className="ae-modal-close-btn"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleEditFlipbookSubmit} className="ae-modal-body space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                      <label className="ae-modal-label">Titre <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        value={editingFlipbook.title} 
                        onChange={(e) => setEditingFlipbook({ ...editingFlipbook, title: e.target.value })} 
                        className="db-input"
                      />
                    </div>
                    
                    <div>
                      <label className="ae-modal-label">Description <span className="text-red-500">*</span></label>
                      <textarea 
                        required 
                        rows={3} 
                        value={editingFlipbook.description} 
                        onChange={(e) => setEditingFlipbook({ ...editingFlipbook, description: e.target.value })} 
                        className="db-textarea"
                      />
                    </div>

                    <div>
                      <label className="ae-modal-label">Catégorie littéraire <span className="text-red-500">*</span></label>
                      <select 
                        value={editingFlipbook.category || "Outils"} 
                        onChange={(e) => setEditingFlipbook({ ...editingFlipbook, category: e.target.value })} 
                        className="db-input w-full"
                      >
                        <option value="Outils">Outils</option>
                        <option value="Poésies">Poésies</option>
                        <option value="Nouvelles">Nouvelles</option>
                        <option value="Romans">Romans</option>
                        <option value="Contes et légendes">Contes et légendes</option>
                        <option value="Essais">Essais</option>
                        <option value="Sciences">Sciences</option>
                        <option value="Cursus scolaire">Cursus scolaire</option>
                        <option value="Art">Art</option>
                      </select>
                    </div>

                     <div>
                      <label className="ae-modal-label">Fichier PDF actuellement associé</label>
                      <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-center w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 text-red-500 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">
                          {editingFlipbook.pdfFile || "Aucun PDF"}
                        </span>
                        
                        <label className="cursor-pointer bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shrink-0">
                          Modifier / remplacer le PDF
                          <input 
                            type="file" 
                            accept=".pdf" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                                  setEditPdfFile(file);
                                } else {
                                  alert("Veuillez sélectionner un fichier PDF valide.");
                                }
                              }
                            }}
                          />
                        </label>
                      </div>

                      {editPdfFile && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg flex items-center justify-between transition-all">
                          <div className="flex flex-col overflow-hidden mr-3">
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-1 uppercase tracking-wider">Nouveau PDF sélectionné :</span>
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {editPdfFile.name}
                              </span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setEditPdfFile(null)}
                            className="text-xs text-red-500 hover:text-red-600 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 px-2 py-1 rounded transition-colors shrink-0"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                      
                      <details className="mt-2">
                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Options avancées (URL externe)</summary>
                        <div className="mt-2">
                          <label className="ae-modal-label text-xs">URL du fichier PDF</label>
                          <input 
                            type="text" 
                            value={editingFlipbook.pdfUrl || ""} 
                            onChange={(e) => setEditingFlipbook({ ...editingFlipbook, pdfUrl: e.target.value })} 
                            className="db-input text-xs"
                            placeholder="https://firebasestorage.googleapis.com/..."
                          />
                        </div>
                      </details>
                    </div>

                    <div className="border-t border-slate-200 pt-4 mt-4 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm font-sans">Gestion des Pages ({editingFlipbook.pages.length})</h4>
                        <button 
                          type="button" 
                          onClick={handleAddPageToEditing}
                          className="bg-blue-50 text-blue-605 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 text-xs px-3 py-1.5 rounded font-bold transition-colors cursor-pointer border border-blue-100 dark:border-blue-900/30"
                        >
                          + Ajouter une page
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {editingFlipbook.pages.map((page, idx) => (
                          <div key={idx} className="border border-slate-100 dark:border-slate-800 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 font-sans">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-slate-400 font-sans">Page {page.pageNum || idx + 1}</span>
                              <button 
                                type="button" 
                                onClick={() => {
                                  const newPages = editingFlipbook.pages.filter((_, pIdx) => pIdx !== idx)
                                    .map((p, pIdx) => ({ ...p, pageNum: pIdx + 1 }));
                                  setEditingFlipbook({ ...editingFlipbook, pages: newPages });
                                }}
                                className="text-red-505 hover:text-red-750 text-[11px] font-bold cursor-pointer border-none bg-transparent"
                              >
                                Supprimer la page
                              </button>
                            </div>
                            <div className="space-y-2">
                              <input 
                                type="text" 
                                value={page.title || ""} 
                                onChange={(e) => {
                                  const newPages = [...editingFlipbook.pages];
                                  newPages[idx].title = e.target.value;
                                  setEditingFlipbook({ ...editingFlipbook, pages: newPages });
                                }}
                                onFocus={() => setLastFocusedField({ type: "flipbook", pageIdx: idx, field: "title" })}
                                className="db-input text-xs"
                                placeholder="Titre de la page"
                              />
                              <textarea 
                                value={page.content || ""} 
                                onChange={(e) => {
                                  const newPages = [...editingFlipbook.pages];
                                  newPages[idx].content = e.target.value;
                                  setEditingFlipbook({ ...editingFlipbook, pages: newPages });
                                }}
                                onFocus={() => setLastFocusedField({ type: "flipbook", pageIdx: idx, field: "content" })}
                                className="db-textarea text-xs"
                                rows={2}
                                placeholder="Contenu de la page..."
                              />
                            </div>
                          </div>
                        ))}
                        {editingFlipbook.pages.length === 0 && (
                          <p className="text-xs text-slate-400 text-center italic py-2">Aucune page dans ce flipbook. Veuillez en ajouter.</p>
                        )}
                      </div>
                    </div>

                    <div className="ae-modal-footer">
                      <button 
                        type="button" 
                        onClick={() => { setShowEditFlipbookModal(false); setEditingFlipbook(null); setEditPdfFile(null); }} 
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm border-none"
                        disabled={isEditingSaving}
                      >
                        Annuler
                      </button>
                      <button 
                        type="submit" 
                        disabled={isEditingSaving}
                        className={`font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm border-none flex items-center gap-2 ${isEditingSaving ? 'bg-[#1e3a8a]/50 text-white cursor-not-allowed' : 'bg-[#1e3a8a] hover:bg-[#172554] text-white'}`}
                      >
                        {isEditingSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            {geminiProgressMsg || "Enregistrement..."}
                          </>
                        ) : (
                          "Enregistrer"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Viewer/Reader Flipbook Modal */}
            {showViewFlipbookModal && viewingFlipbook && (
              <div className="ae-modal-overlay" onClick={() => { setShowViewFlipbookModal(false); setViewingFlipbook(null); }}>
                <div className="ae-modal-container max-w-5xl" onClick={(e) => e.stopPropagation()} style={{ padding: 0 }}>
                  <PdfFlipbookReader 
                    book={viewingFlipbook} 
                    onClose={() => { setShowViewFlipbookModal(false); setViewingFlipbook(null); }} 
                  />
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* NEW INTERACTIVE MODULE MODALS                           */}
            {/* ======================================================== */}
            
            {/* 1. Page Builder Preview Modal (Obsolete, managed inside PageBuilder component) */}

            {/* 2. Media Preview Modal */}
            {showMediaPreviewModal && previewingMedia && (
              <div className="ae-modal-overlay" onClick={() => { setShowMediaPreviewModal(false); setPreviewingMedia(null); }}>
                <div className="ae-modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title truncate pr-6" title={previewingMedia.name}>
                      Média : {previewingMedia.name}
                    </h3>
                    <button onClick={() => { setShowMediaPreviewModal(false); setPreviewingMedia(null); }} className="ae-modal-close-btn">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="ae-modal-body text-center space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                      {previewingMedia.type.startsWith("image/") ? (
                        <img src={previewingMedia.url} alt={previewingMedia.name} className="max-h-60 max-w-full rounded shadow object-contain" referrerPolicy="no-referrer" />
                      ) : previewingMedia.type.startsWith("audio/") ? (
                        <div className="w-full space-y-3 p-4">
                          <span className="text-5xl block animate-pulse">🎵</span>
                          <audio controls className="w-full" src={previewingMedia.url}></audio>
                        </div>
                      ) : (
                        <div className="space-y-2 text-center font-sans">
                          <span className="text-5xl block">📕</span>
                          <p className="text-xs text-slate-505 font-mono">Fichier de type : {previewingMedia.type}</p>
                          <a href={previewingMedia.url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline text-xs block mt-2">
                            Télécharger / Ouvrir dans le navigateur
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="text-left space-y-1.5 text-xs text-slate-505 border-t border-slate-100 dark:border-slate-800 pt-3 font-sans">
                      <p><strong>Nom :</strong> {previewingMedia.name}</p>
                      <p><strong>Type :</strong> {previewingMedia.type}</p>
                      <p><strong>Taille :</strong> {(previewingMedia.size / (1024 * 1024)).toFixed(2)} Mo ({previewingMedia.size.toLocaleString()} octets)</p>
                      <p><strong>Date d'ajout :</strong> {previewingMedia.date}</p>
                    </div>
                  </div>
                  <div className="ae-modal-footer font-sans">
                    <button onClick={() => { setShowMediaPreviewModal(false); setPreviewingMedia(null); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm border-none">
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Add Photo Modal */}
            {showAddPhotoModal && (
              <div className="ae-modal-overlay" onClick={() => setShowAddPhotoModal(false)}>
                <div className="ae-modal-container" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title flex items-center gap-2 text-blue-600">
                      <Image className="w-5 h-5" /> Ajouter une photo à la Galerie
                    </h3>
                    <button onClick={() => setShowAddPhotoModal(false)} className="ae-modal-close-btn">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleAddPhotoSubmit} className="ae-modal-body space-y-4">
                    <div>
                      <label className="ae-modal-label">Titre de la photo <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        placeholder="ex: Coucher de soleil sur la Loire" 
                        value={newPhotoTitle} 
                        onChange={(e) => setNewPhotoTitle(e.target.value)} 
                        className="db-input"
                      />
                    </div>
                    <div>
                      <label className="ae-modal-label">Lien de l'image (URL) <span className="text-red-500">*</span></label>
                      <input 
                        type="url" 
                        required 
                        placeholder="https://images.unsplash.com/photo-..." 
                        value={newPhotoUrl} 
                        onChange={(e) => setNewPhotoUrl(e.target.value)} 
                        className="db-input"
                      />
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-400">Suggestions :</span>
                        <button type="button" onClick={() => setNewPhotoUrl("https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=800")} className="text-[10px] text-blue-606 hover:underline border-none bg-transparent cursor-pointer">Château</button>
                        <button type="button" onClick={() => setNewPhotoUrl("https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=800")} className="text-[10px] text-blue-606 hover:underline border-none bg-transparent cursor-pointer">Loire</button>
                        <button type="button" onClick={() => setNewPhotoUrl("https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800")} className="text-[10px] text-blue-606 hover:underline border-none bg-transparent cursor-pointer">Coteaux</button>
                      </div>
                    </div>
                    <div>
                      <label className="ae-modal-label">Catégorie <span className="text-red-500">*</span></label>
                      <select 
                        value={newPhotoCategory} 
                        onChange={(e) => setNewPhotoCategory(e.target.value)} 
                        className="db-input w-full"
                      >
                        <option value="Loire">Loire</option>
                        <option value="Châteaux">Châteaux</option>
                        <option value="Vignobles">Vignobles</option>
                        <option value="Villages">Villages</option>
                      </select>
                    </div>
                    <div>
                      <label className="ae-modal-label">Description</label>
                      <textarea 
                        rows={2} 
                        placeholder="Une brève description artistique..." 
                        value={newPhotoDesc} 
                        onChange={(e) => setNewPhotoDesc(e.target.value)} 
                        className="db-textarea"
                      />
                    </div>
                    <div className="ae-modal-footer">
                      <button type="button" onClick={() => setShowAddPhotoModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none">
                        Annuler
                      </button>
                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none">
                        Ajouter
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 4. Photo Lightbox Modal */}
            {showPhotoLightboxModal && lightboxPhoto && (
              <div className="ae-modal-overlay" onClick={() => { setShowPhotoLightboxModal(false); setLightboxPhoto(null); }}>
                <div className="ae-modal-container max-w-4xl" onClick={(e) => e.stopPropagation()} style={{ padding: 0, backgroundColor: "#020617", border: "none" }}>
                  <div className="relative">
                    <img 
                      src={lightboxPhoto.url} 
                      alt={lightboxPhoto.title} 
                      className="w-full max-h-[70vh] object-contain mx-auto"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={() => { setShowPhotoLightboxModal(false); setLightboxPhoto(null); }} 
                      className="absolute top-4 right-4 p-2 bg-slate-900/60 hover:bg-slate-800 text-white rounded-full transition-colors border-none cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 bg-slate-900 text-white border-t border-slate-800 rounded-b-16">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-extrabold">{lightboxPhoto.title}</h4>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-blue-950 text-blue-405 rounded-full border border-blue-900 uppercase tracking-wider font-sans">
                        {lightboxPhoto.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed font-light">{lightboxPhoto.description}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-4">Publiée le : {lightboxPhoto.date}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Add Video Modal */}
            {showAddVideoModal && (
              <div className="ae-modal-overlay" onClick={() => setShowAddVideoModal(false)}>
                <div className="ae-modal-container" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title flex items-center gap-2 text-blue-600">
                      <Play className="w-5 h-5" /> Publier une capsule Vidéo
                    </h3>
                    <button onClick={() => setShowAddVideoModal(false)} className="ae-modal-close-btn">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleAddVideoSubmit} className="ae-modal-body space-y-4">
                    <div>
                      <label className="ae-modal-label">Titre de la vidéo <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        placeholder="ex: Récits légendaires de Fontevraud" 
                        value={newVideoTitle} 
                        onChange={(e) => setNewVideoTitle(e.target.value)} 
                        className="db-input"
                      />
                    </div>
                    <div>
                      <label className="ae-modal-label">Lien YouTube <span className="text-red-500">*</span></label>
                      <input 
                        type="url" 
                        required 
                        placeholder="https://www.youtube.com/watch?v=kGgY9fG3g80" 
                        value={newVideoUrl} 
                        onChange={(e) => setNewVideoUrl(e.target.value)} 
                        className="db-input"
                      />
                    </div>
                    <div>
                      <label className="ae-modal-label">Catégorie <span className="text-red-500">*</span></label>
                      <select 
                        value={newVideoCategory} 
                        onChange={(e) => setNewVideoCategory(e.target.value)} 
                        className="db-input w-full"
                      >
                        <option value="Loire">Loire</option>
                        <option value="Châteaux">Châteaux</option>
                        <option value="Nature">Nature</option>
                        <option value="Histoire">Histoire</option>
                        <option value="Récits">Récits</option>
                      </select>
                    </div>
                    <div>
                      <label className="ae-modal-label">Description</label>
                      <textarea 
                        rows={2} 
                        placeholder="Un résumé ou des notes sur l'enregistrement..." 
                        value={newVideoDesc} 
                        onChange={(e) => setNewVideoDesc(e.target.value)} 
                        className="db-textarea"
                      />
                    </div>
                    <div className="ae-modal-footer">
                      <button type="button" onClick={() => setShowAddVideoModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none">
                        Annuler
                      </button>
                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none">
                        Publier
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 6. Video Player Modal */}
            {showVideoPlayerModal && playerVideo && (
              <div className="ae-modal-overlay" onClick={() => { setShowVideoPlayerModal(false); setPlayerVideo(null); }}>
                <div className="ae-modal-container max-w-4xl" onClick={(e) => e.stopPropagation()} style={{ padding: 0, overflow: "hidden" }}>
                  <div className="aspect-video w-full bg-black relative" style={{ height: "450px" }}>
                    <iframe 
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${playerVideo.youtubeId}?autoplay=1`}
                      title={playerVideo.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    ></iframe>
                    <button 
                      onClick={() => { setShowVideoPlayerModal(false); setPlayerVideo(null); }} 
                      className="absolute top-4 right-4 p-2 bg-slate-900/60 hover:bg-slate-800 text-white rounded-full transition-colors border-none cursor-pointer z-10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-105">{playerVideo.title}</h4>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/40 uppercase tracking-wider font-sans">
                        {playerVideo.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-550 leading-relaxed font-light font-sans">{playerVideo.description}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-4 font-sans">Publiée le : {playerVideo.date}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Add News Modal */}
            {showAddNewsModal && (
              <div className="ae-modal-overlay" onClick={() => setShowAddNewsModal(false)}>
                <div className="ae-modal-container" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title flex items-center gap-2 text-blue-600">
                      <Megaphone className="w-5 h-5" /> Publier une actualité
                    </h3>
                    <button onClick={() => setShowAddNewsModal(false)} className="ae-modal-close-btn">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleAddNewsSubmit} className="ae-modal-body space-y-4">
                    <div>
                      <label className="ae-modal-label">Titre de l'annonce <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        placeholder="ex: Prolongation du concours de poésie" 
                        value={newNewsTitle} 
                        onChange={(e) => setNewNewsTitle(e.target.value)} 
                        onFocus={() => setLastFocusedField({ type: "news", field: "title" })}
                        className="db-input"
                      />
                    </div>
                    <div>
                      <label className="ae-modal-label">Niveau d'urgence <span className="text-red-500">*</span></label>
                      <select 
                        value={newNewsType} 
                        onChange={(e) => setNewNewsType(e.target.value)} 
                        className="db-input w-full"
                      >
                        <option value="Info">Info (Simple annonce)</option>
                        <option value="Important">Important (Action recommandée)</option>
                        <option value="Urgent">Urgent (Action immédiate)</option>
                      </select>
                    </div>
                    <div>
                      <label className="ae-modal-label">Contenu de l'actualité <span className="text-red-500">*</span></label>
                      <textarea 
                        rows={4} 
                        required
                        placeholder="Décrivez les détails de l'annonce..." 
                        value={newNewsContent} 
                        onChange={(e) => setNewNewsContent(e.target.value)} 
                        onFocus={() => setLastFocusedField({ type: "news", field: "content" })}
                        className="db-textarea"
                      />
                    </div>
                    <div className="ae-modal-footer">
                      <button type="button" onClick={() => setShowAddNewsModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none">
                        Annuler
                      </button>
                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none">
                        Publier
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 8. Add Account Modal */}
            {showAddAccountModal && (
              <div className="ae-modal-overlay" onClick={() => setShowAddAccountModal(false)}>
                <div className="ae-modal-container" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title flex items-center gap-2 text-blue-600">
                      <Users className="w-5 h-5" /> Créer un compte d'écrivain
                    </h3>
                    <button onClick={() => setShowAddAccountModal(false)} className="ae-modal-close-btn">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleAddAccountSubmit} className="ae-modal-body space-y-4">
                    <div>
                      <label className="ae-modal-label">Nom de l'écrivain <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        placeholder="ex: Pierre de Ronsard" 
                        value={newAccountName} 
                        onChange={(e) => setNewAccountName(e.target.value)} 
                        className="db-input"
                      />
                    </div>
                    <div>
                      <label className="ae-modal-label">Adresse E-mail <span className="text-red-500">*</span></label>
                      <input 
                        type="email" 
                        required 
                        placeholder="ronsard@anjou-edition.fr" 
                        value={newAccountEmail} 
                        onChange={(e) => setNewAccountEmail(e.target.value)} 
                        className="db-input"
                      />
                    </div>
                    <div>
                      <label className="ae-modal-label">Rôle <span className="text-red-500">*</span></label>
                      <select 
                        value={newAccountRole} 
                        onChange={(e) => setNewAccountRole(e.target.value)} 
                        className="db-input w-full"
                      >
                        <option value="Écrivain">Écrivain (Auteur)</option>
                        <option value="Éditeur">Éditeur (Modérateur)</option>
                        <option value="Administrateur">Administrateur (Gestion complète)</option>
                      </select>
                    </div>
                    <div>
                      <label className="ae-modal-label">Statut initial <span className="text-red-500">*</span></label>
                      <select 
                        value={newAccountStatus} 
                        onChange={(e) => setNewAccountStatus(e.target.value)} 
                        className="db-input w-full"
                      >
                        <option value="Actif">Actif</option>
                        <option value="Inactif">Inactif (Désactivé)</option>
                      </select>
                    </div>
                    <div className="ae-modal-footer font-sans">
                      <button type="button" onClick={() => setShowAddAccountModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none">
                        Annuler
                      </button>
                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none">
                        Créer le compte
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 9. Add/Edit Menu/Shortcode Item Modal */}
            {showAddMenuModal && editingMenuItemId !== null && (
              <div className="ae-modal-overlay" onClick={() => setShowAddMenuModal(false)}>
                <div className="ae-modal-container" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title flex items-center gap-2 text-blue-600">
                      <Menu className="w-5 h-5" /> {editingMenuItemId ? "Modifier l'élément" : "Ajouter un élément"}
                    </h3>
                    <button onClick={() => setShowAddMenuModal(false)} className="ae-modal-close-btn">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {renderMenuForm(false)}
                </div>
              </div>
            )}

            {/* 10. Shortcode Preview Modal */}
            {showPreviewShortcodeModal && previewingShortcodeItem && (
              <div className="ae-modal-overlay" onClick={() => { setShowPreviewShortcodeModal(false); setPreviewingShortcodeItem(null); }}>
                <div className="ae-modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title flex items-center gap-2 text-indigo-650">
                      <Sparkles className="w-5 h-5 animate-pulse" /> Prévisualisation du Rendu
                    </h3>
                    <button onClick={() => { setShowPreviewShortcodeModal(false); setPreviewingShortcodeItem(null); }} className="ae-modal-close-btn">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="ae-modal-body space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-855 dark:text-slate-100">{previewingShortcodeItem.title}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-1">{previewingShortcodeItem.shortcode}</p>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                      {renderShortcodePreview(previewingShortcodeItem)}
                    </div>

                    <div className="ae-modal-footer font-sans">
                      <button 
                        type="button" 
                        onClick={() => {
                          handleInsertShortcode(previewingShortcodeItem.shortcode);
                          setShowPreviewShortcodeModal(false);
                          setPreviewingShortcodeItem(null);
                        }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none"
                      >
                        Insérer le shortcode
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { 
                          setShowPreviewShortcodeModal(false); 
                          setPreviewingShortcodeItem(null); 
                        }} 
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Toast */}
            {notification && (
              <div className="ae-toast">
                <span className="ae-toast-indicator"></span>
                <span className="ae-toast-message">{notification}</span>
                <button 
                  onClick={() => setNotification(null)}
                  className="ae-toast-close"
                  title="Fermer la notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
