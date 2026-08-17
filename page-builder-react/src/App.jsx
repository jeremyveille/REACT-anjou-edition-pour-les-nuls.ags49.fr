import { useEffect } from 'react';
import { BuilderProvider } from './store/builderStore';
import Layout from './components/Layout';
import './styles/builder.css';

export default function App() {
  // Apply a body class to identify active builder context
  useEffect(() => {
    document.body.classList.add('builder-active');
    return () => {
      document.body.classList.remove('builder-active');
    };
  }, []);

  return (
    <BuilderProvider>
      <Layout />
    </BuilderProvider>
  );
}
