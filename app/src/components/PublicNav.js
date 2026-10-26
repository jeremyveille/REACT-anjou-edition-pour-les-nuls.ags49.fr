import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Search, Send, Menu, X } from 'lucide-react';
import { BRAND_NAME } from '../constants/brand';

export const PublicNav = ({
  setView,
  mobileMenuOpen,
  setMobileMenuOpen,
  activeDropdown,
  setActiveDropdown,
  getActiveMenuItems,
  handleMenuItemClick,
  dropdownRefs,
  isPreview = false,
  onHomeClick = null
}) => {
  const drawerRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const drawer = drawerRef.current;
    const trigger = toggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('no-scroll');
    drawer?.querySelector('button')?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      } else if (event.key === 'Tab') {
        const focusable = [...drawer.querySelectorAll('button, summary, a[href], input')]
          .filter(element => !element.disabled && element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 900) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      trigger?.focus();
    };
  }, [mobileMenuOpen, setMobileMenuOpen]);

  const renderDropdownItems = (items, depth = 2, isArts = false, shouldOpenLeft = false) => {
    return items.map((child) => {
      const hasChilds = child.children && child.children.length > 0;
      const isLevel2 = depth === 2;
      if (hasChilds) {
        return (
          <div 
            key={child.id} 
            className={`dropdown-submenu level-${depth} ${isArts && isLevel2 ? 'dropdown-submenu-below' : ''} ${shouldOpenLeft ? 'open-left' : ''}`}
          >
            <div className={`ae-dropdown-submenu-item level-${depth}`}>
              {(child.status === "Actif" || child.isActive) && (child.url || child.shortcode) ? (
                <button 
                  type="button"
                  className={`ae-dropdown-sub-btn level-${depth}`}
                  onClick={(e) => {
                    handleMenuItemClick(child, e);
                    setActiveDropdown(null);
                  }}
                >
                  {child.title}
                </button>
              ) : (
                <span className={`ae-dropdown-sub-text level-${depth}`}>{child.title}</span>
              )}
              <span className="ae-dropdown-chevron">
                {isArts && isLevel2 ? (
                  <ChevronDown size={depth === 2 ? 12 : 11} />
                ) : (
                  <ChevronRight size={depth === 2 ? 12 : 11} />
                )}
              </span>
            </div>
            <div 
              className={`dropdown-menu dropdown-level-${depth + 1} ${isArts && isLevel2 ? 'dropdown-menu-below' : ''}`}
              style={{ maxWidth: 'calc(100vw - 20px)' }}
            >
              {renderDropdownItems(child.children, depth + 1, isArts, shouldOpenLeft)}
            </div>
          </div>
        );
      } else {
        return (
          <button 
            key={child.id} 
            type="button" 
            className={`dropdown-item level-${depth}`} 
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
        <div key={item.id} style={{ paddingLeft: `${depth * 10}px`, width: '100%' }}>
          {hasChilds ? (
            <details className={`mobile-details mobile-level-${depth + 1}`}>
              <summary className={`mobile-summary mobile-summary-level-${depth + 1}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="flex-grow">{item.title}</span>
                <span className="ae-action-icon-wrapper" aria-hidden="true"><ChevronDown size={14} /></span>
              </summary>
              <div className="mobile-details-content">
                {renderMobileMenuItems(item.children, depth + 1)}
              </div>
            </details>
          ) : (
            <button 
              type="button" 
              className={`mobile-nav-link ${depth === 0 ? 'main-link' : (depth === 1 ? 'sub-link level-2' : 'sub-link level-3')}`}
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
      <nav className="public-nav" aria-label="Navigation principale">
        <div className="nav-container">
          <button 
            type="button" 
            onClick={() => {
              if (onHomeClick) {
                onHomeClick();
              } else if (!isPreview && setView) {
                setView({ type: 'home' });
                setMobileMenuOpen(false);
              }
            }} 
            className="nav-logo"
            style={{ border: 'none', background: 'none', cursor: 'pointer' }}
          >
            ACCUEIL
          </button>
          
          <div className="nav-links">
            {getActiveMenuItems()
              .filter((item) => {
                const t = (item.title || '').trim().toLowerCase();
                if (t === 'accueil') return false;
                if (t === 'contact') return false;
                if (t === 'flipbooks' || t === 'vidéos' || t === 'videos' || t.startsWith('galerie')) return false;
                if (item.shortcode === 'show_flipbooks' || item.shortcode === 'show_videos' || item.shortcode === 'show_gallery') return false;
                return true;
              })
              .map((item, itemIndex, filteredItems) => {
              const hasChildren = item.children && item.children.length > 0;
              let displayTitle = item.title || '';
              if (displayTitle.trim().toUpperCase() === 'ART') displayTitle = 'ARTS';
              if (displayTitle.trim().toUpperCase() === 'CONTES ET LÉGENDES' || displayTitle.trim().toUpperCase() === 'CONTES ET LEGENDES') displayTitle = 'CONTES et LÉGENDES';
              if (hasChildren) {
                const isArts = (item.title || item.label || "").trim().toLowerCase().startsWith("art");
                const shouldOpenLeft = itemIndex >= Math.floor(filteredItems.length / 2);
                return (
                  <div 
                    className={`dropdown ${shouldOpenLeft ? 'dropdown-menu-align-left' : ''}`} 
                    key={item.id} 
                    ref={(el) => { if(dropdownRefs && dropdownRefs.current) dropdownRefs.current[item.title] = el; }}
                  >
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
                          {displayTitle}
                        </button>
                      ) : (
                        <span 
                          className="nav-dropdown-label"
                          onClick={() => setActiveDropdown(activeDropdown === item.title ? null : item.title)}
                        >
                          {displayTitle}
                        </span>
                      )}
                      <button
                        type="button"
                        className="ae-input-addon-btn"
                        onClick={() => setActiveDropdown(activeDropdown === item.title ? null : item.title)}
                        aria-label={`Ouvrir le menu ${displayTitle}`}
                        aria-expanded={activeDropdown === item.title}
                        aria-haspopup="true"
                      >
                        <ChevronDown size={11} aria-hidden="true" />
                      </button>
                    </div>
                    <div 
                      className={`dropdown-menu ${activeDropdown === item.title ? 'show' : ''}`} 
                      style={{ minWidth: '180px', maxWidth: 'calc(100vw - 20px)' }}
                    >
                      {renderDropdownItems(item.children, 2, isArts, shouldOpenLeft)}
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
                    {displayTitle}
                  </button>
                );
              }
            })}
          </div>

          <div className="nav-actions">
            {isPreview && (
              <div className="search-bar-simulated" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-search, #f1f5f9)', borderRadius: '20px', padding: '0.2rem 0.6rem', border: '1px solid var(--border-color, #e2e8f0)', marginRight: '0.5rem' }}>
                <Search size={13} style={{ color: 'var(--text-muted, #64748b)', marginRight: '0.35rem' }} aria-hidden="true" />
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  className="ae-btn-reset-inline-xs" 
                  style={{ outline: 'none', width: '70px', fontSize: '0.75rem', height: '18px', border: 'none', background: 'transparent' }} 
                  disabled 
                  aria-label="Recherche simulée (aperçu)"
                />
              </div>
            )}
            <button 
              type="button" 
              className="nav-item contact-btn" 
              onClick={() => { if(!isPreview && setView) { setView({ type: 'contact' }); setMobileMenuOpen(false); } }}
            >
              Contact <Send size={11} aria-hidden="true" />
            </button>

            {/* Mobile Hamburger toggle */}
            <button 
              type="button" 
              className="mobile-menu-toggle-btn"
              ref={toggleRef}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu Mobile"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-drawer"
            >
              {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Backdrop */}
      <div 
        className={`mobile-drawer-backdrop ${mobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setMobileMenuOpen(false)} 
        aria-hidden="true" 
      />

      {/* Mobile Drawer Navigation Menu */}
      <div id="mobile-drawer" ref={drawerRef} className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`} role="dialog" aria-modal={mobileMenuOpen ? true : undefined} aria-hidden={!mobileMenuOpen} inert={!mobileMenuOpen} aria-label="Menu principal de navigation mobile">
        <div className="mobile-drawer-header">
          <h2>{BRAND_NAME}</h2>
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
