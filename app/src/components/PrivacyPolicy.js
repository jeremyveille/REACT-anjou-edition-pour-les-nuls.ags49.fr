import React, { useState } from 'react';
import { ArrowLeft, Shield, Trash2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

export const PrivacyPolicy = ({ setView }) => {
  const [clearedSuccess, setClearedSuccess] = useState(false);

  const handleClearAllLocalData = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer l'intégralité des données en cache local sur cet appareil ?")) {
      localStorage.clear();
      setClearedSuccess(true);
      setTimeout(() => setClearedSuccess(false), 4000);
    }
  };

  return (
    <div className="privacy-view fade-in">
      <button 
        type="button" 
        onClick={() => setView({ type: 'home' })} 
        className="btn-back"
        aria-label="Retour à l'accueil du site"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Retour à l'accueil
      </button>

      <div className="contact-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <Shield size={32} color="var(--primary)" aria-hidden="true" />
          <h2 style={{ margin: 0 }}>Politique de Confidentialité & Mentions Légales</h2>
        </div>

        {clearedSuccess && (
          <div className="form-status-alert success" role="alert" aria-live="polite" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle2 size={20} aria-hidden="true" />
            <p>Toutes les données de stockage local ont été effacées avec succès.</p>
          </div>
        )}

        <div className="privacy-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.7', textAlign: 'left' }}>
          <section>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>1. Informations Générales & Responsable du Traitement</h3>
            <p>
              Le site <strong>Anjou Édition – Pour les Nuls</strong> est un portail culturel dédié au patrimoine littéraire et historique de l'Anjou.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Responsable de publication et du traitement des données :</strong><br />
              Équipe Éditoriale Anjou Édition – Maine-et-Loire (49), France.<br />
              <strong>Contact Référent RGPD / DPO :</strong> <a href="mailto:contact@anjou-edition-nuls.fr" style={{ color: 'var(--secondary)' }}>contact@anjou-edition-nuls.fr</a>
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Hébergement :</strong> Firebase Hosting / Google Cloud Platform (centres de données conformes aux clauses contractuelles types de l'UE et au RGPD).
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>2. Données Collectées et Finalité</h3>
            <p>
              Dans un souci de <strong>minimisation des données</strong> (Art. 5 RGPD), nous ne collectons que les informations strictement nécessaires :
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li><strong>Formulaire de contact :</strong> Nom complet, adresse e-mail, sujet et contenu du message.</li>
              <li><strong>Finalité unique :</strong> Répondre aux demandes d'informations des lecteurs et assurer le suivi des échanges culturels ou éditoriaux.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>3. Base Légale du Traitement</h3>
            <p>
              Le traitement de vos données est fondé sur votre <strong>consentement explicite</strong> (Art. 6.1.a du RGPD), recueilli par une case à cocher obligatoire et non pré-cochée avant l'envoi du formulaire de contact.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>4. Durée de Conservation des Données</h3>
            <p>
              Les messages reçus via le formulaire sont conservés pour une durée maximale de <strong>3 ans</strong> à compter du dernier contact émanant de votre part, conformément aux préconisations de la CNIL relatives aux fichiers de prospection et de contact. Au-delà, ils sont supprimés définitivement.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>5. Sécurité et Destinataires des Données</h3>
            <p>
              Vos données sont transmises via un protocole chiffré HTTPS (TLS 1.3) et stockées de façon sécurisée. Elles sont réservées à l'usage exclusif de l'équipe d'Anjou Édition et <strong>ne font l'objet d'aucune cession, revente ou transfert commercial</strong> à des tiers.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>6. Vos Droits (Articles 15 à 22 du RGPD)</h3>
            <p>Conformément à la réglementation européenne et à la loi Informatique et Libertés modifiée, vous disposez des droits suivants :</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li><strong>Droit d'accès et de communication :</strong> Obtenir une copie de vos données personnelles détenues.</li>
              <li><strong>Droit de rectification :</strong> Corriger des données inexactes ou incomplètes.</li>
              <li><strong>Droit à l'effacement (« Droit à l'oubli ») :</strong> Demander la suppression définitive de vos données.</li>
              <li><strong>Droit à la limitation du traitement :</strong> Geler temporairement l'utilisation de vos données.</li>
              <li><strong>Droit d'opposition et de retrait du consentement :</strong> Retirer votre consentement à tout moment.</li>
              <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré et lisible par machine.</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              Pour exercer l'un de ces droits, adressez votre demande par notre <button type="button" onClick={() => setView({ type: 'contact' })} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--secondary)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>formulaire de contact</button> ou par courriel à <a href="mailto:contact@anjou-edition-nuls.fr" style={{ color: 'var(--secondary)' }}>contact@anjou-edition-nuls.fr</a>. Une réponse vous sera apportée sous 30 jours au maximum.
            </p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>CNIL (Commission Nationale de l'Informatique et des Libertés) <ExternalLink size={12} /></a>.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>7. Cookies & Stockage Local (LocalStorage)</h3>
            <p>
              Ce site n'implémente <strong>aucun cookie publicitaire, traceur tiers ou outil de profilage commercial</strong>. Nous exploitons exclusivement le stockage local de votre navigateur (<code>localStorage</code>) pour :
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>La mémorisation de votre thème graphique préféré (Clair / Sombre).</li>
              <li>Vos préférences de lecture audio (volume et synthèse vocale activée/désactivée).</li>
              <li>La mise en cache hors-ligne des textes, poésies et métadonnées de flipbooks pour un affichage instantané.</li>
            </ul>

            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-card, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="var(--primary)" /> Gestion directe de vos données locales
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Vous pouvez purger à tout instant les clés enregistrées par ce site dans votre navigateur :
              </p>
              <button 
                type="button" 
                onClick={handleClearAllLocalData} 
                className="btn-clear-local-data"
                aria-label="Effacer immédiatement toutes les données locales"
              >
                <Trash2 size={16} /> Effacer toutes les données locales enregistrées
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
