const express = require('express');
const router = express.Router();
const bspayService = require('../services/bspayService');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Referral = require('../models/Referral');
const axios = require("axios")

// Gerar PIX para depósito
router.post('/generate-pix/:userId', async (req, res) => {
  try {
    const { amount, email } = req.body;
    
    // Gera o PIX
    const pixData = await bspayService.generatePixQRCode(
      amount, 
      req.params.userId,
      email
    );

    // Registra a transação como pendente
    const transaction = new Transaction({
      userId: req.params.userId,
      type: 'deposit',
      amount: amount,
      status: 'pending',
      transactionId: pixData.transactionId,
      externalId: pixData.externalId
    });

    await transaction.save();
console.log(pixData)
    res.json({
      success: true,
      data: {
        qrCode: pixData.qrcode,
        transactionId: pixData.transactionId,
        amount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Callback do PIX
router.post('/callback', async (req, res) => {
  try {
    const { requestBody } = req.body;
    console.log('Callback recebido:', requestBody);
    
    if (!requestBody) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos no callback'
      });
    }
 
    const { transactionId } = requestBody;
    const transaction = await Transaction.findOne({ transactionId });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transação não encontrada'
      });
    }
 
    if (transaction.status === 'completed') {
      return res.json({ success: true, message: "Already processed" });
    }
 
    // Atualiza o saldo do usuário
    const user = await User.findById(transaction.userId);
    if (user) {
      user.balance += transaction.amount;
      await user.save();
 
      // Processa comissão para o afiliador se for depósito >= R$30
      if (transaction.amount >= 1) {
        const referral = await Referral.findOne({
          'usersReferred.userId': user._id,
          'usersReferred.hasDeposited': false
        });
 
        if (referral) {
          const referredUser = referral.usersReferred.find(
            ref => ref.userId.toString() === user._id.toString()
          );
 
          if (referredUser && !referredUser.hasDeposited) {
            referredUser.hasDeposited = true;
            referredUser.firstDepositAt = new Date();
            referredUser.commissionPaid = true;
            referredUser.commissionPaidAt = new Date();
 
            // Adiciona comissão ao commissionBalance do afiliador
            const referrer = await User.findById(referral.userId);
            if (referrer) {
              if (!referrer.commissionBalance) referrer.commissionBalance = 0;
              referrer.commissionBalance += 50;
              await referrer.save();
 
              // Registra transação da comissão
              const commissionTransaction = new Transaction({
                userId: referral.userId,
                type: 'referral_commission',
                amount: 50,
                status: 'completed',
                description: `Comissão de afiliado - Depósito de ${user._id}`
              });
              await commissionTransaction.save();
 
              referral.totalEarnings += 50;
              await referral.save();
 
              console.log(`Comissão processada: Afiliador ${referral.userId} recebeu R$50 pelo depósito de ${user._id}`);
            }
          }
        }
      }
    }
 
/*/
    try {
   await axios.get(`https://api.pushcut.io/ChzkB6ZYQL5SvlUwWpo2i/notifications/Venda%20realizada `)
    } catch (error) {
      console.error('Erro ao chamar notificação:', error);
    }
/*/

    // Atualiza status da transação
    transaction.status = 'completed';
    await transaction.save();
 
    res.json({ 
      success: true, 
      message: "Success",
      debug: {
        transactionId,
        userId: transaction.userId,
        amount: transaction.amount
      }
    });
  } catch (error) {
    console.error('Erro no callback:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao processar callback',
      debug: error.message 
    });
  }
 });


