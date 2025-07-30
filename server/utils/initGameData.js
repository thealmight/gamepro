// Placeholder for random game data generation logic
// utils/initGameData.js
const { Production, Demand } = require('../models');

async function generateInitialValues(gameId, countries) {
  for (const country of countries) {
    await Production.create({
      country,
      quantity: Math.floor(Math.random() * 100 + 50), // between 50 and 150
      gameId
    });

    await Demand.create({
      country,
      value: Math.floor(Math.random() * 80 + 20), // between 20 and 100
      gameId
    });
  }
}

module.exports = generateInitialValues;
