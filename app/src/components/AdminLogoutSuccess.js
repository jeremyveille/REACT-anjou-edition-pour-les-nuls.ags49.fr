import React from 'react';
import { ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';

/**
 * Écran élégant et sécurisé affiché après la déconnexion du tableau de bord.
 * Respecte l'identité visuelle d'Anjou Édition, les normes WCAG AA et le responsive multi-écrans.
 */
export function AdminLogoutSuccess({
  onReconnect,
  onSwitchAccount,
  onBackToSite,
  isReconnecting = false,
  errorMessage = ''
}) {
  return (
    <div className="admin-logout-page">
      <div 
        className="admin-logout-card" 
        role="region" 
        aria-labelledby="logout-success-title"
      >
        {/* 1. Icône de sécurité dans son cercle doux */}
        <div className="admin-logout-icon-wrapper" aria-hidden="true">
          <ShieldCheck size={32} />
        </div>

        {/* 2. Titre principal */}
        <h1 id="logout-success-title" className="admin-logout-title">
          Déconnexion réussie
        </h1>

        {/* 3. Messages de confirmation */}
        <div className="admin-logout-message-group">
          <p className="admin-logout-text">
            Votre session administrative a été fermée de manière sécurisée.
          </p>
          <p className="admin-logout-subtext">
            À bientôt sur Anjou Édition !
          </p>
        </div>

        {/* Message d'erreur éventuel lors de la reconnexion */}
        {errorMessage && (
          <div className="admin-login-error fade-in" style={{ marginBottom: '1.25rem' }} role="alert">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 4. Bouton CTA Principal : Reconnexion avec Google */}
        <div className="admin-logout-actions">
          <button
            id="btn-reconnect"
            type="button"
            onClick={onReconnect}
            disabled={isReconnecting}
            className="admin-logout-reconnect-btn"
            aria-label="Se reconnecter avec Google"
          >
            <GoogleIcon />
            <span>{isReconnecting ? "Connexion en cours..." : "Se reconnecter avec Google"}</span>
          </button>
        </div>

        {/* 5. Option pour changer de compte Google */}
        <div className="admin-switch-account-wrapper admin-logout-switch-wrapper">
          <span className="admin-switch-account-prompt">
            Vous souhaitez utiliser une autre adresse e-mail ?
          </span>
          <button
            type="button"
            onClick={onSwitchAccount || onReconnect}
            disabled={isReconnecting}
            className="admin-switch-account-btn"
            aria-label="Changer de compte Google"
          >
            Changer de compte Google
          </button>
        </div>

        {/* 5. Lien secondaire discret : Retourner sur Anjou Édition */}
        <div>
          <button
            type="button"
            onClick={onBackToSite}
            className="admin-logout-back-link"
            aria-label="Retourner sur Anjou Édition"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Retourner sur Anjou Édition</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminLogoutSuccess;
