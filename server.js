const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { scheduleDailyIncome } = require('./services/cronJobs');
const app = express();

app.use(cors());
app.use(express.json());

// Conexão com MongoDB
mongoose.connect('mongodb://darkvips:lombarde1@147.79.111.143:27017/picoone-v4', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: 'admin'
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/investments', require('./routes/investments'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/products', require('./routes/products'));
app.use('/api/referral', require('./routes/referral'));

const paymentRoutes = require('./routes/payment');
app.use('/api/payment', paymentRoutes);


//scheduleDailyIncome();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));