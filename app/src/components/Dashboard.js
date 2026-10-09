import React, { useState, useEffect, useRef } from "react";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import InfoCard from "./InfoCard";
import CommandPalette from "./CommandPalette";
import { MediaLibraryModal } from "./MediaLibraryModal";
import { 
  ArrowLeft, FileText, Image, Newspaper, Play, 
  Users, Layers, MessageSquare, Plus, 
  Trash2, ShieldCheck, ShieldOff, Sparkles, BookOpen,
  Megaphone, X,
  Copy, Edit3, Eye, UploadCloud, Menu, Star, Check,
  CheckCircle2, AlertCircle, AlertTriangle, Info, Mail, RotateCcw
} from "lucide-react";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storePDFFile } from "../utils/indexedDBStorage";
import { savePdfToFirestore, deletePdfFromFirestore } from "../utils/firestoreChunker";
import PdfFlipbookReader from "./PdfFlipbookReader";
import FlipbookLayout from "./FlipbookLayout";
import FlipbookManager from "./FlipbookManager";
import FlipbookEditModal from "./FlipbookEditModal";
import AccountEditModal from "./AccountEditModal";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc 
} from "firebase/firestore";
import { 
  isGeminiConfigured, 
  saveGeminiApiKey, 
  generateAiArticle, 
  generateAiFlipbookPages 
} from "../services/geminiService";
import { flipbooksData, textsData, articlesData, generateDefaultMenus } from "../data";
import { PageBuilder } from "./page-builder/PageBuilder";
import { pageService } from "../services/pageService";
import MenuManager from "./menu-manager/MenuManager";
import AdminLogoutSuccess from "./AdminLogoutSuccess";
import { 
  loginWithGoogle, 
  verifyAdminStatus, 
  getFriendlyAuthErrorMessage,
  updateCurrentUserProfile
} from "../services/authService";
import '../styles/page-builder.css';
import '../styles/dashboard.css';
import '../styles/menu-manager.css';
import '../styles/account-admin.css';


