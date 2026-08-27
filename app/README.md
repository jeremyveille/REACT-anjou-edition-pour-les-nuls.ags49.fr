# Anjou Édition – Pour les Nuls

Portail culturel dédié au patrimoine littéraire, historique, poétique et scientifique de l'Anjou. Ce dépôt inclut le site grand public et le tableau de bord d'administration (Dashboard).

## 🚀 Installation & Lancement en Développement

### 1. Prérequis
- **Node.js** (v18 ou supérieur recommandé)
- **npm** (v9 ou supérieur)
- **Firebase CLI** (optionnel pour le déploiement)

### 2. Installation de l'application principale (app)
```bash
cd app
npm install
npm start
```
L'application sera accessible sur [http://localhost:3000](http://localhost:3000).

### 3. Installation du Page Builder autonome (page-builder-react)
Si vous devez travailler sur le constructeur visuel autonome :
```bash
cd page-builder-react
npm install
npm run dev
```

## ⚙️ Configuration & Variables d'environnement

L'application utilise les variables d'environnement suivantes pour l'IA Gemini. Créez un fichier `.env` à la racine du dossier `app/` (et un autre dans `page-builder-react/` si nécessaire) :

```env
REACT_APP_GEMINI_API_KEY=votre_cle_api_gemini
VITE_GEMINI_API_KEY=votre_cle_api_gemini_pour_vite
```
*(Note : La clé d'API peut également être configurée directement via l'interface du Dashboard pour être stockée dans le `localStorage`).*

## 🏗️ Build & Déploiement

Pour générer la version optimisée pour la production :

```bash
cd app
npm run build
```
Les fichiers générés se trouveront dans `app/build/`.
Pour déployer sur Firebase Hosting :
```bash
firebase deploy --only hosting
```

## 🧪 Tests

Le projet utilise Jest et React Testing Library. Pour lancer les tests unitaires et d'intégration :

```bash
cd app
# Lancer les tests en mode interactif
npm test

# Lancer les tests une seule fois (idéal pour la CI)
CI=true npm test
# Sous Windows PowerShell :
$env:CI="true"; npm test
```

## 🏗️ Choix Techniques Importants

- **Framework & Routing** : L'application principale n'utilise pas de librairie de routage complexe comme `react-router-dom`. Un routeur personnalisé (`view` state) est utilisé pour des raisons de légèreté et pour s'adapter à la nature "Single Page" enrichie.
- **Base de données** : Firebase Firestore est utilisé pour persister les articles, les configurations et les messages de contact.
- **Offline-First / Fallback** : Si Firebase est indisponible, l'application utilise une stratégie de bascule (`fallback`) transparente vers le `localStorage` et les données statiques (`data.js`).
- **CSS** : Utilisation de Vanilla CSS (aucun framework lourd comme Tailwind n'est compilé dans l'app principale) pour garder un contrôle complet sur les styles.

## 🛡️ Conformité RGPD

Le projet a été audité et intègre les fonctionnalités RGPD suivantes :
- **Consentement explicite** : Le formulaire de contact inclut une case à cocher obligatoire pour le consentement au traitement des données.
- **Minimisation & Base Légale** : Seules les données nécessaires (Nom, E-mail, Sujet, Message) sont collectées pour répondre à la demande.
- **Mentions Légales & Politique de Confidentialité** : Une page dédiée est accessible depuis le pied de page (`/privacy`), détaillant la conservation des données (maximum 3 ans).
- **Cookies & Traceurs** : L'application utilise uniquement le `localStorage` pour des fonctionnalités strictement nécessaires (thème clair/sombre, volume audio), dispensées de bannière de consentement aux cookies selon la CNIL.

## ♿ Accessibilité Numérique (a11y)

Le projet s'efforce de respecter les normes WCAG (niveau AA cible) :
- Tous les éléments interactifs possèdent des `aria-label` ou `title` pertinents.
- Le focus clavier a été amélioré globalement avec `:focus-visible` pour assurer un contraste net lors de la navigation sans souris.
- Le formulaire de contact associe correctement les `label` (via `htmlFor`) aux `input` (via `id`).
- Le lecteur PDF (Flipbook) intègre des contrôles au clavier natifs pour tourner les pages sans dépendre de la souris.

## ⚠️ Limites Connues et Sécurité (Risques restants)

1. **Sécurité Firestore** : Actuellement, le tableau de bord d'administration est sécurisé par un mot de passe statique local (`admin2026`). **Conséquence** : les règles de sécurité Firestore (`firestore.rules`) sont configurées en lecture/écriture ouverte pour permettre au frontend de fonctionner sans authentification Firebase.
   - *Action Requise (Production)* : Implémenter Firebase Auth et mettre à jour `firestore.rules` pour limiter l'écriture aux administrateurs authentifiés. Un avertissement a été ajouté dans le fichier `firestore.rules`.
2. **Gestion d'état volumineuse** : Le composant `Dashboard.js` gère de très nombreux états et opérations CRUD. Une refonte future avec des contextes React ou Redux/Zustand permettrait de simplifier sa maintenance.
