const scheduledModel = require('../models/scheduledModel');

const scheduledController = {
    // Crear ingreso programado
    async create(req, res) {
        try {
        const userId = req.userId;
        const data = req.body;

        // Validaciones
        if (!data.category_id || !data.amount || !data.frequency || !data.start_date) {
            return res.status(400).json({ 
            error: 'Faltan campos requeridos' 
            });
        }

        if (!['weekly', 'biweekly', 'monthly'].includes(data.frequency)) {
            return res.status(400).json({ 
            error: 'Frecuencia debe ser weekly, biweekly o monthly' 
            });
        }

        if (data.frequency === 'weekly' && (data.day_of_week === undefined || data.day_of_week < 0 || data.day_of_week > 6)) {
            return res.status(400).json({ 
            error: 'Para frecuencia weekly, day_of_week es requerido (0-6)' 
            });
        }

        if (data.frequency === 'monthly' && (data.day_of_month < 1 || data.day_of_month > 31)) {
            return res.status(400).json({ 
            error: 'Para frecuencia monthly, day_of_month es requerido (1-31)' 
            });
        }

        const scheduled = await scheduledModel.create(userId, data);
        res.status(201).json(scheduled);

        } catch (error) {
        console.error('Error creando ingreso programado:', error);
        res.status(500).json({ error: 'Error interno' });
        }
    },

    // Listar ingresos programados
    async list(req, res) {
        try {
        const userId = req.userId;
        const schedules = await scheduledModel.getActive(userId);
        res.json(schedules);
        } catch (error) {
        console.error('Error listando ingresos programados:', error);
        res.status(500).json({ error: 'Error interno' });
        }
    },

    // Desactivar ingreso programado
    async deactivate(req, res) {
        try {
        const userId = req.userId;
        const id = req.params.id;

        const result = await scheduledModel.deactivate(id, userId);
        
        if (!result) {
            return res.status(404).json({ error: 'Ingreso programado no encontrado' });
        }

        res.json({ message: 'Ingreso programado desactivado' });

        } catch (error) {
        console.error('Error desactivando ingreso programado:', error);
        res.status(500).json({ error: 'Error interno' });
        }
    },

    // Endpoint para procesar ingresos (llamar con cron job)
    async process(req, res) {
        // Esta ruta debería estar protegida con una clave secreta
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'No autorizado' });
        }

        try {
        const results = await scheduledModel.processDueIncomes();
        res.json({ 
            message: 'Ingresos procesados', 
            count: results.length,
            transactions: results 
        });
        } catch (error) {
        console.error('Error procesando ingresos:', error);
        res.status(500).json({ error: 'Error interno' });
        }
    }
};

module.exports = scheduledController;