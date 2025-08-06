const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const GameRound = sequelize.define('GameRound', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  gameId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'game_id',
    references: {
      model: 'games',
      key: 'id'
    }
  },
  roundNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'round_number'
  },
  startTime: {
    type: DataTypes.DATE,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.DATE,
    field: 'end_time'
  },
  timeRemaining: {
    type: DataTypes.INTEGER,
    defaultValue: 900,
    field: 'time_remaining'
  },
 status: {
  type: DataTypes.STRING,
  defaultValue: 'pending',
  validate: {
    isIn: [['pending', 'active', 'completed']]
  }
}

}, {
  tableName: 'game_rounds',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['game_id', 'round_number']
    }
  ]
});

module.exports = GameRound;