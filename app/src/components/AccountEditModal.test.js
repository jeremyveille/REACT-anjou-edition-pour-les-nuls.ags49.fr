import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountEditModal from './AccountEditModal';
import * as authService from '../services/authService';

// Mock dependencies
jest.mock('../services/authService', () => {
  const original = jest.requireActual('../services/authService');
  return {
    ...original,
    changeCurrentUserPassword: jest.fn(() => Promise.resolve({ success: true })),
    sendAdminPasswordResetEmail: jest.fn(() => Promise.resolve({ success: true })),
    updateCurrentUserProfile: jest.fn(() => Promise.resolve({ success: true }))
  };
});

describe('AccountEditModal - Tests Complets de Gestion des Utilisateurs', () => {
  const mockCurrentUserGoogle = {
    uid: 'google-user-1',
    email: 'jeremy.veille@hotmail.fr',
    displayName: 'JEREMY VEILLE',
    providerData: [{ providerId: 'google.com' }]
  };

  const mockCurrentUserPassword = {
    uid: 'pass-user-1',
    email: 'admin@anjou-edition.fr',
    displayName: 'Admin Anjou',
    providerData: [{ providerId: 'password' }]
  };

  const mockPatAccount = {
    id: 'u1790502715612',
    name: 'Pat V.',
    email: 'pveille@ymail.com',
    role: 'Administrateur',
    status: 'Inactif',
    color: '#ec4899',
    photoURL: ''
  };

  const mockGoogleAccount = {
    id: 'u1',
    name: 'JEREMY VEILLE',
    email: 'jeremy.veille@hotmail.fr',
    role: 'Administrateur',
    status: 'Actif',
    color: '#004b7a',
    photoURL: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Affiche correctement les informations du compte et le statut inactif', () => {
    render(
      <AccountEditModal
        isOpen={true}
        account={mockPatAccount}
        currentUser={mockCurrentUserGoogle}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    // Titre et email
    expect(screen.getByRole('heading', { level: 3, name: /Pat V\./i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pat V.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('pveille@ymail.com')).toBeInTheDocument();

    // Statut inactif affiché
    expect(screen.getByText('Inactif (Désactivé)')).toBeInTheDocument();
  });

  test('2. Modification et sauvegarde du nom et du statut', async () => {
    const handleSave = jest.fn();

    render(
      <AccountEditModal
        isOpen={true}
        account={mockPatAccount}
        currentUser={mockCurrentUserGoogle}
        onClose={jest.fn()}
        onSave={handleSave}
      />
    );

    // Modifier le nom
    const nameInput = screen.getByLabelText(/Nom complet affiché/i);
    fireEvent.change(nameInput, { target: { value: 'Pat Veillé Édité' } });

    // Activer le compte
    const activateBtn = screen.getByRole('button', { name: /^Actif/i });
    fireEvent.click(activateBtn);

    // Enregistrer
    const saveBtn = screen.getByRole('button', { name: /Enregistrer les modifications/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const savedData = handleSave.mock.calls[0][0];
    expect(savedData.name).toBe('Pat Veillé Édité');
    expect(savedData.status).toBe('Actif');
  });

  test('3. Gestion correcte d\'un compte Google (aucune saisie directe de mot de passe)', () => {
    render(
      <AccountEditModal
        isOpen={true}
        account={mockGoogleAccount}
        currentUser={mockCurrentUserGoogle}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    // Aller sur l'onglet Sécurité
    const securityTab = screen.getByRole('button', { name: /Sécurité du compte/i });
    fireEvent.click(securityTab);

    // Vérifier l'affichage de la carte Google
    expect(screen.getByText(/Compte connecté avec Google/i)).toBeInTheDocument();
    expect(screen.getByText(/Aucun mot de passe n'est stocké sur la plateforme Anjou Édition/i)).toBeInTheDocument();

    // Vérifier l'absence de champs de saisie de mot de passe
    expect(screen.queryByLabelText(/Nouveau mot de passe/i)).not.toBeInTheDocument();
  });

  test('4. Modification du mot de passe pour son propre compte avec identifiants', async () => {
    const ownPasswordAccount = {
      id: 'u-admin-pwd',
      name: 'Admin Anjou',
      email: 'admin@anjou-edition.fr',
      role: 'Administrateur',
      status: 'Actif',
      color: '#004b7a'
    };

    render(
      <AccountEditModal
        isOpen={true}
        account={ownPasswordAccount}
        currentUser={mockCurrentUserPassword}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    // Onglet Sécurité
    fireEvent.click(screen.getByRole('button', { name: /Sécurité du compte/i }));

    // Champs de mot de passe visibles
    expect(screen.getByLabelText(/Mot de passe actuel/i)).toBeInTheDocument();
    const newPassInput = screen.getByLabelText(/^Nouveau mot de passe/i);
    const confirmPassInput = screen.getByLabelText(/Confirmer le nouveau mot de passe/i);

    // Saisie et vérification de la jauge
    fireEvent.change(newPassInput, { target: { value: 'SuperSecret123!' } });
    expect(screen.getByText(/Robustesse :/i)).toBeInTheDocument();

    fireEvent.change(confirmPassInput, { target: { value: 'SuperSecret123!' } });

    // Soumission du formulaire
    const submitBtn = screen.getByRole('button', { name: /Valider mon nouveau mot de passe/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.changeCurrentUserPassword).toHaveBeenCalledWith('', 'SuperSecret123!');
      expect(screen.getByText(/Votre mot de passe a été modifié avec succès/i)).toBeInTheDocument();
    });
  });

  test('5. Envoi d\'un e-mail de réinitialisation pour un autre compte (Pat V.)', async () => {
    window.confirm = jest.fn(() => true);

    render(
      <AccountEditModal
        isOpen={true}
        account={mockPatAccount}
        currentUser={mockCurrentUserPassword}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    // Onglet Sécurité
    fireEvent.click(screen.getByRole('button', { name: /Sécurité du compte/i }));

    // Bouton d'envoi d'e-mail de réinitialisation
    const resetBtn = screen.getByRole('button', { name: /Envoyer un lien de réinitialisation/i });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(authService.sendAdminPasswordResetEmail).toHaveBeenCalledWith('pveille@ymail.com');
      expect(screen.getByText(/Un e-mail officiel de réinitialisation a été transmis avec succès/i)).toBeInTheDocument();
    });
  });

  test('6. Protection du compte administrateur principal contre la rétrogradation', () => {
    render(
      <AccountEditModal
        isOpen={true}
        account={mockGoogleAccount}
        currentUser={mockCurrentUserGoogle}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    // Le select de rôle doit être désactivé
    const roleSelect = screen.getByLabelText(/Rôle de l'utilisateur/i);
    expect(roleSelect).toBeDisabled();

    // Le bouton pour désactiver doit être désactivé
    const inactifBtn = screen.getByRole('button', { name: /Inactif \(Désactivé\)/i });
    expect(inactifBtn).toBeDisabled();
  });

  test('7. Fermeture accessible via touche Échap', () => {
    const handleClose = jest.fn();

    render(
      <AccountEditModal
        isOpen={true}
        account={mockPatAccount}
        currentUser={mockCurrentUserGoogle}
        onClose={handleClose}
        onSave={jest.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
