const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

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
const db = getFirestore(app);

const COLLECTIONS = [
  'menus',
  'pages',
  'articles',
  'flipbooks',
  'gallery',
  'videos',
  'medias',
  'news',
  'accounts',
  'settings',
  'auditLogs',
  'contacts'
];

async function backup() {
  console.log("Starting Firestore production backup...");
  const backupData = {
    timestamp: new Date().toISOString(),
    projectId: "react-anjou-edition",
    collections: {}
  };

  for (const colName of COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      backupData.collections[colName] = snap.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      }));
      console.log(`✓ Collection ${colName}: ${backupData.collections[colName].length} documents backed up.`);
    } catch (err) {
      console.error(`✗ Error backing up ${colName}:`, err.message);
      backupData.collections[colName] = [];
    }
  }

  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `firestore_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(backupDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`Backup completed successfully saved to: ${filePath}`);
}

backup().then(() => process.exit(0)).catch(err => {
  console.error("Backup failed:", err);
  process.exit(1);
});
