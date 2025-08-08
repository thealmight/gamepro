// routes/productionRoutes.js

const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');

// Optionally add authentication middleware here
// const { authenticateToken, requireOperator } = require('./auth');

// Create a new production record (should be operator only in production)
// router.post('/', authenticateToken, requireOperator, productionController.createRecord);
router.post('/', productionController.createRecord);

// Get all production records for a round
router.get('/:round', productionController.getByRound);

// Update a production record (should be operator only in production)
// router.put('/:id', authenticateToken, requireOperator, productionController.updateRecord);
router.put('/:id', productionController.updateRecord);

module.exports = router;
