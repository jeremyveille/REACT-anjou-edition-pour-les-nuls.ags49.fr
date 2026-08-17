import generateId from './generateId';

/**
 * Creates a default element configuration based on the widget type.
 * @param {string} type - The widget type
 * @param {object} customSettings - Optional settings to override defaults
 * @returns {object} The widget element JSON structure
 */
export default function createDefaultElement(type, customSettings = {}) {
  const id = generateId(type);

  switch (type) {

    case 'section':
      return {
        id,
        type: 'section',
        settings: {
          className: '',
          backgroundColor: '#ffffff',
          backgroundImage: '',
          padding: 'py-5',
          margin: 'mb-0',
          container: true,
          minHeight: '',
          ...customSettings,
        },
        children: [],
      };

    case 'hero':
      return {
        id,
        type: 'hero',
        settings: {
          title: 'Bienvenue sur notre site',
          subtitle: 'Découvrez nos services et notre savoir-faire. Créez votre page facilement.',
          buttonText: 'Découvrir',
          buttonHref: '#',
          buttonVariant: 'btn-primary',
          backgroundColor: '#1e293b',
          textColor: '#ffffff',
          minHeight: '500px',
          textAlign: 'text-center',
          overlayOpacity: 0,
          backgroundImage: '',
          ...customSettings,
        },
        children: [],
      };

    case 'row-1':
      return {
        id: generateId('row'),
        type: 'row',
        settings: {
          columns: 1,
          gap: 'g-3',
          alignItems: 'align-items-start',
          justifyContent: 'justify-content-start',
          ...customSettings,
        },
        children: [
          createDefaultElement('column', { className: 'col-12' }),
        ],
      };

    case 'row-2':
      return {
        id: generateId('row'),
        type: 'row',
        settings: {
          columns: 2,
          gap: 'g-3',
          alignItems: 'align-items-start',
          justifyContent: 'justify-content-start',
          ...customSettings,
        },
        children: [
          createDefaultElement('column', { className: 'col-md-6' }),
          createDefaultElement('column', { className: 'col-md-6' }),
        ],
      };

    case 'row-3':
      return {
        id: generateId('row'),
        type: 'row',
        settings: {
          columns: 3,
          gap: 'g-3',
          alignItems: 'align-items-start',
          justifyContent: 'justify-content-start',
          ...customSettings,
        },
        children: [
          createDefaultElement('column', { className: 'col-md-4' }),
          createDefaultElement('column', { className: 'col-md-4' }),
          createDefaultElement('column', { className: 'col-md-4' }),
        ],
      };

    case 'column':
      return {
        id,
        type: 'column',
        settings: {
          className: 'col-md-6',
          backgroundColor: '',
          padding: '',
          margin: '',
          ...customSettings,
        },
        children: [],
      };

    case 'spacer':
      return {
        id,
        type: 'spacer',
        settings: {
          height: 48,
          className: '',
          ...customSettings,
        },
        children: [],
      };

    case 'separator':
      return {
        id,
        type: 'separator',
        settings: {
          color: '#e2e5ec',
          thickness: 1,
          style: 'solid',
          margin: 'my-4',
          width: '100%',
          className: '',
          ...customSettings,
        },
        children: [],
      };

    case 'text':
      return {
        id,
        type: 'text',
        settings: {
          content: 'Votre texte ici. Double-cliquez pour éditer.',
          tag: 'p',
          className: '',
          textAlign: 'text-start',
          color: '#333333',
          fontSize: '',
          fontWeight: '',
          margin: 'mb-3',
          ...customSettings,
        },
        children: [],
      };

    case 'image':
      return {
        id,
        type: 'image',
        settings: {
          src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=60',
          alt: 'Image par défaut',
          className: 'img-fluid rounded',
          width: '100%',
          height: '',
          borderRadius: '',
          margin: 'mb-3',
          objectFit: 'cover',
          ...customSettings,
        },
        children: [],
      };

    case 'video':
      return {
        id,
        type: 'video',
        settings: {
          src: '',
          className: 'ratio ratio-16x9 rounded overflow-hidden',
          margin: 'mb-3',
          ...customSettings,
        },
        children: [],
      };

    case 'button':
      return {
        id,
        type: 'button',
        settings: {
          text: 'Cliquez ici',
          href: '#',
          variant: 'btn-primary',
          size: '',
          target: '_self',
          className: '',
          margin: 'mb-3',
          textAlign: 'text-start',
          ...customSettings,
        },
        children: [],
      };

    case 'icon':
      return {
        id,
        type: 'icon',
        settings: {
          name: 'Smile',
          size: 32,
          color: '#0d6efd',
          className: 'd-inline-block',
          margin: 'mb-3',
          ...customSettings,
        },
        children: [],
      };

    case 'card':
      return {
        id,
        type: 'card',
        settings: {
          title: 'Titre de la carte',
          text: 'Ceci est une carte Bootstrap moderne. Vous pouvez y ajouter du texte, des images et des boutons.',
          imageSrc: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=60',
          buttonText: 'En savoir plus',
          buttonHref: '#',
          variant: 'btn-primary',
          className: 'shadow-sm border-0 h-100',
          margin: 'mb-3',
          ...customSettings,
        },
        children: [],
      };

    case 'alert':
      return {
        id,
        type: 'alert',
        settings: {
          content: 'Ceci est une alerte d\'information importante.',
          variant: 'alert-info',
          dismissible: false,
          className: '',
          margin: 'mb-3',
          ...customSettings,
        },
        children: [],
      };

    case 'testimonial':
      return {
        id,
        type: 'testimonial',
        settings: {
          quote: 'Ce service est absolument remarquable. Je le recommande vivement à tous mes proches !',
          author: 'Marie Dupont',
          role: 'Cliente fidèle',
          avatarSrc: '',
          stars: 5,
          backgroundColor: '#f8f9fb',
          textColor: '#0f172a',
          margin: 'mb-3',
          className: '',
          ...customSettings,
        },
        children: [],
      };

    case 'cta':
      return {
        id,
        type: 'cta',
        settings: {
          title: 'Prêt à commencer ?',
          subtitle: 'Rejoignez des milliers d\'utilisateurs satisfaits et créez dès aujourd\'hui.',
          buttonText: 'Démarrer maintenant',
          buttonHref: '#',
          buttonVariant: 'btn-primary',
          backgroundColor: '#3b6ef8',
          textColor: '#ffffff',
          padding: 'py-5',
          margin: 'mb-0',
          className: '',
          ...customSettings,
        },
        children: [],
      };

    default:
      throw new Error(`Unknown widget type: ${type}`);
  }
}
