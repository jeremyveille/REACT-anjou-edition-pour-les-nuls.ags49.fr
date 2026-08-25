import React from "react";
import { Sparkles, ChevronRight, HelpCircle } from "lucide-react";

export default function InfoCard({ onLearnMore }) {

  return (
    <div
      id="anjou-info-card"
      className="ae-card"
      style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Upper image with custom literary focus */}
      <div style={{ position: 'relative', height: '200px' }}>
        <img
          src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop"
          alt="Anjou Edition - Livres"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          referrerPolicy="no-referrer"
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,75,122,0.9) 0%, rgba(0,75,122,0.3) 100%)' }}></div>
        
        {/* Floating badge */}
        <span style={{ position: 'absolute', top: '16px', left: '16px', background: '#004b7a', color: 'white', fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <Sparkles size={14} />
          Espace Littéraire
        </span>
      </div>

      {/* Primary content area */}
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--blue-dark, #004b7a)', color: 'white' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 12px 0', lineHeight: 1.2 }}>
            Le service Anjou Edition est activé
          </h3>
          
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 24px 0', fontWeight: 300 }}>
            Vous bénéficiez d'un espace de gestion pour créer, organiser et publier vos contenus littéraires. Accédez en toute simplicité à vos livres électroniques, galeries de poésies et outils pédagogiques.
          </p>
        </div>

        {/* Link footer */}
        <button
          id="btn-info-learn-more"
          onClick={onLearnMore}
          className="ae-button"
          style={{ width: '100%', justifyContent: 'space-between', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 16px' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={16} style={{ color: '#f59e0b' }} />
            Pour en savoir plus
          </span>
          <ChevronRight size={16} style={{ opacity: 0.7 }} />
        </button>
      </div>

      {/* Technical bottom indicator decoration */}
      <div style={{ background: '#023657', padding: '12px 24px', fontSize: '0.7rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>ID Client: AE-29381</span>
        <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }}></span>
          Actif
        </span>
      </div>
    </div>
  );
}
