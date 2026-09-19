// Helper to register service worker in production and local environments

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker) {
    if (process.env.NODE_ENV === 'production') {
      // The URL constructor is available in all browsers that support SW.
      const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href);
      if (publicUrl.origin !== window.location.origin) {
        // Our service worker won't work if PUBLIC_URL is on a different origin
        return;
      }

      window.addEventListener('load', () => {
        const swUrl = `${process.env.PUBLIC_URL || ''}/service-worker.js`;

        if (isLocalhost) {
          // This is running on localhost. Let's check if a service worker still exists or not.
          checkValidServiceWorker(swUrl, config);
        } else {
          // Is not localhost. Just register service worker
          registerValidSW(swUrl, config);
        }
      });
    } else if (window.location.hostname === 'localhost' || isLocalhost) {
      // Also allow local testing when explicitly desired
      const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href);
      if (publicUrl.origin === window.location.origin) {
        window.addEventListener('load', () => {
          const swUrl = `${process.env.PUBLIC_URL || ''}/service-worker.js`;
          checkValidServiceWorker(swUrl, config);
        });
      }
    }
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available and will be used when all tabs for this page are closed.
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Content is cached for offline use.
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Erreur lors de l\'enregistrement du Service Worker:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('Mode hors-ligne : aucune connexion Internet trouvée. L\'application fonctionne en mode cache.');
    });
}

export function unregister() {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready
      .then((registration) => {
        if (registration && registration.unregister) {
          registration.unregister();
        }
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
