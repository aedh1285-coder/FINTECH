const pool = require('./db');
const bcrypt = require('bcrypt');

const userModel = {
  // Crear nuevo usuario
    async create(name, email, password) {
    // Encriptar contraseña (10 rondas)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, balance, created_at
    `;
    
    const values = [name, email, hashedPassword];
    const result = await pool.query(query, values);
    
    return result.rows[0];
    },

  // Buscar usuario por email
    async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    return result.rows[0];
    },

  // Buscar usuario por ID
    async findById(id) {
    const query = `
        SELECT id, name, email, balance, created_at 
        FROM users WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    
    return result.rows[0];
    },

    // Verificar contraseña
    async validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
      },
    async findById(id) {
    const query = `
      SELECT id, name, email, balance, created_at 
      FROM users WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },
};

module.exports = userModel;