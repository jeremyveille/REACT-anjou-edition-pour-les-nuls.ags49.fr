import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: "AIzaSyDgb6SZIqJ3jTdi_kM695DvlfDOCvCU71I",
  authDomain: "react-anjou-edition.firebaseapp.com",
  projectId: "react-anjou-edition",
  storageBucket: "react-anjou-edition.firebasestorage.app",
  messagingSenderId: "494338542670",
  appId: "1:494338542670:web:50b23e1a488f46e246071f",
  measurementId: "G-E48RL606Z1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const COLLECTIONS = [
  'pages',
  'articles',
  'menus',
  'flipbooks',
  'medias',
  'gallery',
  'videos',
  'news',
  'accounts',
  'settings',
  'contacts',
  'auditLogs'
];

async function main() {
  console.log("Signing in to Firebase as admin...");
  try {
    await signInWithEmailAndPassword(auth, 'admin@anjou-edition.fr', 'admin2026');
    console.log("Successfully authenticated as admin.");
  } catch (err) {
    console.warn("Auth warning (might read public collections anyway):", err.message);
  }

  const backupData = {
    timestamp: new Date().toISOString(),
    projectId: "react-anjou-edition",
    collections: {}
  };

  for (const colName of COLLECTIONS) {
    try {
      console.log(`Reading collection: ${colName}...`);
      const snap = await getDocs(collection(db, colName));
      backupData.collections[colName] = snap.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      console.log(`  -> Found ${snap.docs.length} docs in ${colName}`);
    } catch (e) {
      console.error(`  -> Error reading ${colName}:`, e.message);
      backupData.collections[colName] = [];
    }
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(__dirname, `../firestore_backup_before_sync_${timestampStr}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`\nBackup saved successfully to: ${backupFilePath}`);
}

main().catch(console.error);
