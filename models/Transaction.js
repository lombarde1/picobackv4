// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { 
    type: String, 
    required: true, 
    enum: ['deposit', 'withdrawal', 'investment', 'investment_return', 'referral_commission', 'referral_bonus', 'commission_withdrawal', 'admin_adjustment'] 
  },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'rejected'], default: 'pending' },
  transactionId: String,
  externalId: String,
  pixKey: String,
  pixKeyType: { type: String, enum: ['cpf', 'email', 'phone', 'random'] },
  description: String,
  rejectionReason: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);