import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Check, Settings2, Trash2 } from 'lucide-react';

export const CookieConsentBanner = ({ setView }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [localClearedNotice, setLocalClearedNotice] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('ae_cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('ae_cookie_consent', 'accepted');
    setShowBanner(false);
    setShowDetailsModal(false);
  };

  const handleRefuseNonEssential = () => {
    localStorage.setItem('ae_cookie_consent', 'functional_only');
    setShowBanner(false);
    setShowDetailsModal(false);
  };

  const handleClearLocalStorage = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes vos préférences locales (thème, sons, cache) ?')) {
      const currentConsent = localStorage.getItem('ae_cookie_consent');
      
      localStorage.clear();
      if (currentConsent) {
        localStorage.setItem('ae_cookie_consent', currentConsent);
      }
      
      setLocalClearedNotice(true);
      setTimeout(() => setLocalClearedNotice(false), 3000);
    }
  };

  if (!showBanner && !showDetailsModal) return null;

  return (
    <>
      {showBanner && (
        <aside 
          className="cookie-banner fade-in" 
          role="region" 
          aria-label="Gestion des préférences et conformité RGPD"
        >
          <div className="cookie-banner-content">
            <div className="cookie-banner-icon" aria-hidden="true">
              <ShieldCheck size={24} />
            </div>
            <div className="cookie-banner-text">
              <p className="cookie-title"><strong>Respect de votre vie privée & Stockage local</strong></p>
              <p className="cookie-desc">
                Nous n'utilisons aucun traceur publicitaire. Seules les données locales nécessaires au bon fonctionnement du portail (thème sombre, son des flipbooks, cache hors-ligne) sont conservées sur votre appareil.
              </p>
            </div>
            <div className="cookie-banner-actions">
              <button 
                type="button" 
                className="btn-cookie-accept" 
                onClick={handleAcceptAll}
                aria-label="Accepter et continuer"
              >
                <Check size={16} aria-hidden="true" /> Tout accepter
              </button>
              <button 
                type="button" 
                className="btn-cookie-manage" 
                onClick={() => setShowDetailsModal(true)}
                aria-label="Personnaliser les préférences de stockage"
              >
                <Settings2 size={16} aria-hidden="true" /> Paramétrer
              </button>
              {setView && (
                <button 
                  type="button" 
                  className="btn-cookie-link" 
                  onClick={() => {
                    setView({ type: 'privacy' });
                    setShowBanner(false);
                  }}
                >
                  En savoir plus
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Modal de personnalisation détaillée */}
      {showDetailsModal && (
        <div 
          className="cookie-modal-overlay" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="cookie-modal-title"
        >
          <div className="cookie-modal-card fade-in">
            <div className="cookie-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={22} color="var(--primary)" aria-hidden="true" />
                <h3 id="cookie-modal-title">Préférences de Confidentialité & RGPD</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowDetailsModal(false)}
                className="cookie-modal-close"
                aria-label="Fermer la fenêtre de préférences"
              >
                <X size={20} />
              </button>
            </div>

            <div className="cookie-modal-body">
              {localClearedNotice && (
                <div className="form-status-alert success" role="status" aria-live="polite">
                  <Check size={18} />
                  <span>Données locales réinitialisées avec succès.</span>
                </div>
              )}

              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Conformément aux recommandations de la CNIL et au RGPD, vous disposez d'un contrôle total sur les informations enregistrées dans votre navigateur.
              </p>

              <div className="cookie-item">
                <div className="cookie-item-header">
                  <div>
                    <strong>Stockage Fonctionnel (Obligatoire)</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                      Mémorisation du choix de thème (clair/sombre) et des réglages audio pour la lecture vocale.
                    </p>
                  </div>
                  <span className="badge-required">Actif</span>
                </div>
              </div>

              <div className="cookie-item">
                <div className="cookie-item-header">
                  <div>
                    <strong>Cache des Flipbooks & Pages (Performances)</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                      Accélère le chargement hors ligne des fables, poésies et brochures PDF sans envoyer de données personnelles.
                    </p>
                  </div>
                  <span className="badge-optional">Recommandé</span>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button 
                  type="button" 
                  onClick={handleClearLocalStorage}
                  className="btn-clear-local-data"
                  aria-label="Purger toutes les données locales stockées"
                >
                  <Trash2 size={16} /> Effacer mes données locales (Droit à l'oubli)
                </button>
              </div>
            </div>

            <div className="cookie-modal-footer">
              <button 
                type="button" 
                className="btn-cookie-refuse" 
                onClick={handleRefuseNonEssential}
              >
                Continuer avec le strict minimum
              </button>
              <button 
                type="button" 
                className="btn-cookie-accept" 
                onClick={handleAcceptAll}
              >
                <Check size={16} /> Tout autoriser
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsentBanner;
