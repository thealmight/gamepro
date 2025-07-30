// Placeholder for user routes
// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { loginUser, getAllUsers } = require('../controllers/userController');

router.post('/login', loginUser);
router.get('/', getAllUsers);

module.exports = router;
