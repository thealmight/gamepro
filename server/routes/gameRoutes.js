const express = require('express');
const { authenticateToken, requireOperator, requirePlayer } = require('./auth');
const gameController = require('../controllers/gameController');
const tariffController = require('../controllers/tariffController');

const router = express.Router();

// Game management routes (Operator only)
router.post('/create', authenticateToken, requireOperator, gameController.createGame);
router.post('/:gameId/start', authenticateToken, requireOperator, gameController.startGame);
router.post('/:gameId/next-round', authenticateToken, requireOperator, gameController.startNextRound);
router.post('/:gameId/end', authenticateToken, requireOperator, gameController.endGame);
router.post('/:gameId/reset', authenticateToken, requireOperator, gameController.resetGame);

// Game data routes
router.get('/:gameId', authenticateToken, gameController.getGameData);
router.get('/:gameId/player-data', authenticateToken, requirePlayer, gameController.getPlayerGameData);

// Tariff routes
router.post('/tariffs/submit', authenticateToken, requirePlayer, tariffController.submitTariffChanges);
router.get('/:gameId/tariffs', authenticateToken, tariffController.getTariffRates);
router.get('/:gameId/tariffs/history', authenticateToken, requireOperator, tariffController.getTariffHistory);
router.get('/:gameId/tariffs/player-status/:roundNumber', authenticateToken, requirePlayer, tariffController.getPlayerTariffStatus);
router.get('/:gameId/tariffs/matrix/:product', authenticateToken, requireOperator, tariffController.getTariffMatrix);

module.exports = router;
