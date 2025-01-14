// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  validityPeriod: Number,
  dailyIncome: Number,
  totalIncome: Number,
  imageUrl: String
});

module.exports = mongoose.model('Product', productSchema);