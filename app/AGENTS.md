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

### 10. Menu d'Administration Latéral Ergonomique (`DashboardSidebar`, `DashboardHeader`, `dashboard.css`)
*   **Desktop ouvert par défaut** : Largeur fixe de 275px sur grand écran, immédiatement identifiable, évitant le recours au hamburger header sur desktop.
*   **Organisation claire en 2 volets** :
    *   **NAVIGATION** : Tableau de bord, Pages, Articles, Actualités, Constructeur de page, Flipbooks, Médias (groupe dépliable regroupant Médiathèque et Galerie photos), Vidéos, Messages (avec compteur de notifications).
    *   **GESTION** : Apparence & Menus, Comptes / Écrivains, Paramètres système.
*   **Rubrique active mise en valeur** : Fond bleu clair (`#e0f2fe`), texte et icône bleu foncé (`#004b7a`), barre indicatrice verticale gauche (4px) et attribut sémantique `aria-current="page"`.
*   **Menu Rétractable & Persistance** : Bouton explicite « Réduire le menu » en bas passant la barre en mode compact (76px) avec infobulles accessibles au survol/focus (`role="tooltip"`), mémorisé dans le `localStorage` (`ae_sidebar_collapsed`).
*   **Défilement ergonomique & Fixité** : En-tête (Logo Anjou Édition) et pied de page (Profil utilisateur + Déconnexion) restent strictement fixes et toujours visibles ; seule la liste centrale des liens dispose d'un défilement vertical fin si la hauteur d'écran est réduite (`min-height: 0; overflow-y: auto;`).
*   **Responsive & Drawer Mobile** : Sur tablettes et smartphones (`< 900px`), le bouton hamburger du header ouvre un drawer latéral avec overlay avec flou (`backdrop-filter`), blocage du défilement d'arrière-plan, bouton de fermeture `×`, fermeture par touche `Échap`, et restitution automatique du focus clavier au bouton déclencheur.

### 11. Gestionnaire de Navigation en Colonnes (`MenuManager`, `MenuColumn`, `MenuItemEditor`, `menu-manager.css`)
*   **Navigation moderne en colonnes (Colonnes Miller)** : Remplacement de l'arborescence verticale infinie par une interface en colonnes dynamique (Colonne 1 : Catégories principales, Colonne 2 : Sous-catégories, Colonne 3+ : Sous-sous-catégories et niveaux profonds avec défilement horizontal fluide).
*   **Fil d'Ariane interactif (`Breadcrumbs`)** : Chemin hiérarchique complet cliquable (`Menu du site / Arts / Peinture / Renaissance`) permettant un retour instantané à tout niveau parent.
*   **Panneau d'édition dédié (`MenuItemEditor`)** : Fiche latérale de configuration des propriétés d'un élément (Intitulé, Type d'action, État actif/inactif, Cible/URL, Contenu dynamique avec shortcodes/datalist, Sélecteur parent, Icône, Description), avec boutons *Enregistrer*, *Déplacer vers...*, *Dupliquer*, et *Supprimer*.
*   **Recherche globale multi-niveaux** : Champ de recherche en temps réel filtrant sur l'ensemble des éléments tous niveaux confondus avec affichage du chemin parent complet ; la sélection d'un résultat déplie automatiquement les colonnes ancêtres et charge l'élément dans le panneau d'édition.
*   **Réordonnancement intra-colonne & Clavier** : Poignée de glisser-déposer HTML5 native (`⋮⋮`) pour réorganiser l'ordre d'affichage au sein d'une même colonne, doublée de commandes clavier accessibles (`Monter`, `Descendre`, `Déplacer en sous-menu...`).
*   **Suppression sécurisée avec détection d'enfants (`DeleteMenuModal`)** : Avertissement explicite si l'élément possède des sous-catégories, offrant le choix guidé entre la conservation des enfants (remontés d'un cran au niveau du parent) ou la suppression en cascade.
*   **Modale de déplacement & Prévention des cycles (`MoveItemModal`)** : Sélection d'un nouveau parent avec calcul d'exclusion prévenant toute boucle infinie (`descendantIds`).
*   **Persistance & Compatibilité totale** : 100% rétrocompatible avec la structure Firestore / LocalStorage existante, zéro dépendance Tailwind, styling 100% Vanilla CSS (`menu-manager.css`).

---

*Dernière mise à jour du contexte par l'agent : 2 octobre 2026.*
