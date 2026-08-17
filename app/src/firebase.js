import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Limit Firebase Storage retry timeouts to 3 seconds to avoid UI hanging on CORS / connection errors
if (storage) {
  storage.maxUploadRetryTime = 3000;
  storage.maxOperationRetryTime = 3000;
}

export default app;
