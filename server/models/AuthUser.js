const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const AuthUser = sequelize.define('AuthUser', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  password: DataTypes.STRING, // Can be plaintext or hashed
  country: DataTypes.STRING,  // Assign once during signup
});

module.exports = AuthUser;
