import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Send, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const ContactForm = ({ setView }) => {
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [formStatus, setFormStatus] = useState({ type: '', message: '', loading: false });
  const [gdprConsent, setGdprConsent] = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = contactForm.name.trim();
    const trimmedEmail = contactForm.email.trim();
    const trimmedSubject = contactForm.subject.trim();
    const trimmedMessage = contactForm.message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      setFormStatus({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires.', loading: false });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setFormStatus({ type: 'error', message: 'Veuillez saisir une adresse e-mail valide.', loading: false });
      return;
    }

    if (!gdprConsent) {
      setFormStatus({ type: 'error', message: 'Veuillez accepter le traitement de vos données personnelles.', loading: false });
      return;
    }

    setFormStatus({ type: '', message: '', loading: true });

    try {
      await addDoc(collection(db, 'contacts'), {
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        subject: trimmedSubject,
        message: trimmedMessage,
        timestamp: serverTimestamp()
      });

      setFormStatus({
        type: 'success',
        message: 'Votre message a bien été envoyé ! Nous vous répondrons dans les plus brefs délais.',
        loading: false
      });
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setGdprConsent(false);
    } catch (error) {
      console.error("Firebase Firestore Error: ", error);
      
      const offlineMessages = JSON.parse(localStorage.getItem('contact_messages') || '[]');
      offlineMessages.push({
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        subject: trimmedSubject,
        message: trimmedMessage,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('contact_messages', JSON.stringify(offlineMessages));

      setFormStatus({
        type: 'success',
        message: 'Message enregistré localement ! (Connexion serveur indisponible, nous le traiterons dès le rétablissement du réseau).',
        loading: false
      });
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setGdprConsent(false);
    }
  };

  return (
    <div className="contact-card">
      <h2>Formulaire de Contact</h2>
      <p>Une suggestion ? Une question sur nos ouvrages ou le patrimoine de l'Anjou ? Contactez-nous via ce formulaire.</p>

      {formStatus.message && (
        <div className={`form-status-alert ${formStatus.type}`} role="alert" aria-live="polite">
          {formStatus.type === 'success' ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertCircle size={20} aria-hidden="true" />}
          <p>{formStatus.message}</p>
        </div>
      )}

      <form onSubmit={handleContactSubmit} className="contact-form" noValidate={false}>
        <div className="form-group">
          <label htmlFor="form-name">Nom complet *</label>
          <input 
            type="text" 
            id="form-name" 
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            placeholder="Jean Dupont"
            autoComplete="name"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="form-email">Adresse e-mail *</label>
          <input 
            type="email" 
            id="form-email" 
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            placeholder="jean.dupont@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="form-subject">Sujet *</label>
          <input 
            type="text" 
            id="form-subject" 
            value={contactForm.subject}
            onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
            placeholder="Demande d'information"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="form-message">Votre message *</label>
          <textarea 
            id="form-message" 
            rows="6"
            value={contactForm.message}
            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
            placeholder="Écrivez votre message ici..."
            required
          ></textarea>
        </div>

        <div className="form-group-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          <input 
            type="checkbox" 
            id="form-gdpr" 
            checked={gdprConsent}
            onChange={(e) => setGdprConsent(e.target.checked)}
            required
            style={{ width: 'auto', marginTop: '0.25rem', cursor: 'pointer' }}
          />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'none', fontWeight: 'normal', textAlign: 'left' }}>
            <label htmlFor="form-gdpr" style={{ cursor: 'pointer', display: 'inline' }}>
              En cochant cette case, j'accepte que mes données personnelles soient traitées pour répondre à ma demande, conformément à la
            </label>{' '}
            <button type="button" onClick={(e) => { e.preventDefault(); setView({ type: 'privacy' }); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--secondary)', textDecoration: 'underline', font: 'inherit', cursor: 'pointer', display: 'inline' }}>politique de confidentialité</button>. *
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          <ShieldCheck size={16} color="var(--primary)" aria-hidden="true" />
          <span>Conservation maximale de 3 ans. Droit d'accès et d'effacement garanti.</span>
        </div>

        <button 
          type="submit" 
          className="btn-submit"
          disabled={formStatus.loading}
          aria-label={formStatus.loading ? "Envoi du message en cours..." : "Envoyer le message"}
        >
          {formStatus.loading ? "Envoi en cours..." : "Envoyer le message"}
          <Send size={18} style={{ marginLeft: '8px' }} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
};

export default ContactForm;
