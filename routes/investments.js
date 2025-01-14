const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Investment = require('../models/Investment');
const InvestmentOption = require('../models/InvestmentOption');

// routes/investments.js
router.post('/invest/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { investmentId, amount } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    if (user.balance < amount) return res.status(400).json({ message: 'Saldo insuficiente' });

    const hasInvestments = await Investment.findOne({ userId });

    // Investimento especial inicial
    if (investmentId === 'special_first') {
      if (hasInvestments) return res.status(400).json({ message: 'O investimento inicial só está disponível para primeira aplicação' });
      if (amount !== 25) return res.status(400).json({ message: 'O investimento inicial deve ser exatamente R$ 25' });

      const endDate = new Date();
      endDate.setHours(endDate.getHours() + 12);

      const investment = new Investment({
        userId,
        optionId: investmentId,
        investmentName: "Investimento Pico One",
        type: "Especial",
        amount: 25,
        startDate: new Date(),
        endDate,
        expectedReturn: 100,
        risk: "baixo",
        status: 'active'
      });

      await investment.save();
      await User.findByIdAndUpdate(userId, { $inc: { balance: -25 } });

      return res.json({
        success: true,
        message: 'Investimento inicial realizado com sucesso',
        investment
      });
    }

    // Investimentos normais
    const investmentOptions = [
      {
        id: "1",
        name: "Tesouro Prefixado 2026",
        type: "Renda Fixa",
        description: "Título público com rendimento prefixado até 2026",
        minAmount: 100,
        returnRate: 11.5,
        durationDays: 730,
        risk: "baixo",
        details: {
          maturityDate: "2026-01-01",
          interestPayments: "Semestrais",
          liquidityLevel: "Média",
          taxInformation: "IR regressivo conforme prazo"
        }
      },
      {
        id: "2",
        name: "Fundo Multimercado Premium",
        type: "Fundo de Investimento",
        description: "Fundo diversificado com estratégias em múltiplos mercados",
        minAmount: 1000,
        returnRate: 15.8,
        durationDays: 365,
        risk: "médio",
        details: {
          managementFee: "1.8% a.a.",
          performanceFee: "20% sobre CDI",
          strategy: "Macro economia global",
          managers: "Equipe especializada"
        }
      },
      {
        id: "3",
        name: "Ações Blue Chips",
        type: "Renda Variável",
        description: "Carteira das principais empresas da bolsa",
        minAmount: 500,
        returnRate: 18.5,
        durationDays: 180,
        risk: "alto",
        details: {
          composition: "Top 10 empresas do Ibovespa",
          rebalancing: "Trimestral",
          dividendYield: "4.5% a.a.",
          sector: "Diversificado"
        }
      },
      {
        id: "4",
        name: "CDB Banco Premium",
        type: "Renda Fixa",
        description: "CDB com rendimento atrelado ao CDI",
        minAmount: 1000,
        returnRate: 12.5,
        durationDays: 365,
        risk: "baixo",
        details: {
          guarantee: "FGC até R$ 250 mil",
          indexer: "120% do CDI",
          liquidityType: "No vencimento",
          emitter: "Banco Premium S.A."
        }
      },
      {
        id: "5",
        name: "Fundo Imobiliário Prime",
        type: "Fundo Imobiliário",
        description: "Fundo de investimentos em imóveis comerciais premium",
        minAmount: 5000,
        returnRate: 14.2,
        durationDays: 730,
        risk: "médio",
        details: {
          properties: "Imóveis comerciais classe A",
          occupationRate: "95%",
          monthlyIncome: "0.8%",
          locations: "Principais capitais"
        }
      }
      // ... outros investimentos
    ].filter(Boolean); // Remove null values

    const investmentOption = investmentOptions.find(opt => opt.id === investmentId);
    if (!investmentOption) return res.status(404).json({ message: 'Opção de investimento não encontrada' });
    if (amount < investmentOption.minAmount) return res.status(400).json({ message: `Valor mínimo para este investimento é R$ ${investmentOption.minAmount}` });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + investmentOption.durationDays);

    const expectedReturn = amount * (1 + (investmentOption.returnRate / 100));

    const investment = new Investment({
      userId,
      optionId: investmentId,
      investmentName: investmentOption.name,
      type: investmentOption.type,
      amount,
      startDate: new Date(),
      endDate,
      expectedReturn,
      risk: investmentOption.risk,
      status: 'active'
    });

    await investment.save();
    await User.findByIdAndUpdate(userId, { $inc: { balance: -amount } });

    res.json({
      success: true,
      message: 'Investimento realizado com sucesso',
      investment
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Obter carteira de investimentos do usuário
router.get('/portfolio/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const investments = await Investment.find({ userId })
      .populate('optionId')
      .sort({ startDate: -1 });

    const activeInvestments = investments.filter(inv => inv.status === 'active');
    const completedInvestments = investments.filter(inv => inv.status === 'completed');

    const totalInvested = investments.reduce((acc, inv) => acc + inv.amount, 0);
    const totalExpectedReturn = investments.reduce((acc, inv) => acc + inv.expectedReturn, 0);
    const totalProfit = totalExpectedReturn - totalInvested;

    res.json({
      summary: {
        totalInvested,
        totalExpectedReturn,
        totalProfit,
        profitPercentage: ((totalProfit / totalInvested) * 100).toFixed(2),
        activeInvestments: activeInvestments.length,
        completedInvestments: completedInvestments.length
      },
      activeInvestments,
      completedInvestments
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verificar rendimentos atuais
router.get('/earnings/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const investments = await Investment.find({ 
      userId,
      status: 'active'
    });

    const earnings = investments.map(inv => {
      const totalDuration = inv.endDate - inv.startDate;
      const elapsed = Date.now() - inv.startDate;
      const progress = Math.min(elapsed / totalDuration, 1);
      const currentEarnings = inv.amount + ((inv.expectedReturn - inv.amount) * progress);

      return {
        investmentId: inv._id,
        originalAmount: inv.amount,
        currentValue: currentEarnings.toFixed(2),
        profit: (currentEarnings - inv.amount).toFixed(2),
        profitPercentage: (((currentEarnings - inv.amount) / inv.amount) * 100).toFixed(2),
        progress: (progress * 100).toFixed(2),
        timeRemaining: Math.max(0, inv.endDate - Date.now()),
        endDate: inv.endDate
      };
    });

    res.json({
      totalInvestments: investments.length,
      totalCurrentValue: earnings.reduce((acc, earn) => acc + parseFloat(earn.currentValue), 0).toFixed(2),
      totalProfit: earnings.reduce((acc, earn) => acc + parseFloat(earn.profit), 0).toFixed(2),
      investments: earnings
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Sacar investimento quando completado
router.post('/withdraw/:userId/:investmentId', async (req, res) => {
  try {
    const { userId, investmentId } = req.params;
    
    const investment = await Investment.findOne({
      _id: investmentId,
      userId,
      status: 'active'
    });

    if (!investment) {
      return res.status(404).json({ message: 'Investimento não encontrado ou já finalizado' });
    }

    if (Date.now() < investment.endDate) {
      return res.status(400).json({ 
        message: 'Investimento ainda não atingiu a data de vencimento',
        timeRemaining: investment.endDate - Date.now()
      });
    }

    // Atualiza status do investimento
    investment.status = 'completed';
    await investment.save();

    // Adiciona o valor de retorno ao saldo do usuário
    await User.findByIdAndUpdate(userId, {
      $inc: { balance: investment.expectedReturn }
    });

    res.json({
      message: 'Investimento sacado com sucesso',
      returnedAmount: investment.expectedReturn
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verificar status de um investimento específico
router.get('/status/:userId/:investmentId', async (req, res) => {
  try {
    const { userId, investmentId } = req.params;
    
    const investment = await Investment.findOne({
      _id: investmentId,
      userId
    });

    if (!investment) {
      return res.status(404).json({ message: 'Investimento não encontrado' });
    }

    const totalDuration = investment.endDate - investment.startDate;
    const elapsed = Date.now() - investment.startDate;
    const progress = Math.min(elapsed / totalDuration, 1);
    const currentEarnings = investment.amount + ((investment.expectedReturn - investment.amount) * progress);

    res.json({
      investment: {
        id: investment._id,
        name: investment.investmentName,
        type: investment.type,
        amount: investment.amount,
        startDate: investment.startDate,
        endDate: investment.endDate,
        expectedReturn: investment.expectedReturn,
        currentValue: currentEarnings.toFixed(2),
        profit: (currentEarnings - investment.amount).toFixed(2),
        status: investment.status,
        risk: investment.risk,
        progress: (progress * 100).toFixed(2),
        timeRemaining: Math.max(0, investment.endDate - Date.now())
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rota para obter opções de investimento disponíveis
router.get('/options/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      // Verifica se o usuário já fez algum investimento
      const hasInvestments = await Investment.findOne({ userId: userId });

    const investmentOptions = [

        !hasInvestments ? {
            id: "special_first",
            name: "Investimento Pico One",
            type: "Especial",
            description: "Invista em itens da pico one - Exclusivo para primeiro investimento!",
            minAmount: 25,
            returnRate: 400, // 400% de retorno
            durationDays: 0.5, // 12 horas
            risk: "baixo",
            isFirstInvestment: true,
            details: {
              exclusivity: "Disponível apenas para primeiro investimento",
              guarantee: "Garantia Pico One",
              duration: "12 horas",
              returnValue: "R$ 100,00 (4x o valor investido)",
              specialNote: "Oportunidade única para novos investidores!"
            }
          } : null,

      {
        id: "1",
        name: "Tesouro Prefixado 2026",
        type: "Renda Fixa",
        description: "Título público com rendimento prefixado até 2026",
        minAmount: 100,
        returnRate: 11.5,
        durationDays: 730,
        risk: "baixo",
        details: {
          maturityDate: "2026-01-01",
          interestPayments: "Semestrais",
          liquidityLevel: "Média",
          taxInformation: "IR regressivo conforme prazo"
        }
      },
      {
        id: "2",
        name: "Fundo Multimercado Premium",
        type: "Fundo de Investimento",
        description: "Fundo diversificado com estratégias em múltiplos mercados",
        minAmount: 1000,
        returnRate: 15.8,
        durationDays: 365,
        risk: "médio",
        details: {
          managementFee: "1.8% a.a.",
          performanceFee: "20% sobre CDI",
          strategy: "Macro economia global",
          managers: "Equipe especializada"
        }
      },
      {
        id: "3",
        name: "Ações Blue Chips",
        type: "Renda Variável",
        description: "Carteira das principais empresas da bolsa",
        minAmount: 500,
        returnRate: 18.5,
        durationDays: 180,
        risk: "alto",
        details: {
          composition: "Top 10 empresas do Ibovespa",
          rebalancing: "Trimestral",
          dividendYield: "4.5% a.a.",
          sector: "Diversificado"
        }
      },
      {
        id: "4",
        name: "CDB Banco Premium",
        type: "Renda Fixa",
        description: "CDB com rendimento atrelado ao CDI",
        minAmount: 1000,
        returnRate: 12.5,
        durationDays: 365,
        risk: "baixo",
        details: {
          guarantee: "FGC até R$ 250 mil",
          indexer: "120% do CDI",
          liquidityType: "No vencimento",
          emitter: "Banco Premium S.A."
        }
      },
      {
        id: "5",
        name: "Fundo Imobiliário Prime",
        type: "Fundo Imobiliário",
        description: "Fundo de investimentos em imóveis comerciais premium",
        minAmount: 5000,
        returnRate: 14.2,
        durationDays: 730,
        risk: "médio",
        details: {
          properties: "Imóveis comerciais classe A",
          occupationRate: "95%",
          monthlyIncome: "0.8%",
          locations: "Principais capitais"
        }
      }
    ];

    res.json(investmentOptions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



  
// Rota para obter histórico de investimentos do usuário
router.get('/history/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const investments = await Investment.find({ userId: userId })
        .sort({ startDate: -1 });
  
      const formattedInvestments = investments.map(inv => ({
        id: inv._id,
        type: inv.type,
        amount: inv.amount,
        startDate: inv.startDate,
        endDate: inv.endDate,
        expectedReturn: inv.expectedReturn,
        currentReturn: inv.currentReturn || 0,
        status: inv.status,
        performance: ((inv.currentReturn || 0 - inv.amount) / inv.amount * 100).toFixed(2)
      }));
  
      res.json(formattedInvestments);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

module.exports = router;