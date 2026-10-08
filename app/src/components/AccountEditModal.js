import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  Mail, 
  ShieldCheck, 
  ShieldOff, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Clock, 
  Palette, 
  Check, 
  AlertCircle, 
  AlertTriangle,
  Save,
  CheckCircle2,
  Camera
} from 'lucide-react';
import GoogleIcon from './GoogleIcon';
import { 
  isGoogleUser, 
  evaluatePasswordStrength, 
  changeCurrentUserPassword, 
  sendAdminPasswordResetEmail,
  getFriendlyAuthErrorMessage,
  normalizeEmail
} from '../services/authService';
import '../styles/account-admin.css';

const AVATAR_COLOR_PALETTE = [
  '#004b7a', // Bleu Anjou Officiel
  '#0284c7', // Bleu Cyan
  '#0d9488', // Émeraude / Sarcelle
  '#16a34a', // Vert Forêt
  '#d97706', // Ambre / Or
  '#dc2626', // Rouge Ardoise
  '#7c3aed', // Violet Royal
  '#db2777', // Rose Littéraire
  '#475569'  // Ardoise Neutre
];

/**
 * Modale Complète de Gestion et Fiche Utilisateur
 * Permet la modification du profil, du rôle, du statut administratif
 * et la gestion sécurisée du mot de passe selon la méthode d'authentification.
 * Conforme WCAG 2.2 AA.
 */
