const transactionModel = require('../models/transactionModel');

const transactionController = {
  // Crear transacción
    async create(req, res) {
        try {
            const userId = req.userId;
            const { category_id, amount, type, description, date } = req.body;

      // Validaciones
        if (!amount || !type || !date) {
            return res.status(400).json({ 
            error: 'Monto, tipo y fecha son requeridos' 
            });
        }

        if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ 
            error: 'Tipo debe ser income o expense' 
            });
        }

        const transaction = await transactionModel.create(userId, {
        category_id,
        amount,
        type,
        description,
        date
        });

      // Obtener nuevo balance
        const balance = await transactionModel.updateUserBalance(userId);

        res.status(201).json({
        message: 'Transacción creada exitosamente',
        transaction,
        currentBalance: balance
        });

    } catch (error) {
        console.error('Error creando transacción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

  // Listar transacciones
    async list(req, res) {
        try {
        const userId = req.userId;
        const transactions = await transactionModel.findByUser(userId);

        res.json({
            count: transactions.length,
            transactions
        });
    } catch (error) {
        console.error('Error listando transacciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

  // Obtener una transacción
    async getOne(req, res) {
    try {
        const userId = req.userId;
        const transactionId = req.params.id;

        const transaction = await transactionModel.findById(transactionId, userId);

        if (!transaction) {
        return res.status(404).json({ error: 'Transacción no encontrada' });
        }

        res.json(transaction);
    } catch (error) {
        console.error('Error obteniendo transacción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

  // Actualizar transacción
    async update(req, res) {
    try {
        const userId = req.userId;
        const transactionId = req.params.id;
        const updates = req.body;

        const transaction = await transactionModel.update(transactionId, userId, updates);

        if (!transaction) {
            return res.status(404).json({ error: 'Transacción no encontrada' });
        }

        const balance = await transactionModel.updateUserBalance(userId);

        res.json({
        message: 'Transacción actualizada',
        transaction,
        currentBalance: balance
        });

    } catch (error) {
        console.error('Error actualizando transacción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

  // Eliminar transacción
    async delete(req, res) {
    try {
        const userId = req.userId;
        const transactionId = req.params.id;

        const deleted = await transactionModel.delete(transactionId, userId);

        if (!deleted) {
            return res.status(404).json({ error: 'Transacción no encontrada' });
        }

        const balance = await transactionModel.updateUserBalance(userId);

        res.json({
        message: 'Transacción eliminada',
        currentBalance: balance
        });

    } catch (error) {
        console.error('Error eliminando transacción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

  // Obtener categorías
    async getCategories(req, res) {
    try {
        const userId = req.userId;
        const categories = await transactionModel.getCategories(userId);
        res.json(categories);
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Crear categoría
    async createCategory(req, res) {
    try {
        const userId = req.userId;
        const { name, type } = req.body;

        if (!name || !type) {
        return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
        }

        if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ error: 'Tipo debe ser income o expense' });
        }

        const category = await transactionModel.createCategory(userId, { name, type });
        res.status(201).json(category);

    } catch (error) {
        console.error('Error creando categoría:', error);
        res.status(500).json({ error: 'Error interno' });
    }
    },

    // Actualizar categoría
    async updateCategory(req, res) {
    try {
        const userId = req.userId;
        const categoryId = req.params.id;
        const updates = req.body;

        const result = await transactionModel.updateCategory(categoryId, userId, updates);
        
        if (!result) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        
        if (result.error) {
        return res.status(400).json({ error: result.error });
        }

        res.json(result);

    } catch (error) {
        console.error('Error actualizando categoría:', error);
        res.status(500).json({ error: 'Error interno' });
    }
    },

    // Eliminar categoría
    async deleteCategory(req, res) {
    try {
        const userId = req.userId;
        const categoryId = req.params.id;

        const result = await transactionModel.deleteCategory(categoryId, userId);
        
        if (!result) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        
        if (result.error) {
        return res.status(400).json({ error: result.error });
        }

        res.json({ message: 'Categoría eliminada', id: result.id });

    } catch (error) {
        console.error('Error eliminando categoría:', error);
        res.status(500).json({ error: 'Error interno' });
    }
    },

            // Establecer límite mensual
        // Establecer límite mensual
    async setLimit(req, res) {
    try {
        const userId = req.userId;
        let { category_id, monthly_limit, month } = req.body;

        if (!category_id || !monthly_limit || !month) {
        return res.status(400).json({ 
            error: 'category_id, monthly_limit y month son requeridos' 
        });
        }

        // Si viene solo YYYY-MM, agregar -01
        if (month.length === 7) {
        month = month + '-01';
        }

        const limit = await transactionModel.setCategoryLimit(
        userId, 
        category_id, 
        monthly_limit, 
        month
        );
        
        res.status(201).json(limit);

    } catch (error) {
        console.error('Error estableciendo límite:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
    },

    // Ver límite de una categoría específica
    async getCategoryLimit(req, res) {
    try {
        const userId = req.userId;
        const categoryId = req.params.categoryId;
        let { month } = req.query;

        if (!month) {
        return res.status(400).json({ error: 'month es requerido (YYYY-MM)' });
        }

        // Si viene solo YYYY-MM, agregar -01
        if (month.length === 7) {
        month = month + '-01';
        }

        const spending = await transactionModel.getCategorySpending(
        userId, 
        categoryId, 
        month
        );
        
        res.json(spending);

    } catch (error) {
        console.error('Error obteniendo límite:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
    },

        // Ver todos los límites del mes
        async getAllLimits(req, res) {
    try {
        const userId = req.userId;
        let { month } = req.query;

        if (!month) {
        return res.status(400).json({ error: 'month es requerido (YYYY-MM)' });
        }

        // Si viene solo YYYY-MM, agregar -01
        if (month.length === 7) {
        month = month + '-01';
        }

        const limits = await transactionModel.getAllLimits(userId, month);
        res.json(limits);

    } catch (error) {
        console.error('❌ ERROR EN CONTROLADOR getAllLimits:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
    },

    // Eliminar límite de una categoría
async deleteLimit(req, res) {
  try {
    const userId = req.userId;
    const categoryId = req.params.categoryId;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ error: 'month es requerido (YYYY-MM)' });
    }

    // Formatear mes si viene solo YYYY-MM
    let monthFormatted = month;
    if (month.length === 7) {
      monthFormatted = month + '-01';
    }

    // Para "eliminar", ponemos límite en 0
        const limit = await transactionModel.setCategoryLimit(
        userId, 
        categoryId, 
        0, 
        monthFormatted
        );
        
        res.json({ message: 'Límite eliminado correctamente' });

    } catch (error) {
        console.error('Error eliminando límite:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
    }
};

module.exports = transactionController;