import { 
  Layout, 
  Square, 
  Columns, 
  Grid, 
  Heading as HeadingIcon, 
  AlignLeft, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  PlaySquare,
  AlertCircle, 
  Minus,
  List as ListIcon,
  PlayCircle,
  Info,
  BookOpen,
  Feather,
  Mail
} from 'lucide-react';
import { flipbooksData, videosData, galleryImages } from '../../data';
import { extractYoutubeVideoId } from '../../utils/youtubeUtils';

const YoutubeIcon = ({ size = 20, color = "currentColor", fill = "none" }) => (
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
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9 10 15" fill={fill !== "none" ? "white" : "none"} />
  </svg>
);

/**
 * Palette officielle Anjou Édition (17 nuances certifiées).
 * Conforme aux variables CSS de App.css et aux critères d'accessibilité WCAG 2.2 AA.
 */
export const ANJOU_EDITION_PALETTE = [
  { label: 'Bleu Royal (Principal)', value: '#1e3a8a', textColor: '#ffffff' },
  { label: 'Bleu Nuit Éditorial', value: '#0f2b5c', textColor: '#ffffff' },
  { label: 'Bleu Ardoise Dashboard', value: '#004b7a', textColor: '#ffffff' },
  { label: 'Bleu Royal Vif', value: '#2563eb', textColor: '#ffffff' },
  { label: 'Bleu Ciel Loire', value: '#0284c7', textColor: '#ffffff' },
  { label: 'Bleu Givré Doux', value: '#f0f7ff', textColor: '#0f2b5c' },
  { label: 'Or Chaud Angevin', value: '#d97706', textColor: '#ffffff' },
  { label: 'Or Doux Pastel', value: '#fef3c7', textColor: '#92400e' },
  { label: 'Vert Loire Végétal', value: '#059669', textColor: '#ffffff' },
  { label: 'Vert Givré', value: '#ecfdf5', textColor: '#065f46' },
  { label: 'Pourpre Éditorial', value: '#7c3aed', textColor: '#ffffff' },
  { label: 'Rose Pivoine', value: '#e11d48', textColor: '#ffffff' },
  { label: 'Crème Papier Vélin', value: '#fdfbf7', textColor: '#1e293b' },
  { label: 'Blanc Pur', value: '#ffffff', textColor: '#0f172a' },
  { label: 'Ardoise Claire', value: '#f8fafc', textColor: '#334155' },
  { label: 'Ardoise Sombre', value: '#1e293b', textColor: '#ffffff' },
  { label: 'Noir Ébène Texte', value: '#0f172a', textColor: '#ffffff' }
];

/**
 * Propriétés standard de style étendu pour le Page Builder.
 */
export const DEFAULT_EXTENDED_STYLE = {
  paddingTop: '',
  paddingBottom: '',
  paddingLeft: '',
  paddingRight: '',
  marginTop: '',
  marginBottom: '',
  borderWidth: '',
  borderStyle: 'none',
  borderColor: '',
  borderRadius: '',
  boxShadow: '',
  backgroundColor: '',
  color: ''
};

/**
 * Drapeaux de visibilité responsive par défaut pour un bloc.
 */
export const DEFAULT_RESPONSIVE_FLAGS = {
  hideOnMobile: false,
  hideOnTablet: false,
  hideOnDesktop: false
};

/**
 * Registre exhaustif des blocs éditables pour Anjou Édition.
 */
