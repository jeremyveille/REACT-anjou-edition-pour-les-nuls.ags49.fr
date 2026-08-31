import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyPolicy } from './PrivacyPolicy';
import { CookieConsentBanner } from './CookieConsentBanner';

describe('Privacy and Cookie Management Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('PrivacyPolicy renders GDPR rights and DPO contact information', () => {
    render(<PrivacyPolicy setView={jest.fn()} />);

    expect(screen.getByText(/Politique de Confidentialité & Mentions Légales/i)).toBeInTheDocument();
    expect(screen.getByText(/Responsable de publication et du traitement des données/i)).toBeInTheDocument();
    expect(screen.getByText(/Vos Droits \(Articles 15 à 22 du RGPD\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Effacer immédiatement toutes les données locales/i })).toBeInTheDocument();
  });

  test('CookieConsentBanner displays banner on first visit and saves consent on acceptance', () => {
    render(<CookieConsentBanner setView={jest.fn()} />);

    expect(screen.getByRole('region', { name: /Gestion des préférences et conformité RGPD/i })).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: /Accepter et continuer/i });
    fireEvent.click(acceptBtn);

    expect(localStorage.getItem('ae_cookie_consent')).toBe('accepted');
    expect(screen.queryByRole('region', { name: /Gestion des préférences et conformité RGPD/i })).not.toBeInTheDocument();
  });
});
