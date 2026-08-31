import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactForm from './ContactForm';
import { addDoc } from 'firebase/firestore';

jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: null }
}));

describe('ContactForm Component Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('renders contact form fields and inputs correctly', () => {
    render(<ContactForm setView={jest.fn()} />);

    expect(screen.getByLabelText(/Nom complet \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Adresse e-mail \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sujet \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Votre message \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Envoyer le message/i })).toBeInTheDocument();
  });

  test('requires GDPR consent checkbox before submission', async () => {
    render(<ContactForm setView={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Jean Dupont/i), { target: { value: 'Jeremy Veille' } });
    fireEvent.change(screen.getByPlaceholderText(/jean.dupont@email.com/i), { target: { value: 'jeremy@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Demande d'information/i), { target: { value: 'Question livre' } });
    fireEvent.change(screen.getByPlaceholderText(/Écrivez votre message ici.../i), { target: { value: 'Bonjour, félicitations pour le site.' } });

    // Submit without checking GDPR
    fireEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }));

    // Should display error message
    expect(await screen.findByText(/Veuillez accepter le traitement de vos données personnelles/i)).toBeInTheDocument();
  });

  test('submits successfully when online and GDPR consent is given', async () => {
    addDoc.mockResolvedValueOnce({ id: 'msg-online-1' });

    render(<ContactForm setView={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Jean Dupont/i), { target: { value: 'Jeremy Veille' } });
    fireEvent.change(screen.getByPlaceholderText(/jean.dupont@email.com/i), { target: { value: 'jeremy@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Demande d'information/i), { target: { value: 'Question livre' } });
    fireEvent.change(screen.getByPlaceholderText(/Écrivez votre message ici.../i), { target: { value: 'Message en ligne.' } });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }));

    expect(await screen.findByText(/Votre message a bien été envoyé/i)).toBeInTheDocument();
  });

  test('falls back to local storage when offline or firestore error occurs', async () => {
    addDoc.mockRejectedValueOnce(new Error('Network offline or permission error'));

    render(<ContactForm setView={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Jean Dupont/i), { target: { value: 'Jeremy Veille' } });
    fireEvent.change(screen.getByPlaceholderText(/jean.dupont@email.com/i), { target: { value: 'jeremy@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Demande d'information/i), { target: { value: 'Question livre' } });
    fireEvent.change(screen.getByPlaceholderText(/Écrivez votre message ici.../i), { target: { value: 'Test message local.' } });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }));

    expect(await screen.findByText(/Message enregistré localement/i)).toBeInTheDocument();

    await waitFor(() => {
      const messages = JSON.parse(localStorage.getItem('contact_messages') || '[]');
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].name).toBe('Jeremy Veille');
      expect(messages[0].email).toBe('jeremy@example.com');
    });
  });
});
