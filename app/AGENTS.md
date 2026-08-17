# Contexte de Travail & Guide de Développement - Anjou Édition

Ce document sert de guide et de référence pour tout agent ou développeur travaillant sur le dépôt **Anjou Édition – Pour les Nuls**. Il résume l'architecture, la stack technique, les scripts utiles et les conventions du codebase.

---

## 📋 Présentation du Projet

**Anjou Édition** est un portail culturel dédié au patrimoine littéraire, historique, poétique et scientifique de l'Anjou. L'application se compose de deux grandes parties :
1. **Le site grand public** : Permet la lecture de textes et poésies (avec synthèse vocale), le feuilletage de flipbooks numériques interactifs, la consultation d'une galerie de photos et de vidéos HD sur la Loire et l'Anjou, ainsi qu'un formulaire de contact.
2. **Le Tableau de Bord d'Administration (`/ae-dashboard`)** : Permet de gérer les pages du site, de publier des articles, de lire les messages de contact reçus, et de générer du contenu assisté par IA grâce à l'intégration de Gemini.

> [!NOTE]
> Le code de l'application React se trouve dans le sous-dossier [app/](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app). Toutes les commandes de développement doivent être exécutées dans ce dossier.

---

## 🛠️ Stack Technique

Le projet repose sur les technologies suivantes :

