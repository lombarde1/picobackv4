const mongoose = require('mongoose');

const apiCredentialSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  clientSecret: { type: String, required: true },
  baseUrl: { type: String, required: true }
});

module.exports = mongoose.model('ApiCredential', apiCredentialSchema);