import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDgb6SZIqJ3jTdi_kM695DvlfDOCvCU71I",
  authDomain: "react-anjou-edition.firebaseapp.com",
  projectId: "react-anjou-edition",
  storageBucket: "react-anjou-edition.firebasestorage.app",
  messagingSenderId: "494338542670",
  appId: "1:494338542670:web:50b23e1a488f46e246071f",
  measurementId: "G-E48RL606Z1"
};

// Initialize Firebase
// Development always uses a demo project, including when emulators are stopped.
export const useEmulators = process.env.REACT_APP_USE_EMULATORS === 'true' ||
  process.env.NODE_ENV === 'development';
const app = initializeApp(useEmulators ? {
  apiKey: 'demo-key',
  authDomain: 'demo-anjou-edition.firebaseapp.com',
  projectId: 'demo-anjou-edition',
  storageBucket: 'demo-anjou-edition.appspot.com',
  appId: 'demo-anjou-edition'
} : firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1');

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

// Limit Firebase Storage retry timeouts to 3 seconds to avoid UI hanging on CORS / connection errors
if (storage) {
  storage.maxUploadRetryTime = 3000;
  storage.maxOperationRetryTime = 3000;
}

export default app;
