// models/SupplyPool.js
module.exports = (sequelize, DataTypes) => {
  const SupplyPool = sequelize.define('SupplyPool', {
    round: { type: DataTypes.INTEGER, allowNull: false },
    product: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false }
  });
  return SupplyPool;
};
