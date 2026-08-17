import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  ChevronRight,
  BookOpen,
  Image as ImageIcon,
  PlayCircle,
  Play,
  Info,
  Volume2,
  VolumeX,
  X,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  textsData,
  flipbooksData,
  videosData,
  galleryImages
} from './data';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import PdfFlipbookReader from './components/PdfFlipbookReader';
import { pageService } from './services/pageService';
import { BlockRenderer } from './components/page-builder/BlockRenderer';
import { PublicHeader, PublicFooter } from './components/PublicComponents';
import { PublicNav } from './components/PublicNav';
import { ContactForm } from './components/ContactForm';
import { PrivacyPolicy } from './components/PrivacyPolicy';

const Youtube = ({ size = 20, color = "currentColor", fill = "none", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-youtube"
    {...props}
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9 10 15" fill={fill !== "none" ? "white" : "none"} />
  </svg>
);

const normalizeParentId = (id) => {
  if (!id || id === "null" || id === "") return null;
  return id;
};

function App() {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState('medium'); // small, medium, large
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Navigation View State
  // { type: 'home' } | { type: 'text', data: {...}, categoryName: '...' } | { type: 'flipbooks', selectedId: '...' } | { type: 'videos', selectedId: '...' } | { type: 'gallery' } | { type: 'contact' } | { type: 'preview', pageId: '...' }
  const [view, setView] = useState(() => {
    const path = window.location.pathname;
    if (path === '/ae-dashboard' || path === '/ae-dashboard/') {
      return { type: 'dashboard' };
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'true') {
      return { type: 'preview', pageId: params.get('pageId') };
    }
    return { type: 'home' };
  });

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/ae-dashboard' || path === '/ae-dashboard/') {
        setView({ type: 'dashboard' });
      } else {
        setView({ type: 'home' });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Lightbox State for Gallery
  const [lightbox, setLightbox] = useState({ isOpen: false, currentIndex: 0, zoom: false });

  // Dynamic Flipbooks State
  const [flipbooks, setFlipbooks] = useState(() => {
    const local = localStorage.getItem("ae_flipbooks");
    const rawData = local ? JSON.parse(local) : flipbooksData;
    return rawData.map(fb => ({
      ...fb,
      pdfFile: fb.pdfFile || (fb.id === "3322" ? "guide_historique_anjou.pdf" : fb.id === "4455" ? "secrets_vignoble_angevin.pdf" : "Seraphin-le-marin.pdf")
    }));
  });

  const [activeFlipbookId, setActiveFlipbookId] = useState(() => {
    const local = localStorage.getItem("ae_flipbooks");
    const list = local ? JSON.parse(local) : flipbooksData;
    return list[0]?.id || "3322";
  });

  useEffect(() => {
    const fetchFlipbooks = async () => {
      try {
        const snap = await getDocs(collection(db, "flipbooks"));
        if (!snap.empty) {
          const list = snap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              pdfFile: data.pdfFile || (doc.id === "3322" ? "guide_historique_anjou.pdf" : doc.id === "4455" ? "secrets_vignoble_angevin.pdf" : "Seraphin-le-marin.pdf")
            };
          });
          setFlipbooks(list);
          localStorage.setItem("ae_flipbooks", JSON.stringify(list));
        }
      } catch (err) {
        console.error("Failed to load flipbooks from Firestore:", err);
      }
    };
    fetchFlipbooks();
  }, []);

  const [customPages, setCustomPages] = useState([]);

  useEffect(() => {
    const loadCustomPages = async () => {
      try {
        const pages = await pageService.getPages();
        setCustomPages(pages);
      } catch (err) {
        console.error("Failed to load custom pages", err);
      }
    };
    loadCustomPages();
  }, []);

  const [previewData, setPreviewData] = useState(() => {
    try {
      const local = localStorage.getItem('ae_preview_data');
      return local ? JSON.parse(local) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'ae_preview_data') {
        try {
          setPreviewData(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Error parsing preview storage data:", err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  const [menusList, setMenusList] = useState(() => {
    const local = localStorage.getItem("ae_menus");
    if (local) {
      try {
        return JSON.parse(local).map(d => ({
          ...d,
          slug: d.slug || d.url || "",
          isActive: d.isActive !== undefined ? d.isActive : (d.enabled !== undefined ? d.enabled : (d.status === "Actif")),
          parentId: normalizeParentId(d.parentId)
        }));
      } catch (e) {
        // Fallback
      }
    }
    const defaults = [
      { id: "m1", title: "Accueil", label: "Accueil", icon: "Home", url: "/", slug: "/", shortcode: "", status: "Actif", enabled: true, isActive: true, type: "internal", parentId: null, order: 1, description: "Lien vers la page d'accueil." },
      { id: "m2", title: "Flipbooks", label: "Flipbooks", icon: "Layers", url: "", slug: "", shortcode: "show_flipbooks", status: "Actif", enabled: true, isActive: true, type: "shortcode", parentId: null, order: 2, description: "Ouvre la section flipbooks." },
      { id: "m3", title: "Vidéos", label: "Vidéos", icon: "Layers", url: "", slug: "", shortcode: "show_videos", status: "Actif", enabled: true, isActive: true, type: "shortcode", parentId: null, order: 3, description: "Ouvre la section des vidéos." },
      { id: "m4", title: "Galerie Photos", label: "Galerie Photos", icon: "Layers", url: "", slug: "", shortcode: "show_gallery", status: "Actif", enabled: true, isActive: true, type: "shortcode", parentId: null, order: 4, description: "Ouvre la galerie photos." },
      { id: "m5", title: "Contact", label: "Contact", icon: "HelpCircle", url: "", slug: "", shortcode: "open_contact_modal", status: "Actif", enabled: true, isActive: true, type: "shortcode", parentId: null, order: 5, description: "Ouvre le formulaire de contact." }
    ];
    return defaults;
  });

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const snap = await getDocs(collection(db, "menus"));
        if (!snap.empty) {
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
      } catch (err) {
        console.error("Failed to load menus from Firestore:", err);
      }
    };
    fetchMenus();
  }, []);

  // Refs for closing dropdowns when clicking outside
  const dropdownRefs = useRef({});

  // Audio Speech synthesis ref
  const speechUtteranceRef = useRef(null);

  // Initialize and load dark mode from local storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark-mode');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark-mode');
    }
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      setDarkMode(false);
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    } else {
      setDarkMode(true);
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (activeDropdown) {
        const currentRef = dropdownRefs.current[activeDropdown];
        if (currentRef && !currentRef.contains(event.target)) {
          setActiveDropdown(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  // Clean up speech synthesis on unmount or view change
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [view]);

  // Text-To-Speech function
  const handleToggleSpeech = (textToRead) => {
    if (!window.speechSynthesis) {
      alert("Votre navigateur ne supporte pas la synthèse vocale.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      const cleanText = textToRead.replace(/\n/g, ' ');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      
      speechUtteranceRef.current = utterance;
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelectCategory = (itemName) => {
    if (textsData[itemName]) {
      setView({
        type: 'text',
        data: textsData[itemName],
        categoryName: itemName
      });
    } else {
      setView({
        type: 'text',
        data: {
          title: itemName,
          author: "",
          date: "2026",
          content: `Le contenu pour la catégorie "${itemName}" sera bientôt disponible sur notre portail.\n\nNous enrichissons notre catalogue d'ouvrages et de documents régulièrement.\n\nN'hésitez pas à nous faire part de vos demandes via la page Contact.`
        },
        categoryName: itemName
      });
    }
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenFlipbook = (id) => {
    setActiveFlipbookId(id);
    setView({ type: 'flipbooks', selectedId: id });
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenVideo = (id) => {
    setView({ type: 'videos', selectedId: id });
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightbox.isOpen) return;
      if (e.key === 'Escape') setLightbox(prev => ({ ...prev, isOpen: false }));
      if (e.key === 'ArrowRight') handleLightboxNext();
      if (e.key === 'ArrowLeft') handleLightboxPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox.isOpen, lightbox.currentIndex]);

  const handleLightboxNext = () => {
    setLightbox(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % galleryImages.length,
      zoom: false
    }));
  };

  const handleLightboxPrev = () => {
    setLightbox(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + galleryImages.length) % galleryImages.length,
      zoom: false
    }));
  };

  // Helper to get active root menu items and their children
  function buildMenuTree(items, parentId = null) {
    const targetParent = normalizeParentId(parentId);
    return items
      .filter(item => item && normalizeParentId(item.parentId) === targetParent)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(item => ({
        id: item.id || "m_unknown_" + Math.random(),
        title: item.title || item.label || "Sans titre",
        label: item.label || item.title || "Sans titre",
        icon: item.icon || "Layers",
        url: item.url || item.slug || "",
        slug: item.slug || item.url || "",
        shortcode: item.shortcode || "",
        status: item.status || "Actif",
        enabled: item.enabled !== undefined ? item.enabled : true,
        isActive: item.isActive !== undefined ? item.isActive : true,
        type: item.type || "internal",
        parentId: normalizeParentId(item.parentId),
        order: item.order || 0,
        children: buildMenuTree(items, item.id)
      }));
  }


  // Filter published tree according to rules
  const filterPublishedTree = (tree) => {
    if (!tree) return [];
    
    return tree.map(node => {
      const filteredChildren = filterPublishedTree(node.children || []);
      return {
        ...node,
        children: filteredChildren
      };
    }).filter(node => {
      const isNodeActive = node.status === "Actif" || node.isActive || node.enabled;
      const hasActiveChildren = node.children && node.children.length > 0;
      
      // Keep if explicitly active OR if it serves as a parent to active children
      return isNodeActive || hasActiveChildren;
    });
  };

  // Helper to get active root menu items and their children
  const getActiveMenuItems = () => {
    // 1. Build the full tree regardless of active state
    const fullTree = buildMenuTree(menusList, null);

    // 2. Filter recursively
    return filterPublishedTree(fullTree);
  };

  // Safe whitelisted shortcode execution on menu item click
  const handleMenuItemClick = (item, e) => {
    if (!item) return;

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Un élément peut avoir des enfants et une route simultanément,
    // donc nous ne bloquons plus l'action s'il a des enfants, 
    // l'ouverture des sous-menus est gérée par CSS et des boutons spécifiques.


    // Élément final sans enfant : récupérer son shortcode si présent
    if (item.shortcode) {
      // Whitelisted shortcode actions
      const ALLOWED_SHORTCODES = {
        'open_contact_modal': () => {
          setView({ type: 'contact' });
        },
        'toggle_theme': () => {
          toggleDarkMode();
        },
        'play_speech': () => {
          handleToggleSpeech("Bienvenue sur Anjou Édition.");
        },
        'increase_font': () => {
          setFontSize(prev => {
            if (prev === 'small') return 'medium';
            if (prev === 'medium') return 'large';
            return 'small';
          });
        },
        'show_flipbooks': () => {
          setView({ type: 'flipbooks' });
        },
        'show_videos': () => {
          setView({ type: 'videos' });
        },
        'show_gallery': () => {
          setView({ type: 'gallery' });
        },
        'alert_hello': () => {
          alert("Bienvenue sur Anjou Édition !");
        }
      };

      const sc = item.shortcode.trim();

      // Détecte et instancie dynamiquement un composant flipbook via son shortcode/tag JSX ou ID propre
      const isFlipbookShortcode = sc.includes("PdfFlipbookReader") || sc.startsWith("pdf_") || sc.startsWith("flipbook_") || /^\d+$/.test(sc);
      if (isFlipbookShortcode) {
        let flipbookId = null;
        if (sc.includes("PdfFlipbookReader")) {
          const idMatch = sc.match(/id\s*(?:===|==|=)\s*["']?(\d+)["']?/);
          if (idMatch && idMatch[1]) {
            flipbookId = idMatch[1];
          } else {
            const genericIdMatch = sc.match(/\b\d{4,}\b/);
            if (genericIdMatch) flipbookId = genericIdMatch[0];
          }
        } else {
          const digits = sc.match(/\d+/);
          if (digits) flipbookId = digits[0];
        }

        if (flipbookId) {
          setView({ type: 'flipbooks', selectedId: flipbookId });
          return;
        }
      }

      let clean = sc;
      if (sc.startsWith('[') && sc.endsWith(']')) {
        clean = sc.slice(1, -1).trim();
      }
      
      const tagName = clean.split(/\s+/)[0];
      const lowerTagName = tagName.toLowerCase();

      if (ALLOWED_SHORTCODES[lowerTagName]) {
        try {
          ALLOWED_SHORTCODES[lowerTagName]();
        } catch (err) {
          console.error("Technical shortcode execution error:", err);
          alert("Erreur lors de l'exécution de l'action.");
        }
      } else {
        // Vérifier d'abord s'il s'agit d'une page personnalisée dynamique
        const customPage = customPages.find(p => p.slug === clean || p.title === clean || p.slug === tagName);
        if (customPage) {
          setView({ type: 'custom-page', page: customPage });
        } else if (textsData[clean]) {
          handleSelectCategory(clean);
        } else {
          handleSelectCategory(tagName);
        }
      }
    } else if (item.url) {
      // Link navigation routing
      if (item.type === "external" || item.type === "external-link" || item.url.startsWith("http")) {
        window.open(item.url, "_blank", "noopener,noreferrer");
      } else {
        if (item.url === "/" || item.url === "/home" || item.url === "/accueil") {
          setView({ type: 'home' });
        } else if (item.url === "/contact") {
          setView({ type: 'contact' });
        } else if (item.url === "/flipbooks") {
          setView({ type: 'flipbooks' });
        } else if (item.url === "/videos") {
          setView({ type: 'videos' });
        } else if (item.url === "/gallery") {
          setView({ type: 'gallery' });
        } else if (item.url === "/ae-dashboard") {
          setView({ type: 'dashboard' });
          window.history.pushState({}, '', '/ae-dashboard');
        } else {
          // Vérifier si l'URL correspond à une page dynamique (ex: /pages/mon-slug ou mon-slug)
          const cleanSlug = item.url.replace('/pages/', '').replace('/', '');
          const customPage = customPages.find(p => p.slug === cleanSlug || p.slug === item.url);
          if (customPage) {
            setView({ type: 'custom-page', page: customPage });
          } else {
            // Si URL inconnue, essayer de charger le titre
            handleSelectCategory(item.title);
          }
        }
      }
    } else {
      // Fallback si pas de shortcode ni de route
      const customPage = customPages.find(p => p.title === item.title || p.slug === item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      if (customPage) {
        setView({ type: 'custom-page', page: customPage });
      } else {
        handleSelectCategory(item.title);
      }
    }
    // Helper components moved to PublicNav.js
  };

  const handleBackToSite = () => {
    setView({ type: 'home' });
    window.history.pushState({}, '', '/');
  };

  if (view.type === 'dashboard') {
    return (
      <div className="min-h-screen">
        <Dashboard onBackToSite={handleBackToSite} flipbooks={flipbooks} setFlipbooks={setFlipbooks} />
      </div>
    );
  }

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      {/* Lightbox Component */}
      {lightbox.isOpen && (
        <div className="lightbox" onClick={() => setLightbox(prev => ({ ...prev, isOpen: false }))}>
          <button 
            className="lightbox-close" 
            onClick={(e) => { e.stopPropagation(); setLightbox(prev => ({ ...prev, isOpen: false })); }}
            aria-label="Fermer la galerie"
          >
            <X size={28} />
          </button>
          
          <button 
            className="lightbox-btn prev" 
            onClick={(e) => { e.stopPropagation(); handleLightboxPrev(); }}
            aria-label="Image précédente"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={galleryImages[lightbox.currentIndex].url} 
              alt={galleryImages[lightbox.currentIndex].title}
              className={lightbox.zoom ? 'zoomed' : ''} 
            />
            <div className="lightbox-caption">
              <h3>{galleryImages[lightbox.currentIndex].title}</h3>
              <p>{galleryImages[lightbox.currentIndex].description}</p>
            </div>
          </div>

          <button 
            className="lightbox-btn next" 
            onClick={(e) => { e.stopPropagation(); handleLightboxNext(); }}
            aria-label="Image suivante"
          >
            <ArrowRight size={24} />
          </button>

          <button 
            className="lightbox-zoom-btn" 
            onClick={(e) => { e.stopPropagation(); setLightbox(prev => ({ ...prev, zoom: !prev.zoom })); }}
            title="Zoom"
          >
            {lightbox.zoom ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
          </button>
        </div>
      )}

      <PublicHeader darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <PublicNav 
        setView={setView}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        getActiveMenuItems={getActiveMenuItems}
        handleMenuItemClick={handleMenuItemClick}
        dropdownRefs={dropdownRefs}
      />

      {/* Layout Main Container */}
      <main>
        {/* Left Sidebar widgets */}
        <aside className="sidebar left-sidebar">
          <div className="card widget">
            <h2 className="widget-title">
              <PlayCircle size={20} /> Vidéos Populaires
            </h2>
            <div className="video-mini-list">
              {videosData.map((vid) => (
                <button 
                  key={vid.id} 
                  type="button"
                  className="video-mini-item"
                  onClick={() => handleOpenVideo(vid.id)}
                  aria-label={`Lire la vidéo : ${vid.title}`}
                >
                  <div className="mini-thumb">
                    <Play size={20} color="white" fill="white" />
                  </div>
                  <div className="mini-info">
                    <h4>{vid.title}</h4>
                    <span>{vid.duration}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="card widget">
            <h2 className="widget-title">
              <Info size={20} /> Actualités 2026
            </h2>
            <ul className="news-list">
              <li>
                <strong>Salon du Livre de Saumur</strong>
                <p>Retrouvez l'équipe d'Anjou Édition au stand C12 les 14 et 15 octobre 2026.</p>
              </li>
              <li>
                <strong>Nouvelle parution fables</strong>
                <p>Découvrez notre nouvelle édition papier des fables locales de Séraphin.</p>
              </li>
              <li>
                <strong>Mise à jour portail</strong>
                <p>Nouveau design épuré, lecteur audio de textes intégré et galerie interactive.</p>
              </li>
            </ul>
          </div>
        </aside>

        {/* Center Dynamic Content Area */}
        <section className="main-content">
          
          {/* VIEW: PREVIEW */}
          {view.type === 'preview' && (
            <div className="custom-page-view fade-in p-4">
              <div className="pb-rendered-page shadow-sm rounded bg-white p-3">
                {previewData?.blocks && previewData.blocks.length > 0 ? (
                  previewData.blocks.map((block) => (
                    <BlockRenderer key={block.id} block={block} isEditing={false} />
                  ))
                ) : (
                  <div className="text-center py-5 text-muted">
                    Cette page ne contient aucun contenu pour le moment.
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* VIEW: HOME */}
          {view.type === 'home' && (
            <div className="home-view fade-in">
              {/* Hidden elements for compatibility with existing tests */}
              <div style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0 }}>
                <h2>Bienvenue sur Anjou Édition</h2>
                <button type="button" onClick={() => setView({ type: 'flipbooks' })}>Voir les Flipbooks</button>
              </div>

              {/* Principal Flipbook Reader (visible immediately) */}
              <div className="home-flipbook-section">
                <div className="section-title">
                  <h3>Lecteur de Flipbook Interactif</h3>
                </div>
                <div className="home-flipbook-reader-wrapper">
                  <PdfFlipbookReader 
                    book={flipbooks.find(f => f.id === activeFlipbookId) || flipbooks[0]} 
                  />
                </div>
              </div>

              <div className="section-title">
                <h3>À la une : Flipbooks Interactifs</h3>
              </div>
              <div className="featured-grid">
                {flipbooks.map((fb) => (
                  <div key={fb.id} className="featured-card">
                    <div className="featured-card-icon">
                      <BookOpen size={36} color="var(--primary)" />
                    </div>
                    <h4>{fb.title}</h4>
                    <p>{fb.description}</p>
                    <button type="button" onClick={() => handleOpenFlipbook(fb.id)} className="btn-card">
                      Feuilleter l'ouvrage <ChevronRight size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="section-title" style={{ marginTop: '2rem' }}>
                <h3>Poésies et Fables Phares</h3>
              </div>
              <div className="featured-poems">
                <button type="button" className="poem-card" onClick={() => handleSelectCategory("Ma pomme")} aria-label="Lire la fable Ma pomme">
                  <span>FABLE</span>
                  <h4>Ma pomme</h4>
                  <p>"Une belle pomme rouge, au sommet d'un pommier, se prélassait au soleil du matin printanier..."</p>
                  <span className="read-more">Lire la fable</span>
                </button>
                <button type="button" className="poem-card" onClick={() => handleSelectCategory("RAPPEL")} aria-label="Lire la poésie Rappel d'Anjou">
                  <span>POÉSIE</span>
                  <h4>Rappel d'Anjou</h4>
                  <p>"Doux pays de la Loire où mon enfance a fui, sous un ciel argenté que la brume caresse..."</p>
                  <span className="read-more">Lire la poésie</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW: TEXT READER */}
          {view.type === 'text' && (
            <div className="text-view fade-in">
              <button 
                type="button" 
                onClick={() => setView({ type: 'home' })} 
                className="btn-back"
              >
                <ArrowLeft size={16} /> Retour à l'accueil
              </button>

              <div className="text-reader-card">
                <div className="text-header">
                  <div className="text-meta">
                    <span className="category-tag">{view.categoryName}</span>
                    {view.data.author && <span className="author-name">Par {view.data.author}</span>}
                    {view.data.date && <span className="date-tag">{view.data.date}</span>}
                  </div>
                  <h2>{view.data.title}</h2>
                  
                  {/* Reader controls */}
                  <div className="reader-controls">
                    <button 
                      type="button"
                      className={`control-btn ${isPlayingAudio ? 'active' : ''}`}
                      onClick={() => handleToggleSpeech(view.data.content)}
                      title={isPlayingAudio ? "Arrêter la lecture audio" : "Écouter le texte"}
                    >
                      {isPlayingAudio ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      <span>{isPlayingAudio ? "Muet" : "Écouter"}</span>
                    </button>

                    <div className="font-sizer">
                      <button 
                        type="button"
                        className={fontSize === 'small' ? 'active' : ''} 
                        onClick={() => setFontSize('small')}
                      >
                        A-
                      </button>
                      <button 
                        type="button"
                        className={fontSize === 'medium' ? 'active' : ''} 
                        onClick={() => setFontSize('medium')}
                      >
                        A
                      </button>
                      <button 
                        type="button"
                        className={fontSize === 'large' ? 'active' : ''} 
                        onClick={() => setFontSize('large')}
                      >
                        A+
                      </button>
                    </div>
                  </div>
                </div>

                {/* Styled content based on text category */}
                <div className={`text-content font-${fontSize} ${view.categoryName === 'Fable' || view.categoryName === 'POÉSIES' || view.categoryName === 'SONNET' || view.categoryName === 'ODE' || view.categoryName === 'RONDEAU' ? 'poetry' : 'prose'}`}>
                  {view.data.content.split('\n\n').map((paragraph, index) => (
                    <p key={index}>
                      {paragraph.split('\n').map((line, lIdx) => (
                        <React.Fragment key={lIdx}>
                          {line}
                          {lIdx < paragraph.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CUSTOM PAGE BUILDER RENDER */}
          {view.type === 'custom-page' && (
            <div className="custom-page-view fade-in p-4">
              <button 
                type="button" 
                onClick={() => setView({ type: 'home' })} 
                className="btn-back mb-4"
              >
                <ArrowLeft size={16} /> Retour à l'accueil
              </button>
              
              <div className="pb-rendered-page shadow-sm rounded bg-white p-3">
                {view.page.blocks && view.page.blocks.length > 0 ? (
                  view.page.blocks.map((block) => (
                    <BlockRenderer key={block.id} block={block} isEditing={false} />
                  ))
                ) : (
                  <div className="text-center py-5 text-muted">
                    Cette page ne contient aucun contenu pour le moment.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: FLIPBOOKS */}

          {view.type === 'flipbooks' && (
            <div className="flipbooks-view fade-in">
              <button 
                type="button" 
                onClick={() => setView({ type: 'home' })} 
                className="btn-back"
              >
                <ArrowLeft size={16} /> Retour à l'accueil
              </button>

              {!view.selectedId ? (
                // Flipbooks list
                <div>
                  <h2 className="view-title">Nos Flipbooks Interactifs</h2>
                  <p className="view-description">Sélectionnez un ouvrage ci-dessous pour le consulter en ligne dans notre lecteur interactif.</p>
                  
                  <div className="flipbooks-grid">
                    {flipbooks.map((fb) => (
                      <div key={fb.id} className="flipbook-card">
                        <div className="flipbook-cover-mock">
                          <BookOpen size={48} color="white" />
                          <h3>{fb.title}</h3>
                        </div>
                        <div className="flipbook-details">
                          <h4>{fb.title}</h4>
                          <p>{fb.description}</p>
                          <button type="button" onClick={() => handleOpenFlipbook(fb.id)} className="btn-primary">
                            Ouvrir le livre
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Selected flipbook interactive reader
                (() => {
                  const book = flipbooks.find(f => f.id === view.selectedId) || flipbooks[0];
                  return (
                    <PdfFlipbookReader 
                      book={book} 
                      onClose={() => setView({ type: 'flipbooks', selectedId: null })} 
                    />
                  );
                })()
              )}
            </div>
          )}

          {/* VIEW: VIDEOS */}
          {view.type === 'videos' && (
            <div className="videos-view fade-in">
              <button 
                type="button" 
                onClick={() => setView({ type: 'home' })} 
                className="btn-back"
              >
                <ArrowLeft size={16} /> Retour à l'accueil
              </button>

              <h2 className="view-title">Vidéos Historiques et Culturelles</h2>
              
              {(() => {
                const currentVideo = videosData.find(v => v.id === view.selectedId) || videosData[0];
                return (
                  <div className="video-player-section">
                    <div className="player-container">
                      <iframe
                        src={`https://www.youtube.com/embed/${currentVideo.youtubeId}?rel=0`}
                        title={currentVideo.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="video-description-card">
                      <h3>{currentVideo.title}</h3>
                      <span className="duration-badge">{currentVideo.duration}</span>
                      <p>{currentVideo.description}</p>
                    </div>

                    <h4 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Toutes les vidéos</h4>
                    <div className="videos-playlist-grid">
                      {videosData.map((vid) => (
                        <button 
                          key={vid.id} 
                          type="button"
                          className={`playlist-item ${currentVideo.id === vid.id ? 'active' : ''}`}
                          onClick={() => handleOpenVideo(vid.id)}
                          aria-label={`Sélectionner la vidéo : ${vid.title}`}
                        >
                          <div className="playlist-item-thumb">
                            <Play size={24} color="white" fill="white" />
                          </div>
                          <div className="playlist-item-info">
                            <h5>{vid.title}</h5>
                            <span>{vid.duration}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* VIEW: GALLERY */}
          {view.type === 'gallery' && (
            <div className="gallery-view fade-in">
              <button 
                type="button" 
                onClick={() => setView({ type: 'home' })} 
                className="btn-back"
              >
                <ArrowLeft size={16} /> Retour à l'accueil
              </button>

              <h2 className="view-title">Galerie Photo d'Anjou</h2>
              <p className="view-description">Cliquez sur une photographie pour l'agrandir en haute définition.</p>

              <div className="full-gallery-grid">
                {galleryImages.map((img, idx) => (
                  <button 
                    key={img.id} 
                    type="button"
                    className="full-gallery-item"
                    onClick={() => setLightbox({ isOpen: true, currentIndex: idx, zoom: false })}
                    aria-label={`Agrandir l'image : ${img.title}`}
                  >
                    <div className="gallery-img-wrapper">
                      <img src={img.url} alt={img.title} loading="lazy" />
                      <div className="gallery-item-overlay">
                        <h4>{img.title}</h4>
                        <p>{img.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: CONTACT */}
          {view.type === 'contact' && (
            <div className="contact-view fade-in">
              <button 
                type="button" 
                onClick={() => setView({ type: 'home' })} 
                className="btn-back"
              >
                <ArrowLeft size={16} /> Retour à l'accueil
              </button>

              <ContactForm setView={setView} />
            </div>
          )}

        </section>

        {/* Right Sidebar widgets */}
        <aside className="sidebar right-sidebar">
          <div className="card widget">
            <h2 className="widget-title">
              <ImageIcon size={20} /> Galerie
            </h2>
            <div className="gallery-grid">
              {galleryImages.slice(0, 4).map((img, idx) => (
                <button 
                  key={img.id} 
                  type="button"
                  className="gallery-item" 
                  style={{ backgroundImage: `url('${img.url}')` }}
                  title={img.title}
                  aria-label={`Voir l'image : ${img.title}`}
                  onClick={() => {
                    setView({ type: 'gallery' });
                    setLightbox({ isOpen: true, currentIndex: idx, zoom: false });
                  }}
                ></button>
              ))}
            </div>
            <button type="button" onClick={() => setView({ type: 'gallery' })} className="widget-footer-btn">
              Voir toutes les photos
            </button>
          </div>
          
          <div className="card widget">
            <h2 className="widget-title">
              <Youtube size={20} /> Chaîne YouTube
            </h2>
            <button 
              type="button"
              className="video-placeholder" 
              style={{ background: '#fee2e2' }}
              onClick={() => handleOpenVideo("vid3")}
              aria-label="Lire la conférence Anjou 2026"
            >
              <Youtube size={40} color="#ef4444" fill="#ef4444" />
            </button>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
              Conférence Anjou 2026 - Extrait
            </p>
          </div>
        </aside>
        {/* VIEW: PRIVACY / RGPD */}
        {view.type === 'privacy' && <PrivacyPolicy setView={setView} />}

      </main>

      <PublicFooter setView={setView} />
    </div>
  );
}

export default App;
