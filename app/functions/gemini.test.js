const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGenerateHandler, nextQuota } = require('./gemini-core');

const request = { auth: { uid: 'admin', token: { admin: true } }, data: { prompt: 'La Loire' } };
function setup(overrides = {}) {
  const calls = [];
  const handler = createGenerateHandler({
    getKey: () => 'server-only-test-key',
    verifyAdmin: async () => true,
    consumeQuota: async uid => calls.push(['quota', uid]),
    fetchImpl: async (url, options) => {
      calls.push(['fetch', url, options]);
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: ' Le texte. ' }] } }] }) };
    },
    ...overrides
  });
  return { handler, calls };
}
test('rejects anonymous and non-admin callers before using quota or upstream', async () => {
  const { handler, calls } = setup();
  await assert.rejects(handler({ data: request.data }), { code: 'unauthenticated' });
  await assert.rejects(handler({ ...request, auth: { uid: 'reader', token: {} } }), { code: 'permission-denied' });
  assert.deepEqual(calls, []);
});
test('rejects a disabled or demoted administrator with a stale token', async () => {
  const { handler } = setup({ verifyAdmin: async () => false });
  await assert.rejects(handler(request), { code: 'permission-denied' });
});
test('validates input before quota and generation', async () => {
  const { handler, calls } = setup();
  for (const prompt of ['', ' ', 42, 'x'.repeat(10001)]) {
    await assert.rejects(handler({ ...request, data: { prompt } }), { code: 'invalid-argument' });
  }
  assert.deepEqual(calls, []);
});
test('keeps secret on server and ignores client model/key overrides', async () => {
  const { handler, calls } = setup();
  assert.deepEqual(await handler({ ...request, data: { ...request.data, apiKey: 'client', model: 'other' } }), { text: 'Le texte.' });
  assert.equal(calls[0][0], 'quota');
  const [, url, options] = calls[1];
  assert.equal(url.includes('key='), false);
  assert.equal(options.headers['x-goog-api-key'], 'server-only-test-key');
  assert.equal(options.body.includes('client'), false);
});
test('does not call upstream when secret or quota is unavailable', async () => {
  const missing = setup({ getKey: () => '' });
  await assert.rejects(missing.handler(request), { code: 'failed-precondition' });
  assert.deepEqual(missing.calls, []);
  const limited = setup({ consumeQuota: async () => { throw Object.assign(new Error('Limit'), { code: 'resource-exhausted' }); } });
  await assert.rejects(limited.handler(request), { code: 'resource-exhausted' });
  assert.deepEqual(limited.calls, []);
});
test('does not expose upstream error payload or secret', async () => {
  const { handler } = setup({ fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({ error: 'secret' }) }) });
  await assert.rejects(handler(request), error => error.code === 'unavailable' && !error.message.includes('secret'));
});
test('rejects empty and malformed responses', async () => {
  for (const json of [async () => ({}), async () => { throw new Error('bad'); }]) {
    const { handler } = setup({ fetchImpl: async () => ({ ok: true, json }) });
    await assert.rejects(handler(request));
  }
});
test('quota limits survive minute changes and reset daily', () => {
  const now = 100000000;
  let quota;
  for (let index = 0; index < 10; index++) quota = nextQuota(quota, now);
  assert.throws(() => nextQuota(quota, now), { code: 'resource-exhausted' });
  const next = nextQuota(quota, now + 60000);
  assert.equal(next.minuteCount, 1);
  assert.equal(next.dayCount, 11);
  assert.throws(() => nextQuota({ ...next, dayCount: 200 }, now + 120000), { code: 'resource-exhausted' });
  assert.equal(nextQuota({ ...next, dayCount: 200 }, now + 86400000).dayCount, 1);
});
