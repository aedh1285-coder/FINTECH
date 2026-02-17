const express = require('express');
const scheduledController = require('../controllers/scheduledController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Todas las rutas requieren autenticación excepto /process (que tiene su propia clave)
router.post('/', authMiddleware, scheduledController.create);
router.get('/', authMiddleware, scheduledController.list);
router.delete('/:id', authMiddleware, scheduledController.deactivate);

// Ruta para cron job (no requiere auth normal, pero sí API key)
router.post('/process', scheduledController.process);

module.exports = router;