export const BLOCK_DEFINITIONS = {
  // --- STRUCTURE ---
  section: {
    type: 'section',
    label: 'Section',
    category: 'structure',
    icon: Layout,
    desc: 'Section globale de la page avec fond personnalisable',
    hasChildren: true,
    defaultSettings: {
      classes: 'py-4',
      backgroundImage: '',
      style: {
        backgroundColor: '#ffffff',
        paddingTop: '2rem',
        paddingBottom: '2rem'
      }
    }
  },
  container: {
    type: 'container',
    label: 'Container',
    category: 'structure',
    icon: Square,
    desc: 'Conteneur centré avec largeur maximale ou pleine largeur',
    hasChildren: true,
    defaultSettings: {
      fluid: false,
      classes: '',
      style: {}
    }
  },
  row: {
    type: 'row',
    label: 'Ligne (Row)',
    category: 'structure',
    icon: Columns,
    desc: 'Ligne de grille Bootstrap',
    hasChildren: true,
    defaultSettings: {
      classes: '',
      style: {}
    }
  },
  column: {
    type: 'column',
    label: 'Colonne',
    category: 'structure',
    icon: Grid,
    desc: 'Colonne responsive ajustable',
    hasChildren: true,
    defaultSettings: {
      sizeClasses: 'col-md-12',
      classes: '',
      style: {}
    }
  },

  // --- CONTENU STANDARD ---
  heading: {
    type: 'heading',
    label: 'Titre',
    category: 'content',
    icon: HeadingIcon,
    desc: 'Titre de niveau H1 à H6 ajustable',
    hasChildren: false,
    defaultSettings: {
      content: 'Nouveau Titre',
      level: 'h2',
      alignment: 'left',
      classes: 'mb-3',
      style: { color: '#1e293b' }
    }
  },
  text: {
    type: 'text',
    label: 'Texte / HTML',
    category: 'content',
    icon: AlignLeft,
    desc: 'Paragraphe de texte riche ou code HTML',
    hasChildren: false,
    defaultSettings: {
      content: '<p>Nouveau paragraphe de texte. Vous pouvez modifier ce texte directement dans le panneau de réglages.</p>',
      alignment: 'left',
      classes: 'mb-3',
      style: { color: '#475569' }
    }
  },
  image: {
    type: 'image',
    label: 'Image',
    category: 'content',
    icon: ImageIcon,
    desc: 'Image avec téléversement et lien optionnel',
    hasChildren: false,
    defaultSettings: {
      src: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=600',
      alt: 'Illustration',
      caption: '',
      link: '',
      classes: 'img-fluid rounded',
      style: {}
    }
  },
  video: {
    type: 'video',
    label: 'Vidéo',
    category: 'content',
    icon: VideoIcon,
    desc: 'Intégration vidéo YouTube ou lecteur vidéo',
    hasChildren: false,
    defaultSettings: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
      title: 'Vidéo',
      classes: '',
      style: {}
    }
  },
  button: {
    type: 'button',
    label: 'Bouton',
    category: 'content',
    icon: PlaySquare,
    desc: 'Bouton d\'action avec lien et icône',
    hasChildren: false,
    defaultSettings: {
      text: 'En savoir plus',
      link: '#',
      buttonStyle: 'btn-primary',
      size: '',
      icon: '',
      newTab: false,
      classes: '',
      style: {}
    }
  },
  card: {
    type: 'card',
    label: 'Carte (Card)',
    category: 'content',
    icon: Square,
    desc: 'Boîte avec titre, texte, image et bouton',
    hasChildren: false,
    defaultSettings: {
      title: 'Titre de la carte',
      text: 'Description de la carte pour présenter un contenu.',
      image: '',
      buttonText: 'Découvrir',
      buttonLink: '#',
      classes: 'shadow-sm',
      style: {}
    }
  },
  alert: {
    type: 'alert',
    label: 'Alerte',
    category: 'content',
    icon: AlertCircle,
    desc: 'Bannière de message d\'information ou d\'avertissement',
    hasChildren: false,
    defaultSettings: {
      content: 'Ceci est un bloc d\'alerte informative.',
      type: 'alert-info',
      classes: '',
      style: {}
    }
  },
  divider: {
    type: 'divider',
    label: 'Séparateur',
    category: 'content',
    icon: Minus,
    desc: 'Ligne de séparation élégante avec style personnalisable',
    hasChildren: false,
    defaultSettings: {
      styleType: 'solid',
      thickness: '1px',
      color: '#e2e8f0',
      margin: '2rem 0',
      hasIcon: false,
      icon: 'BookOpen',
      classes: '',
      style: {}
    }
  },
  list: {
    type: 'list',
    label: 'Liste à puces',
    category: 'content',
    icon: ListIcon,
    desc: 'Liste à puces ou numérotée configurable élément par élément',
    hasChildren: false,
    defaultSettings: {
      listType: 'unordered',
      items: [
        'Premier élément de la liste',
        'Deuxième élément avec des informations complémentaires',
        'Troisième élément'
      ],
      classes: '',
      style: {}
    }
  },

  // --- SECTIONS & MODULES MÉTIER DU SITE ---
  popularVideos: {
    type: 'popularVideos',
    label: 'Vidéos Populaires',
    category: 'sections',
    icon: PlayCircle,
    desc: 'Bloc de vidéos populaires avec gestion des vidéos et de l\'ordre',
    hasChildren: false,
    defaultSettings: {
      title: 'Vidéos Populaires',
      icon: 'PlayCircle',
      layout: 'list', // 'list' (pour sidebar) ou 'grid' (pour page centrale)
      videos: videosData.map(v => ({
        id: v.id,
        title: v.title,
        duration: v.duration,
        youtubeId: v.youtubeId || 'dQw4w9WgXcQ',
        description: v.description || ''
      })),
      classes: '',
      style: {}
    }
  },
  newsList: {
    type: 'newsList',
    label: 'Actualités 2026',
    category: 'sections',
    icon: Info,
    desc: 'Bloc d\'actualités avec gestion de la liste des nouvelles',
    hasChildren: false,
    defaultSettings: {
      title: 'Actualités 2026',
      icon: 'Info',
      news: [
        {
          id: 'news_1',
          title: 'Salon du Livre de Saumur',
          description: 'Retrouvez l\'équipe d\'Anjou Édition au stand C12 les 14 et 15 octobre 2026.'
        },
        {
          id: 'news_2',
          title: 'Nouvelle parution fables',
          description: 'Découvrez notre nouvelle édition papier des fables locales de Séraphin.'
        },
        {
          id: 'news_3',
          title: 'Mise à jour portail',
          description: 'Nouveau design épuré, lecteur audio de textes intégré et galerie interactive.'
        }
      ],
      classes: '',
      style: {}
    }
  },
  featuredPoems: {
    type: 'featuredPoems',
    label: 'Poésies & Fables Phares',
    category: 'sections',
    icon: Feather,
    desc: 'Cartes de poésies et fables mises en avant avec liens de lecture',
    hasChildren: false,
    defaultSettings: {
      title: 'Poésies et Fables Phares',
      poems: [
        {
          id: 'poem_1',
          tag: 'FABLE',
          title: 'Ma pomme',
          excerpt: '"Une belle pomme rouge, au sommet d\'un pommier, se prélassait au soleil du matin printanier..."',
          readMoreText: 'Lire la fable',
          category: 'Ma pomme'
        },
        {
          id: 'poem_2',
          tag: 'POÉSIE',
          title: 'Rappel d\'Anjou',
          excerpt: '"Doux pays de la Loire où mon enfance a fui, sous un ciel argenté que la brume caresse..."',
          readMoreText: 'Lire la poésie',
          category: 'RAPPEL'
        }
      ],
      classes: '',
      style: {}
    }
  },
  flipbookFeatured: {
    type: 'flipbookFeatured',
    label: 'Flipbooks Interactifs',
    category: 'sections',
    icon: BookOpen,
    desc: 'Lecteur ou sélection d\'ouvrages à feuilleter en ligne',
    hasChildren: false,
    defaultSettings: {
      title: 'À la une : Flipbooks Interactifs',
      mode: 'grid', // 'reader' pour lecteur PDF intégré ou 'grid' pour les cartes
      selectedBookId: flipbooksData[0]?.id || '4455',
      items: flipbooksData.map(fb => ({
        id: fb.id,
        title: fb.title,
        description: fb.description,
        pdfFile: fb.pdfFile || 'secrets_vignoble_angevin.pdf',
        buttonText: 'Feuilleter l\'ouvrage'
      })),
      classes: '',
      style: {}
    }
  },
  photoGallery: {
    type: 'photoGallery',
    label: 'Galerie Photos',
    category: 'sections',
    icon: ImageIcon,
    desc: 'Grille de photographies avec visionneuse HD',
    hasChildren: false,
    defaultSettings: {
      title: 'Galerie Photo d\'Anjou',
      subtitle: 'Cliquez sur une photographie pour l\'agrandir en haute définition.',
      columns: 4,
      layout: 'grid', // 'grid' ou 'sidebar'
      images: galleryImages.map(img => ({
        id: img.id,
        title: img.title,
        description: img.description,
        url: img.url
      })),
      classes: '',
      style: {}
    }
  },
  youtubeChannel: {
    type: 'youtubeChannel',
    label: 'Chaîne YouTube',
    category: 'sections',
    icon: YoutubeIcon,
    desc: 'Encart promotionnel pour les vidéos et conférences',
    hasChildren: false,
    defaultSettings: {
      title: 'Chaîne YouTube',
      subtitle: 'Conférence Anjou 2026 - Extrait',
      videoId: 'vid3',
      buttonText: 'Voir la conférence',
      classes: '',
      style: {}
    }
  },
  contactForm: {
    type: 'contactForm',
    label: 'Formulaire Contact',
    category: 'sections',
    icon: Mail,
    desc: 'Formulaire de contact sécurisé conforme au RGPD',
    hasChildren: false,
    defaultSettings: {
      title: 'Contactez-nous',
      subtitle: 'Une question, une remarque ou un projet littéraire ? Écrivez-nous directement.',
      showPrivacyNote: true,
      classes: '',
      style: {}
    }
  }
};

