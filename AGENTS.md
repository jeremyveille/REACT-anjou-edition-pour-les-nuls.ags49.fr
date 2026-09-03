# Contexte de Travail & Guide de Développement - Anjou Édition

Ce document sert de guide et de référence pour tout agent ou développeur travaillant sur le dépôt **Anjou Édition – Pour les Nuls**. Il résume l'architecture, la stack technique, les scripts utiles et les conventions du codebase.

---

## 📋 Présentation du Projet

**Anjou Édition** est un portail culturel dédié au patrimoine littéraire, historique, poétique et scientifique de l'Anjou. L'application se compose de plusieurs grandes parties :
1. **Le site grand public** : Permet la lecture de textes et poésies (avec synthèse vocale), le feuilletage de flipbooks numériques interactifs, la consultation d'une galerie de photos et de vidéos HD sur la Loire et l'Anjou, ainsi qu'un formulaire de contact sécurisé et conforme au RGPD.
2. **Le Tableau de Bord d'Administration (`/ae-dashboard`)** : Permet de gérer les pages du site, de publier des articles, de lire les messages de contact reçus, et de générer du contenu assisté par IA grâce à l'intégration de Gemini.
3. **Le Page Builder Visuel (`/page-builder-react`)** : Un éditeur autonome drag-and-drop permettant de concevoir visuellement des structures de pages (sections, lignes, colonnes, texte, images, vidéos, boutons, cartes, alertes) et d'exporter du code HTML propre prêt à l'intégration avec Bootstrap 5.

> [!NOTE]
> * Le code de l'application React principale se trouve dans le sous-dossier [app/](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app).
> * Le code du Page Builder Visuel se trouve dans le sous-dossier [page-builder-react/](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/page-builder-react).
> * Toutes les commandes doivent être exécutées dans leur dossier respectif.

---

## 🛠️ Stack Technique

