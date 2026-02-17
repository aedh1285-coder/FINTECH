const pool = require('./db');

const scheduledModel = {
    // Crear ingreso programado
    async create(userId, data) {
        const { category_id, amount, description, frequency, day_of_week, day_of_month, start_date, end_date } = data;
        
        const query = `
        INSERT INTO scheduled_incomes 
        (user_id, category_id, amount, description, frequency, day_of_week, day_of_month, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        `;
        const result = await pool.query(query, [userId, category_id, amount, description, frequency, day_of_week, day_of_month, start_date, end_date]);
        return result.rows[0];
    },

    // Obtener ingresos programados activos
    async getActive(userId) {
        const query = `
        SELECT s.*, c.name as category_name 
        FROM scheduled_incomes s
        JOIN categories c ON s.category_id = c.id
        WHERE s.user_id = $1 AND s.active = true
        ORDER BY s.created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // Procesar ingresos programados (esto se ejecutará diariamente)
    async processDueIncomes() {
        const today = new Date().toISOString().split('T')[0];
        
        const query = `
        SELECT s.*, u.email, u.name as user_name 
        FROM scheduled_incomes s
        JOIN users u ON s.user_id = u.id
        WHERE s.active = true 
            AND s.start_date <= $1
            AND (s.end_date IS NULL OR s.end_date >= $1)
            AND (s.last_processed IS NULL OR s.last_processed < $1)
        `;
        const schedules = await pool.query(query, [today]);
        
        const results = [];
        
        for (const schedule of schedules.rows) {
        let shouldProcess = false;
        const scheduleDate = new Date(schedule.start_date);
        
        switch (schedule.frequency) {
            case 'weekly':
            // Verificar si hoy corresponde según día de semana
            const todayDay = new Date().getDay();
            shouldProcess = todayDay === schedule.day_of_week;
            break;
            
            case 'biweekly':
            // Cada 14 días desde start_date
            const daysDiff = Math.floor((new Date(today) - scheduleDate) / (1000 * 60 * 60 * 24));
            shouldProcess = daysDiff % 14 === 0;
            break;
            
            case 'monthly':
            // Mismo día del mes
            const todayDate = new Date().getDate();
            shouldProcess = todayDate === schedule.day_of_month;
            break;
        }
        
        if (shouldProcess) {
            // Crear la transacción
            const transactionQuery = `
            INSERT INTO transactions (user_id, category_id, amount, type, description, date)
            VALUES ($1, $2, $3, 'income', $4, $5)
            RETURNING *
            `;
            const transaction = await pool.query(transactionQuery, [
            schedule.user_id,
            schedule.category_id,
            schedule.amount,
            `${schedule.description} (automático)`,
            today
            ]);
            
            // Actualizar last_processed
            await pool.query(
            'UPDATE scheduled_incomes SET last_processed = $1 WHERE id = $2',
            [today, schedule.id]
            );
            
            // Actualizar balance del usuario
            await pool.query(`
            UPDATE users 
            SET balance = balance + $1 
            WHERE id = $2
            `, [schedule.amount, schedule.user_id]);
            
            results.push(transaction.rows[0]);
        }
        }
        
        return results;
    },

    // Desactivar ingreso programado
    async deactivate(id, userId) {
        const query = `
        UPDATE scheduled_incomes 
        SET active = false 
        WHERE id = $1 AND user_id = $2
        RETURNING id
        `;
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }
};

module.exports = scheduledModel;