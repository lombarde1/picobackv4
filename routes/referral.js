// routes/referral.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Referral = require('../models/Referral');
const Transaction = require('../models/Transaction');

// Verificar/Gerar código de referral
router.get('/verify/:affiliateCode', async (req, res) => {
  try {
    const referral = await Referral.findOne({ 
      referralCode: req.params.affiliateCode.toUpperCase() 
    }).populate('userId', 'fullName email');

    if (!referral) {
      return res.status(404).json({ 
        success: false, 
        message: 'Código de afiliado inválido'
      });
    }

    res.json({
      success: true,
      data: {
        referrerName: referral.userId.fullName,
        totalReferrals: referral.totalReferrals
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gerar código para usuário
router.post('/generate-code/:userId', async (req, res) => {
  try {
    let referral = await Referral.findOne({ userId: req.params.userId });
    
    if (referral) {
      return res.json({ success: true, data: referral });
    }

    const uniqueCode = await Referral.generateUniqueCode();
    referral = new Referral({
      userId: req.params.userId,
      referralCode: uniqueCode,
      usersReferred: [],
      totalEarnings: 0,
      totalReferrals: 0
    });

    await referral.save();
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Processar referral no registro
router.post('/process', async (req, res) => {
  try {
    const { newUserId, referralCode } = req.body;
    
    const referral = await Referral.findOne({ 
      referralCode: referralCode.toUpperCase() 
    });

    if (!referral) {
      return res.status(404).json({ 
        success: false, 
        message: 'Código de afiliado inválido' 
      });
    }

    referral.usersReferred.push({
      userId: newUserId,
      registeredAt: new Date()
    });
    
    referral.totalReferrals += 1;
    await referral.save();

    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Processar comissão após depósito
router.post('/process-commission', async (req, res) => {
  try {
    const { userId, depositAmount } = req.body;

    if (depositAmount < 30) {
      return res.status(400).json({ 
        success: false, 
        message: 'Depósito mínimo de R$ 30 para gerar comissão' 
      });
    }

    const referral = await Referral.findOne({
      'usersReferred.userId': userId,
      'usersReferred.hasDeposited': false
    });

    if (!referral) {
      return res.status(404).json({ 
        success: false, 
        message: 'Referral não encontrado ou comissão já processada' 
      });
    }

    const referredUser = referral.usersReferred.find(
      user => user.userId.toString() === userId
    );

    if (referredUser && !referredUser.hasDeposited) {
      referredUser.hasDeposited = true;
      referredUser.firstDepositAt = new Date();
      referredUser.commissionPaid = true;
      referredUser.commissionPaidAt = new Date();

      const referrer = await User.findById(referral.userId);
      referrer.commissionBalance = (referrer.commissionBalance || 0) + 50;

      referral.totalEarnings += 50;

      // Registra a transação da comissão
      const transaction = new Transaction({
        userId: referral.userId,
        type: 'referral_commission',
        amount: 50,
        status: 'completed',
        description: 'Comissão de indicação'
      });

      await Promise.all([
        transaction.save(),
        referrer.save(),
        referral.save()
      ]);

      res.json({
        success: true,
        data: {
          commission: 50,
          newCommissionBalance: referrer.commissionBalance
        }
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Comissão já processada' 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/commission-balance/:userId', async (req, res) => {
    try {
      const user = await User.findById(req.params.userId)
        .select('fullName commissionBalance');
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }
  
      res.json({
        success: true,
        data: {
          fullName: user.fullName,
          commissionBalance: user.commissionBalance
        }
      });
  
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
// Obter estatísticas do afiliado
router.get('/stats/:userId', async (req, res) => {
  try {
    const referral = await Referral.findOne({ userId: req.params.userId })
      .populate('usersReferred.userId', 'fullName email createdAt');

    if (!referral) {
      const uniqueCode = await Referral.generateUniqueCode();
      const newReferral = new Referral({
        userId: req.params.userId,
        referralCode: uniqueCode
      });
      await newReferral.save();
      
      return res.json({
        success: true,
        data: {
          referralCode: newReferral.referralCode,
          totalEarnings: 0,
          totalReferrals: 0,
          usersReferred: []
        }
      });
    }

    res.json({
      success: true,
      data: {
        referralCode: referral.referralCode,
        totalEarnings: referral.totalEarnings,
        totalReferrals: referral.totalReferrals,
        usersReferred: referral.usersReferred
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Em routes/referral.js, adicione:

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
        let user = await User.findById(userId);
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

        // Deduz o valor do saldo de comissões
        user = await User.findByIdAndUpdate(
            userId,
            { $inc: { commissionBalance: -amount } },
            { new: true }
        );

        await withdrawal.save();

        // Agenda rejeição automática após 1 hora
        setTimeout(async () => {
            try {
                const transaction = await Transaction.findById(withdrawal._id);
                if (transaction && transaction.status === 'pending') {
                    transaction.status = 'rejected';
                    transaction.rejectionReason = 'Tempo limite excedido';
                    await transaction.save();

                    // Devolve o valor para o saldo de comissões do usuário
                    await User.findByIdAndUpdate(
                        userId,
                        { $inc: { commissionBalance: amount } }
                    );

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
                expiresIn: '1 hora',
                newBalance: user.commissionBalance // Adicionado para confirmação
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

module.exports = router;