### 1. Application Principale (app)
*   **Framework Frontend** : [React v19.2.5](https://react.dev/)
*   **Outil de Build & Configuration** : [react-scripts v5.0.1](https://github.com/facebook/create-react-app) (Create React App)
*   **Base de Données & Services Cloud** : [Firebase v12.14.0](https://firebase.google.com/)
    *   **Firestore** : Stockage des pages, articles, configurations système et messages de contact.
    *   **Hosting** : Déploiement sur le projet Firebase `react-anjou-edition`.
*   **Intégration Intelligence Artificielle** : [@google/genai v2.8.0](https://www.npmjs.com/package/@google/genai) (modèle `gemini-2.5-flash`)
*   **Styling (CSS)** : **Vanilla CSS pur** ([App.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.css), [index.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/index.css), [dashboard.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/dashboard.css) et [ae-components.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/ae-components.css)).
    > [!IMPORTANT]
    > **RÈGLE STRICTE** : **NE JAMAIS UTILISER TAILWIND**. Le projet repose à 100% sur du Vanilla CSS écrit à la main et sur Bootstrap 5 pour les blocs du Page Builder.
*   **Bibliothèque d'Icônes** : [lucide-react v1.17.0](https://lucide.dev/)
*   **Tests** : Jest et [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (5 suites de tests complètes et 24 tests unitaires/d'intégration).

### 2. Page Builder Visuel (page-builder-react)
*   **Framework Frontend** : [React v18.3.1](https://react.dev/)
*   **Outil de Build** : [Vite v5.3.1](https://vitejs.dev/)
*   **Gestion Drag & Drop** : [@dnd-kit/core v6.1.0](https://dndkit.com/)
*   **Aide à la mise en page** : Classes Bootstrap 5 (styles CSS & icônes intégrés dans la page exportée)
*   **Bibliothèque d'Icônes** : [lucide-react v0.344.0](https://lucide.dev/)
*   **Qualité du code** : ESLint v8.57.0 (configuré avec plugins React et React Hooks, 0 avertissements).

---

## 📂 Structure du Projet

```
REACT-anjou-edition-pour-les-nuls.ags49.fr/
├── AGENTS.md                  # Ce document de contexte à la racine
├── app/                       # Application React principale (Site public & Admin)
│   ├── .firebaserc            # Configuration du projet Firebase par défaut
│   ├── firebase.json          # Configuration du déploiement Firebase Hosting
│   ├── package.json           # Dépendances npm et scripts de build/test de l'app
│   ├── public/                # Fichiers statiques public
│   └── src/                   # Code source de l'application principale
│       ├── components/        # Composants (Dashboard, PdfFlipbookReader, CookieConsentBanner, ContactForm, PrivacyPolicy...)
│       ├── styles/            # Fichiers CSS (dashboard.css, pdf-reader.css)
│       ├── utils/             # Utilitaires (sanitize.js, indexedDBStorage.js)
│       ├── services/          # Services d'accès aux données (pageService.js)
│       ├── App.js             # Composant principal (site public & navigation)
│       ├── App.test.js        # Tests Jest de l'application
│       ├── data.js            # Données locales de secours (fallback)
│       └── firebase.js        # Configuration & connexion Firebase
│
└── page-builder-react/        # Application Page Builder Visuel
    ├── package.json           # Dépendances npm, devDependencies & scripts (Vite/ESLint)
    ├── vite.config.js         # Configuration du serveur de dev Vite (port 3000)
    ├── .eslintrc.cjs          # Configuration ESLint personnalisée
    ├── index.html             # Point d'entrée HTML
    └── src/                   # Code source du Page Builder
        ├── components/        # Composants de l'éditeur (Canvas, Sidebar, Toolbar, SettingsPanel...)
        ├── data/              # Widgets disponibles et catégories
        ├── store/             # builderStore.jsx (State global, Undo/Redo, LocalStorage)
        ├── styles/            # builder.css (Styles de l'éditeur visuel)
        ├── utils/             # Fonctions utilitaires d'arbre (moveElement, sanitize, renderHtml...)
        └── main.jsx           # Point d'entrée React
```

---

## 💻 Commandes Utiles (Développement & Déploiement)

### 1. Pour l'Application Principale (`app/`)
Se déplacer dans le dossier : `cd app`

| Commande | Rôle / Description |
| :--- | :--- |
| `npm start` | Lance le serveur de développement local sur [http://localhost:3000](http://localhost:3000). |
| `$env:CI="true"; npm test` | Lance tous les tests Jest en mode CI (PowerShell). |
| `npm run build` | Compile l'application pour la production dans le dossier `/build` (0 avertissements). |
| `firebase deploy --only hosting` | Déploie l'application compilée sur Firebase Hosting. |

### 2. Pour le Page Builder Visuel (`page-builder-react/`)
Se déplacer dans le dossier : `cd page-builder-react`

| Commande | Rôle / Description |
| :--- | :--- |
| `npm install` | Installe toutes les dépendances locales, y compris ESLint et ses plugins. |
| `npm run dev` | Lance le serveur de développement local sur [http://localhost:3000](http://localhost:3000). |
| `npm run lint` | Lance la validation ESLint sans warnings tolérés (`--max-warnings 0`). |
| `npm run build` | Compile le Page Builder en bundle optimisé de production dans `/dist`. |
| `npm run preview` | Lance un serveur local pour prévisualiser le build de production. |

---

## 📌 Conventions de Code & Fonctionnalités Clés

### 1. Sécurité & Protection XSS (`sanitize.js`)
*   Le module [app/src/utils/sanitize.js](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/utils/sanitize.js) protège l'ensemble de l'application contre les attaques XSS stockées et injectées.
*   Validation et neutralisation systématique des protocoles dangereux (`javascript:`, `data:`, `vbscript:`).
*   Épuration stricte des balises `<script>` et gestionnaires d'événements inline (`onerror`, `onload`, `onclick`).
*   Intégré dans le moteur de rendu Bootstrap (`ContentWidgets.js`) et dans le gestionnaire de menus du Dashboard.

### 2. Gestion Hybride & Résilience Hors-Ligne (Offline-First)
*   Architecture défensive avec vérification systématique de l'état des snapshots Firestore (`snap && !snap.empty && snap.docs`).
*   Fallback transparent sur le `localStorage` de l'utilisateur (`ae_menus`, `ae_flipbooks`, `ae_pages`, `ae_articles`, `contact_messages`).
*   Préservation intégrale des données locales en mode déconnecté.

### 3. Conformité RGPD (GDPR) & Gestion des Données
*   **Bannière de Consentement (`CookieConsentBanner.js`)** : Présente sur le site public avec options « Tout accepter », « Paramétrer » et « Continuer avec le strict minimum ».
*   **Droit à l'oubli interactif** : Outil intégré dans la bannière et la page de confidentialité permettant à l'utilisateur d'effacer instantanément ses données locales (`localStorage`).
*   **Politique de Confidentialité Complète (`PrivacyPolicy.js`)** : Couvre les Articles 15 à 22 du RGPD, le contact DPO/référent, la durée de conservation (3 ans maximum), et les voies de réclamation auprès de la CNIL.
*   **Consentement explicite sur formulaire** : Case à cocher obligatoire et non pré-cochée sur [ContactForm.js](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/components/ContactForm.js).

### 5. Architecture Responsive Unifiée (4 Paliers Standard)
*   **S — Smartphones / petits écrans** : `@media (max-width: 599px)` (Disposition 1 colonne, contrôles tactiles >= 44px, tiroir mobile, modales fluides).
*   **M — Tablettes / grands smartphones** : `@media (min-width: 600px) and (max-width: 899px)` (Disposition 1 à 2 colonnes, sidebar off-canvas, espacement équilibré).
*   **L — Ordinateurs portables / petits desktops** : `@media (min-width: 900px) and (max-width: 1199px)` (Disposition 2 colonnes avec sidebar fixe, tables aérées).
*   **XL — Grands écrans** : `@media (min-width: 1200px)` (Disposition 3 colonnes jusqu'à 1700px max, KPIs 4 colonnes).
*   **Classes mutualisées** : `.responsive-container`, `.responsive-grid`, `.responsive-actions`, `.responsive-form`, `.responsive-table`, `.responsive-modal`.

---

*Dernière mise à jour du contexte par l'agent : 3 septembre 2026.*

