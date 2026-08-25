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
    <header className="dashboard-topbar ae-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 24px 0', padding: '16px 24px', background: 'linear-gradient(135deg, var(--blue-dark, #004b7a) 0%, var(--blue-primary, #336ddc) 100%)', color: 'white', borderRadius: '12px' }}>
      {/* LEFT: Toggle & Title */}
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ae-icon-button"
          aria-label="Toggle navigation menu"
          style={{ color: 'white', background: 'rgba(255,255,255,0.1)' }}
        >
          <Menu size={20} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="topbar-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>
            {getSectionTitle()}
          </h2>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Administration Anjou Édition</span>
        </div>
      </div>

      {/* RIGHT: Quick Action Buttons */}
      <div className="topbar-right" style={{ display: 'flex', gap: '12px' }}>
        {onBackToSiteClick && (
          <button
            id="btn-nav-back-to-site"
            onClick={onBackToSiteClick}
            className="ae-button"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <BookOpen size={16} />
            <span>Voir le site</span>
          </button>
        )}
        
        <button
          id="btn-nav-logout"
          onClick={onLogoutClick}
          className="ae-button ae-button--danger"
        >
          <Lock size={16} />
          <span>Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
