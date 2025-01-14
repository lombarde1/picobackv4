const cron = require('node-cron');
const UserProduct = require('../models/UserProduct');
const User = require('../models/User');

// Array de produtos importado
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

// Função para processar rendimentos
async function processIncomes() {
    try {
        console.log('Iniciando processamento de rendimentos:', new Date());
        
        // Busca todos os produtos ativos
        const activeProducts = await UserProduct.find({ status: 'active' });
        
        for (const userProduct of activeProducts) {
            const product = PRODUCTS.find(p => p.id === userProduct.productId);
            if (!product) continue;

            const now = new Date();
            
            // Verifica se o produto expirou
            if (now > userProduct.endDate) {
                userProduct.status = 'completed';
                await userProduct.save();
                continue;
            }

            // Calcula dias desde último rendimento
            const daysSinceLastIncome = Math.floor((now - userProduct.lastIncomeDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLastIncome >= 1) {
                // Atualiza saldo do usuário
                await User.findByIdAndUpdate(
                    userProduct.userId,
                    { $inc: { balance: product.dailyIncome } }
                );

                // Atualiza data do último rendimento
                userProduct.lastIncomeDate = now;
                await userProduct.save();

                console.log(`Rendimento processado: Usuário ${userProduct.userId}, Produto ${product.name}, Valor ${product.dailyIncome}`);
            }
        }

        console.log('Processamento de rendimentos finalizado:', new Date());
    } catch (error) {
        console.error('Erro ao processar rendimentos:', error);
    }
}

// Configura o cron job para rodar todos os dias à meia-noite
const scheduleDailyIncome = () => {
    cron.schedule('0 0 * * *', () => {
        processIncomes();
    });
    console.log('Cron job de rendimentos configurado');
};

// Exporta função para iniciar o cron
module.exports = {
    scheduleDailyIncome,
    processIncomes // Exportado para testes manuais se necessário
};