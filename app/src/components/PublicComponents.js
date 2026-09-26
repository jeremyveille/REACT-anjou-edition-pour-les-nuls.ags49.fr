import React from 'react';
import { Sun, Moon } from 'lucide-react';
export { CookieConsentBanner } from './CookieConsentBanner';

// Logo stylisé Anjou Édition (Feuilles d'Anjou & Livre ouvert) en SVG vectoriel pur
const AnjouEditionLogo = ({ size = 52, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 64 64" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Center top leaf (cyan/blue) */}
    <path 
      d="M32 8C32 8 38 18 38 26C38 30.5 35.3 33.5 32 33.5C28.7 33.5 26 30.5 26 26C26 18 32 8 32 8Z" 
      fill="#38bdf8" 
    />
    <path 
      d="M32 14C32 14 35 21 35 25C35 27 33.7 28.5 32 28.5C30.3 28.5 29 27 29 25C29 21 32 14 32 14Z" 
      fill="#7dd3fc" 
    />
    {/* Left leaf (white) */}
    <path 
      d="M17 23C17 23 24 24.5 27.5 30C29 33.5 27 37.5 23 37.5C19 37.5 15.5 33.5 15 29.5C14.5 26 17 23 17 23Z" 
      fill="#ffffff" 
    />
    {/* Right leaf (white) */}
    <path 
      d="M47 23C47 23 40 24.5 36.5 30C35 33.5 37 37.5 41 37.5C45 37.5 48.5 33.5 49 29.5C49.5 26 47 23 47 23Z" 
      fill="#ffffff" 
    />
    {/* Bottom open book page base */}
    <path 
      d="M16 43C22 40 28.5 42 32 44C35.5 42 42 40 48 43" 
      stroke="#ffffff" 
      strokeWidth="3.2" 
      strokeLinecap="round" 
    />
    <path 
      d="M19 48.5C24 46 29 47 32 49C35 47 40 46 45 48.5" 
      stroke="#ffffff" 
      strokeWidth="2.4" 
      strokeLinecap="round" 
      opacity="0.85"
    />
  </svg>
);

export const PublicHeader = ({ darkMode, toggleDarkMode }) => {
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
          src="/header-angers.jpg" 
          alt="" 
          className="header-mockup-bg-img"
        />
        <div className="header-mockup-overlay"></div>
      </div>

      <div className="header-mockup-content">
        <div className="header-mockup-logo-area">
          <div className="header-mockup-logo-icon">
            <AnjouEditionLogo size={52} />
          </div>
          <div className="header-mockup-titles">
            <h1>Anjou Édition</h1>
            <h2>POUR LES NULS</h2>
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
        {darkMode ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </button>
    </header>
  );
};

export const PublicFooter = ({ setView }) => {
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

        {setView && (
          <nav className="footer-links-capsule" aria-label="Liens de pied de page">
            <button type="button" onClick={() => setView({ type: 'home' })}>Accueil</button>
            <span aria-hidden="true" className="footer-sep">|</span>
            <button type="button" onClick={() => setView({ type: 'flipbooks' })}>Flipbooks</button>
            <span aria-hidden="true" className="footer-sep">|</span>
            <button type="button" onClick={() => setView({ type: 'videos' })}>Vidéos</button>
            <span aria-hidden="true" className="footer-sep">|</span>
            <button type="button" onClick={() => setView({ type: 'gallery' })}>Galerie</button>
            <span aria-hidden="true" className="footer-sep">|</span>
            <button type="button" onClick={() => setView({ type: 'contact' })}>Contact</button>
            <span aria-hidden="true" className="footer-sep">|</span>
            <button type="button" onClick={() => setView({ type: 'privacy' })}>Mentions Légales & RGPD</button>
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
