const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { createAccountHandler, AccountError } = require('./accounts-core');

exports.manageAccount = onCall({ region: 'europe-west1', maxInstances: 5 }, async request => {
  try {
    return await createAccountHandler({ auth: getAuth(), db: getFirestore() })(request);
  } catch (error) {
    if (error instanceof AccountError) throw new HttpsError(error.code, error.message);
    if (error.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Un compte utilise déjà cette adresse e-mail.');
    if (error.code === 'auth/user-not-found') throw new HttpsError('not-found', 'Ce compte Firebase est introuvable. Actualisez la liste.');
    throw new HttpsError('internal', 'L’opération n’a pas pu être confirmée. Actualisez la liste avant de réessayer.');
  }
});
