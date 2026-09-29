const { initializeApp } = require('firebase-admin/app');
initializeApp();
exports.generateContent = require('./gemini').generateContent;
exports.manageAccount = require('./accounts').manageAccount;
