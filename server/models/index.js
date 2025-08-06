const sequelize = require('../database');
const User = require('./User');
const Game = require('./Game');
const GameRound = require('./GameRound');
const Production = require('./Production');
const Demand = require('./Demand');
const TariffRate = require('./TariffRate');
const ChatMessage = require('./ChatMessage');

// Define associations
// User associations
User.hasMany(Game, { foreignKey: 'operatorId', as: 'operatedGames' });
User.hasMany(TariffRate, { foreignKey: 'submittedBy', as: 'submittedTariffs' });
User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });

// Game associations
Game.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });
Game.hasMany(GameRound, { foreignKey: 'gameId', as: 'rounds' });
Game.hasMany(Production, { foreignKey: 'gameId', as: 'production' });
Game.hasMany(Demand, { foreignKey: 'gameId', as: 'demand' });
Game.hasMany(TariffRate, { foreignKey: 'gameId', as: 'tariffRates' });
Game.hasMany(ChatMessage, { foreignKey: 'gameId', as: 'chatMessages' });

// GameRound associations
GameRound.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });

// Production associations
Production.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });

// Demand associations
Demand.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });

// TariffRate associations
TariffRate.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });
TariffRate.belongsTo(User, { foreignKey: 'submittedBy', as: 'submitter' });

// ChatMessage associations
ChatMessage.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Sync database (create tables if they don't exist)
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true }); // Use alter: true for development
    console.log('Database synchronized successfully.');
  }catch (error) {
  console.error('Error synchronizing database:', error);
  if (error.original) {
    console.error('Sequelize original error:', error.original);
  }
  if (error.errors) {
    console.error('Sequelize errors array:', error.errors);
  }
}

};

module.exports = {
  sequelize,
  User,
  Game,
  GameRound,
  Production,
  Demand,
  TariffRate,
  ChatMessage,
  syncDatabase
};