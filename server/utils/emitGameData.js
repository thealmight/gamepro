// server/utils/emitGameData.js
const { Game, Production, Demand, TariffRate } = require('../models');

async function emitGameData(io, gameId) {
  // Fetch the latest data for this game
  const [production, demand, tariffRates] = await Promise.all([
    Production.findAll({ where: { gameId } }),
    Demand.findAll({ where: { gameId } }),
    TariffRate.findAll({ where: { gameId } }),
  ]);

  // Clean up sequelize objects for transmission
  const prodData = production.map(row => row.toJSON());
  const demData = demand.map(row => row.toJSON());
  const tariffData = tariffRates.map(row => row.toJSON());

  // Emit to all clients in this game
  io.emit('gameDataUpdated', {
    production: prodData,
    demand: demData,
    tariffRates: tariffData,
    gameId
  });
}

module.exports = emitGameData;
