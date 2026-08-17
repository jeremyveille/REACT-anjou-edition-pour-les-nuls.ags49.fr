import { useState } from 'react';
import { useBuilder } from '../store/builderStore';
import { X, Palette, Type, Layout } from 'lucide-react';

function Field({ label, children }) {
  return (
    <div className="pb-field" style={{marginBottom: '0.875rem'}}>
      <label className="pb-label" style={{display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--pb-text-2)', marginBottom: '0.3rem'}}>{label}</label>
      {children}
    </div>
  );
}

export default function GlobalSettings() {
  const { isGlobalSettingsOpen, setIsGlobalSettingsOpen } = useBuilder();
  const [globalColors, setGlobalColors] = useState({
    primary: '#3b6ef8',
    secondary: '#334155',
    text: '#0f172a',
    bg: '#ffffff'
  });

  if (!isGlobalSettingsOpen) return null;

  return (
    <div className="builder-settings-panel" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '300px', zIndex: 1050, borderRight: '1px solid var(--pb-border)', boxShadow: 'var(--pb-shadow-lg)' }}>
      <div className="pb-settings-header">
        <div className="pb-settings-title">
          <Layout size={15} style={{ color: 'var(--pb-primary)' }} />
          <span>Réglages du site</span>
        </div>
        <button type="button" className="pb-btn pb-btn-icon-only" onClick={() => setIsGlobalSettingsOpen(false)}>
          <X size={13} />
        </button>
      </div>

      <div className="pb-settings-scroll">
        <div className="pb-settings-group">
          <div className="pb-settings-group-title" style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}><Palette size={12}/> Couleurs globales</div>
          <p style={{fontSize: '0.7rem', color: 'var(--pb-text-3)', marginBottom: '1rem', marginTop: '0.5rem', lineHeight: 1.4}}>
            Définissez les couleurs maîtresses. Ces variables s'appliqueront aux éléments utilisant les classes par défaut.
          </p>
          <Field label="Couleur Primaire">
            <div style={{display: 'flex', gap: '0.5rem'}}>
                <input type="color" value={globalColors.primary} onChange={(e) => setGlobalColors({...globalColors, primary: e.target.value})} className="pb-color-swatch" />
                <input type="text" className="pb-input" value={globalColors.primary} readOnly />
            </div>
          </Field>
          <Field label="Couleur du texte (Body)">
            <div style={{display: 'flex', gap: '0.5rem'}}>
                <input type="color" value={globalColors.text} onChange={(e) => setGlobalColors({...globalColors, text: e.target.value})} className="pb-color-swatch" />
                <input type="text" className="pb-input" value={globalColors.text} readOnly />
            </div>
          </Field>
          <Field label="Couleur de fond">
            <div style={{display: 'flex', gap: '0.5rem'}}>
                <input type="color" value={globalColors.bg} onChange={(e) => setGlobalColors({...globalColors, bg: e.target.value})} className="pb-color-swatch" />
                <input type="text" className="pb-input" value={globalColors.bg} readOnly />
            </div>
          </Field>
        </div>
        
        <div className="pb-settings-group" style={{marginTop: '2rem'}}>
          <div className="pb-settings-group-title" style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}><Type size={12}/> Typographie globale</div>
          <Field label="Police principale">
            <select className="pb-select">
              <option>Plus Jakarta Sans</option>
              <option>Inter</option>
              <option>Roboto</option>
              <option>Open Sans</option>
            </select>
          </Field>
        </div>
      </div>
      
      {/* Inject CSS Variables directly into canvas container if needed. 
          For a real export, this would be injected into the generated HTML. */}
      <style>{`
        #pb-canvas-root {
           --bs-primary: ${globalColors.primary} !important;
           --bs-body-color: ${globalColors.text} !important;
           background-color: ${globalColors.bg} !important;
        }
        #pb-canvas-root .btn-primary {
           background-color: var(--bs-primary) !important;
           border-color: var(--bs-primary) !important;
        }
      `}</style>
    </div>
  );
}
