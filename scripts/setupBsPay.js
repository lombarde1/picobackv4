// scripts/setupBsPay.js
const mongoose = require('mongoose');
const ApiCredential = require('../models/ApiCredential');

mongoose.connect('mongodb://darkvips:lombarde1@147.79.111.143:27017/picoone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: 'admin'
});

async function setupCredentials() {
  try {
    await ApiCredential.findOneAndUpdate(
      { name: 'bspay' },
      {
        clientId: 'djavan003_6192735811',
        clientSecret: 'f944202c2941fa7bfe03463e933d4a3f54f333df111f6a4aab0aaeac7eb5a12f',
        baseUrl: 'https://api.bspay.co/v2'
      },
      { upsert: true }
    );
    console.log('Credenciais BS Pay configuradas com sucesso');
  } catch (error) {
    console.error('Erro ao configurar credenciais:', error);
  } finally {
    mongoose.disconnect();
  }
}

setupCredentials();