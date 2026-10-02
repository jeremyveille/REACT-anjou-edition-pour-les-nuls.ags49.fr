import React from "react";
import { BookOpen, Lock, Menu } from "lucide-react";

export default function DashboardHeader({
  userName,
  onLogoutClick,
  onDashboardClick,
  onBackToSiteClick,
  currentPage,
  activeSection,
  sidebarOpen,
  setSidebarOpen,
  hamburgerBtnRef
}) {
  // Translate activeSection into user friendly French titles
  const getSectionTitle = () => {
    if (!activeSection) return "Tableau de bord";
    switch (activeSection) {
      case "Page": return "Gestion des Pages";
      case "Article": return "Gestion des Articles";
      case "Messages": return "Boîte de Réception";
      case "Constructeur de Page": return "Constructeur Visuel";
      case "Mes Flipbooks": return "Gestion des Flipbooks";
      case "Mes menus": return "Menus de Navigation";
      case "Mes Comptes": return "Profils & Écrivains";
      case "Médiathèque": return "Médiathèque / Fichiers";
      case "Galerie": return "Galerie Photos";
      case "Vidéos": return "Capsules Vidéos";
      case "Actualités": return "Newsletters & Annonces";
      case "Paramètres": return "Configurations Système";
      default: return activeSection;
    }
  };

  return (
    <header className="dashboard-topbar ae-card">
      {/* LEFT: Toggle & Title */}
      <div className="topbar-left">
        <button
          ref={hamburgerBtnRef}
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ae-icon-button topbar-menu-toggle"
          aria-label="Afficher ou masquer le menu latéral"
          aria-expanded={sidebarOpen}
          aria-controls="dashboard-sidebar"
          title="Menu de navigation"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="topbar-title-wrapper">
          <h2 className="topbar-title">
            {getSectionTitle()}
          </h2>
          <span className="topbar-subtitle">Administration Anjou Édition</span>
        </div>
      </div>

      {/* RIGHT: Quick Action Buttons */}
      <div className="topbar-right">
        {onBackToSiteClick && (
          <button
            id="btn-nav-back-to-site"
            type="button"
            onClick={onBackToSiteClick}
            className="ae-button topbar-btn-site"
            title="Voir le site grand public"
          >
            <BookOpen size={16} aria-hidden="true" />
            <span className="header-btn-text">Voir le site</span>
          </button>
        )}
        
        <button
          id="btn-nav-logout"
          type="button"
          onClick={onLogoutClick}
          className="ae-button ae-button--danger topbar-btn-logout"
          title="Déconnexion de l'espace d'administration"
        >
          <Lock size={16} aria-hidden="true" />
          <span className="header-btn-text">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
