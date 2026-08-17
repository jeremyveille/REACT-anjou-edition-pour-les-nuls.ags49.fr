import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const PrivacyPolicy = ({ setView }) => {
  return (
    <div className="privacy-view fade-in">
      <button 
        type="button" 
        onClick={() => setView({ type: 'home' })} 
        className="btn-back"
      >
        <ArrowLeft size={16} /> Retour à l'accueil
      </button>

      <div className="contact-card">
        <h2>Politique de Confidentialité & Mentions Légales</h2>
        <div className="privacy-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.6', textAlign: 'left' }}>
          <section>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>1. Informations générales</h3>
            <p>Conformément au Règlement Général sur la Protection des Données (RGPD) et à la réglementation française en vigueur, nous vous informons sur la manière dont vos données personnelles sont collectées et traitées sur notre portail.</p>
          </section>
          <section>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>2. Collecte et finalité des données</h3>
            <p>Nous collectons uniquement les informations personnelles que vous nous fournissez volontairement via le formulaire de contact (nom, adresse e-mail, sujet et message). Le traitement de ces données a pour seule finalité de répondre à votre demande de contact et d'assurer le suivi de nos échanges.</p>
          </section>
          <section>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>3. Base légale et consentement</h3>
            <p>La base légale de ce traitement est votre consentement. Vous manifestez votre accord de manière explicite et univoque en cochant la case d'acceptation obligatoire avant d'envoyer votre message.</p>
          </section>
          <section>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>4. Durée de conservation des données</h3>
            <p>Vos données personnelles sont conservées pour une durée n'excédant pas 3 ans à compter du dernier contact de votre part, puis elles sont définitivement supprimées.</p>
          </section>
          <section>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>5. Sécurité et destinataires des données</h3>
            <p>Vos données sont destinées exclusivement aux personnes habilitées de l'équipe d'Anjou Édition. Elles ne sont jamais transmises, vendues ou cédées à des tiers. Les données sont stockées de manière sécurisée sur les serveurs de notre prestataire technique (Firebase/Google Cloud) et localement en cas de perte de connexion réseau temporaire.</p>
          </section>
          <section>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>6. Vos droits</h3>
            <p>Conformément à la loi « Informatique et Libertés », vous disposez d'un droit d'accès, de rectification, de limitation de traitement, d'effacement (droit à l'oubli) et d'opposition concernant vos informations. Pour exercer ces droits, vous pouvez nous écrire via le formulaire de contact.</p>
          </section>
          <section>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>7. Utilisation du stockage local (Cookies & LocalStorage)</h3>
            <p>Ce portail n'utilise aucun traceur publicitaire ou de profilage. Nous utilisons uniquement le stockage local de votre navigateur (LocalStorage) pour des fonctionnalités strictement fonctionnelles : mémorisation de votre choix de thème (clair/sombre), sauvegarde du cache des flipbooks pour accélérer l'affichage et mémorisation de vos préférences de lecture audio (volume/son activé). Ces données restent locales sur votre appareil.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
