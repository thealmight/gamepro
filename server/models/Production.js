const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Production = sequelize.define('Production', {
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
  country: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  product: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  }
}, {
  tableName: 'production',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['game_id', 'country', 'product']
    }
  ]
});

module.exports = Production;