export const WIDGET_CATEGORIES = {
  LAYOUT:     'Mise en page',
  CONTENT:    'Contenu',
  COMPONENTS: 'Composants',
};

export const widgets = [
  // ─── Mise en page ─────────────────────────────────────────────
  {
    type: 'section',
    label: 'Section vide',
    description: 'Bloc de section pleine largeur avec colonnes',
    category: WIDGET_CATEGORIES.LAYOUT,
    icon: 'Layout',
  },
  {
    type: 'hero',
    label: 'Section Hero',
    description: 'Bandeau d\'accueil avec titre, texte et bouton',
    category: WIDGET_CATEGORIES.LAYOUT,
    icon: 'Layers',
  },
  {
    type: 'row-1',
    label: 'Grille 1 colonne',
    description: 'Une ligne à pleine largeur (100%)',
    category: WIDGET_CATEGORIES.LAYOUT,
    icon: 'Square',
  },
  {
    type: 'row-2',
    label: 'Grille 2 colonnes',
    description: 'Deux colonnes égales côte à côte (50%|50%)',
    category: WIDGET_CATEGORIES.LAYOUT,
    icon: 'Columns',
  },
  {
    type: 'row-3',
    label: 'Grille 3 colonnes',
    description: 'Trois colonnes égales (33%|33%|33%)',
    category: WIDGET_CATEGORIES.LAYOUT,
    icon: 'LayoutGrid',
  },
  {
    type: 'spacer',
    label: 'Espacement',
    description: 'Espace vertical réglable entre les blocs',
    category: WIDGET_CATEGORIES.LAYOUT,
    icon: 'ArrowUpDown',
  },
  {
    type: 'separator',
    label: 'Séparateur',
    description: 'Ligne horizontale décorative',
    category: WIDGET_CATEGORIES.LAYOUT,
    icon: 'Minus',
  },

  // ─── Contenu ──────────────────────────────────────────────────
  {
    type: 'text',
    label: 'Texte',
    description: 'Paragraphe ou titre éditable directement',
    category: WIDGET_CATEGORIES.CONTENT,
    icon: 'Type',
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Image avec URL, alt et dimensions',
    category: WIDGET_CATEGORIES.CONTENT,
    icon: 'Image',
  },
  {
    type: 'button',
    label: 'Bouton',
    description: 'Bouton d\'action avec lien et style',
    category: WIDGET_CATEGORIES.CONTENT,
    icon: 'MousePointer',
  },
  {
    type: 'video',
    label: 'Vidéo',
    description: 'Intégration YouTube ou Vimeo',
    category: WIDGET_CATEGORIES.CONTENT,
    icon: 'Video',
  },
  {
    type: 'icon',
    label: 'Icône',
    description: 'Icône Lucide personnalisable',
    category: WIDGET_CATEGORIES.CONTENT,
    icon: 'Smile',
  },

  // ─── Composants ───────────────────────────────────────────────
  {
    type: 'card',
    label: 'Carte',
    description: 'Boîte avec image, titre, texte et bouton',
    category: WIDGET_CATEGORIES.COMPONENTS,
    icon: 'CreditCard',
  },
  {
    type: 'alert',
    label: 'Alerte',
    description: 'Message coloré d\'information ou d\'avertissement',
    category: WIDGET_CATEGORIES.COMPONENTS,
    icon: 'AlertTriangle',
  },
  {
    type: 'testimonial',
    label: 'Témoignage',
    description: 'Citation client avec auteur et étoiles',
    category: WIDGET_CATEGORIES.COMPONENTS,
    icon: 'Quote',
  },
  {
    type: 'cta',
    label: 'Appel à l\'action',
    description: 'Bloc CTA avec titre, texte et bouton centré',
    category: WIDGET_CATEGORIES.COMPONENTS,
    icon: 'Megaphone',
  },
];
