import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminLogoutSuccess from './AdminLogoutSuccess';

describe('AdminLogoutSuccess Component', () => {
  test('renders security icon, title, confirmation texts, and buttons', () => {
    const mockReconnect = jest.fn();
    const mockBackToSite = jest.fn();

    render(
      <AdminLogoutSuccess 
        onReconnect={mockReconnect} 
        onBackToSite={mockBackToSite} 
      />
    );

    // 1. Title h1
    expect(screen.getByRole('heading', { level: 1, name: /Déconnexion réussie/i })).toBeInTheDocument();

    // 2. Texts
    expect(screen.getByText(/Votre session administrative a été fermée de manière sécurisée/i)).toBeInTheDocument();
    expect(screen.getByText(/À bientôt sur Anjou Édition !/i)).toBeInTheDocument();

    // 3. Primary CTA button
    const reconnectBtn = screen.getByRole('button', { name: /Se reconnecter avec Google/i });
    expect(reconnectBtn).toBeInTheDocument();
    expect(reconnectBtn).toHaveAttribute('id', 'btn-reconnect');

    // 4. Secondary link/button
    const backBtn = screen.getByRole('button', { name: /Retourner sur Anjou Édition/i });
    expect(backBtn).toBeInTheDocument();

    // 5. Trigger actions
    fireEvent.click(reconnectBtn);
    expect(mockReconnect).toHaveBeenCalledTimes(1);

    fireEvent.click(backBtn);
    expect(mockBackToSite).toHaveBeenCalledTimes(1);
  });

  test('displays reconnecting state when isReconnecting is true', () => {
    render(
      <AdminLogoutSuccess 
        onReconnect={jest.fn()} 
        onBackToSite={jest.fn()} 
        isReconnecting={true} 
      />
    );

    const reconnectBtn = screen.getByRole('button', { name: /Se reconnecter avec Google/i });
    expect(reconnectBtn).toBeDisabled();
    expect(screen.getByText(/Connexion en cours\.\.\./i)).toBeInTheDocument();
  });

  test('displays error message when provided', () => {
    render(
      <AdminLogoutSuccess 
        onReconnect={jest.fn()} 
        onBackToSite={jest.fn()} 
        errorMessage="Erreur de test de reconnexion" 
      />
    );

    expect(screen.getByText(/Erreur de test de reconnexion/i)).toBeInTheDocument();
  });
});
