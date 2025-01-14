const express = require('express');
const router = express.Router();
const UserSettings = require('../models/UserSettings');

// Obter configurações do usuário
router.get('/:userId', async (req, res) => {
  try {
    let settings = await UserSettings.findOne({ userId: req.params.userId });
    
    if (!settings) {
      settings = await new UserSettings({ userId: req.params.userId }).save();
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar configurações
router.put('/:userId', async (req, res) => {
  try {
    const settings = await UserSettings.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: req.body },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar categoria específica
router.patch('/:userId/:category', async (req, res) => {
  try {
    const update = { [`${req.params.category}`]: req.body };
    const settings = await UserSettings.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;