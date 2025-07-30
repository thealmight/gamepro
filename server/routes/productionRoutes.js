// routes/productionRoutes.js
const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');

router.post('/', productionController.createRecord);
router.get('/:round', productionController.getByRound);
router.put('/:id', productionController.updateRecord);

module.exports = router;
