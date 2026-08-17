import React from 'react';
import { Sun, Moon } from 'lucide-react';

export const PublicHeader = ({ darkMode, toggleDarkMode }) => {
  return (
    <header>
      <div className="header-content">
        <h1>Anjou Édition</h1>
        <h2>Pour Les Nuls</h2>
      </div>
      
      <button 
        onClick={toggleDarkMode} 
        className="theme-toggle"
        title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
        aria-label="Toggle theme"
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </header>
  );
};

export const PublicFooter = ({ setView }) => {
  return (
    <footer>
      <div className="footer-content">
        <p>&copy; 2026 Anjou Édition - Édition de prestige & Histoire locale</p>
        {setView && (
          <div className="footer-links">
            <button type="button" onClick={() => setView({ type: 'home' })}>Accueil</button> | 
            <button type="button" onClick={() => setView({ type: 'flipbooks' })}>Flipbooks</button> | 
            <button type="button" onClick={() => setView({ type: 'videos' })}>Vidéos</button> | 
            <button type="button" onClick={() => setView({ type: 'gallery' })}>Galerie</button> | 
            <button type="button" onClick={() => setView({ type: 'contact' })}>Contact</button> | 
            <button type="button" onClick={() => setView({ type: 'privacy' })}>Mentions Légales & RGPD</button>
          </div>
        )}
      </div>
    </footer>
  );
};
