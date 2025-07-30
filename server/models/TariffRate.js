const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const TariffRate = sequelize.define('TariffRate', {
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
  product: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  fromCountry: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'from_country'
  },
  toCountry: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'to_country'
  },
  rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  submittedBy: {
    type: DataTypes.INTEGER,
    field: 'submitted_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at'
  }
}, {
  tableName: 'tariff_rates',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['game_id', 'round_number', 'product', 'from_country', 'to_country']
    }
  ]
});

module.exports = TariffRate;
