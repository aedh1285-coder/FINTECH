const express = require('express');
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// CRUD de transacciones
router.post('/limits', transactionController.setLimit);
router.get('/limits', transactionController.getAllLimits);
router.get('/categories', transactionController.getCategories);
router.post('/categories', transactionController.createCategory);
router.get('/categories/:categoryId/limits', transactionController.getCategoryLimit);
router.delete('/limits/:categoryId', transactionController.deleteLimit);
router.put('/categories/:id', transactionController.updateCategory);
router.delete('/categories/:id', transactionController.deleteCategory);
router.post('/', transactionController.create);
router.get('/', transactionController.list);
router.get('/:id', transactionController.getOne);
router.put('/:id', transactionController.update);
router.delete('/:id', transactionController.delete);



module.exports = router;