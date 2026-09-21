import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

const ProblemChild = ({ shouldThrow, message }) => {
  if (shouldThrow) {
    const error = new Error(message || 'Crash test');
    error.name = message?.includes('Loading chunk') ? 'ChunkLoadError' : 'Error';
    throw error;
  }
  return <div>Contenu sécurisé</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error during expected thrown errors in tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  test('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Contenu sécurisé')).toBeInTheDocument();
  });

  test('catches standard error and renders fallback UI', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} message="Erreur personnalisée" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Une erreur inattendue est survenue')).toBeInTheDocument();
    expect(screen.getByText('Erreur personnalisée')).toBeInTheDocument();
    expect(screen.getByText('Recharger la page')).toBeInTheDocument();
  });

  test('detects ChunkLoadError and shows user-friendly chunk message', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} message="Loading chunk vendors failed" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Mise à jour de l'application disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/Une nouvelle version des fichiers de l'application a été déployée/i)).toBeInTheDocument();
  });

  test('renders custom fallback if provided', () => {
    render(
      <ErrorBoundary fallback={<div>Fallback personnalisé</div>}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Fallback personnalisé')).toBeInTheDocument();
  });
});
