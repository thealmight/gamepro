// controllers/productionController.js
const ProductionRecord = require('../models/ProductionRecord');


exports.createRecord = async (req, res) => {
  try {
    const record = await ProductionRecord.create(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByRound = async (req, res) => {
  try {
    const records = await ProductionRecord.findAll({ where: { round: req.params.round } });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const record = await ProductionRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await record.update(req.body);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
