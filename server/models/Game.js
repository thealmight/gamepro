const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  totalRounds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    field: 'total_rounds'
  },
  currentRound: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'current_round'
  },
  roundDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 900, // 15 minutes in seconds
    field: 'round_duration'
  },
  status: {
    type: DataTypes.ENUM('waiting', 'active', 'paused', 'ended'),
    defaultValue: 'waiting'
  },
  operatorId: {
    type: DataTypes.INTEGER,
    field: 'operator_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  startedAt: {
    type: DataTypes.DATE,
    field: 'started_at'
  },
  endedAt: {
    type: DataTypes.DATE,
    field: 'ended_at'
  }
}, {
  tableName: 'games',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Game;