/**
 * Génère un bloc valide avec ses paramètres par défaut, styles étendus et drapeaux responsive.
 * 
 * @param {string} type - Type de bloc parmi BLOCK_DEFINITIONS
 * @param {object} customSettings - Paramètres personnalisés injectés
 * @returns {object} Bloc normalisé avec id unique, settings, et children optionnels
 */
export const createBlock = (type, customSettings = {}) => {
  const definition = BLOCK_DEFINITIONS[type] || BLOCK_DEFINITIONS.text;
  const id = `${type}_${Math.random().toString(36).substr(2, 9)}`;
  const defaultSettings = JSON.parse(JSON.stringify(definition.defaultSettings || {}));

  // Extraction et fusion propre des styles d'apparence (deep merge)
  const mergedStyle = {
    ...(defaultSettings.style || {}),
    ...((customSettings && typeof customSettings.style === 'object') ? customSettings.style : {})
  };

  // Résolution des drapeaux responsive et de visibilité
  const hideOnMobile = typeof customSettings?.hideOnMobile === 'boolean'
    ? customSettings.hideOnMobile
    : (typeof defaultSettings?.hideOnMobile === 'boolean' ? defaultSettings.hideOnMobile : false);

  const hideOnTablet = typeof customSettings?.hideOnTablet === 'boolean'
    ? customSettings.hideOnTablet
    : (typeof defaultSettings?.hideOnTablet === 'boolean' ? defaultSettings.hideOnTablet : false);

  const hideOnDesktop = typeof customSettings?.hideOnDesktop === 'boolean'
    ? customSettings.hideOnDesktop
    : (typeof defaultSettings?.hideOnDesktop === 'boolean' ? defaultSettings.hideOnDesktop : false);

  const isHidden = typeof customSettings?.hidden === 'boolean'
    ? customSettings.hidden
    : (typeof defaultSettings?.hidden === 'boolean' ? defaultSettings.hidden : false);

  const settings = {
    ...defaultSettings,
    ...customSettings,
    hideOnMobile,
    hideOnTablet,
    hideOnDesktop,
    hidden: isHidden,
    style: mergedStyle
  };

  return {
    id,
    type,
    hidden: isHidden,
    settings,
    children: definition.hasChildren ? (Array.isArray(customSettings?.children) ? customSettings.children : []) : undefined
  };
};

