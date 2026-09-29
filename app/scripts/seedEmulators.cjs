// Synthetic fixtures only. Hard guards prevent this script from targeting live services.
process.env.GCLOUD_PROJECT = 'demo-anjou-edition';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const requireFunctions = require('node:module').createRequire(require('node:path').resolve(__dirname, '../functions/package.json'));
const { initializeApp } = requireFunctions('firebase-admin/app');
const { getAuth } = requireFunctions('firebase-admin/auth');
const { getFirestore } = requireFunctions('firebase-admin/firestore');
initializeApp({ projectId: 'demo-anjou-edition' });
async function seed() {
  const auth = getAuth();
  let user;
  try { user = await auth.getUserByEmail('admin@example.test'); }
  catch { user = await auth.createUser({ email: 'admin@example.test', password: 'LocalPreview!2026', displayName: 'Administration de test' }); }
  await auth.setCustomUserClaims(user.uid, { admin: true });
  const db = getFirestore();
  await db.doc('pages/parcours-test').set({
    title: 'Découvrir les bords de Loire', slug: 'bords-de-loire', status: 'published',
    blocks: [{ id: 'intro', type: 'heading', settings: { content: 'Découvrir les bords de Loire', tag: 'h1' }, children: [] }]
  });
  await db.doc('articles/article-test').set({
    title: 'La Loire, un patrimoine vivant', slug: 'loire-patrimoine', status: 'published', category: 'Patrimoine',
    excerpt: 'Un regard sur les paysages et les histoires de notre région.',
    content: 'Contenu fictif destiné uniquement à la vérification locale du site.',
    image: '/header-angers.jpg', blocks: [], updatedAt: new Date().toISOString()
  });
  console.log('Fixtures locales prêtes : admin@example.test (mot de passe de test défini dans ce script).');
}
seed().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
