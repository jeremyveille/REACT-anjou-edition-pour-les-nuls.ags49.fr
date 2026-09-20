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
    <header className="dashboard-topbar ae-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', margin: '0 0 24px 0', padding: '16px 24px', background: 'linear-gradient(135deg, var(--blue-dark, #004b7a) 0%, var(--blue-primary, #336ddc) 100%)', color: 'white', borderRadius: '12px' }}>
      {/* LEFT: Toggle & Title */}
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ae-icon-button"
          aria-label="Afficher ou masquer le menu latéral"
          aria-expanded={sidebarOpen}
          style={{ color: 'white', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <h2 className="topbar-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getSectionTitle()}
          </h2>
          <span style={{ fontSize: '0.75rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Administration Anjou Édition</span>
        </div>
      </div>

      {/* RIGHT: Quick Action Buttons */}
      <div className="topbar-right" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {onBackToSiteClick && (
          <button
            id="btn-nav-back-to-site"
            onClick={onBackToSiteClick}
            className="ae-button"
            title="Voir le site"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <BookOpen size={16} />
            <span className="header-btn-text">Voir le site</span>
          </button>
        )}
        
        <button
          id="btn-nav-logout"
          onClick={onLogoutClick}
          className="ae-button ae-button--danger"
          title="Déconnexion"
        >
          <Lock size={16} />
          <span className="header-btn-text">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
