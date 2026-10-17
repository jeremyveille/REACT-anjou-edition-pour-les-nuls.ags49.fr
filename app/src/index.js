import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker to enable PWA offline caching
serviceWorkerRegistration.register();

// Neutralisation des erreurs non gérées provenant d'extensions de navigateur (ex: canal de message d'extension fermé prématurément)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = (typeof reason === 'string' ? reason : reason?.message) || '';
    if (
      msg.includes('message channel closed before a response was received') ||
      msg.includes('A listener indicated an asynchronous response')
    ) {
      event.preventDefault();
    }
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

