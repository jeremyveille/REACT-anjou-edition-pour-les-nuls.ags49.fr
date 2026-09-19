# Contexte de Travail & Guide de Développement - Anjou Édition

Ce document sert de guide et de référence pour tout agent ou développeur travaillant sur l'application **Anjou Édition – Pour les Nuls** (`app/`).

---

## 📋 Présentation du Projet

**Anjou Édition** est un portail culturel dédié au patrimoine littéraire, historique, poétique et scientifique de l'Anjou. L'application se compose de deux grandes parties :
1. **Le site grand public** : Permet la lecture de textes et poésies (avec synthèse vocale), le feuilletage de flipbooks numériques interactifs, la consultation d'une galerie de photos et de vidéos HD sur la Loire et l'Anjou, ainsi qu'un formulaire de contact RGPD.
2. **Le Tableau de Bord d'Administration (`/ae-dashboard`)** : Permet de gérer les pages du site, de publier des articles, de lire les messages de contact reçus, et de générer du contenu assisté par IA grâce à l'intégration de Gemini.

---

## 🛠️ Stack Technique

*   **Framework Frontend** : [React v19.2.5](https://react.dev/)
*   **Outil de Build & Configuration** : [react-scripts v5.0.1](https://github.com/facebook/create-react-app) (Create React App)
*   **Base de Données & Services Cloud** : [Firebase v12.14.0](https://firebase.google.com/)
    *   **Firestore** : Stockage des pages, articles, configurations système et messages de contact.
    *   **Authentication** & **Storage** : Préparés pour la gestion des utilisateurs et le stockage de médias.
    *   **Hosting** : Utilisé pour héberger l'application sur le projet Firebase `react-anjou-edition`.
*   **Intégration Intelligence Artificielle** : [@google/genai v2.8.0](https://www.npmjs.com/package/@google/genai) (modèle `gemini-2.5-flash`)
*   **Styling (CSS)** : **Vanilla CSS pur** ([App.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.css), [index.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/index.css), [dashboard.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/dashboard.css) et [ae-components.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/ae-components.css)).
    > [!IMPORTANT]
    > **RÈGLE STRICTE** : **NE JAMAIS UTILISER TAILWIND**. Le projet utilise uniquement du Vanilla CSS et Bootstrap 5 pour le Page Builder.
*   **Bibliothèque d'Icônes** : [lucide-react v1.17.0](https://lucide.dev/)
*   **Tests** : Jest et [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (15 suites de tests, 115 tests unitaires et d'intégration, 100% de réussite).

---

## 💻 Commandes Utiles

Se déplacer dans le dossier : `cd app`

| Commande | Rôle / Description |
| :--- | :--- |
| `npm start` | Lance le serveur de développement local sur [http://localhost:3000](http://localhost:3000). |
| `$env:CI="true"; npm test` (Windows PowerShell) | Lance tous les tests Jest en mode non interactif. |
| `npm run build` | Compile l'application pour la production dans le dossier `/build`. |
| `firebase deploy --only hosting` | Déploie l'application compilée sur Firebase Hosting. |

---

## 📌 Architecture, Sécurité & Conformité

### 1. Déploiement Continu (CI/CD GitHub Actions)
*   `.github/workflows/deploy.yml` automatise la validation `CI=true npm test` et `npm run build` puis le déploiement sur Firebase Hosting.
*   `.github/workflows/ci.yml` valide chaque Pull Request et branche.

### 2. PWA (Progressive Web App) & Lecture 100% Hors-Ligne
*   Enregistrement du service worker (`serviceWorkerRegistration.js` & `public/service-worker.js`).
*   Mise en cache intelligente : Cache-First pour les Flipbooks PDF, Stale-While-Revalidate pour les médias et assets statiques, fallback SPA sur `index.html`.
*   Lecture 100% hors-ligne des textes littéraires, contes, fables et poésies d'Anjou.

### 3. Optimisation des Médias & Miniatures WebP (`imageOptimizer.js`)
*   Génération de miniatures WebP légères (`400x300`) et jeux de sources réactifs (`srcset`).
*   Composant `<OptimizedImage />` avec balise `<picture>`, lazy-loading (`loading="lazy"`) et décodage asynchrone (`decoding="async"`).

### 4. Sécurité & Protection XSS (`sanitize.js`)
*   Module de désinfection centralisé [src/utils/sanitize.js](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/utils/sanitize.js) protégeant contre toute injection de scripts, balises HTML non autorisées et schémas d'URL malveillants (`javascript:`, `data:`).

### 5. Gestion Hybride des Données & Mode Hors-Ligne (Offline-First)
*   Tous les accès Firestore sont sécurisés de manière défensive (`snap && !snap.empty && snap.docs`).
*   Bascule automatique (**fallback**) sur le `localStorage` de l'utilisateur en cas de coupure réseau ou d'absence de configuration Firebase.

### 6. Conformité RGPD & Respect de la Vie Privée
*   **Bannière de Consentement (`CookieConsentBanner.js`)** : Consentement granulaire, information claire sur l'absence de traceurs publicitaires.
*   **Droit à l'oubli interactif** : Bouton de purge intégrale du cache local (`localStorage`) dans la politique de confidentialité et la fenêtre de réglages.
*   **Politique de Confidentialité (`PrivacyPolicy.js`)** : Référence complète aux Articles 15 à 22 du RGPD, contact DPO et recours CNIL.

### 7. Accessibilité & Normes WCAG 2.2 AA / RGAA
*   Lien d'évitement (`.skip-to-content`) opérationnel avec focus visible pour la navigation clavier.
*   Prise en compte globale de `prefers-reduced-motion` pour les animations.
*   Attributs `aria-label` descriptifs sur tous les boutons d'action du Page Builder, du lecteur de Flipbook et du formulaire de contact.

### 8. Architecture Responsive Unifiée (4 Paliers Standard)
*   **S — Smartphones / petits écrans** : `@media (max-width: 599px)` (Disposition 1 colonne, contrôles tactiles >= 44px, tiroir mobile, modales fluides).
*   **M — Tablettes / grands smartphones** : `@media (min-width: 600px) and (max-width: 899px)` (Disposition 1 à 2 colonnes, sidebar off-canvas, espacement équilibré).
*   **L — Ordinateurs portables / petits desktops** : `@media (min-width: 900px) and (max-width: 1199px)` (Disposition 2 colonnes avec sidebar fixe, tables aérées).
*   **XL — Grands écrans** : `@media (min-width: 1200px)` (Disposition 3 colonnes jusqu'à 1700px max, KPIs 4 colonnes).
*   **Classes mutualisées** : `.responsive-container`, `.responsive-grid`, `.responsive-actions`, `.responsive-form`, `.responsive-table`, `.responsive-modal`.

---

*Dernière mise à jour du contexte par l'agent : 19 septembre 2026.*

