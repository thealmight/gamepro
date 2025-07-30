const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Submission = sequelize.define('Submission', {
  round: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  player: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tariffs: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
});

module.exports = Submission;
