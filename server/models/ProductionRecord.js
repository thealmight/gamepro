// models/ProductionRecord.js
module.exports = (sequelize, DataTypes) => {
  const ProductionRecord = sequelize.define('ProductionRecord', {
    round: { type: DataTypes.INTEGER, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false },
    product: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false }
  });
  return ProductionRecord;
};
