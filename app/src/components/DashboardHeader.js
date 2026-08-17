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
  setSidebarOpen
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
    <header className="dashboard-topbar flex justify-between items-center w-full">
      {/* LEFT: Toggle & Title */}
      <div className="topbar-left">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mobile-nav-toggle p-2"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="topbar-title">
          {getSectionTitle()}
        </h2>
      </div>

      {/* RIGHT: Quick Action Buttons */}
      <div className="topbar-right flex items-center gap-2">
        {onBackToSiteClick && (
          <button
            id="btn-nav-back-to-site"
            onClick={onBackToSiteClick}
            className="header-btn cursor-pointer inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Voir le site</span>
          </button>
        )}
        
        <button
          id="btn-nav-logout"
          onClick={onLogoutClick}
          className="header-btn-danger cursor-pointer inline-flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
