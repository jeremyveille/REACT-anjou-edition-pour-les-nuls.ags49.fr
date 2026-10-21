/**
 * Modèles de Sections Structurelles Neutres pour le Constructeur de Page d'Anjou Édition.
 *
 * RÈGLE FONDAMENTALE D'IDENTITÉ :
 * Le nom « Anjou Édition » ne signifie en aucun cas que le site est consacré à l'histoire de l'Anjou,
 * à son terroir ou à son patrimoine historique.
 * AUCUN contenu historique, touristique ou patrimonial n'est auto-généré ici.
 * Tous les modèles ci-dessous sont 100% neutres, structuraux et orientés vers l'édition littéraire
 * et la publication d'écrits contemporains.
 */

import {
  Layout,
  Columns,
  Grid,
  PlaySquare,
  Feather,
  Info
} from 'lucide-react';

/**
 * Catégories de modèles disponibles pour l'interface de sélection (BuilderSidebar).
 */
export const SECTION_TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'Tous les modèles' },
  { id: 'hero', label: 'En-têtes & Hero' },
  { id: 'content', label: 'Contenus & Médias' },
  { id: 'grid', label: 'Grilles & Cartes' },
  { id: 'call-to-action', label: 'Appels à l\'Action' },
  { id: 'editorial', label: 'Citations & Éditorial' },
  { id: 'faq', label: 'FAQ & Informations' }
];

/**
 * Bibliothèque des 6 modèles structurels neutres prédéfinis.
 */
