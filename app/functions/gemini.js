const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { createGenerateHandler, nextQuota } = require('./gemini-core');
const geminiKey = defineSecret('GEMINI_API_KEY');

exports.generateContent = onCall({
  region: 'europe-west1', secrets: [geminiKey], timeoutSeconds: 60,
  maxInstances: 4, memory: '256MiB'
}, createGenerateHandler({
  getKey: () => geminiKey.value(),
  fetchImpl: (...args) => fetch(...args),
  verifyAdmin: async (uid) => {
    const user = await getAuth().getUser(uid);
    return !user.disabled && user.customClaims?.admin === true;
  },
  consumeQuota: async (uid) => {
    const db = getFirestore();
    const reference = db.collection('aiRateLimits').doc(uid);
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(reference);
      transaction.set(reference, nextQuota(snapshot.data(), Date.now()));
    });
  }
}));
