#!/usr/bin/env node
/**
 * Script d'exécution universel pour 'npm run build'.
 *
 * Résout le problème des environnements restreints (bac à sable Windows / CI)
 * où le dossier 'build' local n'est pas accessible en écriture ou suppression (EPERM),
 * tout en conservant le comportement standard ('build' local) lorsque le dossier est accessible.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const targetBuildDir = path.resolve(__dirname, '../build');
let isWritable = false;

try {
  if (!fs.existsSync(targetBuildDir)) {
    fs.mkdirSync(targetBuildDir, { recursive: true });
  }
  const testFile = path.join(targetBuildDir, `.test_write_${Date.now()}`);
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  isWritable = true;
} catch (e) {
  isWritable = false;
}

if (!process.env.BUILD_PATH) {
  if (isWritable) {
    process.env.BUILD_PATH = 'build';
  } else {
    const sandboxBuildDir = path.join(os.tmpdir(), 'cra_build');
    console.warn(`[Build] Dossier 'build' local non inscriptible (environnement sandbox/restreint).`);
    console.warn(`[Build] Redirection automatique de BUILD_PATH vers : ${sandboxBuildDir}`);
    process.env.BUILD_PATH = sandboxBuildDir;
  }
}

// Lancement du build officiel Create React App
require('react-scripts/scripts/build');
