const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth'); // Importar middleware

const router = express.Router();

// Rutas públicas (no requieren token)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getProfile);

module.exports = router;