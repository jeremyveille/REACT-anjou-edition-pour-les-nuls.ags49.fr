import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * Composant ErrorBoundary pour intercepter les erreurs de rendu
 * et les échecs de chargement de chunks réseau (ChunkLoadError).
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary a capturé une erreur :", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = 
        this.state.error?.name === 'ChunkLoadError' || 
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch');

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="ae-empty-state-container" style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: '#fee2e2', borderRadius: '50%', marginBottom: '1rem', color: '#dc2626' }}>
            <AlertCircle size={36} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
            {isChunkError ? "Mise à jour de l'application disponible" : "Une erreur inattendue est survenue"}
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            {isChunkError 
              ? "Une nouvelle version des fichiers de l'application a été déployée ou votre connexion a été interrompue. Veuillez recharger la page pour continuer."
              : (this.state.error?.message || "Le composant n'a pas pu se charger correctement.")}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={this.handleReload}
              className="ae-badge-status-published"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                borderRadius: '0.5rem',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={16} />
              Recharger la page
            </button>
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