const normalizeParentId = (id) => {
  if (!id || id === "null" || id === "") return null;
  return id;
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


const ROUTE_MAP = {
  'pages': 'Page',
  'articles': 'Article',
  'flipbooks': 'Mes Flipbooks',
  'builder': 'Constructeur de Page',
  'actualites': 'Actualités',
  'menus': 'Mes menus',
  'mediatheque': 'Médiathèque',
  'galeries': 'Galerie',
  'videos': 'Vidéos',
  'messages': 'Messages',
  'comptes': 'Mes Comptes',
  'parametres': 'Paramètres'
};

export default function Dashboard({ onBackToSite, onLogout, currentUser, flipbooks: propFlipbooks, setFlipbooks: propSetFlipbooks }) {
  // Local fallback state if props are not provided
  const [localFlipbooks, setLocalFlipbooks] = useState(() => {
    try {
      const local = localStorage.getItem("ae_flipbooks");
      if (local !== null) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            fb => fb && fb.id !== "3322" && !(fb.title || '').toLowerCase().includes("guide historique")
          ).map((fb, idx) => ({
            ...fb,
            category: fb.category || (idx === 0 ? "Sciences" : idx === 1 ? "Outils" : "Poésies"),
            date: fb.date || "14/04/2026 à 20h02",
            pdfFile: fb.pdfFile || (fb.id === "4455" ? "secrets_vignoble_angevin.pdf" : "Seraphin-le-marin.pdf")
          }));
        }
      }
      return flipbooksData.filter(
        fb => fb && fb.id !== "3322" && !(fb.title || '').toLowerCase().includes("guide historique")
      ).map((fb, idx) => ({
        ...fb,
        category: fb.category || (idx === 0 ? "Sciences" : idx === 1 ? "Outils" : "Poésies"),
        date: fb.date || "14/04/2026 à 20h02",
        pdfFile: fb.pdfFile || (fb.id === "4455" ? "secrets_vignoble_angevin.pdf" : "Seraphin-le-marin.pdf")
      }));
    } catch (e) {
      return [];
    }
  });

  const flipbooks = propFlipbooks || localFlipbooks;
  const setFlipbooks = propSetFlipbooks || setLocalFlipbooks;

  const [userName, setUserName] = useState(() => currentUser?.displayName || currentUser?.email || "JEREMY VEILLE");

  useEffect(() => {
    if (currentUser?.displayName) {
      setUserName(currentUser.displayName);
    } else if (currentUser?.email) {
      setUserName(currentUser.email);
    }
  }, [currentUser]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Accueil");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        return window.innerWidth >= 900;
      }
    } catch (e) {}
    return true;
  });
  const hamburgerBtnRef = useRef(null);

  // Mode rétractable (compact / plein) avec persistance locale
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("ae_sidebar_collapsed") === "true";
    } catch (e) {
      return false;
    }
  });

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("ae_sidebar_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  };

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
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  // States for Reading/Viewing a flipbook
  const [showViewFlipbookModal, setShowViewFlipbookModal] = useState(false);
  const [viewingFlipbook, setViewingFlipbook] = useState(null);

  const fileInputRef = useRef(null);
  
  // Custom navigation state mimicking router path transitions
  const [activeSection, setActiveSection] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/ae-dashboard/')) {
      const slug = path.split('/')[2];
      return ROUTE_MAP[slug] || null;
    }
    return null;
  });

  useEffect(() => {
    const slug = Object.keys(ROUTE_MAP).find(key => ROUTE_MAP[key] === activeSection);
    if (slug) {
      window.history.pushState(null, '', `/ae-dashboard/${slug}`);
    } else if (window.location.pathname !== '/ae-dashboard' && window.location.pathname !== '/ae-dashboard/') {
      window.history.pushState(null, '', '/ae-dashboard');
    }
  }, [activeSection]);

  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState("");
  const [notification, setNotificationRaw] = useState(
    "Connexion à la base de données Firebase en cours..."
  );

  // Rich Toast Notification State
  const [toast, setToast] = useState({
    id: Date.now(),
    message: "Connexion à la base de données Firebase en cours...",
    type: "info",
    duration: 3500
  });

  const showToast = (message, type = "info", duration = 4000) => {
    setToast({ id: Date.now(), message, type, duration });
    setNotificationRaw(message);
  };

  const setNotification = (msg) => {
    setNotificationRaw(msg);
    if (msg) {
      setToast({ id: Date.now(), message: msg, type: "info", duration: 4000 });
    } else {
      setToast(null);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, toast.duration || 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Command Palette (Ctrl + K) State & Shortcut
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, []);

  // Universal Media Picker Modal State
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerCallback, setMediaPickerCallback] = useState(null);
  const openMediaPicker = (callback) => {
    setMediaPickerCallback(() => callback);
    setIsMediaPickerOpen(true);
  };

  // Messages Filter & Read Tracking
  const [messagesFilter, setMessagesFilter] = useState("all"); // 'all' | 'unread' | 'read'
  const handleToggleMessageRead = (msgId) => {
    setMessagesList(prev => prev.map(m => m.id === msgId ? { ...m, isRead: !m.isRead } : m));
    showToast("Statut de lecture du message mis à jour", "info");
  };

  // RGPD Purge: Supprimer les messages de contact de plus de 3 ans
  const handlePurgeOldMessagesRGPD = () => {
    const now = Date.now();
    const threeYearsMs = 3 * 365.25 * 24 * 60 * 60 * 1000;
    const initialCount = messagesList.length;
    const filtered = messagesList.filter(m => {
      const msgDate = m.timestamp ? (m.timestamp.seconds ? m.timestamp.seconds * 1000 : new Date(m.timestamp).getTime()) : (m.date ? new Date(m.date).getTime() : now);
      return (now - msgDate) < threeYearsMs;
    });
    const purgedCount = initialCount - filtered.length;
    if (purgedCount > 0) {
      setMessagesList(filtered);
      showToast(`${purgedCount} message(s) de plus de 3 ans purgé(s) (Conformité RGPD).`, "success");
    } else {
      showToast("Aucun message expiré (> 3 ans). Registre de contact conforme au RGPD.", "info");
    }
  };

  // Articles Status Filter & Corbeille (Soft Delete)
  const [articlesStatusFilter, setArticlesStatusFilter] = useState("all"); // 'all' | 'published' | 'draft' | 'trash'
  const [trashedArticles, setTrashedArticles] = useState([]);

  const handleTrashArticle = (artId) => {
    const articleToTrash = articlesList.find(a => a.id === artId);
    if (!articleToTrash) return;
    setArticlesList(prev => prev.filter(a => a.id !== artId));
    setTrashedArticles(prev => [articleToTrash, ...prev]);
    showToast(`Article "${articleToTrash.title}" déplacé dans la corbeille.`, "warning");
  };

  const handleRestoreArticle = (artId) => {
    const restored = trashedArticles.find(a => a.id === artId);
    if (!restored) return;
    setTrashedArticles(prev => prev.filter(a => a.id !== artId));
    setArticlesList(prev => [restored, ...prev]);
    showToast(`Article "${restored.title}" restauré avec succès.`, "success");
  };

  const handlePermanentDeleteArticle = async (artId) => {
    setTrashedArticles(prev => prev.filter(a => a.id !== artId));
    setArticlesList(prev => prev.filter(a => a.id !== artId));
    try {
      await pageService.deletePage(artId, 'articles');
      showToast("Article définitivement supprimé.", "info");
    } catch (e) {
      showToast("Article supprimé de la liste.", "info");
    }
  };

  const handleUpdateArticleStatus = async (artId, newStatus) => {
    try {
      await pageService.savePage({ status: newStatus }, artId, 'articles');
      setArticlesList(prev => prev.map(a => a.id === artId ? { ...a, status: newStatus } : a));
      showToast(`Statut mis à jour : ${newStatus === 'published' ? 'Publié' : newStatus === 'draft' ? 'Brouillon' : newStatus}`, "success");
    } catch (e) {
      setArticlesList(prev => prev.map(a => a.id === artId ? { ...a, status: newStatus } : a));
      showToast("Statut mis à jour localement.", "info");
    }
  };

  // Firestore & local states
  const [pagesList, setPagesList] = useState([]);
  const [newPageTitle, setNewPageTitle] = useState("");

  const [articlesList, setArticlesList] = useState([]);
  const [newArticleTitle, setNewArticleTitle] = useState("");
  const [featuredArticleId, setFeaturedArticleId] = useState(() => {
    return localStorage.getItem('ae_featured_article_id') || 'art_presentation_anjou_edition';
  });
  const [showEditArticleModal, setShowEditArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [isSavingArticle, setIsSavingArticle] = useState(false);

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
  const [menusList, setMenusList] = useState(() => {
    const local = localStorage.getItem("ae_menus");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }
    return [];
  });
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

  // Preview & Focus tracking
  const [showPreviewShortcodeModal, setShowPreviewShortcodeModal] = useState(false);
  const [previewingShortcodeItem, setPreviewingShortcodeItem] = useState(null);
  
  // Current active editor field focus tracker
  const [lastFocusedField, setLastFocusedField] = useState(null);

  // Page Builder
  const [builderEditingId, setBuilderEditingId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('pageId') || params.get('articleId') || params.get('id') || null;
  });
  const [builderEditingType, setBuilderEditingType] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('articleId')) return 'article';
    if (params.get('pageId')) return 'page';
    return params.get('type') || null;
  });

  // Médiathèque
  const [mediaList, setMediaList] = useState(() => {
    const local = localStorage.getItem("ae_medias");
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  });
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [showMediaPreviewModal, setShowMediaPreviewModal] = useState(false);
  const [previewingMedia, setPreviewingMedia] = useState(null);
  const [showMediaEditModal, setShowMediaEditModal] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [editMediaName, setEditMediaName] = useState("");
  const [editMediaAlt, setEditMediaAlt] = useState("");
  const [editMediaFile, setEditMediaFile] = useState(null);
  const [editMediaPreviewUrl, setEditMediaPreviewUrl] = useState("");
  const [editMediaIsSaving, setEditMediaIsSaving] = useState(false);
  const [editMediaError, setEditMediaError] = useState("");
  const [editMediaIsDragging, setEditMediaIsDragging] = useState(false);
  const editFileInputRef = useRef(null);

  // Galerie
  const [galleryList, setGalleryList] = useState(() => {
    const local = localStorage.getItem("ae_gallery");
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  });
  const [newPhotoTitle, setNewPhotoTitle] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoCategory, setNewPhotoCategory] = useState("Loire");
  const [newPhotoDesc, setNewPhotoDesc] = useState("");
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [showPhotoLightboxModal, setShowPhotoLightboxModal] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Vidéos
  const [videoList, setVideoList] = useState(() => {
    const local = localStorage.getItem("ae_videos");
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  });
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoDesc, setNewVideoDesc] = useState("");
  const [newVideoCategory, setNewVideoCategory] = useState("Loire");
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [showVideoPlayerModal, setShowVideoPlayerModal] = useState(false);
  const [playerVideo, setPlayerVideo] = useState(null);

  // Actualités
  const [newsList, setNewsList] = useState(() => {
    const local = localStorage.getItem("ae_news");
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  });
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");
  const [newNewsType, setNewNewsType] = useState("Info");
  const [showAddNewsModal, setShowAddNewsModal] = useState(false);

  // Mes Comptes
  const [accountsList, setAccountsList] = useState(() => {
    const local = localStorage.getItem("ae_accounts");
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  });
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountRole, setNewAccountRole] = useState("Écrivain");
  const [newAccountStatus, setNewAccountStatus] = useState("Actif");
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState(null);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Initial Loading State
  const [isInitializing, setIsInitializing] = useState(true);

  const getGeminiClient = () => {
    return isGeminiConfigured(geminiApiKey) ? { apiKey: geminiApiKey } : null;
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
      const list = await pageService.getPages('pages');
      setPagesList(list);
    } catch (e) {
      console.error("Pages error:", e);
      setPagesList([
        { id: "1", title: "Accueil - Anjou Edition", author: "Jeremy Veille", date: "2026-05-12", status: "Publié" },
        { id: "2", title: "À Propos de nous", author: "Sylvie Gautier", date: "2026-06-01", status: "Brouillon" }
      ]);
    }
  };

  const fetchArticles = async () => {
    try {
      const list = await pageService.getPages('articles');
      setArticlesList(list && list.length > 0 ? list : articlesData);
      const feat = await pageService.getFeaturedArticle();
      if (feat) {
        setFeaturedArticleId(feat.id);
      }
    } catch (e) {
      console.error("Articles error:", e);
      setArticlesList(articlesData);
    }
  };

  const fetchMessages = async () => {
    try {
      const snap = await getDocs(collection(db, "contacts"));
      if (snap && snap.docs) {
        const list = snap.docs.map(doc => {
          const data = doc.data() || {};
          let formattedDate = "";
          if (data.timestamp) {
            if (typeof data.timestamp.toDate === 'function') {
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
      }
    } catch (e) {
      console.error("Messages error:", e);
      const local = localStorage.getItem("contact_messages");
      if (local) {
        try {
          setMessagesList(JSON.parse(local));
        } catch (err) {}
      }
    }
  };

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, "settings", "global");
      const snap = await getDoc(docRef);
      if (snap && typeof snap.exists === 'function' && snap.exists()) {
        setSettings(snap.data());
      } else {
        const defaultSettings = {
          siteName: "Anjou Edition – Pour les Nuls",
          contactEmail: "contact@anjou-edition-nuls.fr",
          enableComments: true,
          maintenanceMode: false
        };
        try {
          await setDoc(docRef, defaultSettings);
        } catch (setErr) {
          // Fallback
        }
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
      if (!snap || snap.empty || !snap.docs) {
        const local = localStorage.getItem("ae_medias");
        if (local !== null) {
          try {
            const parsed = JSON.parse(local);
            setMediaList(Array.isArray(parsed) ? parsed : []);
            return;
          } catch (err) {}
        }
        setMediaList([]);
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMediaList(list);
        localStorage.setItem("ae_medias", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Medias error:", e);
      const local = localStorage.getItem("ae_medias");
      if (local !== null) {
        try {
          setMediaList(JSON.parse(local));
        } catch (err) {
          setMediaList([]);
        }
      } else {
        setMediaList([]);
      }
    }
  };

  const fetchGallery = async () => {
    try {
      const snap = await getDocs(collection(db, "gallery"));
      if (!snap || snap.empty || !snap.docs) {
        const local = localStorage.getItem("ae_gallery");
        if (local !== null) {
          try {
            const parsed = JSON.parse(local);
            setGalleryList(Array.isArray(parsed) ? parsed : []);
            return;
          } catch (err) {}
        }
        setGalleryList([]);
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGalleryList(list);
        localStorage.setItem("ae_gallery", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Gallery error:", e);
      const local = localStorage.getItem("ae_gallery");
      if (local !== null) {
        try {
          setGalleryList(JSON.parse(local));
        } catch (err) {
          setGalleryList([]);
        }
      } else {
        setGalleryList([]);
      }
    }
  };

  const fetchVideos = async () => {
    try {
      const snap = await getDocs(collection(db, "videos"));
      if (!snap || snap.empty || !snap.docs) {
        const local = localStorage.getItem("ae_videos");
        if (local !== null) {
          try {
            const parsed = JSON.parse(local);
            setVideoList(Array.isArray(parsed) ? parsed : []);
            return;
          } catch (err) {}
        }
        setVideoList([]);
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVideoList(list);
        localStorage.setItem("ae_videos", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Videos error:", e);
      const local = localStorage.getItem("ae_videos");
      if (local !== null) {
        try {
          setVideoList(JSON.parse(local));
        } catch (err) {
          setVideoList([]);
        }
      } else {
        setVideoList([]);
      }
    }
  };

  const fetchNews = async () => {
    try {
      const snap = await getDocs(collection(db, "news"));
      if (!snap || snap.empty || !snap.docs) {
        const local = localStorage.getItem("ae_news");
        if (local !== null) {
          try {
            const parsed = JSON.parse(local);
            setNewsList(Array.isArray(parsed) ? parsed : []);
            return;
          } catch (err) {}
        }
        setNewsList([]);
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNewsList(list);
        localStorage.setItem("ae_news", JSON.stringify(list));
      }
    } catch (e) {
      console.error("News error:", e);
      const local = localStorage.getItem("ae_news");
      if (local !== null) {
        try {
          setNewsList(JSON.parse(local));
        } catch (err) {
          setNewsList([]);
        }
      } else {
        setNewsList([]);
      }
    }
  };

  const fetchAccounts = async () => {
    try {
      const snap = await getDocs(collection(db, "accounts"));
      if (!snap || snap.empty || !snap.docs) {
        const local = localStorage.getItem("ae_accounts");
        if (local !== null) {
          try {
            const parsed = JSON.parse(local);
            setAccountsList(Array.isArray(parsed) ? parsed : []);
            return;
          } catch (err) {}
        }
        const defaultAdmin = [
          { id: "u1", name: "JEREMY VEILLE", email: "jeremy.veille@hotmail.fr", role: "Administrateur", status: "Actif", color: "#004b7a" }
        ];
        setAccountsList(defaultAdmin);
        localStorage.setItem("ae_accounts", JSON.stringify(defaultAdmin));
      } else {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAccountsList(list);
        localStorage.setItem("ae_accounts", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Accounts error:", e);
      const local = localStorage.getItem("ae_accounts");
      if (local !== null) {
        try {
          setAccountsList(JSON.parse(local));
        } catch (err) {
          setAccountsList([]);
        }
      } else {
        setAccountsList([
          { id: "u1", name: "JEREMY VEILLE", email: "jeremy.veille@hotmail.fr", role: "Administrateur", status: "Actif", color: "#004b7a" }
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
    const defaults = generateDefaultMenus();

    try {
      const snap = await getDocs(collection(db, "menus"));
      if (!snap || snap.empty || !snap.docs) {
        const local = localStorage.getItem("ae_menus");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMenusList(parsed);
              return;
            }
          } catch (e) {}
        }
        // Enregistrer les défauts au format propre
        const formattedDefaults = defaults.map(d => ({
          ...d,
          slug: d.slug || d.url || "",
          isActive: d.isActive !== undefined ? d.isActive : (d.enabled !== undefined ? d.enabled : (d.status === "Actif")),
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        for (const m of formattedDefaults) {
          try {
            const { id, ...menuData } = m;
            await setDoc(doc(db, "menus", id), menuData);
          } catch (err) {}
        }
        setMenusList(formattedDefaults);
        localStorage.setItem("ae_menus", JSON.stringify(formattedDefaults));
      } else {
        const list = snap.docs.map(doc => {
          const data = doc.data() || {};
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
        try {
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
        } catch (err) {}
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
      if (!snap || snap.empty || !snap.docs) {
        const local = localStorage.getItem("ae_flipbooks");
        if (local !== null) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) {
              setFlipbooks(parsed.filter(fb => fb && fb.id !== "3322" && !(fb.title || '').toLowerCase().includes("guide historique")));
              return;
            }
          } catch (err) {}
        }
        const filtered = flipbooksData.filter(
          fb => fb && fb.id !== "3322" && !(fb.title || '').toLowerCase().includes("guide historique")
        ).map((fb, idx) => ({
          ...fb,
          category: fb.category || (idx === 0 ? "Sciences" : "Outils"),
          date: fb.date || "14/04/2026 à 20h02",
          pdfFile: fb.pdfFile || "secrets_vignoble_angevin.pdf"
        }));
        setFlipbooks(filtered);
      } else {
        const list = [];
        for (let idx = 0; idx < snap.docs.length; idx++) {
          const docSnap = snap.docs[idx];
          const data = docSnap.data() || {};
          const isGuideHistorique = docSnap.id === "3322" || 
            (data.title || '').toLowerCase().includes("guide historique") ||
            (data.pdfFile || '').toLowerCase().includes("guide_historique");

          if (isGuideHistorique) {
            try {
              deleteDoc(doc(db, "flipbooks", docSnap.id));
            } catch (err) {}
            continue;
          }

          list.push({
            id: docSnap.id,
            ...data,
            category: data.category || (idx === 0 ? "Sciences" : idx === 1 ? "Outils" : "Poésies"),
            date: data.date || "14/04/2026 à 20h02",
            pdfFile: data.pdfFile || "secrets_vignoble_angevin.pdf"
          });
        }
        setFlipbooks(list);
        localStorage.setItem("ae_flipbooks", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Flipbooks fetch error:", e);
      const local = localStorage.getItem("ae_flipbooks");
      if (local !== null) {
        try {
          const parsed = JSON.parse(local);
          const filtered = (Array.isArray(parsed) ? parsed : []).filter(
            fb => fb && fb.id !== "3322" && !(fb.title || '').toLowerCase().includes("guide historique")
          );
          setFlipbooks(filtered);
        } catch (err) {
          setFlipbooks([]);
        }
      } else {
        setFlipbooks([]);
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
    try {
      await deleteDoc(doc(db, "flipbooks", id));
      await deletePdfFromFirestore(id);
      setNotification(`Flipbook "${title}" supprimé avec succès de Firebase.`);
    } catch (err) {
      console.error("Error deleting flipbook:", err);
      setNotification(`Flipbook "${title}" supprimé localement.`);
    }
  };

  // Editing handlers
  const handleEditFlipbookClick = (fb) => {
    const copy = JSON.parse(JSON.stringify(fb));
    if (!Array.isArray(copy.leftSidebar)) copy.leftSidebar = [];
    if (!Array.isArray(copy.rightSidebar)) copy.rightSidebar = [];
    setEditingFlipbook(copy);
    setShowEditFlipbookModal(true);
  };

  const handleSaveFlipbook = async (updatedData, newPdfFile) => {
    if (!updatedData.title?.trim() || !updatedData.description?.trim()) {
      showToast("Le titre et la description ne peuvent pas être vides.", "error");
      return;
    }

    setIsEditingSaving(true);
    let finalPdfFile = updatedData.pdfFile;
    let finalPdfUrl = updatedData.pdfUrl;
    let hasFirestoreChunks = updatedData.hasFirestoreChunks || false;

    if (newPdfFile) {
      setGeminiProgressMsg("Enregistrement du nouveau fichier PDF...");
      try {
        await storePDFFile(updatedData.id, newPdfFile);
        finalPdfFile = newPdfFile.name;

        let pdfUrl = null;
        try {
          const storageRef = ref(storage, `flipbooks/${updatedData.id}/${newPdfFile.name}`);
          const uploadResult = await uploadBytes(storageRef, newPdfFile);
          pdfUrl = await getDownloadURL(uploadResult.ref);
          finalPdfUrl = pdfUrl;
        } catch (storageErr) {
          console.warn("Firebase Storage upload failed for edit:", storageErr);
          try {
            setGeminiProgressMsg("Sauvegarde du PDF dans Firestore (découpage automatique)...");
            await savePdfToFirestore(updatedData.id, newPdfFile);
            hasFirestoreChunks = true;
          } catch (chunkErr) {
            console.error("Failed to save chunks:", chunkErr);
          }
        }
      } catch (err) {
        console.error("Error storing new PDF:", err);
      }
    }

    const updatedFlipbook = { 
      ...updatedData, 
      pdfFile: finalPdfFile, 
      pdfUrl: finalPdfUrl,
      hasFirestoreChunks: hasFirestoreChunks,
      leftSidebar: Array.isArray(updatedData.leftSidebar) ? updatedData.leftSidebar : [],
      rightSidebar: Array.isArray(updatedData.rightSidebar) ? updatedData.rightSidebar : []
    };

    const updatedList = flipbooks.map(fb => fb.id === updatedData.id ? updatedFlipbook : fb);
    setFlipbooks(updatedList);
    localStorage.setItem("ae_flipbooks", JSON.stringify(updatedList));

    try {
      await setDoc(doc(db, "flipbooks", updatedData.id), updatedFlipbook);
      setNotification(`Flipbook "${updatedData.title}" mis à jour sur Firebase.`);
    } catch (err) {
      console.error("Error updating flipbook on Firebase:", err);
      setNotification(`Flipbook "${updatedData.title}" mis à jour localement.`);
    }

    setShowEditFlipbookModal(false);
    setEditingFlipbook(null); 
    setGeminiProgressMsg("");
    setIsEditingSaving(false);
  };

  const handleBulkDeleteFlipbooks = async (idsToDelete) => {
    if (!idsToDelete || idsToDelete.length === 0) return;
    if (!window.confirm(`Voulez-vous vraiment supprimer les ${idsToDelete.length} flipbooks sélectionnés ?`)) {
      return;
    }
    const updated = flipbooks.filter(fb => !idsToDelete.includes(fb.id));
    setFlipbooks(updated);
    localStorage.setItem("ae_flipbooks", JSON.stringify(updated));

    const count = idsToDelete.length;

    try {
      for (const id of idsToDelete) {
        await deleteDoc(doc(db, "flipbooks", id));
        await deletePdfFromFirestore(id);
      }
      setNotification(`${count} flipbook${count > 1 ? 's' : ''} supprimé${count > 1 ? 's' : ''} avec succès de Firebase.`);
    } catch (err) {
      console.error("Error batch deleting flipbooks:", err);
      setNotification(`${count} flipbook${count > 1 ? 's' : ''} supprimé${count > 1 ? 's' : ''} localement.`);
    }
  };

  // Viewer handlers
  const handleViewFlipbookClick = (fb) => {
    setViewingFlipbook(fb);
    setShowViewFlipbookModal(true);
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
        showToast("Veuillez sélectionner un fichier PDF valide.", "error");
      }
    }
  };

  const handlePdfFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedPdfFile(file);
      } else {
        showToast("Veuillez sélectionner un fichier PDF valide.", "error");
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
      if (useGeminiForPages && isGeminiConfigured(geminiApiKey)) {
        return await generateAiFlipbookPages({
          title: cleanTitle,
          description: cleanDesc,
          fileName: fileName,
          apiKey: geminiApiKey
        });
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
            title: "Présentation", 
            content: `Cet ouvrage est issu du document '${fileName}'.\n\n${cleanDesc}` 
          },
          { 
            pageNum: 3, 
            title: "Contenu du document", 
            content: `Consultez le lecteur PDF interactif pour découvrir l'intégralité des pages et illustrations de cette publication.` 
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
      let hasFirestoreChunks = false;
      try {
        setGeminiProgressMsg("Envoi du PDF vers Firebase Storage...");
        setUploadProgress(90);
        const storageRef = ref(storage, `flipbooks/${newId}/${selectedPdfFile.name}`);
        const uploadResult = await uploadBytes(storageRef, selectedPdfFile);
        pdfUrl = await getDownloadURL(uploadResult.ref);
        console.log("PDF uploaded successfully to Firebase Storage:", pdfUrl);
      } catch (storageErr) {
        console.warn("Firebase Storage upload failed, using IndexedDB local storage fallback:", storageErr);
        try {
          setGeminiProgressMsg("Sauvegarde du PDF dans Firestore (découpage automatique)...");
          await savePdfToFirestore(newId, selectedPdfFile);
          hasFirestoreChunks = true;
        } catch (chunkErr) {
          console.error("Failed to save chunks:", chunkErr);
        }
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
        hasFirestoreChunks: hasFirestoreChunks,
        date: new Date().toLocaleDateString("fr-FR") + " à " + new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
        pages: generatedPages,
        leftSidebar: [],
        rightSidebar: []
      };

      await handleAddFlipbookState(newFlipbookObj);
      setUploadStep(2);
    } catch (error) {
      console.error(error);
      clearInterval(progressInterval);
      showToast("Une erreur est survenue lors de la création du flipbook.", "error");
      setUploadStep(0);
    }
  };

  const handleAddPage = async (e) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;
    const newPage = {
      title: newPageTitle,
      author: userName || "Jeremy Veille",
      date: new Date().toISOString().split('T')[0],
      status: "draft",
      category: newPageCategory
    };

    try {
      const saved = await pageService.savePage(newPage, null, 'pages');
      setPagesList([saved, ...pagesList]);
      setNewPageTitle("");
      setNotification(`Page "${newPage.title}" ajoutée avec succès (statut: ${saved.status}).`);
    } catch (err) {
      console.error("Error adding page:", err);
      const localSaved = { id: String(Date.now()), ...newPage };
      setPagesList([localSaved, ...pagesList]);
      setNewPageTitle("");
      setNotification(`Page "${newPage.title}" ajoutée localement.`);
    }
  };

  const handleAddArticle = async (e) => {
    e.preventDefault();
    if (!newArticleTitle.trim()) return;
    const newArt = {
      title: newArticleTitle,
      slug: newArticleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      excerpt: "",
      content: "",
      image: "/anjou-edition-livre.png",
      views: 0,
      date: new Date().toISOString().split('T')[0],
      status: "published",
      category: newArticleCategory,
      isFeatured: false
    };

    try {
      const saved = await pageService.savePage(newArt, null, 'articles');
      setArticlesList([saved, ...articlesList]);
      setNewArticleTitle("");
      setNotification(`Nouvel article "${newArt.title}" créé avec succès.`);
    } catch (err) {
      console.error("Error adding article:", err);
      const localSaved = { id: String(Date.now()), ...newArt };
      setArticlesList([localSaved, ...articlesList]);
      setNewArticleTitle("");
      setNotification(`Article "${newArt.title}" créé localement.`);
    }
  };

  const handleSetFeaturedArticle = async (articleId) => {
    try {
      await pageService.setFeaturedArticle(articleId);
      setFeaturedArticleId(articleId);
      setArticlesList(prev => prev.map(a => ({
        ...a,
        isFeatured: a.id === articleId
      })));
      setNotification("Article principal défini avec succès pour la page d'accueil.");
    } catch (e) {
      console.error("Erreur sélection article principal:", e);
    }
  };

  const handleOpenEditArticle = (article) => {
    setEditingArticle({
      id: article.id,
      title: article.title || "",
      slug: article.slug || "",
      image: article.image || "",
      excerpt: article.excerpt || "",
      content: article.content || "",
      category: article.category || "Outils",
      status: article.status || "published",
      isFeatured: article.id === featuredArticleId || article.isFeatured === true
    });
    setShowEditArticleModal(true);
  };

  const handleSaveEditArticle = async (e) => {
    e.preventDefault();
    if (!editingArticle || !editingArticle.title.trim()) return;

    setIsSavingArticle(true);
    try {
      const payload = {
        title: editingArticle.title,
        slug: editingArticle.slug || editingArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        image: editingArticle.image,
        excerpt: editingArticle.excerpt,
        content: editingArticle.content,
        category: editingArticle.category,
        status: editingArticle.status,
        isFeatured: editingArticle.isFeatured
      };

      const saved = await pageService.savePage(payload, editingArticle.id, 'articles');
      
      if (editingArticle.isFeatured) {
        await pageService.setFeaturedArticle(editingArticle.id);
        setFeaturedArticleId(editingArticle.id);
      }

      setArticlesList(prev => prev.map(a => a.id === editingArticle.id ? { ...a, ...payload, ...saved } : (editingArticle.isFeatured ? { ...a, isFeatured: false } : a)));
      setShowEditArticleModal(false);
      setEditingArticle(null);
      setNotification(`Article "${payload.title}" mis à jour avec succès.`);
    } catch (err) {
      console.error("Erreur sauvegarde article:", err);
      showToast("Erreur lors de l'enregistrement de l'article.", "error");
    } finally {
      setIsSavingArticle(false);
    }
  };

  // Delete handlers
  const handleDeletePage = async (id) => {
    const target = pagesList.find(p => p.id === id);
    if (!window.confirm(`Supprimer définitivement la page "${target?.title || 'sélectionnée'}" ?`)) return;
    try {
      await pageService.deletePage(id, 'pages');
      setPagesList(pagesList.filter(p => p.id !== id));
      setNotification("Page supprimée avec succès.");
    } catch (err) {
      console.error("Error deleting page:", err);
      setPagesList(pagesList.filter(p => p.id !== id));
    }
  };

  const handleDeleteArticle = (id) => {
    handleTrashArticle(id);
  };

  const handleDeduplicate = async (collectionName = 'pages') => {
    try {
      setNotification(`Analyse et déduplication des ${collectionName} en cours...`);
      const result = await pageService.deduplicateItems(collectionName);
      if (collectionName === 'pages') {
        const refreshed = await pageService.getPages('pages');
        setPagesList(refreshed);
      } else {
        const refreshed = await pageService.getPages('articles');
        setArticlesList(refreshed);
      }
      if (result.removedIds && result.removedIds.length > 0) {
        setNotification(`${result.removedIds.length} doublon(s) supprimé(s) avec succès.`);
      } else {
        setNotification(`Aucun doublon détecté dans ${collectionName}. Base saine.`);
      }
    } catch (err) {
      console.error("Deduplication error:", err);
      setNotification("Erreur lors de la déduplication.");
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
    saveGeminiApiKey(geminiApiKey);
    setNotification("Clé API Gemini configurée avec succès.");
  };

  const handleGenerateArticle = async () => {
    if (!isGeminiConfigured(geminiApiKey)) {
      setNotification("Clé API Gemini non disponible.");
      return;
    }

    setAiLoading(true);
    setAiResult("");
    try {
      const text = await generateAiArticle({
        topic: aiTopic,
        style: aiStyle,
        apiKey: geminiApiKey
      });

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

  const handleLogout = async () => {
    setIsLoggedOut(true);
    setNotification(null);
    if (typeof onLogout === 'function') {
      try {
        await onLogout();
      } catch (err) {
        console.error("Erreur lors de la déconnexion :", err);
      }
    }
  };

  const handleRestartSession = async () => {
    setReconnectError("");
    setIsReconnecting(true);
    try {
      const res = await loginWithGoogle();
      if (res && res.user) {
        const check = await verifyAdminStatus(res.user);
        if (check.isAdmin) {
          setIsLoggedOut(false);
          setActiveSection(null);
          setSearchQuery("");
          setActiveCategory("Accueil");
          if (check.displayName) setUserName(check.displayName);
          setNotification("Session restaurée avec succès.");
        } else {
          setReconnectError("Ce compte Google n'est pas autorisé en tant qu'administrateur.");
        }
      }
    } catch (err) {
      console.error("Erreur de reconnexion Google :", err);
      setReconnectError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsReconnecting(false);
    }
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
        
        let url = "/anjou-edition-livre.png";
        if (file.type.startsWith("image/")) {
          try {
            const reader = new FileReader();
            url = await new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result || '/anjou-edition-livre.png');
              reader.onerror = () => resolve('/anjou-edition-livre.png');
              reader.readAsDataURL(file);
            });
          } catch (err) {
            console.warn("Could not create data URL:", err);
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

  const handleOpenEditMedia = (media) => {
    setEditingMedia(media);
    setEditMediaName(media?.name || "");
    setEditMediaAlt(media?.alt || media?.name || "");
    setEditMediaFile(null);
    setEditMediaPreviewUrl(media?.url || "");
    setEditMediaError("");
    setEditMediaIsDragging(false);
    setShowMediaEditModal(true);
  };

  const handleCloseEditMedia = () => {
    if (editMediaIsSaving) return;
    if (editMediaFile && editMediaPreviewUrl && editMediaPreviewUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(editMediaPreviewUrl);
      } catch (e) {}
    }
    setShowMediaEditModal(false);
    setEditingMedia(null);
    setEditMediaFile(null);
    setEditMediaPreviewUrl("");
    setEditMediaError("");
    setEditMediaIsDragging(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showMediaEditModal && !editMediaIsSaving) {
        handleCloseEditMedia();
      }
    };
    if (showMediaEditModal) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMediaEditModal, editMediaIsSaving]);

  const processNewEditImageFile = (file) => {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      setEditMediaError("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP, SVG, GIF...).");
      return;
    }
    setEditMediaError("");
    setEditMediaFile(file);
    try {
      const preview = URL.createObjectURL(file);
      setEditMediaPreviewUrl(preview);
    } catch (err) {
      console.warn("Could not create preview object URL:", err);
    }
    if (!editMediaName || editMediaName === editingMedia?.name) {
      setEditMediaName(file.name);
    }
  };

  const handleEditMediaFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processNewEditImageFile(file);
    }
    e.target.value = '';
  };

  const handleEditMediaDrop = (e) => {
    e.preventDefault();
    setEditMediaIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processNewEditImageFile(file);
    }
  };

  const handleSaveEditedMedia = async (e) => {
    if (e) e.preventDefault();
    if (!editingMedia) return;

    setEditMediaIsSaving(true);
    setEditMediaError("");

    try {
      let finalUrl = editingMedia.url;
      let finalSize = editingMedia.size;
      let finalType = editingMedia.type;

      if (editMediaFile) {
        finalSize = editMediaFile.size;
        finalType = editMediaFile.type || "image/jpeg";
        try {
          const timestamp = Date.now();
          const cleanName = editMediaFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const storageRef = ref(storage, `medias/${timestamp}_${cleanName}`);
          const uploadResult = await uploadBytes(storageRef, editMediaFile);
          finalUrl = await getDownloadURL(uploadResult.ref);
        } catch (storageErr) {
          console.warn("Firebase Storage non accessible, utilisation du Data URL local:", storageErr);
          try {
            const reader = new FileReader();
            finalUrl = await new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result || editingMedia.url);
              reader.onerror = () => resolve(editingMedia.url);
              reader.readAsDataURL(editMediaFile);
            });
          } catch (blobErr) {
            finalUrl = editMediaPreviewUrl || editingMedia.url;
          }
        }
      }

      const updatedName = editMediaName.trim() || editingMedia.name;
      const updatedAlt = editMediaAlt.trim() || updatedName;

      const updatedMedia = {
        ...editingMedia,
        name: updatedName,
        alt: updatedAlt,
        url: finalUrl,
        size: finalSize,
        type: finalType,
        updatedAt: new Date().toISOString(),
        date: new Date().toLocaleDateString("fr-FR") + " à " + new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })
      };

      try {
        await setDoc(doc(db, "medias", updatedMedia.id), updatedMedia, { merge: true });
      } catch (firestoreErr) {
        console.warn("Firestore update error, updated locally:", firestoreErr);
      }

      const updatedList = mediaList.map(m => m.id === updatedMedia.id ? updatedMedia : m);
      setMediaList(updatedList);
      localStorage.setItem("ae_medias", JSON.stringify(updatedList));

      try {
        const lib = JSON.parse(localStorage.getItem("ae_media_library") || "[]");
        const updatedLib = lib.map(m => m.id === updatedMedia.id ? { ...m, ...updatedMedia } : m);
        localStorage.setItem("ae_media_library", JSON.stringify(updatedLib));
      } catch (err) {}

      setNotification(`L'image "${updatedMedia.name}" a été modifiée avec succès.`);
      handleCloseEditMedia();
    } catch (err) {
      console.error("Erreur lors de la modification de l'image:", err);
      setEditMediaError("Une erreur est survenue lors de l'enregistrement des modifications.");
    } finally {
      setEditMediaIsSaving(false);
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
      showToast("Veuillez saisir un lien YouTube valide (ex: https://www.youtube.com/watch?v=kGgY9fG3g80).", "error");
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
      showToast("L'intitulé est obligatoire.", "error");
      return;
    }
    
    let sanitizedShortcode = "";
    if (newMenuItemType === "shortcode" || newMenuItemShortcode) {
      let rawSc = newMenuItemShortcode.trim();
      
      const isShortcodeValid = validateShortcode(rawSc);
      if (!isShortcodeValid) {
        showToast("Erreur de validation : Le shortcode saisi n'est pas autorisé.", "error");
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
        <div className="ae-card-panel">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Aperçu Menu Horizontal :</p>
          <div className="ae-action-links-row">
            <span className="ae-link-clickable">Accueil</span>
            <span className="ae-link-clickable">Poésies</span>
            <span className="ae-link-clickable">À Propos</span>
            <span className="ae-link-clickable">Contact</span>
          </div>
        </div>
      );
    }

    if (sc.startsWith("[article_liste")) {
      return (
        <div className="ae-info-panel-box">
          <p className="ae-label-caption-bold">Aperçu Liste d'Articles :</p>
          <div className="space-y-2 text-xs">
            <div className="ae-header-divider">
              <p className="ae-text-title-bold">Festival l'Anjou Littéraire 2026</p>
              <p className="ae-caption-muted-micro">Publié le 08/06/2026</p>
            </div>
            <div className="ae-header-divider">
              <p className="ae-text-title-bold">La poésie angevine contemporaine au XXIe siècle</p>
              <p className="ae-caption-muted-micro">Publié le 03/06/2026</p>
            </div>
          </div>
        </div>
      );
    }

    if (sc.startsWith("[bouton")) {
      const textMatch = sc.match(/texte="([^"]+)"/) || sc.match(/text="([^"]+)"/);
      const text = textMatch ? textMatch[1] : "Bouton";
      return (
        <div className="ae-summary-card-centered">
          <p className="text-[10px] uppercase font-bold text-slate-400 text-left mb-3">Aperçu Bouton d'Action :</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-lg cursor-pointer border-none shadow-sm transition-colors">
            {text}
          </button>
        </div>
      );
    }

    if (sc.startsWith("[bloc_contenu")) {
      return (
        <div className="ae-card-panel">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Aperçu Bloc de Contenu :</p>
          <div className="border-l-4 border-emerald-500 pl-3 py-1">
            <h6 className="ae-item-title-bold-sm">Bienvenue sur le portail Anjou Édition</h6>
            <p className="text-xs text-slate-550 leading-relaxed mt-1">
              Ce contenu réutilisable s'insère dynamiquement dans vos constructeurs de page et dans vos articles d'édition.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="ae-code-snippet-box">
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

  const handleOpenAccountModal = (account) => {
    setSelectedAccountForEdit(account);
    setShowEditAccountModal(true);
  };

  const handleCloseAccountModal = () => {
    setShowEditAccountModal(false);
    setSelectedAccountForEdit(null);
  };

  const handleSaveAccountFromModal = async (updatedData) => {
    setIsSavingAccount(true);
    try {
      const updatedList = accountsList.map(a => a.id === updatedData.id ? updatedData : a);
      setAccountsList(updatedList);
      localStorage.setItem("ae_accounts", JSON.stringify(updatedList));

      // Synchronisation Firestore
      await setDoc(doc(db, "accounts", updatedData.id), updatedData, { merge: true });

      // Si l'utilisateur connecté modifie son propre profil
      const currentEmail = (currentUser?.email || "").toLowerCase().trim();
      const updatedEmail = (updatedData.email || "").toLowerCase().trim();
      if ((currentEmail && currentEmail === updatedEmail) || (updatedData.id === "u1")) {
        setUserName(updatedData.name);
        try {
          await updateCurrentUserProfile({
            displayName: updatedData.name,
            photoURL: updatedData.photoURL
          });
        } catch (profileErr) {
          console.warn("Échec synchronisation Firebase Auth profile:", profileErr);
        }
      }

      setNotification(`Compte de "${updatedData.name}" mis à jour avec succès.`);
      handleCloseAccountModal();
    } catch (err) {
      console.error("Erreur mise à jour compte:", err);
      setNotification(`Compte mis à jour localement.`);
      handleCloseAccountModal();
    } finally {
      setIsSavingAccount(false);
    }
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

  const sourceArticles = articlesStatusFilter === "trash" 
    ? trashedArticles 
    : articlesList.filter(a => {
        if (articlesStatusFilter === "published") return a.status === "published";
        if (articlesStatusFilter === "draft") return a.status !== "published";
        return true;
      });

  const displayedArticles = sourceArticles
    .filter(a => activeCategory === "Accueil" || a.category === activeCategory || (a.title && a.title.toLowerCase().includes(activeCategory.toLowerCase())))
    .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredByReadMessages = messagesList.filter(m => {
    if (messagesFilter === "unread") return !m.isRead;
    if (messagesFilter === "read") return !!m.isRead;
    return true;
  });

  const displayedMessages = filteredByReadMessages.filter(m => 
    (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (m.subject && m.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.message && m.message.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayedFlipbooks = flipbooks
    .filter(fb => activeCategory === "Accueil" || fb.category === activeCategory)
    .filter(fb =>
      (fb.title && fb.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (fb.description && fb.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );


  if (isLoggedOut) {
    return (
      <AdminLogoutSuccess
        onReconnect={handleRestartSession}
        onSwitchAccount={handleRestartSession}
        onBackToSite={onBackToSite}
        isReconnecting={isReconnecting}
        errorMessage={reconnectError}
      />
    );
  }

  const renderMenuForm = (isInline = false) => (
    <form onSubmit={handleAddMenuSubmit} className={isInline ? "space-y-4" : "ae-modal-body space-y-4"}>
      <div>
        <label htmlFor="menu-item-title" className="ae-modal-label">Intitulé de l'élément <span className="ae-text-danger">*</span></label>
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
      <div className="ae-grid-2cols-responsive">
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
          <label htmlFor="menu-item-url" className="ae-modal-label">Adresse URL / Route / Slug <span className="ae-text-danger">*</span></label>
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
        <div className="ae-callout-badge-card">
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

      {/* SaaS Dashboard Layout: Sidebar | Main Content Area */}
      <div className={`dashboard-layout-container ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
          
          {/* Left Sidebar */}
          <DashboardSidebar
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            setActiveCategory={setActiveCategory}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            userName={userName}
            handleLogout={handleLogout}
            pagesCount={pagesList.length}
            articlesCount={articlesList.length}
            flipbooksCount={flipbooks.length}
            messagesCount={messagesList.length}
            onOpenPageBuilder={() => {
              const homePage = (pagesList || []).find(p => p.isHome === true || p.isHomePage === true || p.is_home === true || p.slug === 'accueil' || p.slug === 'home' || p.slug === '/' || (p.title || '').toLowerCase().includes('accueil')) || (pagesList && pagesList[0]);
              setBuilderEditingId(homePage ? homePage.id : null);
              setBuilderEditingType('page');
              setActiveSection("Constructeur de Page");
              if (typeof window !== "undefined" && window.innerWidth < 900) {
                setSidebarOpen(false);
              }
            }}
            setNotification={setNotification}
            hamburgerBtnRef={hamburgerBtnRef}
            isCollapsed={isSidebarCollapsed}
            toggleCollapsed={toggleSidebarCollapsed}
          />

          {/* 2. Right Content Area */}
          <div className="dashboard-content-area">
            
            {/* Topbar */}
            <DashboardHeader
              userName={userName}
              onLogoutClick={handleLogout}
              onDashboardClick={() => {
                setActiveSection(null);
                setActiveCategory("Accueil");
                if (typeof window !== "undefined" && window.innerWidth < 900) {
                  setSidebarOpen(false);
                }
                setNotification("Retour à l'accueil du tableau de bord.");
              }}
              onBackToSiteClick={onBackToSite}
              currentPage={activeSection ? "subpage" : "dashboard"}
              activeSection={activeSection}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              hamburgerBtnRef={hamburgerBtnRef}
              isCollapsed={isSidebarCollapsed}
              toggleCollapsed={toggleSidebarCollapsed}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />

            {/* Main Area Content */}
            <div className="ae-dashboard-main-panel">
              {isInitializing ? (
                <div className="ae-empty-state-placeholder">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004b7a] mb-4"></div>
                  <p>Chargement des données...</p>
                </div>
              ) : activeSection ? (
                /* ======================================================== */
                /* COMPREHENSIVE DETAIL ACTIVE VIEW (SIMULATED ROUTER)     */
                /* ======================================================== */
                <div className="detail-view-container">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                    <div className="ae-flex-center-gap-3">
                      <button
                        id="btn-back-to-home"
                        onClick={() => setActiveSection(null)}
                        className="ae-btn-control-secondary"
                        title="Retour au Tableau de bord"
                      >
                        <ArrowLeft className="ae-icon-md" />
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
                    <div className="ae-grid-3cols-responsive">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="db-panel-card">
                          <div className="ae-flex-between-center mb-4">
                            <h4 className="db-title mb-0">
                              <FileText className="ae-icon-md-blue" />
                              Pages existantes sur le site de publication
                            </h4>
                            <button
                              onClick={() => handleDeduplicate('pages')}
                              className="ae-btn-secondary-sm d-flex align-items-center gap-1.5"
                              title="Détecter et nettoyer automatiquement les pages en double"
                              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                            >
                              <Sparkles size={14} className="text-amber-500" />
                              Nettoyer les doublons
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="db-table">
                              <thead>
                                <tr>
                                  <th className="db-th-title">Titre de la page</th>
                                  <th className="db-th-author">Auteur</th>
                                  <th className="db-th-category">Catégorie</th>
                                  <th className="db-th-status">Statut</th>
                                  <th className="text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {displayedPages.map((p) => {
                                  const normStatus = (p.status || '').toLowerCase().trim();
                                  let badgeClass = 'ae-badge-draft';
                                  let badgeLabel = 'Brouillon';
                                  if (normStatus === 'published' || normStatus === 'publié' || normStatus === 'publie') {
                                    badgeClass = 'ae-badge-published';
                                    badgeLabel = 'Publié';
                                  } else if (normStatus === 'approved' || normStatus === 'approuvé' || normStatus === 'approuve') {
                                    badgeClass = 'ae-badge-approved';
                                    badgeLabel = 'Approuvé';
                                  } else if (normStatus === 'pending_review' || normStatus === 'en attente' || normStatus === 'pending') {
                                    badgeClass = 'ae-badge-pending';
                                    badgeLabel = 'En attente';
                                  }

                                  return (
                                    <tr key={p.id}>
                                      <td className="db-td-title">
                                        <span className="db-page-title-text">{p.title}</span>
                                      </td>
                                      <td className="ae-text-muted">{p.author || "Jeremy Veille"}</td>
                                      <td className="db-td-category">
                                        <span className="ae-category-pill">
                                          {p.category || "Outils"}
                                        </span>
                                      </td>
                                      <td>
                                        <span className={`ae-status-badge ${badgeClass}`}>
                                          {badgeLabel}
                                        </span>
                                      </td>
                                      <td className="text-right">
                                         <button
                                           onClick={() => handleLoadPageToBuilder(p)}
                                           className="ae-btn-icon-blue-action"
                                           title="Éditer avec le constructeur"
                                           aria-label={`Éditer la page ${p.title}`}
                                         >
                                           <Edit3 className="ae-icon-md" />
                                         </button>
                                        <button
                                          onClick={() => handleDeletePage(p.id)}
                                          className="ae-btn-icon-danger-hover"
                                          title="Supprimer la page"
                                          aria-label={`Supprimer la page ${p.title}`}
                                        >
                                          <Trash2 className="ae-icon-md" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
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
                    <div className="ae-grid-3cols-responsive">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="db-panel-card">
                          <div className="ae-flex-between-center mb-4">
                            <h4 className="db-title mb-0">
                              <Newspaper className="ae-icon-md-blue" />
                              Articles du portail
                            </h4>
                            <div className="d-flex align-items-center gap-2">
                              <button
                                onClick={() => handleDeduplicate('articles')}
                                className="ae-btn-secondary-sm d-flex align-items-center gap-1.5"
                                title="Détecter et nettoyer automatiquement les articles en double"
                                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                              >
                                <Sparkles size={14} className="text-amber-500" />
                                Nettoyer les doublons
                              </button>
                            </div>
                          </div>

                          {/* Filter Tabs for Articles: Tous, Publiés, Brouillons, Corbeille */}
                          <div className="ae-messages-filter-bar mb-3">
                            <div className="ae-messages-tabs">
                              <button
                                type="button"
                                onClick={() => setArticlesStatusFilter("all")}
                                className={`ae-tab-btn ${articlesStatusFilter === "all" ? "ae-tab-btn--active" : ""}`}
                              >
                                Tous <span className="ae-badge-count">{articlesList.length}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setArticlesStatusFilter("published")}
                                className={`ae-tab-btn ${articlesStatusFilter === "published" ? "ae-tab-btn--active" : ""}`}
                              >
                                Publiés <span className="ae-badge-count">{articlesList.filter(a => a.status === 'published').length}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setArticlesStatusFilter("draft")}
                                className={`ae-tab-btn ${articlesStatusFilter === "draft" ? "ae-tab-btn--active" : ""}`}
                              >
                                Brouillons <span className="ae-badge-count">{articlesList.filter(a => a.status !== 'published').length}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setArticlesStatusFilter("trash")}
                                className={`ae-tab-btn ${articlesStatusFilter === "trash" ? "ae-tab-btn--active" : ""}`}
                              >
                                🗑️ Corbeille <span className="ae-badge-count">{trashedArticles.length}</span>
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {displayedArticles.map(a => {
                              const isCurrentlyFeatured = (a.id === featuredArticleId) || (a.isFeatured === true);
                              return (
                                <div key={a.id} className="ae-list-card-interactive" style={{ borderLeft: isCurrentlyFeatured ? '4px solid #f59e0b' : '4px solid transparent' }}>
                                  <div style={{ flex: 1 }}>
                                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                      <h5 className="ae-text-heading-dark mb-0">{a.title}</h5>
                                      {isCurrentlyFeatured && (
                                        <span className="badge bg-warning-subtle text-amber-800 font-bold px-2 py-0.5 rounded d-inline-flex align-items-center gap-1 text-xs" style={{ border: '1px solid #fcd34d' }}>
                                          <Star size={12} fill="#d97706" color="#d97706" /> Article Principal (Accueil)
                                        </span>
                                      )}
                                      {articlesStatusFilter !== 'trash' ? (
                                        <select
                                          value={a.status || 'draft'}
                                          onChange={(e) => handleUpdateArticleStatus(a.id, e.target.value)}
                                          className="db-select text-xs"
                                          style={{ padding: '2px 6px', height: '24px', fontSize: '11px', borderRadius: '4px', maxWidth: '115px' }}
                                          title="Changer le statut éditorial en 1 clic"
                                          aria-label={`Modifier le statut de l'article ${a.title}`}
                                        >
                                          <option value="published">Publié</option>
                                          <option value="approved">Approuvé</option>
                                          <option value="pending_review">En attente</option>
                                          <option value="draft">Brouillon</option>
                                        </select>
                                      ) : (
                                        <span className="ae-status-badge ae-status-badge--trash">Corbeille</span>
                                      )}
                                    </div>
                                    <p className="ae-meta-muted-sm mb-1">
                                      Slug: <code style={{ fontSize: '11px', color: '#64748b' }}>{a.slug || a.id}</code> | Catégorie: <span className="ae-text-subtitle-semibold">{a.category || "Outils"}</span> | Date: {a.date || '2026-09-20'}
                                    </p>
                                    {a.excerpt && (
                                      <p className="text-xs text-slate-500 italic mb-0 line-clamp-2" style={{ maxWidth: '650px' }}>
                                        "{a.excerpt}"
                                      </p>
                                    )}
                                  </div>

                                  <div className="ae-flex-row-gap-md" style={{ alignItems: 'center' }}>
                                    {articlesStatusFilter === 'trash' ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleRestoreArticle(a.id)}
                                          className="ae-btn-secondary-sm d-flex align-items-center gap-1 text-xs"
                                          title="Restaurer cet article depuis la corbeille"
                                          style={{ padding: '5px 10px', borderRadius: '6px' }}
                                        >
                                          <RotateCcw size={13} />
                                          <span>Restaurer</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handlePermanentDeleteArticle(a.id)}
                                          className="ae-btn-danger-ghost"
                                          title="Supprimer définitivement cet article"
                                          aria-label={`Supprimer définitivement l'article ${a.title}`}
                                        >
                                          <Trash2 className="ae-icon-md text-red-600" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        {!isCurrentlyFeatured ? (
                                          <button
                                            type="button"
                                            onClick={() => handleSetFeaturedArticle(a.id)}
                                            className="ae-btn-secondary-sm d-flex align-items-center gap-1 text-xs"
                                            title="Afficher cet article en priorité sur la page d'accueil"
                                            style={{ padding: '5px 9px', borderRadius: '6px' }}
                                          >
                                            <Star size={13} />
                                            <span>Mettre à la une</span>
                                          </button>
                                        ) : (
                                          <span className="text-xs text-amber-600 font-bold d-flex align-items-center gap-1" style={{ padding: '4px 6px' }}>
                                            <Star size={13} fill="#d97706" color="#d97706" /> En avant
                                          </span>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditArticle(a)}
                                          className="ae-action-btn-blue"
                                          title="Modifier tous les champs de l'article"
                                          aria-label={`Modifier l'article ${a.title}`}
                                        >
                                          <Edit3 className="ae-icon-md" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleLoadArticleToBuilder(a)}
                                          className="ae-action-btn-blue"
                                          title="Éditer avec le constructeur visuel"
                                          aria-label={`Éditer visuellement l'article ${a.title}`}
                                        >
                                          <Layers className="ae-icon-md" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteArticle(a.id)}
                                          className="ae-btn-danger-ghost"
                                          title="Placer l'article dans la corbeille"
                                          aria-label={`Supprimer l'article ${a.title}`}
                                        >
                                          <Trash2 className="ae-icon-md" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {displayedArticles.length === 0 && (
                              <div className="text-center py-6 text-slate-400 italic">
                                {articlesStatusFilter === 'trash' ? "La corbeille est vide." : "Aucun article trouvé."}
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
                          <h4 className="ae-badge-title-indigo">
                            <Sparkles className="ae-status-pulse-indigo" />
                            Générateur d'Article IA (Gemini)
                          </h4>
                          
                          {!getGeminiClient() ? (
                            <div className="text-xs space-y-2">
                              <p className="ae-warning-box-compact">
                                Clé API Gemini manquante. Veuillez la configurer dans l'onglet <strong>Paramètres</strong> pour activer la rédaction assistée.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="ae-dashboard-label-accent">Sujet de l'article</label>
                                <input
                                  type="text"
                                  value={aiTopic}
                                  onChange={(e) => setAiTopic(e.target.value)}
                                  placeholder="ex: Présentation de notre collection littéraire"
                                  className="db-input"
                                />
                              </div>
                              
                              <div>
                                <label className="ae-dashboard-label-accent">Style d'écriture</label>
                                <select
                                  value={aiStyle}
                                  onChange={(e) => setAiStyle(e.target.value)}
                                  className="db-select"
                                >
                                  <option value="Éditorial">Éditorial (Maison d'édition)</option>
                                  <option value="Littéraire">Littéraire (Poésies & Récits)</option>
                                  <option value="Journalistique">Journalistique (Essais)</option>
                                  <option value="Pédagogique">Pédagogique (Guide & Conseils)</option>
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
                                    <span className="ae-spinner-indicator"></span>
                                    Génération en cours...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="ae-icon-sm" />
                                    Générer avec Gemini
                                  </>
                                )}
                              </button>
                              
                              {aiResult && (
                                <div className="space-y-2 mt-3 pt-3 border-t border-indigo-100">
                                  <label className="ae-dashboard-label-accent">Aperçu du texte généré</label>
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
                        <div className="ae-messages-filter-bar">
                          <div className="ae-messages-tabs">
                            <button
                              type="button"
                              onClick={() => setMessagesFilter("all")}
                              className={`ae-tab-btn ${messagesFilter === "all" ? "ae-tab-btn--active" : ""}`}
                            >
                              Tous <span className="ae-badge-count">{messagesList.length}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setMessagesFilter("unread")}
                              className={`ae-tab-btn ${messagesFilter === "unread" ? "ae-tab-btn--active" : ""}`}
                            >
                              Non lus <span className="ae-badge-count">{messagesList.filter(m => !m.isRead).length}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setMessagesFilter("read")}
                              className={`ae-tab-btn ${messagesFilter === "read" ? "ae-tab-btn--active" : ""}`}
                            >
                              Traités <span className="ae-badge-count">{messagesList.filter(m => m.isRead).length}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handlePurgeOldMessagesRGPD}
                            className="ae-btn-secondary-sm d-inline-flex align-items-center gap-1.5 text-xs"
                            title="Supprimer les formulaires de plus de 3 ans conformément aux exigences RGPD"
                            style={{ padding: '5px 11px', borderRadius: '6px' }}
                          >
                            <ShieldCheck size={14} className="text-emerald-600" />
                            <span>Purge RGPD (&gt; 3 ans)</span>
                          </button>
                        </div>

                        <h4 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-1.5">
                          <MessageSquare className="ae-icon-md-blue" />
                          Messages de contact (Formulaires reçus)
                        </h4>
                        {displayedMessages.length === 0 ? (
                          <div className="text-center py-8 text-slate-505 italic">
                            Aucun message trouvé dans la boîte de réception.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="ae-table-full">
                              <thead>
                                <tr className="ae-divider-heading-row">
                                  <th className="ae-table-cell-muted">Expéditeur</th>
                                  <th className="ae-table-cell-muted">E-mail</th>
                                  <th className="ae-table-cell-muted">Sujet</th>
                                  <th className="ae-table-cell-muted">Message</th>
                                  <th className="ae-table-cell-muted">Date</th>
                                  <th className="ae-table-cell-right-muted">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {displayedMessages.map((m) => (
                                  <tr key={m.id} className="ae-table-row">
                                    <td className="py-3 font-semibold text-slate-805">
                                      <div className="d-flex align-items-center gap-1.5">
                                        {!m.isRead && (
                                          <span className="badge bg-primary text-white text-xs px-1.5 py-0.5 rounded" style={{ fontSize: '10px' }}>
                                            Nouveau
                                          </span>
                                        )}
                                        <span>{m.name}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 text-slate-500">
                                      <a href={`mailto:${m.email}`} className="ae-link-primary-underline" title="Écrire à cette adresse">{m.email}</a>
                                    </td>
                                    <td className="py-3 text-slate-700 font-bold">{m.subject}</td>
                                    <td className="py-3 text-slate-600 max-w-xs truncate" title={m.message}>{m.message}</td>
                                    <td className="py-3 text-slate-400 text-xs">{m.date}</td>
                                    <td className="py-3 text-right">
                                      <div className="d-flex align-items-center justify-content-end gap-1.5">
                                        <a
                                          href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || 'Votre message à Anjou Édition')}`}
                                          className="ae-btn-secondary-sm d-inline-flex align-items-center gap-1 text-xs"
                                          title="Répondre par e-mail direct"
                                          style={{ padding: '4px 8px', borderRadius: '5px', textDecoration: 'none' }}
                                        >
                                          <Mail size={13} />
                                          <span>Répondre</span>
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleMessageRead(m.id)}
                                          className="ae-btn-secondary-sm d-inline-flex align-items-center gap-1 text-xs"
                                          title={m.isRead ? "Marquer comme non lu" : "Marquer comme traité"}
                                          style={{ padding: '4px 6px', borderRadius: '5px' }}
                                        >
                                          <Check size={13} className={m.isRead ? "text-emerald-600" : "text-slate-400"} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMessage(m.id)}
                                          className="ae-btn-danger-icon"
                                          title="Supprimer le message"
                                        >
                                          <Trash2 className="ae-icon-md" />
                                        </button>
                                      </div>
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
                    <FlipbookManager
                      flipbooks={flipbooks}
                      onAddFlipbook={() => {
                        setUploadStep(0);
                        setUploadProgress(0);
                        setNewFlipbookTitle("");
                        setNewFlipbookDesc("");
                        setNewFlipbookCategory("Outils");
                        setSelectedPdfFile(null);
                        setShowAddFlipbookModal(true);
                      }}
                      onViewFlipbook={handleViewFlipbookClick}
                      onEditFlipbook={handleEditFlipbookClick}
                      onDeleteFlipbook={handleDeleteFlipbook}
                      onBulkDelete={handleBulkDeleteFlipbooks}
                      onBackToMain={() => setActiveSection(null)}
                      setNotification={setNotification}
                    />
                  )}

                  {activeSection === "Mes Comptes" && (
                    <div className="space-y-6">
                      <div className="ae-toolbar-header-responsive">
                        <div>
                          <h4 className="ae-card-title-lg">
                            Comptes & Écrivains d'Anjou
                          </h4>
                          <p className="ae-text-sm-muted">
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
                          <Plus className="ae-icon-size-sm" /> Créer un profil
                        </button>
                      </div>

                      <div className="accounts-grid animate-fade-in">
                        {accountsList.map((account) => (
                          <div 
                            key={account.id} 
                            className="account-card"
                            onClick={() => handleOpenAccountModal(account)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleOpenAccountModal(account);
                              }
                            }}
                            aria-label={`Gérer le compte de ${account.name}`}
                          >
                            <div className="account-avatar-large" style={{ backgroundColor: account.color || "#336ddc" }}>
                              {account.photoURL ? (
                                <img 
                                  src={account.photoURL} 
                                  alt={account.name || 'Avatar'} 
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                                />
                              ) : (
                                account.name ? account.name.charAt(0).toUpperCase() : "U"
                              )}
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
                              {/* Bouton Modifier le compte (icône de crayon) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAccountModal(account);
                                }}
                                className="account-btn account-btn-edit border-none"
                                title="Modifier le compte"
                                aria-label={`Modifier le compte de ${account.name}`}
                              >
                                <Edit3 className="ae-icon-md" />
                              </button>

                              {/* Bouton Statut (bouclier dynamique) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAccountStatus(account.id);
                                }}
                                className="account-btn border-none"
                                title={account.status === "Actif" ? "Désactiver le compte (actuellement Actif)" : "Activer le compte (actuellement Inactif)"}
                                aria-label={account.status === "Actif" ? "Désactiver le compte" : "Activer le compte"}
                              >
                                {account.status === "Actif" ? (
                                  <ShieldCheck className="ae-icon-emerald" />
                                ) : (
                                  <ShieldOff style={{ color: "#f59e0b" }} className="ae-icon-md" />
                                )}
                              </button>

                              {account.name !== "JEREMY VEILLE" && account.email !== "jeremy.veille@hotmail.fr" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAccount(account.id, account.name);
                                  }}
                                  className="account-btn account-btn-danger border-none bg-transparent"
                                  title="Supprimer le profil"
                                  aria-label={`Supprimer le compte de ${account.name}`}
                                >
                                  <Trash2 className="ae-icon-md" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="db-panel-card max-w-xl">
                        <h5 className="font-bold text-slate-700 dark:text-slate-200 mb-3 text-sm uppercase">Modifier mon nom administratif</h5>
                        <div className="ae-flex-gap-sm">
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
                      <div className="ae-toolbar-header-responsive">
                        <div>
                          <h4 className="ae-card-title-lg">
                            Médiathèque Littéraire
                          </h4>
                          <p className="ae-text-sm-muted">
                            Centralisez tous les documents du portail : PDF, images, musiques, poèmes.
                          </p>
                        </div>
                        <div className="ae-relative-container">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm border-none"
                          >
                            <UploadCloud className="ae-icon-size-sm" /> Importer un fichier
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
                          <div className="ae-spinner-lg"></div>
                          <p className="text-sm font-bold">Importation du fichier... {mediaProgress}%</p>
                          <div className="ae-progress-track-sm">
                            <div className="ae-progress-fill-primary" style={{ width: `${mediaProgress}%` }}></div>
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
                                  title="Aperçu"
                                  aria-label={`Aperçu de ${media.name}`}
                                >
                                  <Eye className="ae-icon-sm" />
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(media.url || "");
                                    setNotification("URL du média copiée dans le presse-papier !");
                                  }}
                                  className="canvas-btn"
                                  title="Copier le lien"
                                  aria-label={`Copier le lien de ${media.name}`}
                                >
                                  <Copy className="ae-icon-sm" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditMedia(media)}
                                  className="canvas-btn"
                                  title="Modifier l'image"
                                  aria-label={`Modifier l'image ${media.name}`}
                                >
                                  <Edit3 className="ae-icon-sm" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMedia(media.id, media.name)}
                                  className="canvas-btn canvas-btn-danger"
                                  title="Supprimer"
                                  aria-label={`Supprimer ${media.name}`}
                                >
                                  <Trash2 className="ae-icon-sm" />
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
                      <div className="ae-toolbar-header-responsive">
                        <div>
                          <h4 className="ae-card-title-lg">
                            Galerie d'Anjou
                          </h4>
                          <p className="ae-text-sm-muted">
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
                          <Plus className="ae-icon-size-sm" /> Ajouter une photo
                        </button>
                      </div>

                      <div className="gallery-grid animate-fade-in">
                        {galleryList.map((photo) => (
                          <div 
                            key={photo.id} 
                            className="ae-gallery-card"
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
                              className="ae-card-delete-overlay-btn"
                              title="Supprimer la photo"
                            >
                              <Trash2 className="ae-icon-sm" />
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
                      <div className="ae-toolbar-header-responsive">
                        <div>
                          <h4 className="ae-card-title-lg">
                            Capsules Vidéos Littéraires
                          </h4>
                          <p className="ae-text-sm-muted">
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
                          <Plus className="ae-icon-size-sm" /> Publier une vidéo
                        </button>
                      </div>

                      <div className="video-grid animate-fade-in">
                        {videoList.map((video) => (
                          <div 
                            key={video.id} 
                            className="ae-video-card-container"
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
                                  <Play className="ae-icon-button-graphic" />
                                </div>
                              </div>
                            </div>
                            <div className="video-card-content font-sans">
                              <div>
                                <h5 className="ae-item-title-single-line">{video.title}</h5>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{video.description}</p>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                                <span className="ae-title-primary-semibold">{video.category}</span>
                                <span>{video.date}</span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVideo(video.id, video.title);
                              }}
                              className="ae-card-delete-overlay-btn"
                              style={{ zIndex: 10 }}
                              title="Supprimer la vidéo"
                            >
                              <Trash2 className="ae-icon-sm" />
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
                      <div className="ae-toolbar-header-responsive">
                        <div>
                          <h4 className="ae-card-title-lg">
                            Actualités & Annonces
                          </h4>
                          <p className="ae-text-sm-muted">
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
                          <Plus className="ae-icon-size-sm" /> Publier une annonce
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
                              <div className="ae-flex-center-gap-3">
                                <span className="ae-text-mono-muted">{news.date}</span>
                                <button
                                  onClick={() => handleDeleteNews(news.id, news.title)}
                                  className="ae-btn-ghost-remove-item"
                                  title="Supprimer l'annonce"
                                >
                                  <Trash2 className="ae-icon-sm" />
                                </button>
                              </div>
                            </div>
                            <h5 className="font-extrabold text-slate-800 dark:text-slate-100 text-base mb-1.5">
                              {news.title}
                            </h5>
                            <p className="ae-paragraph-subtle">
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
                    <MenuManager
                      menusList={menusList}
                      onSaveAllMenus={saveAllMenusToFirebase}
                      pagesList={pagesList}
                      textsData={textsData}
                      flipbooks={flipbooks}
                      normalizeParentId={normalizeParentId}
                      reindexMenuOrders={reindexMenuOrders}
                      getDescendantIds={getDescendantIds}
                      getFlattenedMenuTree={getFlattenedMenuTree}
                      menuAriaAnnouncement={menuAriaAnnouncement}
                      setMenuAriaAnnouncement={setMenuAriaAnnouncement}
                      setNotification={setNotification}
                    />
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
                            className="ae-form-input"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-550 uppercase mb-1">Email de contact littéraire</label>
                          <input
                            type="email"
                            value={settings.contactEmail}
                            onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                            className="ae-form-input"
                          />
                        </div>
                        <div className="ae-action-row-padded">
                          <label className="ae-interactive-row-item">
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

                      <div className="ae-divider-top-section">
                        <h4 className="text-sm font-bold text-[#004b7a] dark:text-[#3b82f6] mb-3 flex items-center gap-1.5">
                          <Sparkles className="ae-icon-indigo-sm" />
                          Configuration Assistant IA Gemini
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-550 uppercase mb-1">Clé API Gemini</label>
                            <div className="ae-flex-gap-sm">
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
                              Obtenez une clé API gratuite sur <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="ae-link-interactive-blue">Google AI Studio</a>. La clé est stockée de manière sécurisée localement dans votre navigateur.
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
                      className="ae-action-link-btn"
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
                  <div className="ae-panel-divider-bottom">
                    <h3 className="ae-card-title-bold">
                      Résultats de recherche globale pour "<strong>{searchQuery}</strong>"
                    </h3>
                    <p className="ae-meta-text-muted-xs">
                      Recherche effectuée dans les pages, articles, flipbooks et messages.
                    </p>
                  </div>

                  <div className="ae-grid-responsive-two-column">
                    {/* Matching Pages */}
                    <div className="db-panel-card">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <FileText className="ae-icon-sm-blue" />
                        Pages ({displayedPages.length})
                      </h4>
                      {displayedPages.length > 0 ? (
                        <ul className="space-y-2" style={{ listStyle: "none", padding: 0 }}>
                          {displayedPages.map(p => (
                            <li key={p.id} className="ae-interactive-list-row">
                              <div>
                                <p className="ae-badge-bold-dark-xs">{p.title}</p>
                                <p className="ae-caption-micro">Statut: {p.status} | Catégorie: {p.category || "Outils"}</p>
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
                        <Newspaper className="ae-icon-amber-warning" />
                        Articles ({displayedArticles.length})
                      </h4>
                      {displayedArticles.length > 0 ? (
                        <ul className="space-y-2" style={{ listStyle: "none", padding: 0 }}>
                          {displayedArticles.map(a => (
                            <li key={a.id} className="ae-interactive-list-row">
                              <div>
                                <p className="ae-badge-bold-dark-xs">{a.title}</p>
                                <p className="ae-caption-micro">Lectures: {a.views} | Catégorie: {a.category || "Outils"}</p>
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
                        <BookOpen className="ae-icon-emerald-sm" />
                        Flipbooks ({displayedFlipbooks.length})
                      </h4>
                      {displayedFlipbooks.length > 0 ? (
                        <ul className="space-y-2" style={{ listStyle: "none", padding: 0 }}>
                          {displayedFlipbooks.map(fb => (
                            <li key={fb.id} className="ae-interactive-list-row">
                              <div>
                                <p className="ae-badge-bold-dark-xs">{fb.title}</p>
                                <p className="ae-caption-micro">{fb.description}</p>
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
                        <MessageSquare className="ae-icon-purple-sm" />
                        Messages de contact ({displayedMessages.length})
                      </h4>
                      {displayedMessages.length > 0 ? (
                        <ul className="space-y-2" style={{ listStyle: "none", padding: 0 }}>
                          {displayedMessages.map(m => (
                            <li key={m.id} className="ae-interactive-list-row">
                              <div>
                                <p className="ae-badge-label-dark-xs">{m.subject}</p>
                                <p className="ae-meta-light-micro">Expéditeur: {m.name} | Date: {m.date}</p>
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
                <div className="ae-dashboard-home-content">
                  {/* KPI Cards Row (Responsive Grid: 4 columns desktop, 2 tablet, 1 mobile) */}
                  <div className="ae-stats-grid">
                    <button
                      type="button"
                      onClick={() => setActiveSection("Page")}
                      className="ae-card ae-stat-card ae-stat-card--interactive"
                      aria-label="Accéder à la gestion des pages"
                    >
                      <div className="ae-stat-content">
                        <span className="ae-stat-title">Pages existantes</span>
                        <span className="ae-stat-value">{pagesList.length}</span>
                        <span className="ae-stat-desc">En ligne & Brouillons</span>
                        <span className="ae-stat-action-hint">Gérer les pages ➔</span>
                      </div>
                      <div className="ae-stat-icon-wrapper ae-stat-icon--green">
                        <FileText size={22} aria-hidden="true" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSection("Article")}
                      className="ae-card ae-stat-card ae-stat-card--interactive"
                      aria-label="Accéder à la gestion des articles et écrits"
                    >
                      <div className="ae-stat-content">
                        <span className="ae-stat-title">Articles de blog</span>
                        <span className="ae-stat-value">{articlesList.length}</span>
                        <span className="ae-stat-desc">Lectorat & Poésies</span>
                        <span className="ae-stat-action-hint">Gérer les écrits ➔</span>
                      </div>
                      <div className="ae-stat-icon-wrapper ae-stat-icon--blue">
                        <Newspaper size={22} aria-hidden="true" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSection("Messages")}
                      className="ae-card ae-stat-card ae-stat-card--interactive"
                      aria-label="Accéder à la boîte de réception des messages"
                    >
                      <div className="ae-stat-content">
                        <span className="ae-stat-title">Boîte de Réception</span>
                        <span className="ae-stat-value">{messagesList.length}</span>
                        <span className="ae-stat-desc">Messages de contact</span>
                        <span className="ae-stat-action-hint">Consulter les messages ➔</span>
                      </div>
                      <div className="ae-stat-icon-wrapper ae-stat-icon--amber">
                        <MessageSquare size={22} aria-hidden="true" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSection("Paramètres")}
                      className="ae-card ae-stat-card ae-stat-card--interactive"
                      aria-label="Accéder aux configurations système"
                    >
                      <div className="ae-stat-content">
                        <span className="ae-stat-title">Base de données</span>
                        <span className="ae-stat-value">Active</span>
                        <span className="ae-stat-desc">Mode Cloud Firestore</span>
                        <span className="ae-stat-action-hint">Configurer ➔</span>
                      </div>
                      <div className="ae-stat-icon-wrapper ae-stat-icon--emerald">
                        <ShieldCheck size={22} aria-hidden="true" />
                      </div>
                    </button>
                  </div>

                  {/* Main Grid: Coherent 2-Column Responsive Grid directly aligned with stats */}
                  <div className="ae-dashboard-main-grid">
                    {/* Recent Pages activity */}
                    <div className="ae-card ae-activity-card">
                      <div className="ae-card-header">
                        <h4 className="ae-card-title">
                          <FileText className="ae-card-title-icon" size={18} aria-hidden="true" />
                          Pages Récentes
                        </h4>
                        <button 
                          onClick={() => setActiveSection("Page")}
                          className="ae-button ae-button--secondary ae-button--sm"
                          title="Gérer toutes les pages"
                        >
                          Gérer
                        </button>
                      </div>
                      <div className="ae-activity-list">
                        {pagesList.slice(-3).reverse().map(p => (
                          <div key={p.id} className="ae-list-item">
                            <div className="ae-list-item-content">
                              <span className="ae-list-item-title">{p.title}</span>
                              <span className="ae-list-item-meta">Auteur : {p.author || "Jeremy Veille"} | {p.status || "Brouillon"}</span>
                            </div>
                            <button 
                              onClick={() => setActiveSection("Page")}
                              className="ae-button ae-button--ghost ae-button--sm"
                              title={`Éditer la page ${p.title}`}
                            >
                              Éditer
                            </button>
                          </div>
                        ))}
                        {pagesList.length === 0 && (
                          <div className="ae-empty-text">Aucune page créée.</div>
                        )}
                      </div>
                    </div>

                    {/* Recent Messages activity */}
                    <div className="ae-card ae-activity-card">
                      <div className="ae-card-header">
                        <h4 className="ae-card-title">
                          <MessageSquare className="ae-card-title-icon ae-icon-emerald" size={18} aria-hidden="true" />
                          Derniers Messages
                        </h4>
                        <button 
                          onClick={() => setActiveSection("Messages")}
                          className="ae-button ae-button--secondary ae-button--sm"
                          title="Consulter la boîte de réception"
                        >
                          Boîte
                        </button>
                      </div>
                      <div className="ae-activity-list">
                        {messagesList.slice(-3).reverse().map(m => (
                          <div key={m.id} className="ae-list-item">
                            <div className="ae-list-item-content">
                              <span className="ae-list-item-title">{m.subject || "Message de contact"}</span>
                              <span className="ae-list-item-meta">De : {m.name || "Visiteur"} | {m.date || "Récemment"}</span>
                            </div>
                            <button 
                              onClick={() => setActiveSection("Messages")}
                              className="ae-button ae-button--ghost ae-button--sm"
                              title="Lire le message"
                            >
                              Lire
                            </button>
                          </div>
                        ))}
                        {messagesList.length === 0 && (
                          <div className="ae-empty-text">Aucun message de contact.</div>
                        )}
                      </div>
                    </div>

                    {/* Administrative Status Card: Service Anjou Édition */}
                    <InfoCard 
                      onLearnMore={() => {
                        setNotification("Le portail Anjou Edition est configuré avec l'API Éditeur v2.4 pour la production.");
                      }} 
                    />

                    {/* Conseil d'administration: Compact & High Contrast (WCAG AAA) */}
                    <div className="ae-card ae-admin-tip-card">
                      <div className="ae-tip-header">
                        <Sparkles size={18} className="ae-tip-icon" aria-hidden="true" />
                        <h4 className="ae-tip-title">Conseil d'administration</h4>
                      </div>
                      <p className="ae-tip-text">
                        Le menu latéral vous permet d'accéder instantanément à tous les modules d'administration. Vos modifications sont enregistrées en temps réel dans Firestore.
                      </p>
                      <div className="ae-tip-footer-badge">
                        <span className="ae-tip-status-dot" aria-hidden="true"></span>
                        Synchronisation temps réel
                      </div>
                    </div>
                  </div>

                  {/* Quick AI Widget */}
                  {getGeminiClient() && (
                    <div className="ae-card quick-ai-widget" style={{ marginTop: '16px' }}>
                      <div className="quick-ai-header">
                        <h4 className="quick-ai-title">
                          <Sparkles className="ae-status-pulse-indigo" />
                          Générateur d'Article Rapide (Gemini)
                        </h4>
                        <button 
                          onClick={() => setActiveSection("Article")}
                          className="ae-activity-action-btn"
                          style={{ color: "#4f46e5" }}
                        >
                          Aller à l'éditeur IA
                        </button>
                      </div>
                      <div className="ae-responsive-grid-2col">
                        <div>
                          <input 
                            type="text" 
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            placeholder="Sujet (ex: Le vin angevin)..."
                            className="db-input text-xs"
                          />
                        </div>
                        <div className="ae-flex-gap-sm">
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
                          <p className="ae-description-clamped">{aiResult}</p>
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
                    <h3 className="ae-modal-header-title">
                      <BookOpen className="ae-icon-blue-primary" />
                      Créer un nouveau Flipbook
                    </h3>
                    <button 
                      onClick={handleCloseModal} 
                      className="ae-modal-close-btn"
                      disabled={uploadStep === 1}
                    >
                      <X className="ae-icon-md" />
                    </button>
                  </div>
                  
                  <div className="ae-modal-body">
                    {uploadStep === 0 && (
                      <form onSubmit={handleCreateFlipbookSubmit} className="space-y-4">
                        <div>
                          <label className="ae-modal-label">Titre du Flipbook <span className="ae-text-danger">*</span></label>
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
                          <label className="ae-modal-label">Description <span className="ae-text-danger">*</span></label>
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
                          <label className="ae-modal-label">Catégorie littéraire <span className="ae-text-danger">*</span></label>
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
                          <label className="ae-modal-label">Fichier PDF <span className="ae-text-danger">*</span></label>
                          
                          {!selectedPdfFile ? (
                            <div 
                              className={`ae-upload-dropzone ${isDraggingPdf ? 'dragging' : ''}`}
                              onDragOver={handlePdfDragOver}
                              onDragLeave={handlePdfDragLeave}
                              onDrop={handlePdfDrop}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <FileText className="w-8 h-8 text-slate-400 mb-2" />
                              <p className="ae-subheading-semibold-slate">
                                Glissez-déposez un PDF ici ou cliquez pour choisir
                              </p>
                              <p className="text-xs text-slate-400 mt-1">Fichiers PDF uniquement (Max 20 Mo)</p>
                            </div>
                          ) : (
                            <div className="ae-uploaded-file-card">
                              <div className="ae-truncate-inline-row">
                                <span className="text-xl flex-shrink-0">📕</span>
                                <div className="truncate font-sans">
                                  <p className="ae-item-title-truncate-semibold" title={selectedPdfFile.name}>
                                    {selectedPdfFile.name}
                                  </p>
                                  <p className="ae-meta-muted-sm">
                                    {(selectedPdfFile.size / (1024 * 1024)).toFixed(2)} Mo
                                  </p>
                                </div>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setSelectedPdfFile(null)} 
                                className="ae-btn-ghost-danger"
                                title="Supprimer le fichier"
                              >
                                <Trash2 className="ae-icon-size-sm" />
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
                          <div className="ae-info-badge-card">
                            <input 
                              type="checkbox" 
                              id="use-gemini" 
                              checked={useGeminiForPages} 
                              onChange={(e) => setUseGeminiForPages(e.target.checked)} 
                              className="accent-indigo-600 cursor-pointer"
                            />
                            <label htmlFor="use-gemini" className="ae-link-indigo">
                              <Sparkles className="ae-icon-pulse-indigo" />
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
                        <div className="ae-avatar-circle-lg">
                          <span className="ae-spinner-loader-blue"></span>
                          📖
                        </div>
                        <div className="space-y-2">
                          <h4 className="ae-heading-title-base">Traitement du document en cours...</h4>
                          <p className="ae-code-meta-italic-xs">{geminiProgressMsg}</p>
                        </div>
                        <div className="ae-progress-track-md">
                          <div 
                            className="ae-progress-meter-indicator" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="ae-mono-badge-primary-bold">{uploadProgress}%</span>
                      </div>
                    )}
                    
                    {uploadStep === 2 && (
                      <div className="text-center py-4 space-y-4 font-sans">
                        <div className="ae-avatar-success-animated">
                          ✓
                        </div>
                        <div className="space-y-2 font-sans">
                          <h4 className="ae-heading-title-base">Flipbook créé avec succès !</h4>
                          <p className="ae-meta-subtext-regular">
                            Votre flipbook "{newFlipbookTitle}" est prêt à être intégré dans l'application.
                          </p>
                        </div>
                        
                        <div className="ae-card-panel-subtle">
                          <label className="ae-modal-field-label">Intégration React.js :</label>
                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <code className="ae-code-snippet-box">
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
                              <Copy className="ae-icon-tiny" /> Copier
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
              <FlipbookEditModal
                isOpen={showEditFlipbookModal}
                flipbook={editingFlipbook}
                onClose={() => {
                  setShowEditFlipbookModal(false);
                  setEditingFlipbook(null);
                }}
                onSave={handleSaveFlipbook}
                isSaving={isEditingSaving}
                saveProgressMsg={geminiProgressMsg}
              />
            )}

            {/* Viewer/Reader Flipbook Modal */}
            {showViewFlipbookModal && viewingFlipbook && (
              <div className="ae-modal-overlay" onClick={() => { setShowViewFlipbookModal(false); setViewingFlipbook(null); }}>
                <div className="ae-modal-container" onClick={(e) => e.stopPropagation()} style={{ padding: 0, maxWidth: '1480px', width: '96vw', border: 'none', background: 'transparent', boxShadow: 'none' }}>
                  <FlipbookLayout book={viewingFlipbook}>
                    <PdfFlipbookReader 
                      book={viewingFlipbook} 
                      onClose={() => { setShowViewFlipbookModal(false); setViewingFlipbook(null); }} 
                    />
                  </FlipbookLayout>
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
                      <X className="ae-icon-md" />
                    </button>
                  </div>
                  <div className="ae-modal-body text-center space-y-4">
                    <div className="ae-empty-preview-box">
                      {previewingMedia.type.startsWith("image/") ? (
                        <img src={previewingMedia.url} alt={previewingMedia.name} className="ae-media-thumbnail-contain" referrerPolicy="no-referrer" />
                      ) : previewingMedia.type.startsWith("audio/") ? (
                        <div className="ae-card-panel-stacked-p4">
                          <span className="text-5xl block animate-pulse">🎵</span>
                          <audio controls className="w-full" src={previewingMedia.url}></audio>
                        </div>
                      ) : (
                        <div className="space-y-2 text-center font-sans">
                          <span className="text-5xl block">📕</span>
                          <p className="ae-mono-caption-muted-xs">Fichier de type : {previewingMedia.type}</p>
                          <a href={previewingMedia.url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline text-xs block mt-2">
                            Télécharger / Ouvrir dans le navigateur
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="ae-card-footer-details">
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

            {/* 2b. Media Edit / Replace Modal */}
            {showMediaEditModal && editingMedia && (
              <div 
                className="ae-media-edit-overlay" 
                onClick={handleCloseEditMedia}
                role="dialog"
                aria-modal="true"
                aria-labelledby="media-edit-title"
              >
                <div className="ae-media-edit-modal" onClick={(e) => e.stopPropagation()}>
                  {/* [ En-tête ] */}
                  <div className="ae-media-edit-header">
                    <div className="ae-media-edit-title-group">
                      <Edit3 className="ae-icon-md text-blue-600 flex-shrink-0" />
                      <h3 id="media-edit-title" className="ae-media-edit-title" title={editingMedia.name}>
                        Modifier le média : {editingMedia.name}
                      </h3>
                    </div>
                    <button 
                      onClick={handleCloseEditMedia} 
                      className="ae-modal-close-btn"
                      disabled={editMediaIsSaving}
                      aria-label="Fermer la boîte de dialogue"
                    >
                      <X className="ae-icon-md" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditedMedia} className="ae-media-edit-form">
                    <div className="ae-media-edit-body">
                      {editMediaError && (
                        <div className="ae-media-edit-alert-error" role="alert">
                          {editMediaError}
                        </div>
                      )}

                      {/* [ Aperçu de l'image ] */}
                      <div className="ae-media-edit-preview-section">
                        <label className="ae-modal-label">Aperçu de l'image</label>
                        <div className="ae-media-edit-preview-box">
                          {editMediaPreviewUrl ? (
                            <img 
                              src={editMediaPreviewUrl} 
                              alt={editMediaAlt || editMediaName || editingMedia.name} 
                              className="ae-media-edit-preview-img"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="ae-media-edit-no-preview">
                              <Image className="ae-icon-xl text-slate-300" />
                              <span>Aucun aperçu disponible</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* [ Zone de remplacement de fichier ] */}
                      <div className="ae-media-edit-upload-section">
                        <label className="ae-modal-label">Remplacer le fichier image</label>
                        <div
                          className={`ae-upload-dropzone ae-media-edit-dropzone ${editMediaIsDragging ? 'dragging' : ''}`}
                          onClick={() => editFileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setEditMediaIsDragging(true); }}
                          onDragLeave={() => setEditMediaIsDragging(false)}
                          onDrop={handleEditMediaDrop}
                          tabIndex={0}
                          role="button"
                          aria-label="Sélectionner ou glisser une nouvelle image"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              editFileInputRef.current?.click();
                            }
                          }}
                        >
                          <UploadCloud className="ae-icon-size-sm mb-2 text-blue-600" />
                          <p className="text-sm font-bold text-slate-700 mb-1">
                            {editMediaFile ? editMediaFile.name : "Cliquez ou glissez une nouvelle image ici"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {editMediaFile 
                              ? `Taille : ${(editMediaFile.size / (1024 * 1024)).toFixed(2)} Mo (${editMediaFile.type || 'image'})` 
                              : "Formats acceptés : JPG, PNG, WebP, SVG, GIF (max 10 Mo)"}
                          </p>
                        </div>
                        <input 
                          type="file" 
                          ref={editFileInputRef}
                          accept="image/*"
                          onChange={handleEditMediaFileChange}
                          style={{ display: 'none' }}
                        />
                      </div>

                      {/* [ Informations fichier ] */}
                      <div className="ae-media-edit-info-card">
                        <div className="ae-media-edit-info-item">
                          <span className="ae-media-edit-info-label">Nom du fichier</span>
                          <span className="ae-media-edit-info-value">{editMediaFile ? editMediaFile.name : editingMedia.name}</span>
                        </div>
                        <div className="ae-media-edit-info-item">
                          <span className="ae-media-edit-info-label">Identifiant unique</span>
                          <span className="ae-media-edit-info-value font-mono">{editingMedia.id}</span>
                        </div>
                        <div className="ae-media-edit-info-item">
                          <span className="ae-media-edit-info-label">Taille</span>
                          <span className="ae-media-edit-info-value">
                            {editMediaFile 
                              ? `${(editMediaFile.size / (1024 * 1024)).toFixed(2)} Mo (${editMediaFile.size.toLocaleString()} octets)`
                              : editingMedia.size 
                                ? `${(editingMedia.size / (1024 * 1024)).toFixed(2)} Mo (${editingMedia.size.toLocaleString()} octets)` 
                                : 'Non spécifiée'}
                          </span>
                        </div>
                        <div className="ae-media-edit-info-item">
                          <span className="ae-media-edit-info-label">Type MIME</span>
                          <span className="ae-media-edit-info-value">{editMediaFile ? editMediaFile.type || 'image/jpeg' : editingMedia.type || 'image/jpeg'}</span>
                        </div>
                        {editMediaFile && (
                          <div className="ae-media-edit-badge-new">
                            <Sparkles className="ae-icon-xs inline-block mr-1 text-blue-600 flex-shrink-0" />
                            <span>Nouvelle image sélectionnée (remplacera le fichier actuel)</span>
                          </div>
                        )}
                      </div>

                      {/* [ Formulaire ] */}
                      <div className="ae-media-edit-fields">
                        <div className="ae-media-edit-field-group">
                          <label htmlFor="edit-media-name-input" className="ae-modal-label">
                            Nom du fichier / Titre
                          </label>
                          <input 
                            id="edit-media-name-input"
                            type="text" 
                            value={editMediaName}
                            onChange={(e) => setEditMediaName(e.target.value)}
                            placeholder="ex: chateau_angers.jpg"
                            className="db-input ae-media-edit-input"
                            disabled={editMediaIsSaving}
                          />
                        </div>

                        <div className="ae-media-edit-field-group">
                          <label htmlFor="edit-media-alt-input" className="ae-modal-label">
                            Texte alternatif (SEO / Accessibilité)
                          </label>
                          <input 
                            id="edit-media-alt-input"
                            type="text" 
                            value={editMediaAlt}
                            onChange={(e) => setEditMediaAlt(e.target.value)}
                            placeholder="ex: Façade du château d'Angers sous le soleil"
                            className="db-input ae-media-edit-input"
                            disabled={editMediaIsSaving}
                          />
                          <p className="ae-media-edit-help-text">
                            Conserve l'identifiant <strong className="font-mono text-slate-600">{editingMedia.id}</strong> pour ne pas casser les intégrations existantes.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* [ Actions ] - Sticky Footer */}
                    <div className="ae-media-edit-footer font-sans">
                      <button 
                        type="button" 
                        onClick={handleCloseEditMedia} 
                        className="ae-media-btn-cancel"
                        disabled={editMediaIsSaving}
                      >
                        Annuler
                      </button>
                      <button 
                        type="submit" 
                        className="ae-media-btn-save"
                        disabled={editMediaIsSaving}
                      >
                        {editMediaIsSaving ? (
                          <>
                            <span className="ae-spinner-btn-white inline-block mr-1"></span>
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Check className="ae-icon-sm" />
                            Enregistrer
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 3. Add Photo Modal */}
            {showAddPhotoModal && (
              <div className="ae-modal-overlay" onClick={() => setShowAddPhotoModal(false)}>
                <div className="ae-modal-container" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title">
                      <Image className="ae-icon-md" /> Ajouter une photo à la Galerie
                    </h3>
                    <button onClick={() => setShowAddPhotoModal(false)} className="ae-modal-close-btn">
                      <X className="ae-icon-md" />
                    </button>
                  </div>
                  <form onSubmit={handleAddPhotoSubmit} className="ae-modal-body space-y-4">
                    <div>
                      <label className="ae-modal-label">Titre de la photo <span className="ae-text-danger">*</span></label>
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
                      <label className="ae-modal-label">Lien de l'image (URL) <span className="ae-text-danger">*</span></label>
                      <input 
                        type="url" 
                        required 
                        placeholder="https://images.unsplash.com/photo-..." 
                        value={newPhotoUrl} 
                        onChange={(e) => setNewPhotoUrl(e.target.value)} 
                        className="db-input"
                      />
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="ae-text-micro-muted">Suggestions :</span>
                        <button type="button" onClick={() => setNewPhotoUrl("https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=800")} className="ae-btn-link-xs">Château</button>
                        <button type="button" onClick={() => setNewPhotoUrl("https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=800")} className="ae-btn-link-xs">Loire</button>
                        <button type="button" onClick={() => setNewPhotoUrl("https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800")} className="ae-btn-link-xs">Coteaux</button>
                      </div>
                    </div>
                    <div>
                      <label className="ae-modal-label">Catégorie <span className="ae-text-danger">*</span></label>
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
                  <div className="ae-relative-container">
                    <img 
                      src={lightboxPhoto.url} 
                      alt={lightboxPhoto.title} 
                      className="w-full max-h-[70vh] object-contain mx-auto"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={() => { setShowPhotoLightboxModal(false); setLightboxPhoto(null); }} 
                      className="ae-overlay-action-btn"
                    >
                      <X className="ae-icon-md" />
                    </button>
                  </div>
                  <div className="ae-dark-footer-rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-extrabold">{lightboxPhoto.title}</h4>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-blue-950 text-blue-405 rounded-full border border-blue-900 uppercase tracking-wider font-sans">
                        {lightboxPhoto.category}
                      </span>
                    </div>
                    <p className="ae-text-description-muted">{lightboxPhoto.description}</p>
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
                    <h3 className="ae-modal-title">
                      <Play className="ae-icon-md" /> Publier une capsule Vidéo
                    </h3>
                    <button onClick={() => setShowAddVideoModal(false)} className="ae-modal-close-btn">
                      <X className="ae-icon-md" />
                    </button>
                  </div>
                  <form onSubmit={handleAddVideoSubmit} className="ae-modal-body space-y-4">
                    <div>
                      <label className="ae-modal-label">Titre de la vidéo <span className="ae-text-danger">*</span></label>
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
                      <label className="ae-modal-label">Lien YouTube <span className="ae-text-danger">*</span></label>
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
                      <label className="ae-modal-label">Catégorie <span className="ae-text-danger">*</span></label>
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
                  <div className="ae-video-container" style={{ height: "450px" }}>
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
                      className="ae-modal-close-floating"
                    >
                      <X className="ae-icon-md" />
                    </button>
                  </div>
                  <div className="ae-card-footer-panel">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="ae-heading-extrabold-base">{playerVideo.title}</h4>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/40 uppercase tracking-wider font-sans">
                        {playerVideo.category}
                      </span>
                    </div>
                    <p className="ae-text-caption-light">{playerVideo.description}</p>
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
                    <h3 className="ae-modal-title">
                      <Megaphone className="ae-icon-md" /> Publier une actualité
                    </h3>
                    <button onClick={() => setShowAddNewsModal(false)} className="ae-modal-close-btn">
                      <X className="ae-icon-md" />
                    </button>
                  </div>
                  <form onSubmit={handleAddNewsSubmit} className="ae-modal-body space-y-4">
                    <div>
                      <label className="ae-modal-label">Titre de l'annonce <span className="ae-text-danger">*</span></label>
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
                      <label className="ae-modal-label">Niveau d'urgence <span className="ae-text-danger">*</span></label>
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
                      <label className="ae-modal-label">Contenu de l'actualité <span className="ae-text-danger">*</span></label>
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
                    <h3 className="ae-modal-title">
                      <Users className="ae-icon-md" /> Créer un compte d'écrivain
                    </h3>
                    <button onClick={() => setShowAddAccountModal(false)} className="ae-modal-close-btn">
                      <X className="ae-icon-md" />
                    </button>
                  </div>
                  <form onSubmit={handleAddAccountSubmit} className="ae-modal-body space-y-4">
                    <div>
                      <label className="ae-modal-label">Nom de l'écrivain <span className="ae-text-danger">*</span></label>
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
                      <label className="ae-modal-label">Adresse E-mail <span className="ae-text-danger">*</span></label>
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
                      <label className="ae-modal-label">Rôle <span className="ae-text-danger">*</span></label>
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
                      <label className="ae-modal-label">Statut initial <span className="ae-text-danger">*</span></label>
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

            {/* 8.bis Edit / Manage Account Modal */}
            {showEditAccountModal && selectedAccountForEdit && (
              <AccountEditModal
                isOpen={showEditAccountModal}
                account={selectedAccountForEdit}
                currentUser={currentUser}
                onClose={handleCloseAccountModal}
                onSave={handleSaveAccountFromModal}
                onToggleStatus={handleToggleAccountStatus}
                isSaving={isSavingAccount}
              />
            )}

            {/* 9. Add/Edit Menu/Shortcode Item Modal */}
            {showAddMenuModal && editingMenuItemId !== null && (
              <div className="ae-modal-overlay" onClick={() => setShowAddMenuModal(false)}>
                <div className="ae-modal-container" onClick={(e) => e.stopPropagation()}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title">
                      <Menu className="ae-icon-md" /> {editingMenuItemId ? "Modifier l'élément" : "Ajouter un élément"}
                    </h3>
                    <button onClick={() => setShowAddMenuModal(false)} className="ae-modal-close-btn">
                      <X className="ae-icon-md" />
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
                    <h3 className="ae-modal-header-heading">
                      <Sparkles className="ae-icon-pulse-lg" /> Prévisualisation du Rendu
                    </h3>
                    <button onClick={() => { setShowPreviewShortcodeModal(false); setPreviewingShortcodeItem(null); }} className="ae-modal-close-btn">
                      <X className="ae-icon-md" />
                    </button>
                  </div>
                  <div className="ae-modal-body space-y-4">
                    <div>
                      <h4 className="ae-section-title-sm">{previewingShortcodeItem.title}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-1">{previewingShortcodeItem.shortcode}</p>
                    </div>

                    <div className="ae-divider-top-section">
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

            {/* 11. Edit Article Modal */}
            {showEditArticleModal && editingArticle && (
              <div className="ae-modal-overlay" onClick={() => { setShowEditArticleModal(false); setEditingArticle(null); }}>
                <div className="ae-modal-container max-w-2xl" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', width: '90%' }}>
                  <div className="ae-modal-header">
                    <h3 className="ae-modal-title">
                      <Edit3 className="ae-icon-md text-blue-600" /> Modifier l'article : {editingArticle.title}
                    </h3>
                    <button 
                      type="button"
                      onClick={() => { setShowEditArticleModal(false); setEditingArticle(null); }} 
                      className="ae-modal-close-btn"
                      aria-label="Fermer la boîte de dialogue"
                    >
                      <X className="ae-icon-md" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSaveEditArticle} className="ae-modal-body space-y-4">
                    <div>
                      <label className="ae-modal-label">Titre de l'article <span className="ae-text-danger">*</span></label>
                      <input 
                        type="text" 
                        required 
                        value={editingArticle.title} 
                        onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })} 
                        className="db-input w-full"
                        placeholder="Titre de l'article"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="ae-modal-label">Identifiant URL (Slug)</label>
                        <input 
                          type="text" 
                          value={editingArticle.slug} 
                          onChange={(e) => setEditingArticle({ ...editingArticle, slug: e.target.value })} 
                          className="db-input w-full"
                          placeholder="slug-de-l-article"
                        />
                      </div>
                      <div>
                        <label className="ae-modal-label">Catégorie</label>
                        <select 
                          value={editingArticle.category} 
                          onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })} 
                          className="db-select w-full"
                        >
                          <option value="Maison d'édition">Maison d'édition</option>
                          <option value="Présentation">Présentation</option>
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
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <label className="ae-modal-label mb-0">Image principale (URL)</label>
                          <button
                            type="button"
                            onClick={() => openMediaPicker((url) => setEditingArticle(prev => ({ ...prev, image: url })))}
                            className="ae-btn-secondary-sm d-inline-flex align-items-center gap-1 text-xs"
                            style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}
                            title="Choisir une image existante depuis la médiathèque"
                          >
                            <Image size={12} />
                            <span>Médiathèque</span>
                          </button>
                        </div>
                        <input 
                          type="url" 
                          value={editingArticle.image || ''} 
                          onChange={(e) => setEditingArticle({ ...editingArticle, image: e.target.value })} 
                          className="db-input w-full"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="ae-modal-label">Statut de publication</label>
                        <select 
                          value={editingArticle.status} 
                          onChange={(e) => setEditingArticle({ ...editingArticle, status: e.target.value })} 
                          className="db-select w-full"
                        >
                          <option value="published">Publié (En ligne)</option>
                          <option value="approved">Approuvé</option>
                          <option value="pending_review">En attente de relecture</option>
                          <option value="draft">Brouillon (Non visible)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="ae-modal-label">Extrait court (Affiché sur les cartes et l'accueil)</label>
                      <textarea 
                        rows={2} 
                        value={editingArticle.excerpt} 
                        onChange={(e) => setEditingArticle({ ...editingArticle, excerpt: e.target.value })} 
                        className="db-textarea w-full"
                        placeholder="Court résumé de l'article..."
                      />
                    </div>

                    <div>
                      <label className="ae-modal-label">Contenu complet de l'article</label>
                      <textarea 
                        rows={8} 
                        value={editingArticle.content} 
                        onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })} 
                        className="db-textarea w-full"
                        placeholder="Contenu complet avec titres (##), listes (*), etc."
                      />
                    </div>

                    {/* Option claire de sélection comme article principal pour la page d'accueil */}
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1rem', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.95rem' }}>
                        <input 
                          type="checkbox"
                          checked={editingArticle.isFeatured}
                          onChange={(e) => setEditingArticle({ ...editingArticle, isFeatured: e.target.checked })}
                          style={{ width: '18px', height: '18px', accentColor: '#1e3a8a' }}
                        />
                        <span>Afficher cet article sur la page d’accueil (Définir comme article principal)</span>
                      </label>
                      <p style={{ margin: '0.35rem 0 0 2rem', fontSize: '0.8rem', color: '#475569' }}>
                        Cet article apparaîtra en priorité dans l'encart « À la une » et sera lié au bouton principal du Hero de la page d'accueil.
                      </p>
                    </div>

                    <div className="ae-modal-footer font-sans">
                      <button 
                        type="button" 
                        onClick={() => { setShowEditArticleModal(false); setEditingArticle(null); }} 
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none"
                        disabled={isSavingArticle}
                      >
                        Annuler
                      </button>
                      <button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-sm border-none d-flex align-items-center gap-1.5"
                        disabled={isSavingArticle}
                      >
                        {isSavingArticle ? "Enregistrement..." : "Enregistrer l'article"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Rich Notification Toast */}
            {(toast || notification) && (
              <div 
                className={`ae-toast ae-toast--${toast?.type || 'info'}`} 
                role={toast?.type === 'error' ? "alert" : "status"} 
                aria-live="polite"
              >
                {toast?.type === 'success' ? (
                  <CheckCircle2 size={18} className="ae-toast-icon ae-toast-icon--success" aria-hidden="true" />
                ) : toast?.type === 'error' ? (
                  <AlertCircle size={18} className="ae-toast-icon ae-toast-icon--error" aria-hidden="true" />
                ) : toast?.type === 'warning' ? (
                  <AlertTriangle size={18} className="ae-toast-icon ae-toast-icon--warning" aria-hidden="true" />
                ) : (
                  <Info size={18} className="ae-toast-icon ae-toast-icon--info" aria-hidden="true" />
                )}
                <span className="ae-toast-message">{toast?.message || notification}</span>
                <button 
                  type="button"
                  onClick={() => {
                    setToast(null);
                    setNotificationRaw(null);
                  }}
                  className="ae-toast-close"
                  title="Fermer la notification"
                  aria-label="Fermer la notification"
                >
                  <X className="ae-icon-size-sm" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Sélecteur de média universel */}
            <MediaLibraryModal
              isOpen={isMediaPickerOpen}
              onClose={() => setIsMediaPickerOpen(false)}
              filterType="image"
              onSelect={(item) => {
                const url = typeof item === 'string' ? item : (item.url || item.dataUrl || '');
                if (mediaPickerCallback) {
                  mediaPickerCallback(url);
                }
                setIsMediaPickerOpen(false);
                showToast("Média sélectionné depuis la médiathèque", "success");
              }}
            />

            {/* Palette de commandes universelle (Ctrl + K) */}
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              onClose={() => setIsCommandPaletteOpen(false)}
              onNavigateSection={(sec) => {
                setActiveSection(sec);
                setSidebarOpen(false);
              }}
              onAction={(actionType, payload) => {
                if (actionType === "new-article") {
                  setActiveSection("Article");
                } else if (actionType === "new-flipbook") {
                  setActiveSection("Mes Flipbooks");
                  setUploadStep(0);
                  setUploadProgress(0);
                  setNewFlipbookTitle("");
                  setNewFlipbookDesc("");
                  setNewFlipbookCategory("Outils");
                  setSelectedPdfFile(null);
                  setShowAddFlipbookModal(true);
                } else if (actionType === "new-page") {
                  setActiveSection("Page");
                } else if (actionType === "open-article" && payload) {
                  setActiveSection("Article");
                  handleOpenEditArticle(payload);
                }
              }}
              articles={articlesList}
              flipbooks={flipbooks}
              pages={pagesList}
              messages={messagesList}
              onBackToSite={onBackToSite}
              onLogout={handleLogout}
            />

          </div>
        </div>
    </div>
  );
}
