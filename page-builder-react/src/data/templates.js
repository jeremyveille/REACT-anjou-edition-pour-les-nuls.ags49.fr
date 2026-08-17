

/**
 * Pre-built page templates.
 * Each template is a function returning a fresh element tree (with new IDs).
 */

function id(prefix = 'el') {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

export const TEMPLATES = [
  {
    id: 'blank',
    name: 'Page vierge',
    description: 'Un canvas vide pour démarrer de zéro.',
    category: 'Démarrage',
    preview: '⬜',
    build: () => [],
  },

  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Hero accrocheur + 3 features + appel à l\'action.',
    category: 'Business',
    preview: '🚀',
    build: () => {
      const heroId = id('hero');
      const featSectionId = id('section');
      const featRowId = id('row');
      const col1 = id('col'), col2 = id('col'), col3 = id('col');
      const card1 = id('card'), card2 = id('card'), card3 = id('card');
      const ctaId = id('cta');

      return [
        {
          id: heroId,
          type: 'hero',
          settings: {
            title: 'Créez votre page en quelques clics',
            subtitle: 'Notre solution no-code vous permet de concevoir des pages professionnelles sans écrire une seule ligne de code.',
            buttonText: 'Commencer gratuitement',
            buttonHref: '#features',
            buttonVariant: 'btn-light',
            backgroundColor: '#1e293b',
            textColor: '#ffffff',
            minHeight: '520px',
            textAlign: 'text-center',
            overlayOpacity: 0,
            backgroundImage: '',
          },
          children: [],
        },
        {
          id: featSectionId,
          type: 'section',
          settings: { backgroundColor: '#f8f9fb', padding: 'py-5', margin: 'mb-0', container: true, className: '', minHeight: '', backgroundImage: '' },
          children: [
            {
              id: featRowId,
              type: 'row',
              settings: { columns: 3, gap: 'g-4', alignItems: 'align-items-start', justifyContent: 'justify-content-center' },
              children: [
                {
                  id: col1, type: 'column',
                  settings: { className: 'col-md-4', backgroundColor: '', padding: '', margin: '' },
                  children: [{
                    id: card1, type: 'card',
                    settings: {
                      title: '⚡ Rapide à prendre en main',
                      text: 'Glissez, déposez, configurez. Pas besoin de formation, vous êtes opérationnel en 5 minutes.',
                      imageSrc: '',
                      buttonText: 'En savoir plus',
                      buttonHref: '#',
                      variant: 'btn-outline-primary',
                      className: 'shadow-sm border-0 h-100 text-center',
                      margin: 'mb-0',
                    },
                    children: [],
                  }],
                },
                {
                  id: col2, type: 'column',
                  settings: { className: 'col-md-4', backgroundColor: '', padding: '', margin: '' },
                  children: [{
                    id: card2, type: 'card',
                    settings: {
                      title: '🎨 Design moderne',
                      text: 'Des blocs visuellement soignés, une typographie propre, un rendu Bootstrap 5 compatible.',
                      imageSrc: '',
                      buttonText: 'Voir les blocs',
                      buttonHref: '#',
                      variant: 'btn-outline-primary',
                      className: 'shadow-sm border-0 h-100 text-center',
                      margin: 'mb-0',
                    },
                    children: [],
                  }],
                },
                {
                  id: col3, type: 'column',
                  settings: { className: 'col-md-4', backgroundColor: '', padding: '', margin: '' },
                  children: [{
                    id: card3, type: 'card',
                    settings: {
                      title: '💾 Sauvegarde auto',
                      text: 'Votre travail est enregistré automatiquement. Exportez en HTML propre à tout moment.',
                      imageSrc: '',
                      buttonText: 'Exporter',
                      buttonHref: '#',
                      variant: 'btn-outline-primary',
                      className: 'shadow-sm border-0 h-100 text-center',
                      margin: 'mb-0',
                    },
                    children: [],
                  }],
                },
              ],
            },
          ],
        },
        {
          id: ctaId,
          type: 'cta',
          settings: {
            title: 'Prêt à créer votre première page ?',
            subtitle: 'Rejoignez des milliers d\'utilisateurs satisfaits et lancez-vous dès aujourd\'hui.',
            buttonText: 'Démarrer maintenant →',
            buttonHref: '#',
            buttonVariant: 'btn-light',
            backgroundColor: '#3b6ef8',
            textColor: '#ffffff',
            padding: 'py-5',
            margin: 'mb-0',
            className: '',
          },
          children: [],
        },
      ];
    },
  },

  {
    id: 'about',
    name: 'Page À propos',
    description: 'Présentation d\'équipe avec photo, texte et témoignages.',
    category: 'Business',
    preview: '👥',
    build: () => {
      const heroId = id('hero');
      const s1 = id('section'), r1 = id('row'), c1a = id('col'), c1b = id('col');
      const img1 = id('img'), t1 = id('text'), t2 = id('text'), t3 = id('text');
      const sepId = id('sep');
      const s2 = id('section'), r2 = id('row');
      const tc1 = id('col'), tc2 = id('col'), tc3 = id('col');
      const tm1 = id('testimonial'), tm2 = id('testimonial'), tm3 = id('testimonial');

      return [
        {
          id: heroId, type: 'hero',
          settings: {
            title: 'À propos de nous',
            subtitle: 'Découvrez notre histoire, nos valeurs et l\'équipe passionnée qui se cache derrière ce projet.',
            buttonText: '',
            buttonHref: '',
            buttonVariant: 'btn-primary',
            backgroundColor: '#0f172a',
            textColor: '#ffffff',
            minHeight: '340px',
            textAlign: 'text-center',
            overlayOpacity: 0,
            backgroundImage: '',
          },
          children: [],
        },
        {
          id: s1, type: 'section',
          settings: { backgroundColor: '#ffffff', padding: 'py-5', margin: 'mb-0', container: true, className: '', minHeight: '', backgroundImage: '' },
          children: [{
            id: r1, type: 'row',
            settings: { columns: 2, gap: 'g-5', alignItems: 'align-items-center', justifyContent: 'justify-content-start' },
            children: [
              {
                id: c1a, type: 'column',
                settings: { className: 'col-md-5', backgroundColor: '', padding: '', margin: '' },
                children: [{
                  id: img1, type: 'image',
                  settings: {
                    src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=60',
                    alt: 'Notre équipe',
                    className: 'img-fluid rounded-4 shadow',
                    width: '100%', height: '', borderRadius: '16px', margin: 'mb-0', objectFit: 'cover',
                  },
                  children: [],
                }],
              },
              {
                id: c1b, type: 'column',
                settings: { className: 'col-md-7', backgroundColor: '', padding: '', margin: '' },
                children: [
                  { id: t1, type: 'text', settings: { content: 'Notre histoire', tag: 'h2', className: '', textAlign: 'text-start', color: '#0f172a', fontSize: '', fontWeight: '800', margin: 'mb-3' }, children: [] },
                  { id: t2, type: 'text', settings: { content: 'Fondée en 2018, notre entreprise s\'est donné pour mission de démocratiser la création web. Nous croyons fermement qu\'une belle présence en ligne ne devrait pas nécessiter de compétences techniques avancées.', tag: 'p', className: '', textAlign: 'text-start', color: '#475569', fontSize: '1rem', fontWeight: '', margin: 'mb-3' }, children: [] },
                  { id: t3, type: 'text', settings: { content: 'Aujourd\'hui, plus de 10 000 utilisateurs font confiance à nos outils pour construire leur présence digitale, gérer leur contenu et toucher leur audience.', tag: 'p', className: '', textAlign: 'text-start', color: '#475569', fontSize: '1rem', fontWeight: '', margin: 'mb-3' }, children: [] },
                ],
              },
            ],
          }],
        },
        {
          id: sepId, type: 'separator',
          settings: { color: '#e2e5ec', thickness: 1, style: 'solid', margin: 'my-0', width: '100%', className: '' },
          children: [],
        },
        {
          id: s2, type: 'section',
          settings: { backgroundColor: '#f8f9fb', padding: 'py-5', margin: 'mb-0', container: true, className: '', minHeight: '', backgroundImage: '' },
          children: [{
            id: r2, type: 'row',
            settings: { columns: 3, gap: 'g-4', alignItems: 'align-items-start', justifyContent: 'justify-content-center' },
            children: [
              {
                id: tc1, type: 'column',
                settings: { className: 'col-md-4', backgroundColor: '', padding: '', margin: '' },
                children: [{
                  id: tm1, type: 'testimonial',
                  settings: { quote: 'Un outil incroyable, simple et efficace. Je le recommande à tous les créateurs.', author: 'Sophie M.', role: 'Graphiste', avatarSrc: '', stars: 5, backgroundColor: '#ffffff', textColor: '#0f172a', margin: 'mb-0', className: '' },
                  children: [],
                }],
              },
              {
                id: tc2, type: 'column',
                settings: { className: 'col-md-4', backgroundColor: '', padding: '', margin: '' },
                children: [{
                  id: tm2, type: 'testimonial',
                  settings: { quote: 'J\'ai créé mon site en une après-midi. C\'est bluffant de facilité et le résultat est vraiment pro.', author: 'Thomas D.', role: 'Entrepreneur', avatarSrc: '', stars: 5, backgroundColor: '#ffffff', textColor: '#0f172a', margin: 'mb-0', className: '' },
                  children: [],
                }],
              },
              {
                id: tc3, type: 'column',
                settings: { className: 'col-md-4', backgroundColor: '', padding: '', margin: '' },
                children: [{
                  id: tm3, type: 'testimonial',
                  settings: { quote: 'La meilleure alternative à Elementor que j\'aie testée. Et en plus c\'est en français !', author: 'Camille L.', role: 'Chef de projet', avatarSrc: '', stars: 5, backgroundColor: '#ffffff', textColor: '#0f172a', margin: 'mb-0', className: '' },
                  children: [],
                }],
              },
            ],
          }],
        },
      ];
    },
  },

  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Présentation de projets en grille avec Hero et contact.',
    category: 'Créatif',
    preview: '🎨',
    build: () => {
      const heroId = id('hero');
      const s1 = id('section'), r1 = id('row');
      const c1 = id('col'), c2 = id('col'), c3 = id('col');
      const k1 = id('card'), k2 = id('card'), k3 = id('card');
      const spacer1 = id('spacer');
      const ctaId = id('cta');

      return [
        {
          id: heroId, type: 'hero',
          settings: {
            title: 'Mon Portfolio',
            subtitle: 'Designer & Développeur créatif basé à Paris. Je crée des expériences digitales mémorables.',
            buttonText: 'Voir mes projets ↓',
            buttonHref: '#projets',
            buttonVariant: 'btn-outline-light',
            backgroundColor: '#7c3aed',
            textColor: '#ffffff',
            minHeight: '480px',
            textAlign: 'text-center',
            overlayOpacity: 0,
            backgroundImage: '',
          },
          children: [],
        },
        {
          id: spacer1, type: 'spacer',
          settings: { height: 16, className: '' },
          children: [],
        },
        {
          id: s1, type: 'section',
          settings: { backgroundColor: '#ffffff', padding: 'py-5', margin: 'mb-0', container: true, className: '', minHeight: '', backgroundImage: '' },
          children: [{
            id: r1, type: 'row',
            settings: { columns: 3, gap: 'g-4', alignItems: 'align-items-start', justifyContent: 'justify-content-start' },
            children: [
              {
                id: c1, type: 'column',
                settings: { className: 'col-md-4', backgroundColor: '', padding: '', margin: '' },
                children: [{
                  id: k1, type: 'card',
                  settings: {
                    title: 'Projet Branding',
                    text: 'Identité visuelle complète pour une startup tech. Logotype, charte graphique et déclinaisons.',
                    imageSrc: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&auto=format&fit=crop&q=60',
                    buttonText: 'Voir le projet',
                    buttonHref: '#',
                    variant: 'btn-primary',
                    className: 'shadow border-0 h-100',
                    margin: 'mb-0',
                  },
                  children: [],
                }],
              },
              {
                id: c2, type: 'column',
                settings: { className: 'col-md-4', backgroundColor: '', padding: '', margin: '' },
                children: [{
                  id: k2, type: 'card',
                  settings: {
                    title: 'Application Web',
                    text: 'Dashboard analytics pour une PME. React, Node.js, visualisations temps réel et export PDF.',
                    imageSrc: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=60',
                    buttonText: 'Voir le projet',
                    buttonHref: '#',
                    variant: 'btn-primary',
                    className: 'shadow border-0 h-100',
                    margin: 'mb-0',
                  },
                  children: [],
                }],
              },
              {
                id: c3, type: 'column',
                settings: { className: 'col-md-4', backgroundColor: '', padding: '', margin: '' },
                children: [{
                  id: k3, type: 'card',
                  settings: {
                    title: 'E-commerce',
                    text: 'Boutique en ligne pour une maison d\'édition. Design épuré, tunnel de conversion optimisé.',
                    imageSrc: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&auto=format&fit=crop&q=60',
                    buttonText: 'Voir le projet',
                    buttonHref: '#',
                    variant: 'btn-primary',
                    className: 'shadow border-0 h-100',
                    margin: 'mb-0',
                  },
                  children: [],
                }],
              },
            ],
          }],
        },
        {
          id: ctaId, type: 'cta',
          settings: {
            title: 'Vous avez un projet ?',
            subtitle: 'Parlons-en ! Je suis disponible pour de nouvelles collaborations.',
            buttonText: 'Me contacter',
            buttonHref: 'mailto:contact@example.com',
            buttonVariant: 'btn-light',
            backgroundColor: '#7c3aed',
            textColor: '#ffffff',
            padding: 'py-5',
            margin: 'mb-0',
            className: '',
          },
          children: [],
        },
      ];
    },
  },

  {
    id: 'article',
    name: 'Article de blog',
    description: 'Mise en page pour un article long format avec image et texte.',
    category: 'Contenu',
    preview: '📝',
    build: () => {
      const heroId = id('hero');
      const s1 = id('section'), r1 = id('row'), colMain = id('col');
      const t1 = id('text'), t2 = id('text'), img1 = id('img'), t3 = id('text'), t4 = id('text'), t5 = id('text');
      const alertId = id('alert');
      const sepId = id('sep');
      const s2 = id('section'), r2 = id('row'), cq = id('col'), tmId = id('testimonial');

      return [
        {
          id: heroId, type: 'hero',
          settings: {
            title: 'Comment créer une page web sans coder',
            subtitle: 'Guide complet pour les débutants — 10 minutes de lecture',
            buttonText: '',
            buttonHref: '',
            buttonVariant: 'btn-primary',
            backgroundColor: '#0f766e',
            textColor: '#ffffff',
            minHeight: '320px',
            textAlign: 'text-center',
            overlayOpacity: 0,
            backgroundImage: '',
          },
          children: [],
        },
        {
          id: s1, type: 'section',
          settings: { backgroundColor: '#ffffff', padding: 'py-5', margin: 'mb-0', container: true, className: '', minHeight: '', backgroundImage: '' },
          children: [{
            id: r1, type: 'row',
            settings: { columns: 1, gap: 'g-3', alignItems: 'align-items-start', justifyContent: 'justify-content-center' },
            children: [{
              id: colMain, type: 'column',
              settings: { className: 'col-md-8 mx-auto', backgroundColor: '', padding: '', margin: '' },
              children: [
                { id: t1, type: 'text', settings: { content: 'Introduction', tag: 'h2', className: '', textAlign: 'text-start', color: '#0f172a', fontSize: '1.75rem', fontWeight: '800', margin: 'mb-3' }, children: [] },
                { id: t2, type: 'text', settings: { content: 'La création de pages web a été pendant longtemps réservée aux développeurs. Aujourd\'hui, des outils no-code permettent à n\'importe qui de concevoir des pages professionnelles en quelques minutes, sans écrire une seule ligne de code.', tag: 'p', className: 'lead', textAlign: 'text-start', color: '#334155', fontSize: '', fontWeight: '', margin: 'mb-4' }, children: [] },
                {
                  id: img1, type: 'image',
                  settings: {
                    src: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&auto=format&fit=crop&q=60',
                    alt: 'Création de page web',
                    className: 'img-fluid rounded-3 shadow-sm',
                    width: '100%', height: '350', borderRadius: '12px', margin: 'mb-4', objectFit: 'cover',
                  },
                  children: [],
                },
                { id: t3, type: 'text', settings: { content: 'Pourquoi choisir un outil no-code ?', tag: 'h3', className: '', textAlign: 'text-start', color: '#0f172a', fontSize: '', fontWeight: '700', margin: 'mb-2' }, children: [] },
                { id: t4, type: 'text', settings: { content: 'Les outils no-code présentent de nombreux avantages : rapidité de mise en œuvre, coût réduit, autonomie totale pour les mises à jour, et une courbe d\'apprentissage beaucoup plus douce qu\'avec du code traditionnel.', tag: 'p', className: '', textAlign: 'text-start', color: '#475569', fontSize: '', fontWeight: '', margin: 'mb-3' }, children: [] },
                {
                  id: alertId, type: 'alert',
                  settings: { content: '💡 <strong>Bon à savoir :</strong> Ce page builder exporte du HTML Bootstrap 5 propre, facilement intégrable dans n\'importe quel site.', variant: 'alert-info', dismissible: false, className: '', margin: 'mb-4' },
                  children: [],
                },
                { id: t5, type: 'text', settings: { content: 'En conclusion, le no-code n\'est plus une tendance mais une réalité incontournable pour toute organisation souhaitant rester agile et réactive dans son rapport au web.', tag: 'p', className: '', textAlign: 'text-start', color: '#475569', fontSize: '', fontWeight: '', margin: 'mb-4' }, children: [] },
                { id: sepId, type: 'separator', settings: { color: '#e2e5ec', thickness: 1, style: 'solid', margin: 'my-4', width: '100%', className: '' }, children: [] },
              ],
            }],
          }],
        },
        {
          id: s2, type: 'section',
          settings: { backgroundColor: '#f8f9fb', padding: 'py-4', margin: 'mb-0', container: true, className: '', minHeight: '', backgroundImage: '' },
          children: [{
            id: r2, type: 'row',
            settings: { columns: 1, gap: 'g-3', alignItems: 'align-items-center', justifyContent: 'justify-content-center' },
            children: [{
              id: cq, type: 'column',
              settings: { className: 'col-md-7 mx-auto', backgroundColor: '', padding: '', margin: '' },
              children: [{
                id: tmId, type: 'testimonial',
                settings: { quote: 'Cet article m\'a ouvert les yeux. J\'ai créé ma première page en moins d\'une heure !', author: 'Lecteur satisfait', role: 'Abonné', avatarSrc: '', stars: 5, backgroundColor: '#ffffff', textColor: '#0f172a', margin: 'mb-0', className: '' },
                children: [],
              }],
            }],
          }],
        },
      ];
    },
  },
];

/** Returns a deep copy with fresh IDs so templates can be loaded multiple times safely */
export function instantiateTemplate(templateId) {
  const tpl = TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return [];
  // Re-call build() to get fresh element tree every time
  return tpl.build();
}
