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
*   **Intégration Intelligence Artificielle** : API REST Google Generative Language native via [`src/services/geminiService.js`](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/services/geminiService.js) (modèle `gemini-2.5-flash`, sans dépendances Node/Webpack lourdes côté client).
*   **Styling (CSS)** : **Vanilla CSS pur** ([App.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/App.css), [index.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/index.css), [dashboard.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/dashboard.css) et [ae-components.css](file:///C:/Users/jerem/REACT-anjou-edition-pour-les-nuls.ags49.fr/app/src/styles/ae-components.css)).
    > [!IMPORTANT]
    > **RÈGLE STRICTE** : **NE JAMAIS UTILISER TAILWIND**. Le projet utilise uniquement du Vanilla CSS et Bootstrap 5 pour le Page Builder.
*   **Bibliothèque d'Icônes** : [lucide-react v1.17.0](https://lucide.dev/)
*   **Tests** : Jest et [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (22 suites de tests, 173 tests unitaires et d'intégration, 100% de réussite).

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

### 1. Intégration Continue (CI GitHub Actions)
*   `.github/workflows/ci.yml` valide chaque Pull Request et branche pour garantir l'intégrité du code (`CI=true npm test` et `npm run build`).
*   Le déploiement sur Firebase Hosting s'effectue manuellement à la demande via `firebase deploy --only hosting`.

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

### 9. Barres Latérales Administrables du Flipbook (`FlipbookLayout`, `FlipbookSidebar`, `FlipbookSidebarEditor`)
*   **Disposition publique à 3 colonnes** : Encadre le lecteur central (`PdfFlipbookReader`) avec une barre latérale gauche (~20%) et une barre latérale droite (~20%) qui s'adaptent automatiquement à l'espace disponible.
*   **Responsive sans compromis** : Sur mobile et tablette (`<= 860px`), disposition verticale fluide ordonnée avec priorité absolue au Flipbook en haut (`order: 1`), suivi des blocs de la barre gauche (`order: 2`), puis de la barre droite (`order: 3`), avec zéro débordement horizontal.
*   **Administration unifiée dans le Dashboard** : Section « Barres latérales du Flipbook » avec colonnes « Barre gauche » et « Barre droite », gestion fine des blocs (création, modification, activation/désactivation, monter, descendre, suppression).
*   **Types de blocs multimédias supportés** : Images (médiathèque, upload ou URL), vidéos (intégration YouTube responsive 16/9 ou vidéos locales HTML5), textes/HTML sécurisés avec assainissement XSS (`sanitizeHtml`), titres avec niveaux hiérarchiques, boutons d'action stylisés, documents PDF téléchargeables.
*   **Persistance hybride** : Association exclusive à chaque flipbook (`leftSidebar` et `rightSidebar`), synchronisée sur Firestore et mise en cache dans `localStorage`.

### 10. Menu d'Administration Latéral Ergonomique & Layout Dashboard (`DashboardSidebar`, `DashboardHeader`, `dashboard.css`)
*   **Structure SaaS rectangulaire & Sans rognage** : Sidebar verticale rectangulaire de 250px de largeur fixe sur grand écran, sans forme ovale ou arrondie qui coupe les intitulés, intégrée directement dans un conteneur SaaS pleine hauteur (`.dashboard-layout-container`).
*   **Organisation claire en 2 volets** :
    *   **NAVIGATION** : Tableau de bord, Pages, Articles, Actualités, Constructeur de page, Flipbooks, Médias (groupe dépliable avec sous-menus imbriqués en flux vertical pour Médiathèque et Galerie photos), Vidéos, Messages (avec compteur de notifications).
    *   **GESTION** : Apparence & Menus, Comptes / Écrivains, Paramètres système.
*   **Rubrique active & Compteurs** : Fond bleu doux (`#f0fdf4` / `#e0f2fe`), liseré d'accentuation vertical gauche (3px bleu #004b7a), texte sombre à fort contraste (>12:1) et attribut `aria-current="page"`. Préservation intégrale des badges numériques pour Pages, Articles, Flipbooks et Messages.
*   **Menu Rétractable & Persistance** : Bouton explicite « Réduire le menu » passant la barre en mode compact (68px, icônes centrées) avec infobulles accessibles au survol/focus (`role="tooltip"`), mémorisé dans le `localStorage` (`ae_sidebar_collapsed`).
*   **Grille Responsive Unifiée** : En-tête avec bouton unique de déconnexion et retour au site, grille de KPIs 4 colonnes (`.ae-stats-grid`), grille principale 2 colonnes (`.ae-dashboard-main-grid`) intégrant les activités récentes (Pages & Messages), une carte de statut administratif compacte (`InfoCard`) et le conseil d'administration accessible (WCAG AA).
*   **Responsive & Drawer Mobile** : Sur tablettes et smartphones (`< 900px`), le bouton hamburger du header ouvre un drawer latéral fluide avec overlay flouté (`backdrop-filter`), blocage du défilement d'arrière-plan, bouton de fermeture `×`, fermeture par touche `Échap`, et restitution automatique du focus clavier au bouton déclencheur.

### 11. Gestionnaire de Navigation en Colonnes (`MenuManager`, `MenuColumn`, `MenuItemEditor`, `menu-manager.css`)
*   **Navigation moderne en colonnes (Colonnes Miller)** : Remplacement de l'arborescence verticale infinie par une interface en colonnes dynamique (Colonne 1 : Catégories principales, Colonne 2 : Sous-catégories, Colonne 3+ : Sous-sous-catégories et niveaux profonds avec défilement horizontal fluide).
*   **Fil d'Ariane interactif (`Breadcrumbs`)** : Chemin hiérarchique complet cliquable (`Menu du site / Arts / Peinture / Renaissance`) permettant un retour instantané à tout niveau parent.
*   **Panneau d'édition dédié (`MenuItemEditor`)** : Fiche latérale de configuration des propriétés d'un élément (Intitulé, Type d'action, État actif/inactif, Cible/URL, Contenu dynamique avec shortcodes/datalist, Sélecteur parent, Icône, Description), avec boutons *Enregistrer*, *Déplacer vers...*, *Dupliquer*, et *Supprimer*.
*   **Recherche globale multi-niveaux** : Champ de recherche en temps réel filtrant sur l'ensemble des éléments tous niveaux confondus avec affichage du chemin parent complet ; la sélection d'un résultat déplie automatiquement les colonnes ancêtres et charge l'élément dans le panneau d'édition.
*   **Réordonnancement intra-colonne & Clavier** : Poignée de glisser-déposer HTML5 native (`⋮⋮`) pour réorganiser l'ordre d'affichage au sein d'une même colonne, doublée de commandes clavier accessibles (`Monter`, `Descendre`, `Déplacer en sous-menu...`).
*   **Suppression sécurisée avec détection d'enfants (`DeleteMenuModal`)** : Avertissement explicite si l'élément possède des sous-catégories, offrant le choix guidé entre la conservation des enfants (remontés d'un cran au niveau du parent) ou la suppression en cascade.
*   **Modale de déplacement & Prévention des cycles (`MoveItemModal`)** : Sélection d'un nouveau parent avec calcul d'exclusion prévenant toute boucle infinie (`descendantIds`).
*   **Persistance & Compatibilité totale** : 100% rétrocompatible avec la structure Firestore / LocalStorage existante, zéro dépendance Tailwind, styling 100% Vanilla CSS (`menu-manager.css`).

### 12. Administration Ergonomique des Flipbooks (`FlipbookManager`, `FlipbookEditModal`, `flipbook-admin.css`)
*   **Tableau compact & Hauteur réduite** : Remplacement de l'ancien tableau encombré par une vue moderne à faible hauteur de ligne. Le titre du flipbook est mis en valeur avec sa catégorie en badge subtil, la longue description est masquée de la table (consultable en édition), et le code technique React n'encombre plus les colonnes.
*   **Recherche, Filtres et Tri instantanés** : Recherche en temps réel (titre, catégorie, fichier PDF, description), filtre dynamique par catégorie (« Toutes les catégories »), et tri multicritères (Plus récent, Plus ancien, Titre A → Z, Titre Z → A) sans requête Firestore intempestive.
*   **Pagination intelligente** : 10 éléments par page par défaut (avec sélecteur 10 / 20 / 50), contrôles ‹ Précédent / 1 2 3 / Suivant ›, et retour automatique en page 1 lors de l'application d'un filtre ou d'une recherche.
*   **Barre d'actions groupées haute** : Dès qu'un élément est coché, la barre d'actions groupées s'affiche immédiatement en haut de la liste pour éviter tout défilement vertical inutile.
*   **Actions compréhensibles & Accessibilité WCAG AA** : Boutons d'action explicites (Voir, Modifier, Copier code d'intégration, Supprimer) avec cibles tactiles >= 40-44px, info-bulles et attributs `aria-label`.
*   **Grande Modale d'Édition Responsive** : Dimensions desktop `width: min(1100px, 94vw); max-height: 90vh;` avec un seul défilement interne (fin des scrolls imbriqués), en-tête et pied d'enregistrement fixes (`position: sticky`), gestion des pages sous forme d'accordéon compact, et pleine exploitation de la largeur pour les colonnes de barres latérales (Barre gauche / Barre droite).
*   **Vue Mobile Adaptée** : Transformation fluide en cartes verticales condensées sur mobile pour éliminer tout défilement horizontal forcé.
*   **Tests & Qualité** : 29 suites de tests automatisées et 219 tests unitaires/d'intégration réussis à 100%, 0 avertissements de compilation de production.

### 13. Authentification Google, Vérification Administrateur & Sécurité Firebase (`authService.js`, `firebase.js`, `firestore.rules`)
*   **Connexion Google Firebase native (`GoogleAuthProvider`)** : Bouton clair et accessible « Continuer avec Google » avec le logo Google officiel, utilisant en priorité `signInWithPopup` et basculant sur `signInWithRedirect` en cas de blocage navigateur.
*   **Contrôle strict des privilèges Administrateur (`verifyAdminStatus`)** : Tout compte Google connecté ne bénéficie pas automatiquement des privilèges admin. L'accès au tableau de bord (`/ae-dashboard`) est conditionné à :
    1. Custom Claims Firebase Auth (`claims.admin === true`),
    2. Enregistrement en tant qu'administrateur actif dans la collection Firestore `accounts` (`role === "Administrateur"` et `status === "Actif"`),
    3. Liste blanche des administrateurs du portail (`jeremy.veille@hotmail.fr`, `pveille@ymail.com`, `admin@anjou-edition.fr`).
*   **États de session sans clignotement** : Gestion explicite des 4 états d'authentification (`loading`, `authenticated`, `unauthenticated`, `unauthorized`) via `onAuthStateChanged`. Au rafraîchissement d'une session valide sur `/ae-dashboard`, un indicateur de chargement propre empêche toute éviction prématurée vers l'écran de connexion.
*   **Écran d'accès non autorisé explicite** : En cas de tentative de connexion avec un compte Google non administrateur, l'accès est refusé avec un message clair affichant l'e-mail du compte connecté et un bouton d'action « Se connecter avec un autre compte ».
*   **Déconnexion complète (`logoutAdmin`)** : Appel Firebase `signOut()`, suppression immédiate de l'accès administratif, purge du cache local et redirection vers la page d'accueil avec verrouillage strict du retour au dashboard.
*   **Domaines autorisés & Déploiement** : Domaines configurés dans Firebase Authentication (`localhost`, `react-anjou-edition.firebaseapp.com`, `react-anjou-edition.web.app`, `anjou-edition-pour-les-nuls.ags49.fr`).
*   **Règles de sécurité Firestore renforcées (`firestore.rules`)** : Toutes les écritures administratives (`pages`, `articles`, `flipbooks`, `medias`, `gallery`, `videos`, `news`, `menus`, `settings`, `accounts`) sont protégées côté serveur par la fonction `isAdmin()` vérifiant le token d'authentification (`request.auth.token.admin == true` ou liste des e-mails admin).

### 14. Écran de Déconnexion Ergonomique & Sécurisé (`AdminLogoutSuccess`, `GoogleIcon`, `App.css`)
*   **Design rassurant et équilibré** : Écran sobre et élégant affiché après la déconnexion avec bouclier de sécurité orange dans un halo subtil, titre `<h1>Déconnexion réussie</h1>`, messages espacés confirmant la fermeture sécurisée de la session administrative.
*   **Bouton CTA Principal** : Bouton bleu marine (`#0b2348`) stylisé en Vanilla CSS avec logo officiel Google SVG « Se reconnecter avec Google », effet hover doux (`translateY(-2px)`), outline d'accessibilité visible au focus et gestion des états asynchrones de reconnexion.
*   **Lien secondaire vers le site public** : Action « Retourner sur Anjou Édition » permettant de quitter immédiatement l'espace d'administration sans avoir à se reconnecter.
*   **Responsive & WCAG AA** : Carte centrée verticalement (`min-height: 100dvh`), largeurs fluides avec marges de sécurité sur smartphone (`padding: 34px 22px; border-radius: 18px;`), cibles tactiles >= 44-52px, compatibilité totale mode sombre.

### 15. Gestion Complète des Comptes Administrateurs & Sécurité des Mots de Passe (`AccountEditModal`, `authService.js`, `account-admin.css`)
*   **Fiche de Gestion Utilisateur Interactive** : Ouverture au clic sur la carte utilisateur ou sur le bouton « Modifier le compte » (icône crayon `<Edit3 />`), avec fermeture par touche `Échap`, clic sur le fond et navigation par onglets accessibles.
*   **Profil & Droits** : Modification en direct du nom affiché, de l'adresse e-mail, de la photo de profil (`photoURL` ou palette de 8 couleurs Anjou Édition), du rôle (`Administrateur`, `Écrivain`, `Éditeur`) et du statut administratif (`Actif` / `Inactif`). Protection contre la rétrogradation du compte super-administrateur principal.
*   **Sécurité selon la Méthode d'Authentification** :
    *   **Compte Google OAuth** : Détection automatique avec logo Google officiel. Aucune saisie directe de mot de passe n'est proposée : message clair expliquant la délégation d'authentification à Google et lien sécurisé vers les paramètres de sécurité Google.
    *   **Son Propre Compte (E-mail / Mot de passe)** : Formulaire de modification sécurisé avec mot de passe actuel (ré-authentification Firebase `reauthenticateWithCredential`), nouveau mot de passe, confirmation, boutons œil afficher/masquer, et jauge visuelle de robustesse dynamique en temps réel (barre colorée, score 0-4 et checklist des critères).
    *   **Compte d'un Autre Utilisateur (ex: Pat V.)** : Respect strict de la confidentialité (aucun affichage ni saisie de mot de passe par un tiers). Bouton d'envoi d'un e-mail officiel de réinitialisation sécurisé via Firebase Authentication (`sendPasswordResetEmail`).
*   **Distinction Statut Administratif vs Connexion Technique** : Clarification pédagogique expliquant que le statut `Inactif` est un verrou administratif stocké dans Firestore et localement, indépendant de la présence d'une session technique Firebase Auth ou d'une inactivité temporelle.
*   **Activité & Métadonnées d'Audit** : Consultation de l'identifiant système, du mode d'authentification, de la date de création, de la date de dernière connexion et de la date de dernière modification administrative.
*   **Qualité & Tests** : 31 suites de tests et 242 tests automatisés réussis à 100%, 0 avertissements de compilation.

### 16. Sélecteur Dynamique et Changement de Compte Google OAuth (`authService.js`, `AdminLogoutSuccess.js`, `App.js`)
*   **Sélecteur de Compte Explicite (`prompt: 'select_account'`)** : Configuration systématique du paramètre standard OAuth 2.0 `select_account` sur le `GoogleAuthProvider`. Même lorsqu'un compte Google est déjà mémorisé dans le navigateur, Google affiche systématiquement l'écran de sélection de compte (« Choisir un compte » ou « Utiliser un autre compte ») sans reconnexion silencieuse au mauvais compte.
*   **Fonction `switchGoogleAccount()`** : Assure la purge préalable de la session active Firebase Auth (`signOut(auth)` + nettoyage du cache local `ae_authenticated`) avant de déclencher la popup OAuth avec sélection forcée.
*   **Interface Intuitive & Accessible** :
    *   Sous le bouton principal « Continuer avec Google », affichage de la question « Vous souhaitez utiliser une autre adresse e-mail ? » suivie de l'action « Changer de compte Google ».
    *   Intégration harmonieuse sur la page de connexion, l'écran de déconnexion (`AdminLogoutSuccess`) et l'écran de refus d'accès (`unauthorized`).
    *   Contraste WCAG AAA (bleu Anjou `#004b7a` sur fond clair, `#38bdf8` en dark mode), cible tactile accessible et outline focus visible.
*   **Contrôle Strict des Droits Administrateurs** : Seuls les comptes explicitement autorisés (claims `admin: true`, collection Firestore `accounts` avec rôle `Administrateur` et statut `Actif`, ou liste blanche sécurisée) peuvent accéder au dashboard. Toute tentative avec une autre adresse Google affiche l'écran de refus d'accès avec l'e-mail connecté et l'action pour changer de compte.
*   **Neutralité et Absence Totale de Présélection (`App.js`, `authService.js`)** :
    *   La page de connexion `/ae-dashboard` démarre avec un champ e-mail entièrement vierge (`loginEmail = ''`).
    *   Aucun compte (notamment `pveille@ymail.com`) n'est imposé ou présélectionné par défaut.
    *   Suppression de toute mémorisation d'e-mail dans `localStorage` (`ae_last_login_email` purgé au montage et à la déconnexion).
    *   Interdiction stricte de tout paramètre `login_hint` sur `GoogleAuthProvider` : seul `prompt: 'select_account'` est transmis, laissant l'administrateur entièrement libre de choisir ou de taper l'adresse de son choix.
    *   Après déconnexion, réinitialisation systématique des champs d'authentification sans adresse résiduelle.
*   **Qualité & Tests** : 31 suites de tests et 248 tests automatisés validés à 100%, 0 avertissements de compilation.

---

*Dernière mise à jour du contexte par l'agent : 8 octobre 2026.*


