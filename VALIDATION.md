# Vérification locale et préparation de la mise en ligne

Cette branche améliore la navigation publique, les erreurs de sauvegarde, le menu mobile, l’administration Firebase et les deux constructeurs de pages. Les vérifications s’effectuent dans un projet Firebase de démonstration, sans modifier la production.

## Démarrage local

Prérequis : Node.js 22 et Java 21 pour les émulateurs.

1. Dans `app`, exécuter `npm ci`.
2. Dans `app/functions`, exécuter `npm ci` et créer un fichier `.secret.local` contenant `GEMINI_API_KEY=`. Ce fichier est ignoré par Git. La génération IA ne fonctionnera pas avec ce secret vide.
3. Dans `app`, démarrer `npm run emulators`.
4. Dans un autre terminal ouvert dans `app`, exécuter `npm run seed:emulators`, puis `npm start`.

Le mode développement utilise systématiquement `demo-anjou-edition` et les émulateurs sur `127.0.0.1`. Le script de démonstration crée uniquement des données synthétiques et un compte `admin@example.test` / `LocalPreview!2026`. Ces identifiants ne servent qu’aux émulateurs, jamais au site en ligne.

## Vérifications automatisées

- `app` : `npm run test:ci` et `npm run build`.
- `app/functions` : `npm test` pour la validation, les autorisations, quotas et erreurs de génération IA.
- `app`, émulateurs actifs : `npm run test:emulators` pour les règles Firestore/Storage et les comptes Firebase réels de démonstration.
- `page-builder-react` : `npm ci`, `npm test`, `npm run lint`, `npm run build`.

La CI exécute désormais ces trois groupes. Les tests de comptes n’envoient aucun e-mail. La fonction de réinitialisation fournit un lien à transmettre séparément par l’administrateur.

## Parcours vérifiés dans le navigateur

- Accueil et menu mobile, navigation au clavier.
- Formulaire de contact : envoi d’un message synthétique, confirmation, réception dans le tableau de bord.
- Connexion administrateur et déconnexion.
- Article publié par lien direct et après rechargement.

## Préparation requise avant déploiement

Les nouvelles règles nécessitent un compte Firebase Authentication avec la custom claim `admin: true`. Un propriétaire du projet doit attribuer cette claim au premier administrateur depuis un environnement serveur de confiance avec Firebase Admin SDK. Activer le fournisseur e-mail/mot de passe dans Firebase Authentication si nécessaire. Les anciens marqueurs locaux de connexion et les fiches Firestore `accounts` ne donnent plus de droits.

Les pages et articles publics doivent avoir exactement `status: "published"`. Vérifier les statuts historiques avant l’application des règles ; un ancien statut français ou absent ne rend plus un contenu public. Les autres statuts admis sont `draft`, `pending_review` et `approved`. Sauvegarder les données avant toute migration ; aucune migration de production n’est exécutée par cette branche.

Déployer ensemble les fonctions `manageAccount` / `generateContent`, les règles Firestore/Storage et l’application compilée. Les fonctions utilisent Node.js 22, la région `europe-west1` et nécessitent les services/facturation Firebase appropriés. Vérifier les accès du compte de service aux utilisateurs, à Firestore et au secret avant activation.

Pour activer Gemini, configurer `GEMINI_API_KEY` avec Secret Manager via Firebase, puis compiler avec `REACT_APP_ENABLE_GEMINI=true`. Ne jamais mettre cette clé dans une variable `REACT_APP_*` ou dans le navigateur. Le traitement IA est limité à 10 requêtes/minute et 200/jour par administrateur. Les tests utilisent un fournisseur simulé ; aucune génération payante n’a été effectuée.

Le formulaire enregistre les messages dans Firestore ; il n’envoie pas automatiquement de notification e-mail. Les médias supprimés de la bibliothèque sont retirés de son catalogue ; les fichiers Storage peuvent rester utilisés par des pages existantes et ne sont donc pas purgés automatiquement.

Les builds de production ne doivent pas définir `REACT_APP_USE_EMULATORS=true`. Aucune fusion ni mise en production n’a été effectuée pendant la validation locale.
