module.exports = (sequelize, DataTypes) => {
  const Player = sequelize.define('Player', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    round: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    // other fields...
  });

  return Player;
};
const express = require('express'); 