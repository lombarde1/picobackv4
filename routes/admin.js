// routes/admin.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const ApiCredential = require('../models/ApiCredential');
const Admin = require('../models/Admin');

// Login Admin
// Login Admin
// Login Admin
router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body; // Alterado para match com o payload do frontend
      
      console.log('Tentativa de login:', { email: username }); // Log para debug
  
      const admin = await Admin.findOne({ email: username });
      
      if (!admin) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
  
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
  
      const token = jwt.sign(
        { id: admin._id, role: admin.role },
        'admin-secret-key',
        { expiresIn: '1d' }
      );
  
      res.json({ 
        token, 
        role: admin.role,
        email: admin.email
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ message: error.message });
    }
  });

// Gerenciamento de Usuários
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    const transactions = await Transaction.find({ userId: req.params.userId });
    const investments = await Investment.find({ userId: req.params.userId });

    res.json({
      user,
      transactions,
      investments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Atualizar saldo do usuário
router.post('/user/balance/:userId', async (req, res) => {
  try {
    const { amount, operation, reason } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const oldBalance = user.balance;
    if (operation === 'add') {
      user.balance += amount;
    } else if (operation === 'subtract') {
      user.balance -= amount;
    } else if (operation === 'set') {
      user.balance = amount;
    }

    await user.save();

    // Registra a operação
    const transaction = new Transaction({
      userId: user._id,
      type: 'admin_adjustment',
      amount: amount,
      status: 'completed',
      description: reason || 'Ajuste administrativo',
      oldBalance,
      newBalance: user.balance
    });

    await transaction.save();

    res.json({ 
      message: 'Saldo atualizado com sucesso',
      newBalance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Gerenciamento de Depósitos
router.get('/deposits', async (req, res) => {
  try {
    const deposits = await Transaction.find({ type: 'deposit' })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Gerenciamento de Saques
router.get('/withdrawals', async (req, res) => {
  try {
    const withdrawals = await Transaction.find({ type: 'withdrawal' })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Aprovar/Rejeitar saque
router.post('/withdrawal/:transactionId', async (req, res) => {
  try {
    const { action, reason } = req.body;
    const transaction = await Transaction.findById(req.params.transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'Transação não encontrada' });
    }

    if (action === 'approve') {
      transaction.status = 'completed';
    } else if (action === 'reject') {
      transaction.status = 'rejected';
      transaction.rejectionReason = reason;

      // Devolve o valor para o usuário
      const user = await User.findById(transaction.userId);
      user.balance += transaction.amount;
      await user.save();
    }

    await transaction.save();

    res.json({ message: `Saque ${action === 'approve' ? 'aprovado' : 'rejeitado'}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Configurações BSPay
router.get('/bspay-settings', async (req, res) => {
  try {
    const credentials = await ApiCredential.findOne({ name: 'bspay' });
    res.json(credentials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/bspay-settings', async (req, res) => {
  try {
    const { clientId, clientSecret, baseUrl } = req.body;
    
    const credentials = await ApiCredential.findOneAndUpdate(
      { name: 'bspay' },
      { 
        clientId,
        clientSecret,
        baseUrl
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Configurações atualizadas', credentials });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Rota para criar o primeiro admin
router.post('/create-first-admin', async (req, res) => {
    try {
      const { email, senha } = req.body; // Alterado para 'senha' para match com o request
  
      // Validações básicas
      if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios' });
      }
  
      // Verifica se já existe algum admin
      const adminExists = await Admin.findOne();
      if (adminExists) {
        return res.status(400).json({ message: 'Já existe um admin no sistema' });
      }
  
      // Garante que a senha é uma string
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(String(senha), salt);
  
      const admin = new Admin({
        email,
        password: hashedPassword,
        role: 'super_admin'
      });
  
      await admin.save();
  
      res.json({ 
        message: 'Admin principal criado com sucesso', 
        adminId: admin._id 
      });
  
    } catch (error) {
      console.error('Erro ao criar admin:', error);
      res.status(500).json({ 
        message: 'Erro ao criar admin',
        error: error.message 
      });
    }
  });


  const checkSuperAdmin = async (req, res, next) => {
    try {
      const token = req.header('x-auth-token');
      if (!token) {
        return res.status(401).json({ message: 'Acesso negado' });
      }
  
      const decoded = jwt.verify(token, 'admin-secret-key');
      if (decoded.role !== 'super_admin') {
        return res.status(403).json({ message: 'Permissão negada' });
      }
  
      next();
    } catch (error) {
      res.status(401).json({ message: 'Token inválido' });
    }
  };
  
  // Rota para criar novos admins (apenas super_admin pode usar)
  router.post('/register', checkSuperAdmin, async (req, res) => {
    try {
      const { email, password, role = 'admin' } = req.body;
      
      // Verifica se o email já está em uso
      const adminExists = await Admin.findOne({ email });
      if (adminExists) {
        return res.status(400).json({ message: 'Email já está em uso' });
      }
  
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      const admin = new Admin({
        email,
        password: hashedPassword,
        role
      });
  
      await admin.save();
  
      res.json({ message: 'Admin criado com sucesso', adminId: admin._id });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

// Dashboard Admin
router.get('/dashboard', async (req, res) => {
    try {
      const totalUsers = await User.countDocuments();
      const totalBalance = await User.aggregate([
        { $group: { _id: null, total: { $sum: "$balance" } } }
      ]);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const todayDeposits = await Transaction.aggregate([
        { 
          $match: { 
            type: 'deposit',
            status: 'completed',
            createdAt: { $gte: today }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
  
      // Mudando de .count() para .countDocuments()
      const pendingWithdrawals = await Transaction.countDocuments({
        type: 'withdrawal',
        status: 'pending'
      });
  
      res.json({
        totalUsers,
        totalBalance: totalBalance[0]?.total || 0,
        todayDeposits: todayDeposits[0]?.total || 0,
        pendingWithdrawals
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

module.exports = router;