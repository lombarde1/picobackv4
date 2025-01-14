// models/UserProduct.js
const mongoose = require('mongoose');

const userProductSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: String }, // Mudando para String
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    lastIncomeDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserProduct', userProductSchema);