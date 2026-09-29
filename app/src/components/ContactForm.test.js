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

  test('preserves the message and consent on failure without claiming delivery or writing personal data locally', async () => {
    addDoc.mockRejectedValueOnce(new Error('Network offline or permission error'));
    localStorage.setItem('contact_messages', 'invalid legacy storage');
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ContactForm setView={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Jean Dupont/i), { target: { value: 'Jeremy Veille' } });
    fireEvent.change(screen.getByPlaceholderText(/jean.dupont@email.com/i), { target: { value: 'jeremy@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Demande d'information/i), { target: { value: 'Question livre' } });
    fireEvent.change(screen.getByPlaceholderText(/Écrivez votre message ici.../i), { target: { value: 'Test message local.' } });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }));

    expect(await screen.findByText(/Votre message n’a pas été envoyé/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nom complet/i)).toHaveValue('Jeremy Veille');
    expect(screen.getByLabelText(/Adresse e-mail/i)).toHaveValue('jeremy@example.com');
    expect(screen.getByLabelText(/Votre message/i)).toHaveValue('Test message local.');
    expect(checkbox).toBeChecked();
    expect(localStorage.getItem('contact_messages')).toBe('invalid legacy storage');
    expect(screen.getByRole('button', { name: /Envoyer le message/i })).toBeEnabled();

    addDoc.mockResolvedValueOnce({ id: 'retry-success' });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }));
    expect(await screen.findByText(/Votre message a bien été envoyé/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Votre message/i)).toHaveValue('');
    expect(checkbox).not.toBeChecked();
    errorLog.mockRestore();
  });

  test('prevents duplicate submission until the server confirms delivery', async () => {
    let finish;
    addDoc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<ContactForm setView={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nom complet/i), { target: { value: 'Lecteur' } });
    fireEvent.change(screen.getByLabelText(/Adresse e-mail/i), { target: { value: 'lecteur@example.com' } });
    fireEvent.change(screen.getByLabelText(/Sujet/i), { target: { value: 'Lecture' } });
    fireEvent.change(screen.getByLabelText(/Votre message/i), { target: { value: 'Bonjour' } });
    fireEvent.click(screen.getByRole('checkbox'));
    const form = screen.getByLabelText(/Nom complet/i).closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Envoi du message en cours/i })).toBeDisabled();
    expect(screen.queryByText(/Votre message a bien été envoyé/i)).not.toBeInTheDocument();
    finish({ id: 'confirmed' });
    await waitFor(() => expect(screen.getByText(/Votre message a bien été envoyé/i)).toBeInTheDocument());
  });
});