*   **Framework Frontend** : [React v19.2.5](https://react.dev/)
*   **Outil de Build & Configuration** : [react-scripts v5.0.1](https://github.com/facebook/create-react-app) (Create React App)
*   **Base de Données & Services Cloud** : [Firebase v12.14.0](https://firebase.google.com/)
    *   **Firestore** : Stockage des pages, articles, configurations système et messages de contact.
    *   **Authentication** & **Storage** : Préparés pour la gestion des utilisateurs et le stockage de médias.
    *   **Hosting** : Utilisé pour héberger l'application sur le projet Firebase `react-anjou-edition`.
*   **Intégration Intelligence Artificielle** : [@google/genai v2.8.0](https://www.npmjs.com/package/@google/genai)
    *   Utilisé pour appeler l'API Gemini (modèle `gemini-2.5-flash`) afin de générer automatiquement des articles historiques ou poétiques sur l'Anjou depuis le Dashboard.
*   **Styling (CSS)** : **Vanilla CSS** ([App.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.css), [index.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/index.css) et [dashboard.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/dashboard.css)). Aucun framework CSS comme Tailwind n'est utilisé par défaut.
*   **Bibliothèque d'Icônes** : [lucide-react v1.17.0](https://lucide.dev/)
*   **Tests** : Jest et [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

## 📂 Structure du Projet

Voici l'arborescence du répertoire de l'application :

```
REACT-anjou-edition-pour-les-nuls.ags49.fr/
├── AGENTS.md                  # Ce document de contexte à la racine
└── app/                       # Répertoire contenant l'application React
    ├── .firebaserc            # Configuration du projet Firebase par défaut (react-anjou-edition)
    ├── firebase.json          # Configuration du déploiement Firebase Hosting
    ├── package.json           # Dépendances npm et scripts de build/test
    ├── README.md              # Instructions standards de démarrage
    ├── public/                # Fichiers statiques (index.html, manifest.json, favicons)
    └── src/                   # Code source de l'application
        ├── components/        # Composants React du tableau de bord
        │   ├── Dashboard.js   # Panneau d'administration principal
        │   ├── DashboardCard.js # Carte d'action individuelle du Dashboard
        │   ├── DashboardHeader.js # En-tête du Dashboard
        │   ├── InfoCard.js    # Cartes de statistiques du Dashboard
        │   └── PdfFlipbookReader.js # Lecteur/visualisateur de Flipbooks PDF interactif
        ├── styles/            # Fichiers CSS
        │   ├── dashboard.css  # Styles spécifiques au Dashboard
        │   └── pdf-reader.css # Styles spécifiques au lecteur PDF
        ├── utils/             # Fonctions utilitaires
        │   └── indexedDBStorage.js # Gestion du stockage IndexedDB pour les fichiers PDF volumineux
        ├── App.js             # Composant principal gérant le site grand public et le routage
        ├── App.css            # Styles du site grand public
        ├── App.test.js        # Tests unitaires et d'intégration
        ├── data.js            # Données locales statiques en français
        ├── firebase.js        # Initialisation de Firebase et exports des services (db, auth)
        ├── index.js           # Point d'entrée de l'application React
        ├── index.css          # Styles globaux de base
        └── setupTests.js      # Configuration de l'environnement de test Jest
```

---

## 💻 Commandes Utiles (Développement & Déploiement)

Avant de lancer toute commande, assurez-vous de vous déplacer dans le dossier de l'application :
```powershell
cd app
```

Les scripts npm disponibles dans [package.json](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/package.json) sont :

| Commande | Rôle / Description |
| :--- | :--- |
| `npm start` | Lance le serveur de développement local sur [http://localhost:3000](http://localhost:3000). |
| `$env:CI="true"; npm test` (Windows PowerShell) ou `CI=true npm test` (Linux/macOS) | Lance tous les tests Jest une seule fois en mode non interactif. |
| `npm run build` | Compile l'application pour la production dans le dossier `/build`. |
| `npm run eject` | Extrait les configurations webpack de `react-scripts`. **Attention : opération irréversible !** |

### Commandes Firebase :
*   **Se connecter** : `firebase login`
*   **Simuler localement** : `firebase emulators:start` ou `firebase serve`
*   **Déployer sur Firebase Hosting** : `firebase deploy --only hosting`

---

## 📌 Conventions de Code & Fonctionnalités Clés

### 1. Routage Applicatif Personnalisé
Le projet n'utilise pas `react-router-dom`. La navigation est gérée de façon réactive dans le composant [App](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.js#L56) :
*   L'état `view` détermine l'écran à afficher. Par exemple `{ type: 'home' }`, `{ type: 'text', data: {...} }` ou `{ type: 'dashboard' }`.
*   Le passage au Dashboard d'administration s'effectue par navigation vers `/ae-dashboard` ou `/ae-dashboard/`. Un écouteur d'événement `popstate` synchronise l'historique du navigateur.

### 2. Gestion Hybride des Données (Firestore / LocalStorage)
Pour les formulaires de contact et la création de pages/articles :
*   L'application tente d'abord de lire/écrire sur Firestore.
*   En cas d'erreur réseau ou de permission Firebase, elle retombe (**fallback**) automatiquement sur le `localStorage` de l'utilisateur (ex. clés `contact_messages`, `ae_flipbooks`).
*   Les données par défaut définies dans [data.js](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/data.js) sont injectées automatiquement dans Firestore lors du premier démarrage si les collections Firestore associées sont détectées comme vides.

### 3. Intégration de l'IA (Gemini)
*   Le module IA utilise le SDK officiel `@google/genai` avec le modèle `gemini-2.5-flash` dans le composant [Dashboard](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/components/Dashboard.js#L40).
*   La clé d'API est récupérée de la manière suivante :
    1. Dans le `localStorage` sous la clé `gemini_api_key` (configurable dans l'onglet **Paramètres** du Dashboard).
    2. Depuis les variables d'environnement (`process.env.REACT_APP_GEMINI_API_KEY` ou `process.env.VITE_GEMINI_API_KEY`).

### 4. Styles CSS & Layout Responsive
*   L'application implémente deux thèmes : **Clair** et **Sombre** (activé en ajoutant la classe `.dark-mode` sur `document.documentElement` et stocké dans `localStorage` sous la clé `theme`).
*   Le Dashboard utilise des classes utilitaires personnalisées de grille responsive définies nativement dans [dashboard.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/dashboard.css) (ex. `.grid`, `.grid-cols-1`, `.lg:grid-cols-2`, `.xl:grid-cols-3`).
*   **Isolation du Dashboard** : Pour éviter les conflits avec le style CSS du site grand public défini sur le sélecteur `main` dans [App.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.css#L434), le conteneur principal du Dashboard utilise la classe `.dashboard-main` (et non la balise `<main>`).

### 5. Résolution de l'Incompatibilité des Tests Jest
*   Jest ne supportant pas nativement la syntaxe ESM des dépendances de la bibliothèque `@google/genai` (comme `p-retry` utilisé en interne), le composant [Dashboard](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/components/Dashboard.js) est mocké dans [App.test.js](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.test.js#L4-L10).
*   Cette isolation garantit que `npm test` s'exécute avec succès.

### 6. Design WordPress (Section Flipbooks)
*   La section **Mes Flipbooks** propose une table d'administration reprenant le style natif de l'interface d'administration WordPress.
*   Les styles associés sont préfixés par `.wp-` dans [dashboard.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/dashboard.css). Ils gèrent l'alternance de couleur des lignes, les liens bleus classiques et les actions contextuelles au survol d'une ligne (Modifier, Corbeille, Afficher).

### 7. Conformité RGPD (GDPR)
*   **Consentement obligatoire** : Une case à cocher explicite est intégrée au formulaire de contact pour s'assurer du consentement de l'utilisateur.
*   **Information utilisateur** : Page de Politique de Confidentialité dédiée, récapitulant les informations sur la collecte, la durée de conservation (3 ans maximum), les droits d'accès/rectification et le fonctionnement du stockage local (`localStorage`).
*   **Sécurisation** : Aucun mot de passe ou donnée sensible n'est exposé inutilement.

### 8. Accessibilité Numérique (a11y)
*   **Navigation Clavier** : Tous les éléments interactifs à l'origine cliquables (cartes de poèmes, miniatures, listes de vidéos, items de galerie) ont été convertis de `div` en boutons sémantiques (`<button type="button">`) focusables.
*   **Indicateurs de focus** : Une mise en surbrillance visible (`focus-visible`) a été appliquée globalement à tous les contrôles interactifs.
*   **Aide à la lecture** : Synthèse vocale de lecture de textes via l'API Web Speech et modification dynamique de la taille de police.
*   **Respect des préférences** : Bloc média `@media (prefers-reduced-motion: reduce)` ajouté pour désactiver automatiquement les animations système pour les utilisateurs sensibles au mouvement.

### 9. Page Builder Bootstrap (Conception Visuelle & Firestore)
*   **Architecture Modulaire** : Isolé dans `src/components/page-builder/` et `src/components/bootstrap-blocks/`. Gère une arborescence JSON imbriquée (`Section > Container > Row > Column > Widgets`).
*   **Historique Local (Undo/Redo)** : Géré par le custom hook `usePageBuilderHistory.js` basé sur une pile réactive d'états de blocs (sans manipulation directe du DOM).
*   **Fallback Hors ligne & Persistance** : Le service `pageService.js` assure les opérations CRUD Firestore avec synchronisation automatique et bascule vers le `localStorage` (`ae_pages`) en cas d'absence de réseau ou de droits d'accès.
*   **Rendu Dynamique** : Moteur de rendu récursif `BlockRenderer.js` qui traduit la structure JSON en code JSX / HTML propre en mode édition (dans le Dashboard avec contrôles d'espacement/classes) et public (via le slug de page dans `App.js`).

---

*Dernière mise à jour du contexte par l'agent : 5 juillet 2026.*


