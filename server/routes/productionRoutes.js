// routes/productionRoutes.js

const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
const { authenticateToken } = require('./auth');

// Create a new production record (operator only in production)
router.post('/', authenticateToken, productionController.createRecord);

// Get all production records for a round
router.get('/:round', authenticateToken, productionController.getByRound);

// Update a production record (operator only)
router.put('/:id', authenticateToken, productionController.updateRecord);

module.exports = router;
