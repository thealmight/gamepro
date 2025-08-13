// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { loginUser, getAllUsers } = require('../controllers/userController');
const { authenticateToken } = require('./auth');

router.post('/login', loginUser);
router.get('/', authenticateToken, getAllUsers);

module.exports = router;
