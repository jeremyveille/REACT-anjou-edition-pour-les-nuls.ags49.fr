import React from 'react';
import { Sun, Moon } from 'lucide-react';
export { CookieConsentBanner } from './CookieConsentBanner';

export const PublicHeader = ({ darkMode, toggleDarkMode }) => {
  return (
    <header role="banner">
      <a 
        href="#main-content" 
        className="skip-to-content"
      >
        Aller au contenu principal
      </a>
      <div className="header-content">
        <h1>Anjou Édition</h1>
        <h2>Pour Les Nuls</h2>
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
    <footer role="contentinfo">
      <div className="footer-content">
        <p>&copy; 2026 Anjou Édition - Édition de prestige & Histoire locale</p>
        {setView && (
          <nav className="footer-links" aria-label="Liens de pied de page">
            <button type="button" onClick={() => setView({ type: 'home' })}>Accueil</button>
            <span aria-hidden="true"> | </span>
            <button type="button" onClick={() => setView({ type: 'flipbooks' })}>Flipbooks</button>
            <span aria-hidden="true"> | </span>
            <button type="button" onClick={() => setView({ type: 'videos' })}>Vidéos</button>
            <span aria-hidden="true"> | </span>
            <button type="button" onClick={() => setView({ type: 'gallery' })}>Galerie</button>
            <span aria-hidden="true"> | </span>
            <button type="button" onClick={() => setView({ type: 'contact' })}>Contact</button>
            <span aria-hidden="true"> | </span>
            <button type="button" onClick={() => setView({ type: 'privacy' })}>Mentions Légales & RGPD</button>
          </nav>
        )}
      </div>
    </footer>
  );
};
