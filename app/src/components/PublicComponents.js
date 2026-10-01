import React from 'react';
import { Sun, Moon } from 'lucide-react';
export { CookieConsentBanner } from './CookieConsentBanner';

// Logo officiel Anjou Édition (Livre sur étagère)
const AnjouEditionLogo = ({ size = 56, className = "" }) => (
  <img 
    src="/logo-anjou-edition-shelf.png" 
    alt="Logo Anjou Édition" 
    style={{ height: `${size}px`, width: 'auto', objectFit: 'contain' }}
    className={`header-mockup-shelf-logo ${className}`}
  />
);

export const PublicHeader = ({ darkMode, toggleDarkMode, headerImage }) => {
  return (
    <header role="banner" className="ae-mockup-header">
      <a 
        href="#main-content" 
        className="skip-to-content"
      >
        Aller au contenu principal
      </a>
      
      {/* Background panoramic photo of Château d'Angers & Maine */}
      <div className="header-mockup-banner-bg" aria-hidden="true">
        <img 
          src={headerImage || "/header-angers-panoramic.jpg"} 
          alt="" 
          className="header-mockup-bg-img"
        />
        <div className="header-mockup-overlay"></div>
      </div>

      <div className="header-mockup-content">
        <div className="header-mockup-logo-area">
          <div className="header-mockup-logo-icon">
            <AnjouEditionLogo size={44} />
          </div>
          <div className="header-mockup-titles">
            <h1 className="brand-title">Anjou Édition</h1>
            <p className="brand-subtitle">POUR LES NULS</p>
          </div>
        </div>
      </div>
      
      <button 
        type="button" 
        onClick={toggleDarkMode} 
        className="theme-toggle"
        title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
        aria-label={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
      >
        {darkMode ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
      </button>
    </header>
  );
};

export const PublicFooter = ({ setView, onNavigate }) => {
  const handleNav = (targetView, path, title) => {
    if (typeof onNavigate === 'function') {
      onNavigate(targetView, path, title);
    } else if (typeof setView === 'function') {
      setView(targetView);
      if (typeof window !== 'undefined') {
        if (path) window.history.pushState({}, '', path);
        if (title) document.title = title;
        if (typeof window.scrollTo === 'function') {
          try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (e) {
            window.scrollTo(0, 0);
          }
        }
      }
    }
  };

  return (
    <footer role="contentinfo" className="ae-mockup-footer">
      <div className="footer-mockup-wave" aria-hidden="true">
        <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none">
          <path d="M0,25 C360,55 1080,0 1440,25 L1440,60 L0,60 Z" fill="#e0f2fe" opacity="0.6" />
          <path d="M0,35 C480,65 960,10 1440,40 L1440,60 L0,60 Z" fill="#bae6fd" opacity="0.4" />
        </svg>
      </div>

      <div className="footer-mockup-container">
        <div className="footer-mockup-left">
          <AnjouEditionLogo size={36} className="footer-fleur-icon" />
        </div>

        {(onNavigate || setView) && (
          <nav className="footer-links-capsule" aria-label="Liens de pied de page">
            <button type="button" onClick={() => handleNav({ type: 'home' }, '/', "Anjou Édition — Pour les Nuls")}>Accueil</button>
            <span aria-hidden="true" className="footer-sep">|</span>
            <button type="button" onClick={() => handleNav({ type: 'flipbooks' }, '/flipbooks', "Nos Flipbooks Interactifs — Anjou Édition")}>Flipbooks</button>
            <span aria-hidden="true" className="footer-sep">|</span>
            <button type="button" onClick={() => handleNav({ type: 'videos' }, '/videos', "Vidéos & Conférences — Anjou Édition")}>Vidéos</button>
            <span aria-hidden="true" className="footer-sep">|</span>
            <button type="button" onClick={() => handleNav({ type: 'gallery' }, '/gallery', "Galerie Photos — Anjou Édition")}>Galerie</button>
            <span aria-hidden="true" className="footer-sep">|</span>
            <button type="button" onClick={() => handleNav({ type: 'contact' }, '/contact', "Contact — Anjou Édition")}>Contact</button>
            <span aria-hidden="true" className="footer-sep">|</span>
            <button type="button" onClick={() => handleNav({ type: 'privacy' }, '/privacy', "Mentions Légales & RGPD — Anjou Édition")}>Mentions Légales & RGPD</button>
          </nav>
        )}

        <div className="footer-mockup-right" aria-hidden="true">
          <img 
            src="/header-angers.jpg" 
            alt="" 
            className="footer-mockup-silhouette"
          />
        </div>
      </div>
    </footer>
  );
};
