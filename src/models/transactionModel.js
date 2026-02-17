const pool = require('./db');

const transactionModel = {
  // Crear una transacción
    async create(userId, { category_id, amount, type, description, date }) {
        const query = `
        INSERT INTO transactions (user_id, category_id, amount, type, description, date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `;
        const values = [userId, category_id, amount, type, description, date];
        const result = await pool.query(query, values);
    
        // Actualizar balance del usuario
        await this.updateUserBalance(userId);
    
        return result.rows[0];
    },

  // Obtener transacciones de un usuario
    async findByUser(userId) {
        const query = `
        SELECT t.*, c.name as category_name 
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
        ORDER BY t.date DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    },

  // Obtener una transacción específica
    async findById(id, userId) {
        const query = `
        SELECT t.*, c.name as category_name 
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.id = $1 AND t.user_id = $2
        `;
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    },

  // Actualizar transacción
    async update(id, userId, fields) {
        const { category_id, amount, type, description, date } = fields;
        const query = `
        UPDATE transactions 
        SET category_id = COALESCE($1, category_id),
        amount = COALESCE($2, amount),
        type = COALESCE($3, type),
        description = COALESCE($4, description),
        date = COALESCE($5, date)
        WHERE id = $6 AND user_id = $7
        RETURNING *
        `;
        const values = [category_id, amount, type, description, date, id, userId];
        const result = await pool.query(query, values);
    
        await this.updateUserBalance(userId);
        return result.rows[0];
    },

  // Eliminar transacción
    async delete(id, userId) {
    const query = 'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id';
    const result = await pool.query(query, [id, userId]);
    
    await this.updateUserBalance(userId);
    return result.rows[0];
    },

  // Actualizar balance del usuario
    async updateUserBalance(userId) {
        const query = `
        UPDATE users 
        SET balance = (
        SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
        FROM transactions
        WHERE user_id = $1
        )
        WHERE id = $1
        RETURNING balance
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0].balance;
    },

  // Obtener categorías del usuario
    async getCategories(userId) {
        const query = `
        SELECT * FROM categories 
        WHERE user_id IS NULL OR user_id = $1
        ORDER BY type, name
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
    },


    // Crear categoría personalizada
    async createCategory(userId, { name, type }) {
      const query = `
        INSERT INTO categories (name, type, user_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const result = await pool.query(query, [name, type, userId]);
      return result.rows[0];
    },

    // Actualizar categoría
    async updateCategory(categoryId, userId, { name, type }) {
      // Verificar que la categoría pertenece al usuario o es global
      const checkQuery = 'SELECT * FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)';
      const check = await pool.query(checkQuery, [categoryId, userId]);
      
      if (check.rows.length === 0) {
        return null; // No tiene permiso
      }

      // Si es global, no permitir editar (solo admin, pero por ahora solo lectura)
      if (check.rows[0].user_id === null) {
        return { error: 'Las categorías globales no se pueden modificar' };
      }

      const query = `
        UPDATE categories 
        SET name = COALESCE($1, name),
        type = COALESCE($2, type)
        WHERE id = $3 AND user_id = $4
        RETURNING *
      `;
      const result = await pool.query(query, [name, type, categoryId, userId]);
      return result.rows[0];
    },

    // Eliminar categoría (solo si es del usuario y no tiene transacciones)
    async deleteCategory(categoryId, userId) {
      // Verificar que tiene transacciones
      const checkQuery = 'SELECT COUNT(*) FROM transactions WHERE category_id = $1';
      const check = await pool.query(checkQuery, [categoryId]);
      
      if (parseInt(check.rows[0].count) > 0) {
        return { error: 'No se puede eliminar una categoría con transacciones' };
      }

      const query = 'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id';
      const result = await pool.query(query, [categoryId, userId]);
      return result.rows[0];
    },

    // Obtener categorías (globales + del usuario)
    async getCategories(userId) {
      const query = `
        SELECT * FROM categories 
        WHERE user_id IS NULL OR user_id = $1
        ORDER BY type, name
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    },

    // Establecer límite mensual
    async setCategoryLimit(userId, categoryId, monthlyLimit, month) {
      const query = `
        INSERT INTO category_limits (user_id, category_id, monthly_limit, month)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, category_id, month) 
        DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
        RETURNING *
      `;
      const result = await pool.query(query, [userId, categoryId, monthlyLimit, month]);
      return result.rows[0];
    },

    // Obtener gasto actual vs límite
    async getCategorySpending(userId, categoryId, month) {
      const query = `
        WITH spending AS (
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE user_id = $1 
            AND category_id = $2
            AND type = 'expense'
            AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $3::date)
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
        LEFT JOIN category_limits l ON l.user_id = $1 AND l.category_id = $2 
          AND DATE_TRUNC('month', l.month) = DATE_TRUNC('month', $3::date)
      `;
      const result = await pool.query(query, [userId, categoryId, month]);
      return result.rows[0] || { monthly_limit: null, current_spending: 0, remaining: null, status: 'ok' };
    },

    // Obtener todos los límites del mes

  async getAllLimits(userId, month) {
    try {
      console.log('getAllLimits - userId:', userId, 'month:', month);
      
      const query = `
        SELECT 
          c.id as category_id,
          c.name as category_name,
          c.type,
          l.monthly_limit,
          COALESCE((
            SELECT SUM(amount) 
            FROM transactions 
            WHERE user_id = $1 
              AND category_id = c.id
              AND type = 'expense'
              AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
          ), 0) as current_spending
        FROM categories c
        LEFT JOIN category_limits l ON l.user_id = $1 AND l.category_id = c.id 
          AND DATE_TRUNC('month', l.month) = DATE_TRUNC('month', $2::date)
        WHERE (c.user_id IS NULL OR c.user_id = $1)
          AND c.type = 'expense'
        ORDER BY c.name
      `;
      
      console.log('Ejecutando query:', query);
      console.log('Con parámetros:', [userId, month]);
      
      const result = await pool.query(query, [userId, month]);
      console.log('Resultado:', result.rows);
      
      return result.rows;
      
    } catch (error) {
      console.error('ERROR EN getAllLimits:', error);
      throw error; // Lanza el error para que el controlador lo capture
    }
  }
};

module.exports = transactionModel;