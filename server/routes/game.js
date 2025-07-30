const express = require('express');
const router = express.Router();
const { Production, Demand } = require('../models');

// Operator route
router.get('/game/:gameId/all-data', async (req, res) => {
  const { gameId } = req.params;
  const production = await Production.findAll({ where: { gameId } });
  const demand = await Demand.findAll({ where: { gameId } });
  res.json({ production, demand });
});

// Player route
router.get('/game/:gameId/:country', async (req, res) => {
  const { gameId, country } = req.params;
  const production = await Production.findOne({ where: { gameId, country } });
  const demand = await Demand.findOne({ where: { gameId, country } });
  res.json({ production, demand });
});

module.exports = router;
