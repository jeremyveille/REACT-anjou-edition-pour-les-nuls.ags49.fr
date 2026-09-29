const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const requireFunctions = require('node:module').createRequire(require('node:path').resolve(__dirname, '../../functions/package.json'));
process.env.GCLOUD_PROJECT = 'demo-anjou-edition';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const { initializeApp, deleteApp } = requireFunctions('firebase-admin/app');
const { getAuth } = requireFunctions('firebase-admin/auth');
const app = initializeApp({ projectId: 'demo-anjou-edition' }, 'account-tests');
const auth = getAuth(app);
const password = 'EmulatorOnly!2026';
const users = [];
let adminToken, memberToken, admin;
async function makeUser(email, isAdmin) {
  const user = await auth.createUser({ email, password });
  users.push(user.uid);
  await auth.setCustomUserClaims(user.uid, { admin: isAdmin });
  const result = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  return { user, token: (await result.json()).idToken };
}
async function call(data, token) {
  const result = await fetch('http://127.0.0.1:5001/demo-anjou-edition/europe-west1/manageAccount', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify({ data })
  });
  return { status: result.status, body: await result.json() };
}
before(async () => {
  const suffix = Date.now();
  const a = await makeUser('admin-' + suffix + '@example.test', true);
  const m = await makeUser('member-' + suffix + '@example.test', false);
  admin = a.user; adminToken = a.token; memberToken = m.token;
});
after(async () => {
  for (const uid of users) await auth.deleteUser(uid).catch(() => {});
  await deleteApp(app);
});
test('callable rejects anonymous and ordinary members', async () => {
  assert.equal((await call({ action: 'list' })).status, 401);
  assert.equal((await call({ action: 'list' }, memberToken)).status, 403);
});
test('admin account management really creates, changes and deletes an Auth identity', async () => {
  const created = await call({ action: 'create', name: 'Lecteur local', email: 'created-' + Date.now() + '@example.test', role: 'member' }, adminToken);
  assert.equal(created.status, 200);
  const id = created.body.result.account.id;
  users.push(id);
  assert.equal((await auth.getUser(id)).disabled, false);
  const link = await call({ action: 'resetLink', id }, adminToken);
  assert.equal(link.status, 200);
  assert.ok(link.body.result.resetLink);
  const updated = await call({ action: 'update', id, disabled: true }, adminToken);
  assert.equal(updated.status, 200);
  assert.equal((await auth.getUser(id)).disabled, true);
  assert.equal((await call({ action: 'resetLink', id }, adminToken)).status, 400);
  assert.equal((await call({ action: 'delete', id }, adminToken)).status, 200);
  await assert.rejects(auth.getUser(id), { code: 'auth/user-not-found' });
});
test('administrator cannot remove own access or submit an unknown role', async () => {
  for (const data of [{ action: 'delete' }, { action: 'update', disabled: true }, { action: 'update', role: 'member' }]) {
    const result = await call({ ...data, id: admin.uid }, adminToken);
    assert.equal(result.body.error.status, 'FAILED_PRECONDITION');
  }
  const invalid = await call({ action: 'create', name: 'Invalid', email: 'invalid@example.test', role: 'owner' }, adminToken);
  assert.equal(invalid.body.error.status, 'INVALID_ARGUMENT');
});
