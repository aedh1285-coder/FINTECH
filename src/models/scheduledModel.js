const sql = require('./db');

const scheduledModel = {
    // Crear ingreso programado
    async create(userId, data) {
        const { category_id, amount, description, frequency, day_of_week, day_of_month, start_date, end_date } = data;
        
        const [schedule] = await sql`
            INSERT INTO scheduled_incomes 
            (user_id, category_id, amount, description, frequency, day_of_week, day_of_month, start_date, end_date)
            VALUES (${userId}, ${category_id}, ${amount}, ${description}, ${frequency}, ${day_of_week}, ${day_of_month}, ${start_date}, ${end_date})
            RETURNING *
        `;
        return schedule;
    },

    // Obtener ingresos programados activos
    async getActive(userId) {
        const schedules = await sql`
            SELECT s.*, c.name as category_name 
            FROM scheduled_incomes s
            JOIN categories c ON s.category_id = c.id
            WHERE s.user_id = ${userId} AND s.active = true
            ORDER BY s.created_at DESC
        `;
        return schedules;
    },

    // Procesar ingresos programados (esto se ejecutará diariamente)
    async processDueIncomes() {
        const today = new Date().toISOString().split('T')[0];
        
        const schedules = await sql`
            SELECT s.*, u.email, u.name as user_name 
            FROM scheduled_incomes s
            JOIN users u ON s.user_id = u.id
            WHERE s.active = true 
                AND s.start_date <= ${today}
                AND (s.end_date IS NULL OR s.end_date >= ${today})
                AND (s.last_processed IS NULL OR s.last_processed < ${today})
        `;
        
        const results = [];
        
        for (const schedule of schedules) {
            let shouldProcess = false;
            const scheduleDate = new Date(schedule.start_date);
            
            switch (schedule.frequency) {
                case 'weekly':
                    const todayDay = new Date().getDay();
                    shouldProcess = todayDay === schedule.day_of_week;
                    break;
                    
                case 'biweekly':
                    const daysDiff = Math.floor((new Date(today) - scheduleDate) / (1000 * 60 * 60 * 24));
                    shouldProcess = daysDiff % 14 === 0;
                    break;
                    
                case 'monthly':
                    const todayDate = new Date().getDate();
                    shouldProcess = todayDate === schedule.day_of_month;
                    break;
            }
            
            if (shouldProcess) {
                // Usar transacción para asegurar consistencia
                const [transaction] = await sql.begin(async (sql) => {
                    // Crear la transacción
                    const [newTransaction] = await sql`
                        INSERT INTO transactions (user_id, category_id, amount, type, description, date)
                        VALUES (${schedule.user_id}, ${schedule.category_id}, ${schedule.amount}, 'income', ${`${schedule.description} (automático)`}, ${today})
                        RETURNING *
                    `;
                    
                    // Actualizar last_processed
                    await sql`
                        UPDATE scheduled_incomes 
                        SET last_processed = ${today} 
                        WHERE id = ${schedule.id}
                    `;
                    
                    // Actualizar balance del usuario
                    await sql`
                        UPDATE users 
                        SET balance = balance + ${schedule.amount} 
                        WHERE id = ${schedule.user_id}
                    `;
                    
                    return newTransaction;
                });
                
                results.push(transaction);
            }
        }
        
        return results;
    },

    // Desactivar ingreso programado
    async deactivate(id, userId) {
        const [deactivated] = await sql`
            UPDATE scheduled_incomes 
            SET active = false 
            WHERE id = ${id} AND user_id = ${userId}
            RETURNING id
        `;
        return deactivated;
    }
};

module.exports = scheduledModel;