export default function AccountEditModal({
  isOpen,
  account,
  currentUser,
  onClose,
  onSave,
  onToggleStatus,
  isSaving = false
}) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'history'

  // États du formulaire profil
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Écrivain');
  const [status, setStatus] = useState('Actif');
  const [color, setColor] = useState('#004b7a');
  const [photoURL, setPhotoURL] = useState('');

  // États du changement de mot de passe (pour son propre compte)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: null, message: '' });

  // États de réinitialisation par email (pour un autre compte)
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetStatus, setResetStatus] = useState({ type: null, message: '' });

  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (account && isOpen) {
      setName(account.name || '');
      setEmail(account.email || '');
      setRole(account.role || 'Écrivain');
      setStatus(account.status || 'Actif');
      setColor(account.color || '#004b7a');
      setPhotoURL(account.photoURL || '');
      setActiveTab('profile');

      // Réinitialiser les champs de sécurité
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus({ type: null, message: '' });
      setResetStatus({ type: null, message: '' });

      // Focus accessible
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    }
  }, [account, isOpen]);

  // Fermeture par touche Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSaving && !isUpdatingPassword) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSaving, isUpdatingPassword, onClose]);

  if (!isOpen || !account) return null;

  // Déterminer s'il s'agit du compte actuellement connecté
  const currentEmail = normalizeEmail(currentUser?.email);
  const accountEmail = normalizeEmail(account.email);
  const isCurrentUser = Boolean(currentEmail && accountEmail && currentEmail === accountEmail);

  // Déterminer si le compte utilise Google
  const accountIsGoogle = isGoogleUser(account) || (isCurrentUser && isGoogleUser(currentUser));

  // Compte principal protégé (interdiction de rétrograder le super admin)
  const isPrimaryAdmin = accountEmail === 'jeremy.veille@hotmail.fr';

  // Robustesse du mot de passe
  const strength = evaluatePasswordStrength(newPassword);

  // Soumission des modifications générales du compte
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Le nom de l'utilisateur est obligatoire.");
      return;
    }
    if (!email.trim()) {
      alert("L'adresse e-mail est obligatoire.");
      return;
    }

    const updatedData = {
      ...account,
      name: name.trim(),
      email: email.trim(),
      role: isPrimaryAdmin ? 'Administrateur' : role,
      status: isPrimaryAdmin ? 'Actif' : status,
      color,
      photoURL: photoURL.trim(),
      updatedAt: new Date().toISOString()
    };

    await onSave(updatedData);
  };

  // Traitement de modification du mot de passe (propre compte)
  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: null, message: '' });

    if (!newPassword) {
      setPasswordStatus({ type: 'error', message: "Veuillez saisir un nouveau mot de passe." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: "Le nouveau mot de passe doit comporter au moins 6 caractères." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: "Les deux mots de passe saisis ne correspondent pas." });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await changeCurrentUserPassword(currentPassword, newPassword);
      setPasswordStatus({ 
        type: 'success', 
        message: "Votre mot de passe a été modifié avec succès dans Firebase Authentication !" 
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setPasswordStatus({ type: 'error', message: friendlyMsg });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Traitement d'envoi du lien de réinitialisation (autre compte)
  const handleSendResetEmailClick = async () => {
    setResetStatus({ type: null, message: '' });

    if (!window.confirm(`Envoyer un e-mail officiel de réinitialisation de mot de passe à l'adresse "${account.email}" ?`)) {
      return;
    }

    try {
      setIsSendingReset(true);
      await sendAdminPasswordResetEmail(account.email);
      setResetStatus({
        type: 'success',
        message: `Un e-mail officiel de réinitialisation a été transmis avec succès à "${account.email}". L'utilisateur pourra définir son nouveau mot de passe en toute sécurité.`
      });
    } catch (err) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setResetStatus({ type: 'error', message: friendlyMsg });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div 
      className="ae-account-modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving && !isUpdatingPassword) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="ae-account-modal-container" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        
        {/* EN-TÊTE MODAL */}
        <header className="ae-account-modal-header">
          <div className="ae-account-modal-header-left">
            <div className="ae-account-modal-header-avatar" style={{ backgroundColor: color }}>
              {photoURL ? (
                <img src={photoURL} alt={name || 'Avatar'} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                (name || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 id="account-modal-title" className="ae-account-modal-title">
                {name || 'Fiche Compte'}
              </h3>
              <p className="ae-account-modal-subtitle">
                {email} • <span style={{ fontWeight: 700 }}>{role}</span> • 
                <span style={{ color: status === 'Actif' ? '#10b981' : '#f59e0b', marginLeft: '4px' }}>
                  {status}
                </span>
                {isCurrentUser && <span style={{ marginLeft: '6px', fontStyle: 'italic' }}>(Vous)</span>}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="ae-account-modal-close-btn"
            title="Fermer la fenêtre (Échap)"
            aria-label="Fermer la fenêtre"
            disabled={isSaving || isUpdatingPassword}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {/* ONGLETS */}
        <nav className="ae-account-tabs" aria-label="Sections de la fiche utilisateur">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`ae-account-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            aria-current={activeTab === 'profile' ? 'page' : undefined}
          >
            <User size={16} aria-hidden="true" /> Profil & Droits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`ae-account-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            aria-current={activeTab === 'security' ? 'page' : undefined}
          >
            <Lock size={16} aria-hidden="true" /> Sécurité du compte
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`ae-account-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            aria-current={activeTab === 'history' ? 'page' : undefined}
          >
            <Clock size={16} aria-hidden="true" /> Activité & Métadonnées
          </button>
        </nav>

        {/* CORPS DE LA MODALE */}
        <div className="ae-account-modal-body">
          
          {/* ======================= ONGLET 1 : PROFIL & DROITS ======================= */}
          {activeTab === 'profile' && (
            <form id="account-profile-form" onSubmit={handleSaveProfile} className="ae-account-section">
              
              {/* Informations Générales */}
              <div className="ae-account-card-box">
                <h4 className="ae-account-section-title">
                  <User size={16} className="ae-icon-blue" /> Informations personnelles
                </h4>

                <div className="ae-form-grid-2">
                  <div className="ae-form-group">
                    <label htmlFor="account-name-input" className="ae-form-label">
                      Nom complet affiché <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="account-name-input"
                      ref={firstInputRef}
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: Pat Veillé"
                      className="ae-form-input"
                    />
                    <span className="ae-form-hint">Nom visible sur les articles et le tableau de bord.</span>
                  </div>

                  <div className="ae-form-group">
                    <label htmlFor="account-email-input" className="ae-form-label">
                      Adresse e-mail <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="account-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@exemple.fr"
                      className="ae-form-input"
                    />
                    <span className="ae-form-hint">Adresse utilisée pour les notifications et l'authentification.</span>
                  </div>
                </div>

                {/* Avatar & Palette */}
                <div className="ae-form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="ae-form-label">
                    <Palette size={14} /> Avatar & Couleur de profil
                  </label>
                  <div className="ae-avatar-config-row">
                    <div className="ae-avatar-preview-wrapper" style={{ backgroundColor: color }}>
                      {photoURL ? (
                        <img src={photoURL} alt="Aperçu" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        (name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ flexGrow: 1, minWidth: '220px' }}>
                      <span className="ae-form-hint" style={{ marginBottom: '6px', display: 'block' }}>
                        Couleur d'initiale de la charte Anjou Édition :
                      </span>
                      <div className="ae-palette-presets">
                        {AVATAR_COLOR_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={`ae-color-circle-btn ${color === c ? 'selected' : ''}`}
                            style={{ backgroundColor: c }}
                            title={`Choisir la couleur ${c}`}
                            aria-label={`Couleur ${c}`}
                          >
                            {color === c && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photo de profil personnalisée */}
                <div className="ae-form-group">
                  <label htmlFor="account-photo-input" className="ae-form-label">
                    <Camera size={14} /> URL d'une photo de profil (optionnel)
                  </label>
                  <input
                    id="account-photo-input"
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://domaine.fr/mon-avatar.jpg"
                    className="ae-form-input"
                  />
                  <span className="ae-form-hint">Lien direct vers une image hébergée ou photo Google. Laissez vide pour utiliser l'avatar d'initiale.</span>
                </div>
              </div>

              {/* Rôle & Statut Administratif */}
              <div className="ae-account-card-box">
                <h4 className="ae-account-section-title">
                  <ShieldCheck size={16} className="ae-icon-blue" /> Permissions & Statut administratif
                </h4>

                <div className="ae-form-grid-2">
                  {/* Rôle */}
                  <div className="ae-form-group">
                    <label htmlFor="account-role-select" className="ae-form-label">
                      Rôle de l'utilisateur
                    </label>
                    <select
                      id="account-role-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={isPrimaryAdmin}
                      className="ae-form-select"
                    >
                      <option value="Administrateur">Administrateur (Gestion totale)</option>
                      <option value="Écrivain">Écrivain (Rédaction d'articles)</option>
                      <option value="Éditeur">Éditeur (Modération littéraire)</option>
                    </select>
                    {isPrimaryAdmin && (
                      <span className="ae-form-hint" style={{ color: '#0369a1' }}>
                        Le compte super-administrateur ne peut pas être rétrogradé.
                      </span>
                    )}
                  </div>

                  {/* Statut Administratif */}
                  <div className="ae-form-group">
                    <label className="ae-form-label">
                      Statut administratif du compte
                    </label>
                    <div className="ae-status-selector">
                      <button
                        type="button"
                        onClick={() => setStatus('Actif')}
                        className={`ae-status-option-btn ${status === 'Actif' ? 'active' : ''}`}
                      >
                        <span className="ae-status-option-header" style={{ color: '#10b981' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={16} /> Actif
                          </span>
                          {status === 'Actif' && <Check size={14} />}
                        </span>
                        <span className="ae-status-option-desc">
                          Accès autorisé aux fonctionnalités du portail selon le rôle.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatus('Inactif')}
                        disabled={isPrimaryAdmin}
                        className={`ae-status-option-btn is-inactive ${status === 'Inactif' ? 'active' : ''}`}
                      >
                        <span className="ae-status-option-header" style={{ color: '#f59e0b' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldOff size={16} /> Inactif (Désactivé)
                          </span>
                          {status === 'Inactif' && <Check size={14} />}
                        </span>
                        <span className="ae-status-option-desc">
                          Accès suspendu administrativement.
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Explication Pédagogique sur le Statut Inactif */}
                <div className="ae-info-banner">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Distinction clé entre statut administratif et connexion technique :</strong>
                    <div style={{ marginTop: '4px' }}>
                      Le statut <em>« Inactif »</em> est un verrou administratif défini dans la base de données. Il permet de suspendre les privilèges d'un compte sans effacer son historique ni modifier son compte d'authentification Firebase.
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ======================= ONGLET 2 : SÉCURITÉ DU COMPTE ======================= */}
          {activeTab === 'security' && (
            <div className="ae-account-section">
              
              {/* CAS 1 : COMPTE GOOGLE OAUTH */}
              {accountIsGoogle ? (
                <div className="ae-google-card">
                  <div className="ae-google-card-header">
                    <GoogleIcon size={32} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                        Compte connecté avec Google
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                        Fédération d'identité sécurisée pour {account.email}
                      </p>
                    </div>
                  </div>

                  <div className="ae-info-banner">
                    <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Sécurité déléguée à Google :</strong>
                      <p style={{ margin: '4px 0 0 0' }}>
                        Ce compte s'authentifie via le protocole sécurisé Google OAuth. 
                        <strong> Aucun mot de passe n'est stocké sur la plateforme Anjou Édition.</strong>
                      </p>
                      <p style={{ margin: '6px 0 0 0' }}>
                        Pour modifier le mot de passe, activer l'authentification à deux facteurs ou gérer les clés de sécurité, rendez-vous directement dans les paramètres de votre compte Google.
                      </p>
                    </div>
                  </div>

                  {isCurrentUser && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <a 
                        href="https://myaccount.google.com/security" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="ae-btn ae-btn-secondary"
                      >
                        <ExternalLink size={16} /> Gérer la sécurité de mon compte Google
                      </a>
                    </div>
                  )}
                </div>
              ) : isCurrentUser ? (
                /* CAS 2 : PROPRE COMPTE (AVEC MOT DE PASSE) */
                <form onSubmit={handlePasswordChangeSubmit} className="ae-account-card-box">
                  <h4 className="ae-account-section-title">
                    <KeyRound size={16} className="ae-icon-blue" /> Modifier mon mot de passe
                  </h4>
                  <p className="ae-form-hint" style={{ marginTop: '-0.5rem' }}>
                    Modifiez le mot de passe de votre compte administrateur connecté.
                  </p>

                  {passwordStatus.type === 'success' && (
                    <div className="ae-success-banner" role="alert">
                      <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                      <div>{passwordStatus.message}</div>
                    </div>
                  )}

                  {passwordStatus.type === 'error' && (
                    <div className="ae-warning-banner" role="alert">
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <div>{passwordStatus.message}</div>
                    </div>
                  )}

                  <div className="ae-form-group">
                    <label htmlFor="current-pass-input" className="ae-form-label">
                      Mot de passe actuel
                    </label>
                    <div className="ae-password-input-wrapper">
                      <input
                        id="current-pass-input"
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="ae-form-input"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="ae-password-toggle-btn"
                        title={showCurrentPass ? "Masquer" : "Afficher"}
                        aria-label={showCurrentPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span className="ae-form-hint">Requis par Firebase pour valider votre identité.</span>
                  </div>

                  <div className="ae-form-group">
                    <label htmlFor="new-pass-input" className="ae-form-label">
                      Nouveau mot de passe <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="ae-password-input-wrapper">
                      <input
                        id="new-pass-input"
                        type={showNewPass ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Au moins 8 caractères recommandés"
                        className="ae-form-input"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="ae-password-toggle-btn"
                        title={showNewPass ? "Masquer" : "Afficher"}
                        aria-label={showNewPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* JAUGE DE ROBUSTESSE */}
                    {newPassword.length > 0 && (
                      <div className="ae-password-strength-container" aria-live="polite">
                        <div className="ae-strength-header">
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Robustesse :</span>
                          <span className="ae-strength-label" style={{ color: strength.color }}>
                            {strength.label}
                          </span>
                        </div>
                        <div className="ae-strength-bar-bg">
                          <div 
                            className="ae-strength-bar-fill"
                            style={{ width: `${strength.percent}%`, backgroundColor: strength.color }}
                          />
                        </div>
                        <div className="ae-strength-tips">
                          {strength.feedback.map((tip, idx) => (
                            <span key={idx} className="ae-strength-tip-pill">{tip}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ae-form-group">
                    <label htmlFor="confirm-pass-input" className="ae-form-label">
                      Confirmer le nouveau mot de passe <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="ae-password-input-wrapper">
                      <input
                        id="confirm-pass-input"
                        type={showConfirmPass ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Répétez le nouveau mot de passe"
                        className="ae-form-input"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="ae-password-toggle-btn"
                        title={showConfirmPass ? "Masquer" : "Afficher"}
                        aria-label={showConfirmPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                    <button
                      type="submit"
                      disabled={isUpdatingPassword || !newPassword}
                      className="ae-btn ae-btn-primary"
                    >
                      <Save size={16} />
                      {isUpdatingPassword ? "Mise à jour en cours..." : "Valider mon nouveau mot de passe"}
                    </button>
                  </div>
                </form>
              ) : (
                /* CAS 3 : COMPTE D'UN AUTRE UTILISATEUR (PAT V., ETC.) */
                <div className="ae-account-card-box">
                  <h4 className="ae-account-section-title">
                    <KeyRound size={16} className="ae-icon-blue" /> Réinitialisation sécurisée du mot de passe
                  </h4>

                  <div className="ae-info-banner">
                    <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Protection de la vie privée & Chiffrement :</strong>
                      <p style={{ margin: '4px 0 0 0' }}>
                        Pour des raisons strictes de conformité de sécurité et RGPD, 
                        <strong> aucun administrateur ne peut voir ou saisir le mot de passe d'un autre utilisateur</strong>.
                      </p>
                      <p style={{ margin: '6px 0 0 0' }}>
                        Vous pouvez transmettre un lien sécurisé généré par Firebase Authentication vers son adresse e-mail officielle. L'utilisateur pourra définir son mot de passe en toute confidentialité.
                      </p>
                    </div>
                  </div>

                  {resetStatus.type === 'success' && (
                    <div className="ae-success-banner" role="alert">
                      <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                      <div>{resetStatus.message}</div>
                    </div>
                  )}

                  {resetStatus.type === 'error' && (
                    <div className="ae-warning-banner" role="alert">
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <div>{resetStatus.message}</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleSendResetEmailClick}
                      disabled={isSendingReset}
                      className="ae-btn ae-btn-primary"
                      title={`Envoyer un email de réinitialisation à ${account.email}`}
                    >
                      <Mail size={16} />
                      {isSendingReset ? "Envoi du lien sécurisé..." : `Envoyer un lien de réinitialisation à ${account.email}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= ONGLET 3 : ACTIVITÉ & MÉTADONNÉES ======================= */}
          {activeTab === 'history' && (
            <div className="ae-account-section">
              <div className="ae-account-card-box">
                <h4 className="ae-account-section-title">
                  <Clock size={16} className="ae-icon-blue" /> Historique et informations techniques
                </h4>

                <div className="ae-metadata-list">
                  <div className="ae-metadata-item">
                    <span className="ae-metadata-label">Identifiant système (ID)</span>
                    <span className="ae-metadata-value" style={{ fontFamily: 'monospace' }}>
                      {account.id || 'N/A'}
                    </span>
                  </div>

                  <div className="ae-metadata-item">
                    <span className="ae-metadata-label">Méthode d'authentification</span>
                    <span className="ae-metadata-value">
                      {accountIsGoogle ? "Google OAuth (Fédéré)" : "E-mail & Mot de passe"}
                    </span>
                  </div>

                  <div className="ae-metadata-item">
                    <span className="ae-metadata-label">Date de création du compte</span>
                    <span className="ae-metadata-value">
                      {account.createdAt ? new Date(account.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : (currentUser?.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString('fr-FR') : "Date antérieure")}
                    </span>
                  </div>

                  <div className="ae-metadata-item">
                    <span className="ae-metadata-label">Dernière connexion enregistrée</span>
                    <span className="ae-metadata-value">
                      {account.lastLoginAt ? new Date(Number(account.lastLoginAt) || account.lastLoginAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : (currentUser?.metadata?.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : "Non disponible")}
                    </span>
                  </div>

                  <div className="ae-metadata-item">
                    <span className="ae-metadata-label">Statut administratif</span>
                    <span className="ae-metadata-value" style={{ color: status === 'Actif' ? '#10b981' : '#f59e0b' }}>
                      {status}
                    </span>
                  </div>

                  <div className="ae-metadata-item">
                    <span className="ae-metadata-label">Dernière modification administrative</span>
                    <span className="ae-metadata-value">
                      {account.updatedAt ? new Date(account.updatedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : "Non enregistrée"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* PIED DE PAGE DE LA MODALE */}
        <footer className="ae-account-modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isUpdatingPassword}
            className="ae-btn ae-btn-secondary"
          >
            Annuler
          </button>
          
          <button
            type="submit"
            form="account-profile-form"
            disabled={isSaving || isUpdatingPassword}
            className="ae-btn ae-btn-primary"
          >
            <Save size={16} />
            {isSaving ? "Enregistrement en cours..." : "Enregistrer les modifications"}
          </button>
        </footer>

      </div>
    </div>
  );
}
