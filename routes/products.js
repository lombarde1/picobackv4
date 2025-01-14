// routes/products.js
const express = require('express');
const router = express.Router();
const UserProduct = require("../models/UserProduct");
const User = require("../models/User");
const PRODUCTS = [
    {
      id: "pico1",
      name: "PICO 1 VR Headset",
      price: 40,
      validityPeriod: 50,
      dailyIncome: 8,
      totalIncome: 400,
      imageUrl: "https://dev.hocketzap.com/integrations/chat-media/image/607236a4-0c6b-491d-85b9-39c98b2f566e.jpg"
    },
    {
      id: "pico1pro",
      name: "PICO 1 Pro VR Headset",
      price: 150,
      validityPeriod: 50,
      dailyIncome: 33,
      totalIncome: 1650,
      imageUrl: "https://dev.hocketzap.com/integrations/chat-media/image/6eccf9ca-03a9-48fa-803d-336c46224518.jpg"
    },
    {
      id: "pico2",
      name: "PICO 2 VR Headset",
      price: 500,
      validityPeriod: 50,
      dailyIncome: 125,
      totalIncome: 6250,
      imageUrl: "https://dev.hocketzap.com/integrations/chat-media/image/d6fe761c-8947-4edd-a6ae-d9848e9a48d0.jpg"
    },
    {
      id: "pico2pro",
      name: "PICO 2 Pro VR Headset", 
      price: 1000,
      validityPeriod: 50,
      dailyIncome: 270,
      totalIncome: 13500,
      imageUrl: "https://dev.hocketzap.com/integrations/chat-media/image/d6fe761c-8947-4edd-a6ae-d9848e9a48d0.jpg"
    },
    {
      id: "pico3",
      name: "PICO 3 VR Headset",
      price: 2500,
      validityPeriod: 50,
      dailyIncome: 750,
      totalIncome: 37500,
      imageUrl: "https://dev.hocketzap.com/integrations/chat-media/image/aaffd123-5ee8-44cf-a4e5-b35447d25330.jpg"
    },
    {
      id: "pico3pro",
      name: "PICO 3 Pro VR Headset",
      price: 5000,
      validityPeriod: 50,
      dailyIncome: 1650,
      totalIncome: 82500,
      imageUrl: "https://dev.hocketzap.com/integrations/chat-media/image/aaffd123-5ee8-44cf-a4e5-b35447d25330.jpg"
    }
   ];

// Listar produtos
router.get('/', (req, res) => {
  res.json(PRODUCTS);
});

// Comprar produto
router.post('/buy/:userId', async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.params.userId);
    const product = PRODUCTS.find(p => p.id === productId);

    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
    if (user.balance < product.price) return res.status(400).json({ message: 'Saldo insuficiente' });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + product.validityPeriod);

    const userProduct = new UserProduct({
      userId: user._id,
      productId,
      endDate,
      status: 'active'
    });

    await userProduct.save();
    await User.findByIdAndUpdate(user._id, { $inc: { balance: -product.price } });

    res.json({
      success: true,
      message: 'Produto adquirido com sucesso',
      product: userProduct
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Listar produtos do usuário
router.get('/my-products/:userId', async (req, res) => {
  try {
    const userProducts = await UserProduct.find({ 
      userId: req.params.userId,
      status: 'active'
    });
    
    const productsWithDetails = userProducts.map(up => {
      const product = PRODUCTS.find(p => p.id === up.productId);
      return {
        ...product,
        startDate: up.startDate,
        endDate: up.endDate,
        lastIncomeDate: up.lastIncomeDate
      };
    });

    res.json(productsWithDetails);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Processar renda diária (deve ser executado por um cron job)
router.post('/process-income/:userId', async (req, res) => {
  try {
    const userProducts = await UserProduct.find({
      userId: req.params.userId,
      status: 'active'
    });

    let totalIncome = 0;
    for (const up of userProducts) {
      const product = PRODUCTS.find(p => p.id === up.productId);
      if (product) {
        const now = new Date();
        const daysSinceLastIncome = Math.floor((now - up.lastIncomeDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastIncome >= 1) {
          totalIncome += product.dailyIncome;
          up.lastIncomeDate = now;
          await up.save();
        }
      }
    }

    if (totalIncome > 0) {
      await User.findByIdAndUpdate(req.params.userId, { $inc: { balance: totalIncome } });
    }

    res.json({
      success: true,
      incomeProcessed: totalIncome
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;