import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  FileText,
  Newspaper,
  Megaphone,
  Layers,
  BookOpen,
  FolderOpen,
  Image,
  Play,
  MessageSquare,
  Menu as MenuIcon,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  X
} from "lucide-react";

export default function DashboardSidebar({
  activeSection,
  setActiveSection,
  setActiveCategory,
  sidebarOpen,
  setSidebarOpen,
  userName = "JEREMY VEILLE",
  handleLogout,
  pagesCount = 0,
  articlesCount = 0,
  flipbooksCount = 0,
  messagesCount = 0,
  onOpenPageBuilder,
  setNotification,
  hamburgerBtnRef
}) {
  // Mode rétractable (compact / plein) avec persistance locale
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("ae_sidebar_collapsed") === "true";
    } catch (e) {
      return false;
    }
  });

  const isMediaActive = activeSection === "Médiathèque" || activeSection === "Galerie";

  // Sous-menu Médias ouvert par défaut pour un accès instantané
  const [mediaSubmenuOpen, setMediaSubmenuOpen] = useState(true);

  // Garder le sous-menu ouvert si l'utilisateur consulte une de ses rubriques
  useEffect(() => {
    if (isMediaActive) {
      setMediaSubmenuOpen(true);
    }
  }, [isMediaActive]);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("ae_sidebar_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  };

  const closeBtnRef = useRef(null);

  const handleCloseMobile = useCallback(() => {
    setSidebarOpen(false);
    if (hamburgerBtnRef && hamburgerBtnRef.current) {
      hamburgerBtnRef.current.focus();
    }
  }, [setSidebarOpen, hamburgerBtnRef]);

  // Fermeture par touche Échap & blocage du défilement du corps sur mobile
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && sidebarOpen) {
        handleCloseMobile();
      }
    };

    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      if (closeBtnRef.current) {
        setTimeout(() => closeBtnRef.current?.focus(), 60);
      }
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarOpen, handleCloseMobile]);

  const handleNavClick = (sectionName) => {
    setActiveSection(sectionName);
    setSidebarOpen(false);
  };

  const handleHomeClick = () => {
    setActiveSection(null);
    if (setActiveCategory) setActiveCategory("Accueil");
    setSidebarOpen(false);
    if (setNotification) setNotification("Retour à l'accueil du tableau de bord.");
  };

  return (
    <>
      {/* Overlay sombre pour mobile/tablette drawer */}
      <div 
        className="sidebar-overlay" 
        onClick={handleCloseMobile}
        aria-hidden="true"
      />

      <aside 
        id="dashboard-sidebar"
        className={`dashboard-sidebar ${isCollapsed ? "is-collapsed" : ""} ${sidebarOpen ? "is-mobile-open" : ""}`}
        aria-label="Menu principal du tableau de bord"
      >
        {/* ============================================================== */}
        {/* 1. EN-TÊTE : Logo & Marque Anjou Édition (fixe en haut)         */}
        {/* ============================================================== */}
        <div className="sidebar-brand-wrapper">
          <button
            type="button"
            className="sidebar-brand"
            onClick={handleHomeClick}
            aria-label="Accueil Anjou Édition"
            title="Anjou Édition - Accueil du tableau de bord"
          >
            <div className="sidebar-brand-icon">
              <BookOpen size={20} aria-hidden="true" />
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">ANJOU ÉDITION</span>
              <span className="sidebar-brand-subtitle">Pour les Nuls</span>
            </div>
          </button>

          {/* Bouton de fermeture réservé au drawer mobile */}
          <button
            ref={closeBtnRef}
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={handleCloseMobile}
            aria-label="Fermer le menu latéral"
            title="Fermer le menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* 2. CENTRE : Navigation principale (seule zone scrollable)      */}
        {/* ============================================================== */}
        <nav className="sidebar-menu" aria-label="Sections du site">
          
          {/* SECTION : NAVIGATION */}
          <div className="sidebar-section-title">Navigation</div>
          <div className="sidebar-section-divider" aria-hidden="true" />

          {/* Tableau de bord / Vue d'ensemble */}
          <button
            type="button"
            onClick={handleHomeClick}
            className={`sidebar-menu-btn ${!activeSection ? "active" : ""}`}
            aria-current={!activeSection ? "page" : undefined}
            title={isCollapsed ? "Tableau de bord" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <LayoutDashboard size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Tableau de bord</span>
            </span>
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Tableau de bord</span>}
          </button>

          {/* Pages */}
          <button
            type="button"
            onClick={() => handleNavClick("Page")}
            className={`sidebar-menu-btn ${activeSection === "Page" ? "active" : ""}`}
            aria-current={activeSection === "Page" ? "page" : undefined}
            title={isCollapsed ? "Pages" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <FileText size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Pages</span>
            </span>
            {pagesCount > 0 && <span className="sidebar-badge">{pagesCount}</span>}
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Pages ({pagesCount})</span>}
          </button>

          {/* Articles */}
          <button
            type="button"
            onClick={() => handleNavClick("Article")}
            className={`sidebar-menu-btn ${activeSection === "Article" ? "active" : ""}`}
            aria-current={activeSection === "Article" ? "page" : undefined}
            title={isCollapsed ? "Articles" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <Newspaper size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Articles</span>
            </span>
            {articlesCount > 0 && <span className="sidebar-badge">{articlesCount}</span>}
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Articles ({articlesCount})</span>}
          </button>

          {/* Actualités */}
          <button
            type="button"
            onClick={() => handleNavClick("Actualités")}
            className={`sidebar-menu-btn ${activeSection === "Actualités" ? "active" : ""}`}
            aria-current={activeSection === "Actualités" ? "page" : undefined}
            title={isCollapsed ? "Actualités" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <Megaphone size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Actualités</span>
            </span>
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Actualités</span>}
          </button>

          {/* Constructeur de page */}
          <button
            type="button"
            onClick={() => {
              if (onOpenPageBuilder) onOpenPageBuilder();
            }}
            className={`sidebar-menu-btn ${activeSection === "Constructeur de Page" ? "active" : ""}`}
            aria-current={activeSection === "Constructeur de Page" ? "page" : undefined}
            title={isCollapsed ? "Constructeur de pages" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <Layers size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Constructeur de pages</span>
            </span>
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Constructeur de pages</span>}
          </button>

          {/* Flipbooks */}
          <button
            type="button"
            onClick={() => handleNavClick("Mes Flipbooks")}
            className={`sidebar-menu-btn ${activeSection === "Mes Flipbooks" ? "active" : ""}`}
            aria-current={activeSection === "Mes Flipbooks" ? "page" : undefined}
            title={isCollapsed ? "Flipbooks" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Flipbooks</span>
            </span>
            {flipbooksCount > 0 && <span className="sidebar-badge">{flipbooksCount}</span>}
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Flipbooks ({flipbooksCount})</span>}
          </button>

          {/* GROUPE DÉPLIABLE : Médias (Médiathèque + Galerie) */}
          <div className="sidebar-group">
            <button
              type="button"
              onClick={() => {
                if (isCollapsed) {
                  // En mode compact, ouvrir la médiathèque directement
                  handleNavClick("Médiathèque");
                } else {
                  setMediaSubmenuOpen(prev => !prev);
                }
              }}
              className={`sidebar-menu-btn sidebar-group-toggle ${isMediaActive ? "has-active-child" : ""}`}
              aria-expanded={mediaSubmenuOpen}
              aria-controls="sidebar-submenu-medias"
              title={isCollapsed ? "Médias" : undefined}
            >
              <span className="sidebar-menu-btn-inner">
                <span className="sidebar-menu-icon">
                  <FolderOpen size={18} aria-hidden="true" />
                </span>
                <span className="sidebar-label">Médias</span>
              </span>
              <span className="sidebar-chevron" aria-hidden="true">
                {mediaSubmenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Médias</span>}
            </button>

            {/* Sous-menu visible si déplié ou si compact avec items directs */}
            {(!isCollapsed ? mediaSubmenuOpen : true) && (
              <div 
                id="sidebar-submenu-medias" 
                className="sidebar-submenu"
                role="group"
                aria-label="Sous-menu Médias"
              >
                {/* Médiathèque */}
                <button
                  type="button"
                  onClick={() => handleNavClick("Médiathèque")}
                  className={`sidebar-menu-btn sidebar-submenu-btn ${activeSection === "Médiathèque" ? "active" : ""}`}
                  aria-current={activeSection === "Médiathèque" ? "page" : undefined}
                  title={isCollapsed ? "Médiathèque" : undefined}
                >
                  <span className="sidebar-menu-btn-inner">
                    <span className="sidebar-menu-icon">
                      <FolderOpen size={16} aria-hidden="true" />
                    </span>
                    <span className="sidebar-label">Médiathèque</span>
                  </span>
                  {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Médiathèque</span>}
                </button>

                {/* Galerie Photos */}
                <button
                  type="button"
                  onClick={() => handleNavClick("Galerie")}
                  className={`sidebar-menu-btn sidebar-submenu-btn ${activeSection === "Galerie" ? "active" : ""}`}
                  aria-current={activeSection === "Galerie" ? "page" : undefined}
                  title={isCollapsed ? "Galerie Photos" : undefined}
                >
                  <span className="sidebar-menu-btn-inner">
                    <span className="sidebar-menu-icon">
                      <Image size={16} aria-hidden="true" />
                    </span>
                    <span className="sidebar-label">Galerie Photos</span>
                  </span>
                  {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Galerie Photos</span>}
                </button>
              </div>
            )}
          </div>

          {/* Vidéos */}
          <button
            type="button"
            onClick={() => handleNavClick("Vidéos")}
            className={`sidebar-menu-btn ${activeSection === "Vidéos" ? "active" : ""}`}
            aria-current={activeSection === "Vidéos" ? "page" : undefined}
            title={isCollapsed ? "Vidéos" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <Play size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Vidéos</span>
            </span>
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Vidéos</span>}
          </button>

          {/* Messages */}
          <button
            type="button"
            onClick={() => handleNavClick("Messages")}
            className={`sidebar-menu-btn ${activeSection === "Messages" ? "active" : ""}`}
            aria-current={activeSection === "Messages" ? "page" : undefined}
            title={isCollapsed ? "Messages" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <MessageSquare size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Messages</span>
            </span>
            {messagesCount > 0 && (
              <span className="sidebar-badge sidebar-badge-red">{messagesCount}</span>
            )}
            {isCollapsed && (
              <span className="sidebar-tooltip" role="tooltip">
                Messages {messagesCount > 0 ? `(${messagesCount})` : ""}
              </span>
            )}
          </button>

          {/* SECTION : GESTION */}
          <div className="sidebar-section-title">Gestion</div>
          <div className="sidebar-section-divider" aria-hidden="true" />

          {/* Apparence & Menus (conserve "Mes menus" pour compatibilité tests) */}
          <button
            type="button"
            onClick={() => handleNavClick("Mes menus")}
            className={`sidebar-menu-btn ${activeSection === "Mes menus" ? "active" : ""}`}
            aria-current={activeSection === "Mes menus" ? "page" : undefined}
            title={isCollapsed ? "Apparence & Mes menus" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <MenuIcon size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Apparence / Mes menus</span>
            </span>
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Apparence / Mes menus</span>}
          </button>

          {/* Comptes / Écrivains */}
          <button
            type="button"
            onClick={() => handleNavClick("Mes Comptes")}
            className={`sidebar-menu-btn ${activeSection === "Mes Comptes" ? "active" : ""}`}
            aria-current={activeSection === "Mes Comptes" ? "page" : undefined}
            title={isCollapsed ? "Comptes / Écrivains" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <Users size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Comptes / Écrivains</span>
            </span>
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Comptes / Écrivains</span>}
          </button>

          {/* Paramètres */}
          <button
            type="button"
            onClick={() => handleNavClick("Paramètres")}
            className={`sidebar-menu-btn ${activeSection === "Paramètres" ? "active" : ""}`}
            aria-current={activeSection === "Paramètres" ? "page" : undefined}
            title={isCollapsed ? "Paramètres" : undefined}
          >
            <span className="sidebar-menu-btn-inner">
              <span className="sidebar-menu-icon">
                <Settings size={18} aria-hidden="true" />
              </span>
              <span className="sidebar-label">Paramètres</span>
            </span>
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Paramètres</span>}
          </button>
        </nav>

        {/* ============================================================== */}
        {/* 3. PIED DE SIDEBAR : Réduction, Profil & Déconnexion (fixe)     */}
        {/* ============================================================== */}
        <div className="sidebar-footer">
          {/* Commande explicite de réduction du menu (desktop) */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="sidebar-collapse-toggle-btn"
            aria-label={isCollapsed ? "Agrandir le menu latéral" : "Réduire le menu latéral"}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            {isCollapsed ? (
              <>
                <ChevronRight size={18} aria-hidden="true" />
                <span className="sidebar-tooltip" role="tooltip">Agrandir le menu</span>
              </>
            ) : (
              <>
                <ChevronLeft size={18} aria-hidden="true" />
                <span>Réduire le menu</span>
              </>
            )}
          </button>

          {/* Carte Profil utilisateur (mode complet) */}
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {(userName || "J").charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-fullname" title={userName}>{userName}</span>
              <span className="sidebar-user-status">
                <span className="sidebar-status-dot" aria-hidden="true"></span>
                Administrateur
              </span>
            </div>
          </div>

          {/* Avatar compact (mode réduit) */}
          <div className="sidebar-user-compact-avatar">
            <div
              className="sidebar-user-avatar"
              title={`${userName} (Administrateur)`}
              tabIndex={0}
              aria-label={`${userName} - Administrateur`}
            >
              {(userName || "J").charAt(0).toUpperCase()}
            </div>
            <span className="sidebar-tooltip" role="tooltip">{userName} (Admin)</span>
          </div>

          {/* Bouton de Déconnexion */}
          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-logout-button"
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Déconnexion</span>
            {isCollapsed && <span className="sidebar-tooltip" role="tooltip">Déconnexion</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
