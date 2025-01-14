const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  commissionBalance: { type: Number, default: 0 }, // Novo campo para saldo de comissões
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);