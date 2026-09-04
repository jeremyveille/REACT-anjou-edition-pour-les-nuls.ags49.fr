import React from 'react';
import { ChevronDown, ChevronRight, Search, Send, Menu, X } from 'lucide-react';

export const PublicNav = ({
  setView,
  mobileMenuOpen,
  setMobileMenuOpen,
  activeDropdown,
  setActiveDropdown,
  getActiveMenuItems,
  handleMenuItemClick,
  dropdownRefs,
  isPreview = false
}) => {

  const renderDropdownItems = (items) => {
    return items.map((child) => {
      const hasChilds = child.children && child.children.length > 0;
      if (hasChilds) {
        return (
          <div key={child.id} className="dropdown-submenu">
            <div className="ae-dropdown-submenu-item">
              {(child.status === "Actif" || child.isActive) && (child.url || child.shortcode) ? (
                <button 
                  type="button"
                  className="ae-dropdown-sub-btn"
                  onClick={(e) => {
                    handleMenuItemClick(child, e);
                    setActiveDropdown(null);
                  }}
                >
                  {child.title}
                </button>
              ) : (
                <span className="ae-dropdown-sub-text">{child.title}</span>
              )}
              <span className="ae-dropdown-chevron">
                <ChevronRight size={13} />
              </span>
            </div>
            <div className="dropdown-menu">
              {renderDropdownItems(child.children)}
            </div>
          </div>
        );
      } else {
        return (
          <button 
            key={child.id} 
            type="button" 
            className="dropdown-item" 
            onClick={(e) => {
              handleMenuItemClick(child, e);
              setActiveDropdown(null);
            }}
          >
            {child.title}
          </button>
        );
      }
    });
  };

  const renderMobileMenuItems = (items, depth = 0) => {
    return items.map((item) => {
      const hasChilds = item.children && item.children.length > 0;
      return (
        <div key={item.id} style={{ paddingLeft: `${depth * 12}px`, width: '100%' }}>
          {hasChilds ? (
            <details className="mobile-details">
              <summary className="mobile-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {(item.status === "Actif" || item.isActive) && (item.url || item.shortcode) ? (
                  <button 
                    type="button"
                    className="ae-mobile-nav-item-button"
                    style={{ border: 'none', background: 'transparent' }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleMenuItemClick(item, e);
                      setMobileMenuOpen(false);
                    }}
                  >
                    {item.title}
                  </button>
                ) : (
                  <span className="flex-grow">{item.title}</span>
                )}
                <span className="ae-action-icon-wrapper"><ChevronDown size={14} /></span>
              </summary>
              <div className="mobile-details-content">
                {renderMobileMenuItems(item.children, depth + 1)}
              </div>
            </details>
          ) : (
            <button 
              type="button" 
              className={`mobile-nav-link ${depth > 0 ? 'sub-link' : 'main-link'}`}
              style={{ paddingLeft: depth > 0 ? '10px' : '0' }}
              onClick={(e) => {
                handleMenuItemClick(item, e);
                setMobileMenuOpen(false);
              }}
            >
              {item.title}
            </button>
          )}
        </div>
      );
    });
  };

  return (
    <>
      <nav>
        <div className="nav-container">
          <button 
            type="button" 
            onClick={() => { if(!isPreview && setView) { setView({ type: 'home' }); setMobileMenuOpen(false); } }} 
            className="nav-logo"
            style={{ border: 'none', background: 'none', cursor: 'pointer' }}
          >
            Accueil
          </button>
          
          <div className="nav-links">
            {getActiveMenuItems().map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              if (hasChildren) {
                return (
                  <div className="dropdown" key={item.id} ref={(el) => { if(dropdownRefs) dropdownRefs.current[item.title] = el; }}>
                    <div className="ae-nav-item-compact" style={{ color: activeDropdown === item.title ? 'var(--secondary)' : 'inherit' }}>
                      {(item.status === "Actif" || item.isActive) && (item.url || item.shortcode) ? (
                        <button 
                          type="button"
                          className="nav-dropdown-btn"
                          onClick={(e) => {
                            handleMenuItemClick(item, e);
                            setActiveDropdown(null);
                          }}
                        >
                          {item.title}
                        </button>
                      ) : (
                        <span className="nav-dropdown-label">{item.title}</span>
                      )}
                      <button
                        type="button"
                        className="ae-input-addon-btn"
                        onClick={() => setActiveDropdown(activeDropdown === item.title ? null : item.title)}
                        aria-label={`Ouvrir le menu ${item.title}`}
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>
                    <div className={`dropdown-menu ${activeDropdown === item.title ? 'show' : ''}`} style={{ minWidth: '180px' }}>
                      {renderDropdownItems(item.children)}
                    </div>
                  </div>
                );
              } else {
                return (
                  <button 
                    key={item.id}
                    type="button"
                    className="nav-item"
                    onClick={(e) => handleMenuItemClick(item, e)}
                  >
                    {item.title}
                  </button>
                );
              }
            })}
          </div>

          <div className="nav-actions">
            {isPreview && (
              <div className="search-bar-simulated" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-search, #f1f5f9)', borderRadius: '20px', padding: '0.2rem 0.6rem', border: '1px solid var(--border-color, #e2e8f0)', marginRight: '0.5rem' }}>
                <Search size={13} style={{ color: 'var(--text-muted, #64748b)', marginRight: '0.35rem' }} />
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  className="ae-btn-reset-inline-xs" 
                  style={{ outline: 'none', width: '70px', fontSize: '0.75rem', height: '18px', border: 'none', background: 'transparent' }} 
                  disabled 
                />
              </div>
            )}
            <button 
              type="button" 
              className="nav-item contact-btn" 
              onClick={() => { if(!isPreview && setView) { setView({ type: 'contact' }); setMobileMenuOpen(false); } }}
            >
              Contact <Send size={13} />
            </button>

            {/* Mobile Hamburger toggle */}
            <button 
              type="button" 
              className="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu Mobile"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Navigation Menu */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <h2>Anjou Édition</h2>
          <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Fermer le menu">
            <X size={24} />
          </button>
        </div>
        <div className="mobile-drawer-content">
          {renderMobileMenuItems(getActiveMenuItems())}
        </div>
      </div>
    </>
  );
};