export const SECTION_TEMPLATES = [
  // 1. En-tête Hero & Introduction Centrée
  {
    id: 'hero_centered',
    aliases: ['hero-intro', 'hero-centered'],
    name: 'En-tête Hero & Accroche Centrée',
    description: 'Bannière d\'ouverture épurée avec grand titre, paragraphe introductif et bouton d\'action principal centré.',
    icon: 'Layout',
    iconComponent: Layout,
    category: 'hero',
    blocks: [
      {
        id: 'tmpl_hero_sec',
        type: 'section',
        settings: {
          classes: 'py-5 text-center',
          backgroundImage: '',
          style: {
            backgroundColor: '#f8fafc',
            paddingTop: '4rem',
            paddingBottom: '4rem',
            color: '#0f172a'
          }
        },
        children: [
          {
            id: 'tmpl_hero_con',
            type: 'container',
            settings: {
              fluid: false,
              classes: '',
              style: {}
            },
            children: [
              {
                id: 'tmpl_hero_row',
                type: 'row',
                settings: {
                  classes: 'justify-content-center',
                  style: {}
                },
                children: [
                  {
                    id: 'tmpl_hero_col',
                    type: 'column',
                    settings: {
                      sizeClasses: 'col-lg-8 col-md-10 col-12',
                      classes: 'mx-auto',
                      style: {}
                    },
                    children: [
                      {
                        id: 'tmpl_hero_h1',
                        type: 'heading',
                        settings: {
                          level: 'h1',
                          content: 'Titre Principal de la Publication',
                          alignment: 'center',
                          classes: 'mb-3 fw-bold',
                          style: { color: '#1e3a8a' }
                        }
                      },
                      {
                        id: 'tmpl_hero_txt',
                        type: 'text',
                        settings: {
                          content: '<p class="lead">Présentez ici la thématique de votre ouvrage, une courte note d\'intention de l\'auteur ou les grandes lignes de cette publication inédite.</p>',
                          alignment: 'center',
                          classes: 'mb-4',
                          style: { color: '#475569' }
                        }
                      },
                      {
                        id: 'tmpl_hero_btn',
                        type: 'button',
                        settings: {
                          text: 'Découvrir la parution',
                          link: '#decouvrir',
                          buttonStyle: 'btn-primary',
                          size: 'btn-lg',
                          newTab: false,
                          classes: 'px-4 py-2',
                          style: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' }
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },

  // 2. Section 2 Colonnes — Texte & Média côte à côte
  {
    id: 'two_columns_media',
    aliases: ['two-columns-media'],
    name: 'Section 2 Colonnes — Texte & Média',
    description: 'Disposition équilibrée 50/50 présentant un argumentaire éditorial avec bouton à gauche et une illustration à droite.',
    icon: 'Columns',
    iconComponent: Columns,
    category: 'content',
    blocks: [
      {
        id: 'tmpl_2col_sec',
        type: 'section',
        settings: {
          classes: 'py-5',
          backgroundImage: '',
          style: {
            backgroundColor: '#ffffff',
            paddingTop: '3rem',
            paddingBottom: '3rem'
          }
        },
        children: [
          {
            id: 'tmpl_2col_con',
            type: 'container',
            settings: {
              fluid: false,
              classes: '',
              style: {}
            },
            children: [
              {
                id: 'tmpl_2col_row',
                type: 'row',
                settings: {
                  classes: 'align-items-center g-4',
                  style: {}
                },
                children: [
                  {
                    id: 'tmpl_2col_col_left',
                    type: 'column',
                    settings: {
                      sizeClasses: 'col-md-6 col-12',
                      classes: '',
                      style: {}
                    },
                    children: [
                      {
                        id: 'tmpl_2col_h2',
                        type: 'heading',
                        settings: {
                          level: 'h2',
                          content: 'À propos de cette création',
                          alignment: 'left',
                          classes: 'mb-3',
                          style: { color: '#0f2b5c' }
                        }
                      },
                      {
                        id: 'tmpl_2col_txt',
                        type: 'text',
                        settings: {
                          content: '<p>Développez ici le propos littéraire, la genèse de l\'œuvre ou le contexte d\'écriture. Ce paragraphe permet d\'offrir au lecteur une mise en contexte soignée et immersive avant la lecture.</p><p>Ajoutez des détails sur la mise en page, les inspirations ou les formats disponibles en feuilletage numérique interactif.</p>',
                          alignment: 'left',
                          classes: 'mb-4',
                          style: { color: '#334155' }
                        }
                      },
                      {
                        id: 'tmpl_2col_btn',
                        type: 'button',
                        settings: {
                          text: 'Feuilleter l\'extrait',
                          link: '#feuilleter',
                          buttonStyle: 'btn-outline-primary',
                          size: '',
                          newTab: false,
                          classes: '',
                          style: {}
                        }
                      }
                    ]
                  },
                  {
                    id: 'tmpl_2col_col_right',
                    type: 'column',
                    settings: {
                      sizeClasses: 'col-md-6 col-12',
                      classes: 'text-center',
                      style: {}
                    },
                    children: [
                      {
                        id: 'tmpl_2col_img',
                        type: 'image',
                        settings: {
                          src: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800',
                          alt: 'Couverture de l\'ouvrage ou illustration éditoriale',
                          caption: 'Édition originale — Format numérique interactif',
                          link: '',
                          classes: 'img-fluid rounded shadow',
                          style: { maxHeight: '420px', objectFit: 'cover', width: '100%' }
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },

  // 3. Grille de 3 Cartes Thématiques
  {
    id: 'three_cards_grid',
    aliases: ['three-cards-grid'],
    name: 'Grille de 3 Cartes Thématiques',
    description: 'Mise en page en 3 colonnes pour présenter une sélection d\'écrits, de collections ou de thématiques littéraires.',
    icon: 'Grid',
    iconComponent: Grid,
    category: 'grid',
    blocks: [
      {
        id: 'tmpl_3cards_sec',
        type: 'section',
        settings: {
          classes: 'py-5',
          backgroundImage: '',
          style: {
            backgroundColor: '#fdfbf7', // Crème Papier Vélin
            paddingTop: '3.5rem',
            paddingBottom: '3.5rem'
          }
        },
        children: [
          {
            id: 'tmpl_3cards_con',
            type: 'container',
            settings: {
              fluid: false,
              classes: '',
              style: {}
            },
            children: [
              {
                id: 'tmpl_3cards_row_hdr',
                type: 'row',
                settings: {
                  classes: 'text-center mb-4',
                  style: {}
                },
                children: [
                  {
                    id: 'tmpl_3cards_col_hdr',
                    type: 'column',
                    settings: {
                      sizeClasses: 'col-12',
                      classes: '',
                      style: {}
                    },
                    children: [
                      {
                        id: 'tmpl_3cards_h2',
                        type: 'heading',
                        settings: {
                          level: 'h2',
                          content: 'Thématiques & Collections',
                          alignment: 'center',
                          classes: 'mb-2',
                          style: { color: '#0f2b5c' }
                        }
                      },
                      {
                        id: 'tmpl_3cards_txt_hdr',
                        type: 'text',
                        settings: {
                          content: '<p class="text-muted">Explorez nos différents genres d\'écrits et créations littéraires inédites.</p>',
                          alignment: 'center',
                          classes: 'mb-4',
                          style: { color: '#64748b' }
                        }
                      }
                    ]
                  }
                ]
              },
              {
                id: 'tmpl_3cards_row_grid',
                type: 'row',
                settings: {
                  classes: 'g-4',
                  style: {}
                },
                children: [
                  {
                    id: 'tmpl_3cards_col_1',
                    type: 'column',
                    settings: {
                      sizeClasses: 'col-md-4 col-12',
                      classes: '',
                      style: {}
                    },
                    children: [
                      {
                        id: 'tmpl_3cards_c1',
                        type: 'card',
                        settings: {
                          title: 'Poésies & Fables',
                          text: 'Découvrez des compositions poétiques et récits versifiés rédigés par nos auteurs contributeurs.',
                          image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600',
                          buttonText: 'Consulter la sélection',
                          buttonLink: '#poesies',
                          classes: 'h-100 shadow-sm border-0',
                          style: { borderRadius: '12px' }
                        }
                      }
                    ]
                  },
                  {
                    id: 'tmpl_3cards_col_2',
                    type: 'column',
                    settings: {
                      sizeClasses: 'col-md-4 col-12',
                      classes: '',
                      style: {}
                    },
                    children: [
                      {
                        id: 'tmpl_3cards_c2',
                        type: 'card',
                        settings: {
                          title: 'Flipbooks Interactifs',
                          text: 'Feuilletez des ouvrages complets avec synthèse vocale intégrée et affichage en double-page.',
                          image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600',
                          buttonText: 'Feuilleter en ligne',
                          buttonLink: '#flipbooks',
                          classes: 'h-100 shadow-sm border-0',
                          style: { borderRadius: '12px' }
                        }
                      }
                    ]
                  },
                  {
                    id: 'tmpl_3cards_col_3',
                    type: 'column',
                    settings: {
                      sizeClasses: 'col-md-4 col-12',
                      classes: '',
                      style: {}
                    },
                    children: [
                      {
                        id: 'tmpl_3cards_c3',
                        type: 'card',
                        settings: {
                          title: 'Actualités & Rencontres',
                          text: 'Suivez le calendrier des parutions, des séances de dédicaces et des événements éditoriaux.',
                          image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600',
                          buttonText: 'Lire les actualités',
                          buttonLink: '#actualites',
                          classes: 'h-100 shadow-sm border-0',
                          style: { borderRadius: '12px' }
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },

  // 4. Appel à l'Action Centré / Bannière CTA
  {
    id: 'cta_banner',
    aliases: ['cta-centered', 'cta-banner'],
    name: 'Bannière d\'Appel à l\'Action (CTA)',
    description: 'Bandeau contrasté avec fond bleu institutionnel invitant le visiteur à soumettre un manuscrit ou contacter la rédaction.',
    icon: 'PlaySquare',
    iconComponent: PlaySquare,
    category: 'call-to-action',
    blocks: [
      {
        id: 'tmpl_cta_sec',
        type: 'section',
        settings: {
          classes: 'py-5 my-3',
          backgroundImage: '',
          style: {
            backgroundColor: '#1e3a8a', // Bleu Royal
            color: '#ffffff',
            paddingTop: '3.5rem',
            paddingBottom: '3.5rem',
            borderRadius: '16px'
          }
        },
        children: [
          {
            id: 'tmpl_cta_con',
            type: 'container',
            settings: {
              fluid: false,
              classes: '',
              style: {}
            },
            children: [
              {
                id: 'tmpl_cta_row',
                type: 'row',
                settings: {
                  classes: 'justify-content-center text-center',
                  style: {}
                },
                children: [
                  {
                    id: 'tmpl_cta_col',
                    type: 'column',
                    settings: {
                      sizeClasses: 'col-lg-8 col-md-10 col-12',
                      classes: 'mx-auto',
                      style: {}
                    },
                    children: [
                      {
                        id: 'tmpl_cta_h2',
                        type: 'heading',
                        settings: {
                          level: 'h2',
                          content: 'Vous écrivez ? Partagez vos créations inédites',
                          alignment: 'center',
                          classes: 'mb-3 text-white fw-bold',
                          style: { color: '#ffffff' }
                        }
                      },
                      {
                        id: 'tmpl_cta_txt',
                        type: 'text',
                        settings: {
                          content: '<p class="text-white-50 lead mb-4">Notre comité éditorial étudie avec soin tout projet littéraire, recueil de poésie ou conte proposé par nos membres.</p>',
                          alignment: 'center',
                          classes: 'mb-4',
                          style: { color: '#e0f2fe' }
                        }
                      },
                      {
                        id: 'tmpl_cta_btn',
                        type: 'button',
                        settings: {
                          text: 'Soumettre un manuscrit',
                          link: '#contact',
                          buttonStyle: 'btn-light',
                          size: 'btn-lg',
                          newTab: false,
                          classes: 'fw-semibold shadow',
                          style: { color: '#1e3a8a', backgroundColor: '#ffffff' }
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },

  // 5. Citation Littéraire & Séparateur Stylisé
  {
    id: 'literary_quote',
    aliases: ['quote-divider', 'literary-quote'],
    name: 'Citation Littéraire & Séparateur Stylisé',
    description: 'Mise en exergue élégante d\'un extrait textuel encadré de séparateurs décoratifs dorés et d\'une signature d\'auteur.',
    icon: 'Feather',
    iconComponent: Feather,
    category: 'editorial',
    blocks: [
      {
        id: 'tmpl_quote_sec',
        type: 'section',
        settings: {
          classes: 'py-4',
          backgroundImage: '',
          style: {
            backgroundColor: '#ffffff',
            paddingTop: '2.5rem',
            paddingBottom: '2.5rem'
          }
        },
        children: [
          {
            id: 'tmpl_quote_con',
            type: 'container',
            settings: {
              fluid: false,
              classes: '',
              style: {}
            },
            children: [
              {
                id: 'tmpl_quote_row',
                type: 'row',
                settings: {
                  classes: 'justify-content-center',
                  style: {}
                },
                children: [
                  {
                    id: 'tmpl_quote_col',
                    type: 'column',
                    settings: {
                      sizeClasses: 'col-lg-8 col-md-10 col-12 text-center',
                      classes: 'mx-auto',
                      style: {}
                    },
                    children: [
                      {
                        id: 'tmpl_quote_div1',
                        type: 'divider',
                        settings: {
                          styleType: 'solid',
                          thickness: '2px',
                          color: '#d97706', // Or Chaud
                          margin: '1.5rem auto',
                          hasIcon: true,
                          icon: 'Feather',
                          classes: '',
                          style: {}
                        }
                      },
                      {
                        id: 'tmpl_quote_txt',
                        type: 'text',
                        settings: {
                          content: '<blockquote class="blockquote my-3"><p class="fst-italic fs-4" style="color: #1e293b;">« La lecture est une porte ouverte sur un monde enchanté, où chaque page tournée dévoile la promesse d\'une découverte. »</p><footer class="blockquote-footer mt-2" style="color: #64748b;">Signature de l\'auteur, <cite title="Titre du recueil">Extrait de l\'œuvre</cite></footer></blockquote>',
                          alignment: 'center',
                          classes: 'px-3',
                          style: { color: '#1e293b' }
                        }
                      },
                      {
                        id: 'tmpl_quote_div2',
                        type: 'divider',
                        settings: {
                          styleType: 'solid',
                          thickness: '1px',
                          color: '#e2e8f0',
                          margin: '1.5rem auto',
                          hasIcon: false,
                          icon: 'BookOpen',
                          classes: '',
                          style: {}
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },

  // 6. Foire Aux Questions & Informations Pratiques
  {
    id: 'faq_section',
    aliases: ['faq-accordion', 'faq-section'],
    name: 'Foire Aux Questions & Informations Pratiques',
    description: 'Structure organisée comprenant une bannière d\'information et une liste d\'éléments explicatifs avec coches de validation.',
    icon: 'Info',
    iconComponent: Info,
    category: 'faq',
    blocks: [
      {
        id: 'tmpl_faq_sec',
        type: 'section',
        settings: {
          classes: 'py-5',
          backgroundImage: '',
          style: {
            backgroundColor: '#f8fafc',
            paddingTop: '3rem',
            paddingBottom: '3rem'
          }
        },
        children: [
          {
            id: 'tmpl_faq_con',
            type: 'container',
            settings: {
              fluid: false,
              classes: '',
              style: {}
            },
            children: [
              {
                id: 'tmpl_faq_row',
                type: 'row',
                settings: {
                  classes: 'justify-content-center',
                  style: {}
                },
                children: [
                  {
                    id: 'tmpl_faq_col',
                    type: 'column',
                    settings: {
                      sizeClasses: 'col-lg-8 col-12',
                      classes: 'mx-auto',
                      style: {}
                    },
                    children: [
                      {
                        id: 'tmpl_faq_h2',
                        type: 'heading',
                        settings: {
                          level: 'h2',
                          content: 'Questions Fréquentes & Modalités',
                          alignment: 'left',
                          classes: 'mb-3',
                          style: { color: '#0f2b5c' }
                        }
                      },
                      {
                        id: 'tmpl_faq_alert',
                        type: 'alert',
                        settings: {
                          type: 'alert-info',
                          content: 'Les textes et flipbooks proposés sur la plateforme sont accessibles gratuitement en lecture intégrale pour tous nos lecteurs.',
                          classes: 'mb-4 shadow-sm',
                          style: {}
                        }
                      },
                      {
                        id: 'tmpl_faq_list',
                        type: 'list',
                        settings: {
                          listType: 'check',
                          items: [
                            'Comment accéder au lecteur de flipbook sur tablette ou smartphone ?',
                            'Puis-je activer la synthèse vocale pour écouter la lecture d\'un texte ?',
                            'Quels sont les délais d\'examen pour la proposition d\'un nouveau manuscrit ?',
                            'Comment signaler une coquille ou suggérer une amélioration éditoriale ?'
                          ],
                          classes: 'mb-3',
                          style: { color: '#334155' }
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

/**
 * Fonction interne de clonage récursif d'un bloc avec attribution de nouveaux identifiants uniques.
 * Évite toute dépendance circulaire et garantit une autonomie totale du module.
 *
 * @param {Object} block - Bloc source à cloner
 * @returns {Object|null} Bloc cloné avec nouvel ID et enfants récursivement clonés
 */
export const internalCloneBlock = (block) => {
  if (!block || typeof block !== 'object') return null;
  const newType = block.type || 'text';
  const newId = `${newType}_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;

  const cloned = {
    ...JSON.parse(JSON.stringify(block)),
    id: newId
  };

  if (Array.isArray(cloned.children)) {
    cloned.children = cloned.children.map(child => internalCloneBlock(child)).filter(Boolean);
  }

  return cloned;
};

/**
 * Récupère la définition d'un modèle par son identifiant ou un de ses alias.
 *
 * @param {string} templateId - Identifiant unique ou alias du modèle
 * @returns {Object|null} Modèle trouvé ou null
 */
export const getSectionTemplateById = (templateId) => {
  if (!templateId || typeof templateId !== 'string') return null;
  const normalizedId = templateId.trim();
  return (
    SECTION_TEMPLATES.find(
      t => t.id === normalizedId || (Array.isArray(t.aliases) && t.aliases.includes(normalizedId))
    ) || null
  );
};

/**
 * Instancie un modèle de section en clonant en profondeur tous ses blocs
 * et en régénérant des identifiants uniques pour chaque bloc et descendant.
 *
 * @param {string} templateId - Identifiant unique ou alias du modèle (ex: 'hero_centered' ou 'hero-intro')
 * @param {Function} [cloneFn] - Fonction optionnelle de clonage personnalisé (ex: cloneBlock de blockRegistry)
 * @returns {Array<Object>} Tableau de blocs clonés prêts à être injectés dans la page (ou [] si introuvable)
 */
export const instantiateSectionTemplate = (templateId, cloneFn = null) => {
  if (!templateId) return [];

  const template = getSectionTemplateById(templateId);
  if (!template || !Array.isArray(template.blocks)) {
    console.warn(`[sectionTemplates] Modèle introuvable ou invalide : "${templateId}"`);
    return [];
  }

  const effectiveClone = typeof cloneFn === 'function' ? cloneFn : internalCloneBlock;
  return template.blocks.map(block => effectiveClone(block)).filter(Boolean);
};

/**
 * Récupère la liste des modèles filtrés par catégorie.
 *
 * @param {string} [category='all'] - Identifiant de la catégorie ou 'all'
 * @returns {Array<Object>} Modèles correspondants
 */
export const getSectionTemplatesByCategory = (category = 'all') => {
  if (!category || category === 'all') {
    return SECTION_TEMPLATES;
  }
  return SECTION_TEMPLATES.filter(t => t.category === category);
};
