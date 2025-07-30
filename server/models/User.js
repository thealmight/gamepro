const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    field: 'password_hash'
  },
  role: {
    type: DataTypes.ENUM('operator', 'player'),
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  socketId: {
    type: DataTypes.STRING(100),
    field: 'socket_id'
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_online'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = User;
