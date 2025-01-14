const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  region: { 
    country: { type: String, default: 'Brasil' },
    currency: { type: String, default: 'BRL' },
    timezone: { type: String, default: 'America/Sao_Paulo' }
  },
  investorProfile: {
    riskLevel: { type: String, enum: ['conservador', 'moderado', 'arrojado'], default: 'moderado' },
    experience: { type: String, enum: ['iniciante', 'intermediário', 'avançado'], default: 'iniciante' },
    investmentGoal: { type: String, enum: ['renda', 'crescimento', 'especulação'], default: 'crescimento' }
  },
  preferences: {
    showNewMarkets: { type: Boolean, default: false },
    riskNotifications: { type: Boolean, default: true },
    autoInvestment: { type: Boolean, default: false },
    showBalance: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false }
  },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    investmentAlerts: { type: Boolean, default: true },
    marketUpdates: { type: Boolean, default: true },
    profitAlerts: { type: Boolean, default: true },
    lossAlerts: { type: Boolean, default: true }
  },
  security: {
    twoFactorAuth: { type: Boolean, default: false },
    loginNotifications: { type: Boolean, default: true },
    withdrawalConfirmation: { type: Boolean, default: true },
    ipRestriction: { type: Boolean, default: false }
  },
  dashboard: {
    defaultView: { type: String, enum: ['overview', 'investments', 'analytics'], default: 'overview' },
    showGraphs: { type: Boolean, default: true },
    showNews: { type: Boolean, default: true },
    compactView: { type: Boolean, default: false }
  }
});

module.exports = mongoose.model('UserSettings', userSettingsSchema);