/**
 * Normalise récursivement un arbre de blocs pour garantir son intégrité,
 * hydrater les styles étendus manquants et initialiser les drapeaux responsive.
 * 
 * @param {Array} blocksList - Tableau de blocs bruts (Firestore, localStorage, ou importés)
 * @returns {Array} Tableau de blocs normalisés et sécurisés
 */
export const normalizeBlocks = (blocksList) => {
  if (!Array.isArray(blocksList)) return [];

  return blocksList.map((block) => {
    if (!block || typeof block !== 'object') return null;

    const rawType = block.type || 'text';
    const type = BLOCK_DEFINITIONS[rawType] ? rawType : 'text';
    const definition = BLOCK_DEFINITIONS[type];
    const id = block.id || `${type}_${Math.random().toString(36).substr(2, 9)}`;
    const defaultSettings = JSON.parse(JSON.stringify(definition.defaultSettings || {}));
    const rawSettings = (block.settings && typeof block.settings === 'object') ? block.settings : {};

    // 1. Fusion récursive des styles d'apparence
    const defaultStyle = (defaultSettings.style && typeof defaultSettings.style === 'object') ? defaultSettings.style : {};
    const rawStyle = (rawSettings.style && typeof rawSettings.style === 'object') ? rawSettings.style : {};
    const mergedStyle = {
      ...defaultStyle,
      ...rawStyle
    };

    // 2. Normalisation des drapeaux responsive et visibilité
    const hideOnMobile = typeof rawSettings.hideOnMobile === 'boolean' ? rawSettings.hideOnMobile : false;
    const hideOnTablet = typeof rawSettings.hideOnTablet === 'boolean' ? rawSettings.hideOnTablet : false;
    const hideOnDesktop = typeof rawSettings.hideOnDesktop === 'boolean' ? rawSettings.hideOnDesktop : false;
    const isHidden = Boolean(rawSettings.hidden ?? block.hidden ?? false);

    // 3. Assemblage des paramètres normalisés
    const settings = {
      ...defaultSettings,
      ...rawSettings,
      hideOnMobile,
      hideOnTablet,
      hideOnDesktop,
      hidden: isHidden,
      style: mergedStyle
    };

    // 4. Rétrocompatibilité et préservation intégrale des blocs vidéo
    if (type === 'video') {
      const rawUrl = rawSettings.url || rawSettings.src || settings.url || '';
      const extractedId = extractYoutubeVideoId(rawUrl);
      const rawId = rawSettings.videoId || settings.videoId || extractedId;
      
      if (rawUrl) {
        settings.url = rawUrl;
      } else if (rawId) {
        settings.url = `https://www.youtube.com/watch?v=${rawId}`;
      }
      
      if (rawId) {
        settings.videoId = rawId;
      }
    }

    // 5. Rétrocompatibilité et purge définitive des anciens flipbooks
    if (type === 'flipbookFeatured') {
      if (Array.isArray(settings.items)) {
        settings.items = settings.items.filter(it => 
          it && it.id !== '3322' && 
          !(it.title || '').toLowerCase().includes('guide historique') &&
          !(it.pdfFile || '').toLowerCase().includes('guide_historique')
        );
      }
      if (settings.selectedBookId === '3322' || !settings.selectedBookId) {
        settings.selectedBookId = flipbooksData[0]?.id || '4455';
      }
    }

    const normalized = {
      id,
      type,
      hidden: isHidden,
      settings
    };

    if (definition.hasChildren || Array.isArray(block.children)) {
      normalized.children = normalizeBlocks(block.children || []);
    }

    return normalized;
  }).filter(Boolean);
};

