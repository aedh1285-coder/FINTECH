const sql = require('./db');

const transactionModel = {
    // Crear una transacción
    async create(userId, { category_id, amount, type, description, date }) {
        const [transaction] = await sql`
            INSERT INTO transactions (user_id, category_id, amount, type, description, date)
            VALUES (${userId}, ${category_id}, ${amount}, ${type}, ${description}, ${date})
            RETURNING *
        `;
    
        // Actualizar balance del usuario
        await this.updateUserBalance(userId);
    
        return transaction;
    },

    // Obtener transacciones de un usuario
    async findByUser(userId) {
        const transactions = await sql`
            SELECT t.*, c.name as category_name 
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ${userId}
            ORDER BY t.date DESC
        `;
        return transactions;
    },

    // Obtener una transacción específica
    async findById(id, userId) {
        const [transaction] = await sql`
            SELECT t.*, c.name as category_name 
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.id = ${id} AND t.user_id = ${userId}
        `;
        return transaction;
    },

    // Actualizar transacción
    async update(id, userId, fields) {
        const { category_id, amount, type, description, date } = fields;
        
        const [updated] = await sql`
            UPDATE transactions 
            SET 
                category_id = COALESCE(${category_id}, category_id),
                amount = COALESCE(${amount}, amount),
                type = COALESCE(${type}, type),
                description = COALESCE(${description}, description),
                date = COALESCE(${date}, date)
            WHERE id = ${id} AND user_id = ${userId}
            RETURNING *
        `;
    
        await this.updateUserBalance(userId);
        return updated;
    },

    // Eliminar transacción
    async delete(id, userId) {
        const [deleted] = await sql`
            DELETE FROM transactions 
            WHERE id = ${id} AND user_id = ${userId}
            RETURNING id
        `;
    
        await this.updateUserBalance(userId);
        return deleted;
    },

    // Actualizar balance del usuario
    async updateUserBalance(userId) {
        const [result] = await sql`
            UPDATE users 
            SET balance = (
                SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
                FROM transactions
                WHERE user_id = ${userId}
            )
            WHERE id = ${userId}
            RETURNING balance
        `;
        return result.balance;
    },

    // Obtener categorías del usuario
    async getCategories(userId) {
        const categories = await sql`
            SELECT * FROM categories 
            WHERE user_id IS NULL OR user_id = ${userId}
            ORDER BY type, name
        `;
        return categories;
    },

    // Crear categoría personalizada
    async createCategory(userId, { name, type }) {
        const [category] = await sql`
            INSERT INTO categories (name, type, user_id)
            VALUES (${name}, ${type}, ${userId})
            RETURNING *
        `;
        return category;
    },

    // Actualizar categoría
    async updateCategory(categoryId, userId, { name, type }) {
        // Verificar que la categoría pertenece al usuario o es global
        const [check] = await sql`
            SELECT * FROM categories 
            WHERE id = ${categoryId} AND (user_id = ${userId} OR user_id IS NULL)
        `;
        
        if (!check) {
            return null; // No tiene permiso
        }

        // Si es global, no permitir editar
        if (check.user_id === null) {
            return { error: 'Las categorías globales no se pueden modificar' };
        }

        const [updated] = await sql`
            UPDATE categories 
            SET 
                name = COALESCE(${name}, name),
                type = COALESCE(${type}, type)
            WHERE id = ${categoryId} AND user_id = ${userId}
            RETURNING *
        `;
        return updated;
    },

    // Eliminar categoría (solo si es del usuario y no tiene transacciones)
    async deleteCategory(categoryId, userId) {
        // Verificar que tiene transacciones
        const [check] = await sql`
            SELECT COUNT(*) as count FROM transactions 
            WHERE category_id = ${categoryId}
        `;
        
        if (parseInt(check.count) > 0) {
            return { error: 'No se puede eliminar una categoría con transacciones' };
        }

        const [deleted] = await sql`
            DELETE FROM categories 
            WHERE id = ${categoryId} AND user_id = ${userId}
            RETURNING id
        `;
        return deleted;
    },

    // Establecer límite mensual
    async setCategoryLimit(userId, categoryId, monthlyLimit, month) {
        const [limit] = await sql`
            INSERT INTO category_limits (user_id, category_id, monthly_limit, month)
            VALUES (${userId}, ${categoryId}, ${monthlyLimit}, ${month})
            ON CONFLICT (user_id, category_id, month) 
            DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
            RETURNING *
        `;
        return limit;
    },

    // Obtener gasto actual vs límite
    async getCategorySpending(userId, categoryId, month) {
        const [result] = await sql`
            WITH spending AS (
                SELECT COALESCE(SUM(amount), 0) as total
                FROM transactions
                WHERE user_id = ${userId} 
                    AND category_id = ${categoryId}
                    AND type = 'expense'
                    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', ${month}::date)
            )
            SELECT 
                l.monthly_limit,
                s.total as current_spending,
                l.monthly_limit - s.total as remaining,
                CASE 
                    WHEN s.total > l.monthly_limit THEN 'exceeded'
                    WHEN s.total >= l.monthly_limit * 0.8 THEN 'warning'
                    ELSE 'ok'
                END as status
            FROM spending s
            LEFT JOIN category_limits l ON l.user_id = ${userId} AND l.category_id = ${categoryId} 
                AND DATE_TRUNC('month', l.month) = DATE_TRUNC('month', ${month}::date)
        `;
        return result || { monthly_limit: null, current_spending: 0, remaining: null, status: 'ok' };
    },

    // Obtener todos los límites del mes
    async getAllLimits(userId, month) {
        try {
            console.log('getAllLimits - userId:', userId, 'month:', month);
            
            const limits = await sql`
                SELECT 
                    c.id as category_id,
                    c.name as category_name,
                    c.type,
                    l.monthly_limit,
                    COALESCE((
                        SELECT SUM(amount) 
                        FROM transactions 
                        WHERE user_id = ${userId} 
                            AND category_id = c.id
                            AND type = 'expense'
                            AND DATE_TRUNC('month', date) = DATE_TRUNC('month', ${month}::date)
                    ), 0) as current_spending
                FROM categories c
                LEFT JOIN category_limits l ON l.user_id = ${userId} AND l.category_id = c.id 
                    AND DATE_TRUNC('month', l.month) = DATE_TRUNC('month', ${month}::date)
                WHERE (c.user_id IS NULL OR c.user_id = ${userId})
                    AND c.type = 'expense'
                ORDER BY c.name
            `;
            
            console.log('Resultado:', limits);
            return limits;
            
        } catch (error) {
            console.error('ERROR EN getAllLimits:', error);
            throw error;
        }
    }
};

module.exports = transactionModel;