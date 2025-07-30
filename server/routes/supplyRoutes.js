const express = require('express');
const router = express.Router();

// GET all supply pools (placeholder route)
router.get('/', (req, res) => {
  res.json({ message: 'Supply route is active!' });
});

// POST to create new supply data
router.post('/', (req, res) => {
  const newSupply = req.body;
  // You can hook this to your Sequelize SupplyPool model later
  res.status(201).json({ message: 'Supply data created', data: newSupply });
});

// GET specific supply entry by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Supply entry for ID ${id}` });
});

module.exports = router;
