const { before, after, beforeEach, test } = require('node:test');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, query, where, setDoc, deleteDoc, serverTimestamp } = require('firebase/firestore');
const { ref, uploadBytes, deleteObject } = require('firebase/storage');
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-anjou-rules',
    firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync('firestore.rules', 'utf8') },
    storage: { host: '127.0.0.1', port: 9199, rules: fs.readFileSync('storage.rules', 'utf8') }
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    for (const path of ['pages/published', 'articles/published']) await setDoc(doc(context.firestore(), path), { status: 'published', title: 'Public' });
    for (const path of ['pages/draft', 'articles/draft']) await setDoc(doc(context.firestore(), path), { status: 'draft', title: 'Private' });
    for (const path of ['accounts/member', 'settings/global', 'contacts/message']) await setDoc(doc(context.firestore(), path), { value: 'private' });
    await setDoc(doc(context.firestore(), 'settings/homepage'), { featuredArticleId: 'published' });
    await setDoc(doc(context.firestore(), 'flipbooks/book'), { title: 'Book' });
  });
});
const anonymous = () => env.unauthenticatedContext();
const member = () => env.authenticatedContext('reader', { admin: false });
const admin = () => env.authenticatedContext('administrator', { admin: true });

test('public can read published content and homepage, but no drafts, identities, messages or private settings', async () => {
  for (const context of [anonymous(), member()]) {
    const db = context.firestore();
    for (const path of ['pages/published', 'articles/published', 'settings/homepage']) await assertSucceeds(getDoc(doc(db, path)));
    for (const path of ['pages/draft', 'articles/draft', 'accounts/member', 'settings/global', 'contacts/message']) await assertFails(getDoc(doc(db, path)));
    await assertSucceeds(getDocs(query(collection(db, 'pages'), where('status', '==', 'published'))));
    await assertFails(getDocs(collection(db, 'pages')));
  }
});
test('anonymous and non-admin clients cannot mutate public content or assign privileges', async () => {
  for (const context of [anonymous(), member()]) {
    for (const path of ['pages/published', 'articles/published', 'flipbooks/book', 'menus/item', 'settings/homepage', 'accounts/member']) {
      await assertFails(setDoc(doc(context.firestore(), path), { status: 'published', admin: true }));
      await assertFails(deleteDoc(doc(context.firestore(), path)));
    }
  }
});
test('admin can manage editorial content with valid status but identity changes require server', async () => {
  const db = admin().firestore();
  await assertSucceeds(getDoc(doc(db, 'pages/draft')));
  await assertSucceeds(setDoc(doc(db, 'pages/new'), { status: 'published' }));
  await assertFails(setDoc(doc(db, 'pages/new'), { status: 'arbitrary' }));
  await assertSucceeds(deleteDoc(doc(db, 'flipbooks/book')));
  await assertFails(setDoc(doc(db, 'accounts/member'), { admin: true }));
});
test('contact submission validates data, rejects forged metadata and remains private', async () => {
  const db = anonymous().firestore();
  const contact = { name: 'Lecteur test', email: 'reader@example.test', subject: 'Question', message: 'Message de test.', timestamp: serverTimestamp() };
  await assertSucceeds(setDoc(doc(db, 'contacts/new'), contact));
  await assertFails(getDoc(doc(db, 'contacts/new')));
  await assertFails(setDoc(doc(db, 'contacts/invalid'), { ...contact, message: '', role: 'admin' }));
  await assertFails(setDoc(doc(db, 'contacts/stale'), { ...contact, timestamp: 'yesterday' }));
  await assertSucceeds(getDoc(doc(admin().firestore(), 'contacts/new')));
});
test('public homepage cannot contain a private setting and audit logs are immutable', async () => {
  const db = admin().firestore();
  await assertSucceeds(setDoc(doc(db, 'settings/homepage'), { featuredArticleId: 'published' }));
  await assertFails(setDoc(doc(db, 'settings/homepage'), { featuredArticleId: 'published', privateKey: 'no' }));
  await assertSucceeds(setDoc(doc(db, 'auditLogs/test'), { actorId: 'administrator' }));
  await assertFails(setDoc(doc(db, 'auditLogs/test'), { actorId: 'administrator', tampered: true }));
  await assertFails(setDoc(doc(db, 'auditLogs/forged'), { actorId: 'another-user' }));
  await assertFails(deleteDoc(doc(db, 'auditLogs/test')));
});
test('Storage permits admin media uploads and deletion while rejecting other users and active HTML', async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  for (const context of [anonymous(), member()]) {
    await assertFails(uploadBytes(ref(context.storage(), 'test.png'), bytes, { contentType: 'image/png' }));
    await assertFails(deleteObject(ref(context.storage(), 'test.png')));
  }
  const storage = admin().storage();
  await assertFails(uploadBytes(ref(storage, 'active.html'), bytes, { contentType: 'text/html' }));
  await assertSucceeds(uploadBytes(ref(storage, 'test.png'), bytes, { contentType: 'image/png' }));
  await assertSucceeds(deleteObject(ref(storage, 'test.png')));
});
