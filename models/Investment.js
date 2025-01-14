// models/Investment.js
const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  optionId: { type: String, required: true },
  investmentName: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  expectedReturn: { type: Number, required: true },
  risk: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' }
});

module.exports = mongoose.model('Investment', investmentSchema);