// Verificar status do pagamento
router.get('/check-status/:transactionId', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transação não encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        status: transaction.status,
        amount: transaction.amount,
        createdAt: transaction.createdAt
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



router.post('/withdraw/:userId', async (req, res) => {
    try {
      const { amount, pixKey, pixKeyType } = req.body;
      const userId = req.params.userId;
  
      // Verifica se o usuário existe
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuário não encontrado' 
        });
      }
  
      // Verifica se tem saldo suficiente
      if (user.balance < amount) {
        return res.status(400).json({ 
          success: false, 
          message: 'Saldo insuficiente' 
        });
      }
  
      // Cria a transação de saque
      const withdrawal = new Transaction({
        userId,
        type: 'withdrawal',
        amount,
        status: 'pending',
        pixKey,
        pixKeyType,
        description: 'Solicitação de saque via PIX',
        transactionId: `WD_${Date.now()}_${userId}`
      });
  
      await withdrawal.save();
  
      // Deduz o valor do saldo do usuário
      user.balance -= amount;
      await user.save();
  
      res.json({
        success: true,
        message: 'Solicitação de saque realizada com sucesso',
        data: {
          transactionId: withdrawal.transactionId,
          amount,
          status: 'pending'
        }
      });
  
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Obter histórico de atividades
  router.get('/activity/:userId', async (req, res) => {
    try {
      const transactions = await Transaction.find({ 
        userId: req.params.userId 
      })
      .sort({ createdAt: -1 })
      .limit(50);
  
      const formattedTransactions = transactions.map(t => ({
        id: t._id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        description: t.description || getDefaultDescription(t.type),
        date: t.createdAt,
        details: {
          pixKey: t.pixKey,
          pixKeyType: t.pixKeyType,
          rejectionReason: t.rejectionReason
        }
      }));
  
      res.json({
        success: true,
        data: formattedTransactions
      });
  
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  

  router.post('/withdraw-commission/:userId', async (req, res) => {
    try {
      const { amount, pixKey, pixKeyType } = req.body;
      const userId = req.params.userId;
  
      // Verifica valor mínimo
      if (amount < 60) {
        return res.status(400).json({
          success: false,
          message: 'Valor mínimo para saque de comissões é R$ 60,00'
        });
      }
  
      // Verifica se o usuário existe e tem saldo suficiente
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }
  
      if (user.commissionBalance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Saldo de comissões insuficiente'
        });
      }
  
      // Cria a transação de saque
      const withdrawal = new Transaction({
        userId,
        type: 'commission_withdrawal',
        amount,
        status: 'pending',
        pixKey,
        pixKeyType,
        description: 'Saque de comissões via PIX',
        transactionId: `COMWD_${Date.now()}_${userId}`
      });
  
      await withdrawal.save();
  
      // Deduz o valor do saldo de comissões
      user.commissionBalance -= amount;
      await user.save();
  
      // Agenda rejeição automática após 1 hora
      setTimeout(async () => {
        try {
          const transaction = await Transaction.findById(withdrawal._id);
          if (transaction && transaction.status === 'pending') {
            transaction.status = 'rejected';
            transaction.rejectionReason = 'Tempo limite excedido';
            await transaction.save();
  
            // Devolve o valor para o saldo de comissões do usuário
            const user = await User.findById(userId);
            user.commissionBalance += amount;
            await user.save();
  
            console.log(`Saque de comissão rejeitado automaticamente: ${withdrawal.transactionId}`);
          }
        } catch (error) {
          console.error('Erro ao rejeitar saque:', error);
        }
      }, 3600000); // 1 hora em milissegundos
  
      res.json({
        success: true,
        message: 'Solicitação de saque de comissões realizada com sucesso',
        data: {
          transactionId: withdrawal.transactionId,
          amount,
          status: 'pending',
          expiresIn: '1 hora'
        }
      });
  
    } catch (error) {
      console.error('Erro ao solicitar saque:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Verificar status do saque de comissões
  router.get('/commission-withdrawal/:transactionId', async (req, res) => {
    try {
      const transaction = await Transaction.findOne({
        transactionId: req.params.transactionId,
        type: 'commission_withdrawal'
      });
  
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transação não encontrada'
        });
      }
  
      res.json({
        success: true,
        data: {
          status: transaction.status,
          amount: transaction.amount,
          createdAt: transaction.createdAt,
          rejectionReason: transaction.rejectionReason
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Função auxiliar para descrições padrão
  function getDefaultDescription(type) {
    const descriptions = {
      deposit: 'Depósito via PIX',
      withdrawal: 'Saque via PIX',
      investment: 'Novo investimento',
      investment_return: 'Retorno de investimento'
    };
    return descriptions[type] || 'Transação';
  }
  
module.exports = router;