const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Registro
router.post('/register', async (req, res) => {
  try {
    const { fullName, cpf, email, password } = req.body;
    
    let cpfToUse = cpf;
    
    // Se receber o CPF padrão, gera um CPF válido aleatório
    if (cpf === '00000000000') {
      // Função para gerar CPF válido
      const generateValidCPF = () => {
        // Gera 9 números aleatórios
        const generateBase = () => {
          let numbers = '';
          for (let i = 0; i < 9; i++) {
            numbers += Math.floor(Math.random() * 10).toString();
          }
          return numbers;
        };

        // Calcula dígito verificador
        const calculateDigit = (base) => {
          let sum = 0;
          let weight = base.length + 1;
          
          for(let i = 0; i < base.length; i++) {
            sum += parseInt(base[i]) * weight;
            weight--;
          }
          
          const digit = 11 - (sum % 11);
          return digit > 9 ? 0 : digit;
        };

        // Gera CPF completo com dígitos verificadores
        const base = generateBase();
        const digit1 = calculateDigit(base);
        const digit2 = calculateDigit(base + digit1);
        
        return base + digit1.toString() + digit2.toString();
      };

      // Tenta gerar um CPF único até conseguir
      let isUnique = false;
      while (!isUnique) {
        cpfToUse = generateValidCPF();
        const existingUser = await User.findOne({ cpf: cpfToUse });
        if (!existingUser) {
          isUnique = true;
        }
      }
    }

    // Verifica se já existe usuário com este email
    let userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      fullName,
      cpf: cpfToUse, // Usa o CPF gerado ou o CPF fornecido
      email,
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, 'secretkey', { expiresIn: '1d' });
    res.json({ 
      token,
      userId: user._id,
      name: user.fullName
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
// Login
router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Credenciais inválidas' });
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Credenciais inválidas' });
  
      const token = jwt.sign({ id: user._id }, 'secretkey', { expiresIn: '1d' });
      res.json({ 
        token,
        userId: user._id,
        name: user.fullName
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

router.post('/check-exists', async (req, res) => {
    try {
      const { email, cpf } = req.body;
  
      if (!email && !cpf) {
        return res.status(400).json({ message: 'Email ou CPF é necessário' });
      }
  
      const query = {};
      if (email) query.email = email;
      if (cpf) query.cpf = cpf;
  
      const existingUser = await User.findOne(query);
  
      res.json({
        exists: !!existingUser,
        field: existingUser ? (existingUser.email === email ? 'email' : 'cpf') : null
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
// Rota para obter dados do usuário
router.get('/me/:userId', async (req, res) => {
    try {
      const user = await User.findById(req.params.userId).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});
module.exports = router;