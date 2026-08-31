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
*   **Styling (CSS)** : **Vanilla CSS** ([App.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.css), [index.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/index.css) et [dashboard.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/dashboard.css)).
*   **Bibliothèque d'Icônes** : [lucide-react v1.17.0](https://lucide.dev/)
*   **Tests** : Jest et [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (5 suites de tests, 24 tests unitaires et d'intégration).

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

### 1. Sécurité & Protection XSS (`sanitize.js`)
*   Module de désinfection centralisé [src/utils/sanitize.js](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/utils/sanitize.js) protégeant contre toute injection de scripts, balises HTML non autorisées et schémas d'URL malveillants (`javascript:`, `data:`).

### 2. Gestion Hybride des Données & Mode Hors-Ligne (Offline-First)
*   Tous les accès Firestore sont sécurisés de manière défensive (`snap && !snap.empty && snap.docs`).
*   Bascule automatique (**fallback**) sur le `localStorage` de l'utilisateur en cas de coupure réseau ou d'absence de configuration Firebase.

### 3. Conformité RGPD & Respect de la Vie Privée
*   **Bannière de Consentement (`CookieConsentBanner.js`)** : Consentement granulaire, information claire sur l'absence de traceurs publicitaires.
*   **Droit à l'oubli interactif** : Bouton de purge intégrale du cache local (`localStorage`) dans la politique de confidentialité et la fenêtre de réglages.
*   **Politique de Confidentialité (`PrivacyPolicy.js`)** : Référence complète aux Articles 15 à 22 du RGPD, contact DPO et recours CNIL.

### 4. Accessibilité Numérique (WCAG 2.1 AA)
*   Lien d'accès rapide au contenu `.skip-to-content` navigable au clavier.
*   Mise en surbrillance visible `:focus-visible` sur l'ensemble des éléments interactifs.
*   Composants modaux et visionneuse photo conformes (`role="dialog"`, `aria-modal="true"`, `aria-label`).
*   Prise en compte de `@media (prefers-reduced-motion: reduce)`.
*   Synthèse vocale intégrée et commandes de contraste.

---

*Dernière mise à jour du contexte par l'agent : 31 août 2026.*
