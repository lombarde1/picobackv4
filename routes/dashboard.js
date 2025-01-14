const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Investment = require('../models/Investment');
const InvestmentOption = require('../models/InvestmentOption');

// Rota para obter todos os dados do dashboard
// Rota para obter todos os dados do dashboard
router.get('/summary/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
  
      const investments = await Investment.find({ userId: userId });
      const investmentOptions = await InvestmentOption.find();
  
      // Calcula o total investido
      const totalInvested = investments.reduce((acc, inv) => acc + inv.amount, 0);
  
      // Calcula o retorno total esperado
      const totalExpectedReturn = investments.reduce((acc, inv) => acc + inv.expectedReturn, 0);
  
      // Busca investimentos ativos e completados
      const activeInvestments = investments.filter(inv => inv.status === 'active');
      const completedInvestments = investments.filter(inv => inv.status === 'completed');
  
      const summaryData = {
        user: {
          name: user.fullName,
          balance: user.balance,
          totalInvested,
          totalExpectedReturn
        },
        investmentSummary: {
          totalInvestments: investments.length,
          activeInvestments: activeInvestments.length,
          completedInvestments: completedInvestments.length,
          portfolioPerformance: totalInvested > 0 ? ((totalExpectedReturn - totalInvested) / totalInvested * 100).toFixed(2) : "0.00"
        },
        marketData: {
          marketStatus: "Aberto",
          lastUpdate: new Date(),
          mainIndexes: [
            { name: "IBOVESPA", value: 129876.54, variation: 1.23 },
            { name: "S&P 500", value: 4789.32, variation: 0.87 },
            { name: "NASDAQ", value: 15234.67, variation: -0.45 }
          ]
        },
        availableInvestments: investmentOptions,
        recentInvestments: investments.slice(0, 5),
        performanceMetrics: {
          daily: 0.45,
          weekly: 2.31,
          monthly: 8.76,
          yearly: 23.54
        }
      };
  
      res.json(summaryData);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });





module.exports = router;