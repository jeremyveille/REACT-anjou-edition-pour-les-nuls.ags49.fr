# Contexte de Travail & Guide de Développement - Anjou Édition

Ce document sert de guide et de référence pour tout agent ou développeur travaillant sur le dépôt **Anjou Édition – Pour les Nuls**. Il résume l'architecture, la stack technique, les scripts utiles et les conventions du codebase.

---

## 📋 Présentation du Projet

**Anjou Édition** est un portail culturel dédié au patrimoine littéraire, historique, poétique et scientifique de l'Anjou. L'application se compose de plusieurs grandes parties :
1. **Le site grand public** : Permet la lecture de textes et poésies (avec synthèse vocale), le feuilletage de flipbooks numériques interactifs, la consultation d'une galerie de photos et de vidéos HD sur la Loire et l'Anjou, ainsi qu'un formulaire de contact.
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
*   **Styling (CSS)** : **Vanilla CSS** ([App.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.css), [index.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/index.css) et [dashboard.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/dashboard.css)). Aucun framework CSS comme Tailwind n'est utilisé.
*   **Bibliothèque d'Icônes** : [lucide-react v1.17.0](https://lucide.dev/)
*   **Tests** : Jest et [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### 2. Page Builder Visuel (page-builder-react)
*   **Framework Frontend** : [React v18.3.1](https://react.dev/)
*   **Outil de Build** : [Vite v5.3.1](https://vitejs.dev/)
*   **Gestion Drag & Drop** : [@dnd-kit/core v6.1.0](https://dndkit.com/)
*   **Aide à la mise en page** : Classes Bootstrap 5 (styles CSS & icônes intégrés dans la page exportée)
*   **Bibliothèque d'Icônes** : [lucide-react v0.344.0](https://lucide.dev/)
*   **Qualité du code** : ESLint v8.57.0 (configuré avec plugins React et React Hooks)

---

## 📂 Structure du Projet

Voici l'arborescence complète du dépôt :

```
REACT-anjou-edition-pour-les-nuls.ags49.fr/
├── AGENTS.md                  # Ce document de contexte à la racine
├── app/                       # Application React principale (Site public & Admin)
│   ├── .firebaserc            # Configuration du projet Firebase par défaut
│   ├── firebase.json          # Configuration du déploiement Firebase Hosting
│   ├── package.json           # Dépendances npm et scripts de build/test de l'app
│   ├── public/                # Fichiers statiques public
│   └── src/                   # Code source de l'application principale
│       ├── components/        # Composants (Dashboard, PdfFlipbookReader, etc.)
│       ├── styles/            # Fichiers CSS (dashboard.css, pdf-reader.css)
│       ├── utils/             # IndexedDB et utilitaires
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
| `$env:CI="true"; npm test` | Lance tous les tests Jest une seule fois en mode non interactif (PowerShell). |
| `npm run build` | Compile l'application pour la production dans le dossier `/build`. |
| `firebase deploy --only hosting` | Déploie l'application compilée sur Firebase Hosting. |

### 2. Pour le Page Builder Visuel (`page-builder-react/`)
Se déplacer dans le dossier : `cd page-builder-react`

| Commande | Rôle / Description |
| :--- | :--- |
| `npm install` | Installe toutes les dépendances locales, y compris ESLint et ses plugins. |
| `npm run dev` | Lance le serveur de développement local sur [http://localhost:3000](http://localhost:3000) (attention aux conflits de ports si l'app principale tourne). |
| `npm run lint` | Lance la validation ESLint sans warnings tolérés (`--max-warnings 0`). |
| `npm run build` | Compile le Page Builder en bundle optimisé de production dans `/dist`. |
| `npm run preview` | Lance un serveur local pour prévisualiser le build de production. |

---

## 📌 Conventions de Code & Fonctionnalités Clés

### 1. Routage Applicatif Personnalisé (App Principale)
Le projet n'utilise pas `react-router-dom`. La navigation est gérée de façon réactive dans le composant [App](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.js) :
*   L'état `view` détermine l'écran à afficher. Par exemple `{ type: 'home' }`, `{ type: 'text', data: {...} }` ou `{ type: 'dashboard' }`.
*   Le passage au Dashboard d'administration s'effectue par navigation vers `/ae-dashboard`. Un écouteur d'événement `popstate` synchronise l'historique du navigateur.

### 2. Gestion Hybride des Données (Firestore / LocalStorage)
Pour les formulaires de contact et la création de pages/articles :
*   L'application tente d'abord de lire/écrire sur Firestore.
*   En cas d'erreur réseau ou de permission Firebase, elle retombe (**fallback**) automatiquement sur le `localStorage` de l'utilisateur (ex. clés `contact_messages`, `ae_flipbooks`).
*   Les données par défaut définies dans [data.js](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/data.js) sont injectées automatiquement dans Firestore lors du premier démarrage si les collections Firestore associées sont détectées comme vides.

### 3. Intégration de l'IA (Gemini)
*   Le module IA utilise le SDK officiel `@google/genai` avec le modèle `gemini-2.5-flash` dans le composant [Dashboard](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/components/Dashboard.js).
*   La clé d'API est récupérée de la manière suivante :
    1. Dans le `localStorage` sous la clé `gemini_api_key` (configurable dans l'onglet **Paramètres** du Dashboard).
    2. Depuis les variables d'environnement (`process.env.REACT_APP_GEMINI_API_KEY`).

### 4. Styles CSS & Layout Responsive
*   L'application implémente deux thèmes : **Clair** et **Sombre** (activé en ajoutant la classe `.dark-mode` sur `document.documentElement` et stocké dans `localStorage` sous la clé `theme`).
*   **Isolation du Dashboard** : Le conteneur principal du Dashboard utilise la classe `.dashboard-main` (et non la balise `<main>`) pour éviter les conflits de styles avec le site grand public.

### 5. Résolution de l'Incompatibilité des Tests Jest
*   Jest ne supportant pas nativement la syntaxe ESM des dépendances de la bibliothèque `@google/genai` (comme `p-retry` utilisé en interne), le composant [Dashboard](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/components/Dashboard.js) est mocké dans [App.test.js](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.test.js).
*   Cette isolation garantit que `npm test` s'exécute avec succès.

### 6. Architecture du Page Builder Visuel (`page-builder-react/` & `app/`)
*   **State & Historique (Undo/Redo)** : Géré par le `BuilderProvider` dans [builderStore.jsx](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/page-builder-react/src/store/builderStore.jsx). L'état est persistant via le `localStorage` sous la clé `react_page_builder_content`. Les actions clavier `Ctrl+Z` et `Ctrl+Y` sont interceptées globalement.
*   **Intégrité des données** : Pour éviter toute instabilité de rendu, les manipulations d'éléments dans [moveElement.js](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/page-builder-react/src/utils/moveElement.js) sont implémentées de manière **entièrement immuable** (aucune mutation directe de sous-objets).
*   **Drag & Drop Sensibilité** : Configurée avec une activation sur déplacement de plus de 8 pixels dans [Layout.jsx](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/page-builder-react/src/components/Layout.jsx) pour permettre de cliquer ou de double-cliquer sur les widgets pour éditer leurs textes sans déclencher accidentellement un glisser-déposer.
*   **Interface avancée style Elementor** : Le Page Builder intègre un *Navigateur* d'arborescence (pour gérer facilement l'empilement des calques), un panneau de *Réglages du site* (couleurs globales), et un *Menu Contextuel* au clic-droit sur les blocs (Dupliquer, Copier/Coller le style, Supprimer, etc.).
*   **Réglages organisés** : Le panneau de droite est découpé en onglets (Contenu, Style, Avancé) pour plus de lisibilité.
*   **Apostrophes en français** : La règle ESLint `react/no-unescaped-entities` est désactivée dans `.eslintrc.cjs` pour permettre l'écriture naturelle des textes en français contenant des apostrophes.
*   **Support hybride Pages & Articles** : Le `pageService` et le composant `PageBuilder` autonome ont été généralisés pour accepter dynamiquement un paramètre `collectionName` (`'pages'` ou `'articles'`).
*   **Résolution des warnings de build** : Nettoyage des anciennes fonctions, states et modals inutilisés (qui étaient des reliquats de l'ancienne version non-autonome du builder) dans [Dashboard.js](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/components/Dashboard.js), éliminant ainsi toute alerte ESLint lors de la compilation de production.

### 7. Conformité RGPD (GDPR)
*   **Consentement obligatoire** : Une case à cocher explicite est intégrée au formulaire de contact pour s'assurer du consentement de l'utilisateur.
*   **Information utilisateur** : Page de Politique de Confidentialité dédiée, récapitulant les informations sur la collecte, la durée de conservation (3 ans maximum), les droits d'accès/rectification et le fonctionnement du stockage local (`localStorage`).

### 8. Accessibilité Numérique (a11y)
*   **Navigation Clavier** : Tous les éléments interactifs à l'origine cliquables (cartes de poèmes, miniatures, listes de vidéos, items de galerie) ont été convertis de `div` en boutons sémantiques (`<button type="button">`) focusables.
*   **Indicateurs de focus** : Une mise en surbrillance visible (`focus-visible`) a été appliquée globalement à tous les contrôles interactifs.
*   **Aide à la lecture** : Synthèse vocale de lecture de textes via l'API Web Speech et modification dynamique de la taille de police.
*   **Respect des préférences** : Bloc média `@media (prefers-reduced-motion: reduce)` pour désactiver automatiquement les animations pour les utilisateurs sensibles au mouvement.

---

*Dernière mise à jour du contexte par l'agent : 6 juillet 2026.*
