import React from "react";
import { BookOpen, Lock, Menu, X, ChevronLeft, ChevronRight, Search } from "lucide-react";

export default function DashboardHeader({
  userName,
  onLogoutClick,
  onDashboardClick,
  onBackToSiteClick,
  currentPage,
  activeSection,
  sidebarOpen,
  setSidebarOpen,
  hamburgerBtnRef,
  isCollapsed = false,
  toggleCollapsed,
  onOpenCommandPalette
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
      {/* LEFT: Toggle, Collapse & Title/Breadcrumbs */}
      <div className="topbar-left">
        <button
          ref={hamburgerBtnRef}
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="topbar-menu-toggle"
          aria-label="Afficher ou masquer le menu latéral"
          aria-expanded={sidebarOpen}
          aria-controls="dashboard-sidebar"
          title={sidebarOpen ? "Masquer le menu latéral" : "Afficher le menu latéral"}
        >
          {sidebarOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <Menu size={20} aria-hidden="true" />
          )}
        </button>

        {/* Bouton d'agrandissement / réduction du menu latéral */}
        <button
          type="button"
          onClick={() => {
            if (!sidebarOpen) {
              setSidebarOpen(true);
            }
            toggleCollapsed();
          }}
          className="sidebar-collapse-toggle-btn"
          aria-label={isCollapsed ? "Agrandir le menu latéral" : "Réduire le menu latéral"}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight size={20} aria-hidden="true" />
          ) : (
            <ChevronLeft size={20} aria-hidden="true" />
          )}
          <span className="sidebar-tooltip" role="tooltip">
            {isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          </span>
        </button>

        <div className="topbar-title-wrapper">
          {activeSection ? (
            <nav aria-label="Fil d'Ariane" className="topbar-breadcrumb">
              <button
                type="button"
                onClick={onDashboardClick}
                className="topbar-breadcrumb-link"
                title="Retour à l'accueil du tableau de bord"
              >
                Tableau de bord
              </button>
              <ChevronRight size={14} className="topbar-breadcrumb-separator" aria-hidden="true" />
              <h2 className="topbar-title topbar-breadcrumb-current">
                {getSectionTitle()}
              </h2>
            </nav>
          ) : (
            <h2 className="topbar-title">
              Tableau de bord
            </h2>
          )}
          <span className="topbar-subtitle">Administration Anjou Édition</span>
        </div>
      </div>

      {/* RIGHT: Quick Action Buttons */}
      <div className="topbar-right">
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="topbar-search-trigger"
            aria-label="Recherche universelle et commandes rapides (Ctrl + K)"
            title="Recherche universelle et commandes rapides (Ctrl + K)"
          >
            <Search size={15} className="topbar-search-icon" aria-hidden="true" />
            <span className="topbar-search-text">Recherche rapide...</span>
            <kbd className="topbar-search-kbd">Ctrl K</kbd>
          </button>
        )}
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