/**
 * Clone profondément un bloc et tous ses descendants en leur attribuant de nouveaux identifiants uniques,
 * tout en dupliquant fidèlement l'ensemble des styles étendus, drapeaux responsive et réglages métiers.
 * 
 * @param {object} block - Bloc source à dupliquer
 * @returns {object|null} Bloc dupliqué autonome ou null
 */
export const cloneBlock = (block) => {
  if (!block || typeof block !== 'object') return null;

  const newType = block.type || 'text';
  const newId = `${newType}_${Math.random().toString(36).substr(2, 9)}`;

  // Clonage en profondeur complet pour isoler toutes les références d'objets (style, settings, tableaux)
  const clonedData = JSON.parse(JSON.stringify(block));

  const rawSettings = (clonedData.settings && typeof clonedData.settings === 'object') ? clonedData.settings : {};
  const rawStyle = (rawSettings.style && typeof rawSettings.style === 'object') ? rawSettings.style : {};

  const clonedSettings = {
    ...rawSettings,
    style: { ...rawStyle },
    hideOnMobile: typeof rawSettings.hideOnMobile === 'boolean' ? rawSettings.hideOnMobile : false,
    hideOnTablet: typeof rawSettings.hideOnTablet === 'boolean' ? rawSettings.hideOnTablet : false,
    hideOnDesktop: typeof rawSettings.hideOnDesktop === 'boolean' ? rawSettings.hideOnDesktop : false,
    hidden: Boolean(rawSettings.hidden ?? block.hidden ?? false)
  };

  const cloned = {
    ...clonedData,
    id: newId,
    hidden: clonedSettings.hidden,
    settings: clonedSettings
  };

  if (Array.isArray(cloned.children)) {
    cloned.children = cloned.children.map(child => cloneBlock(child)).filter(Boolean);
  }

  return cloned;
};

/**
 * Génère la structure complète de blocs pour la page d'accueil par défaut.
 * Centrée sur Anjou Édition (maison d'édition & plateforme de publication).
 * Aucun contenu historique régional n'est inventé ou injecté automatiquement.
 */
export const getDefaultHomepageBlocks = () => {
  return [];
};

