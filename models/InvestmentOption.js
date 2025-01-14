const mongoose = require('mongoose');

const investmentOptionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    minAmount: { type: Number, required: true },
    returnRate: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    risk: { type: String, enum: ['baixo', 'médio', 'alto'], required: true },
    isFirstInvestment: { type: Boolean, default: false } // Novo campo
  });

module.exports = mongoose.model('InvestmentOption', investmentOptionSchema);