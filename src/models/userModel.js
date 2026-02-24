const sql = require('./db');
const bcrypt = require('bcrypt');

const userModel = {
    // Crear nuevo usuario
    async create(name, email, password) {
        // Encriptar contraseña (10 rondas)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [user] = await sql`
            INSERT INTO users (name, email, password_hash)
            VALUES (${name}, ${email}, ${hashedPassword})
            RETURNING id, name, email, balance, created_at
        `;
        
        return user;
    },

    // Buscar usuario por email
    async findByEmail(email) {
        const [user] = await sql`
            SELECT * FROM users WHERE email = ${email}
        `;
        return user;
    },

    // Buscar usuario por ID
    async findById(id) {
        const [user] = await sql`
            SELECT id, name, email, balance, created_at 
            FROM users WHERE id = ${id}
        `;
        return user;
    },

    // Verificar contraseña
    async validatePassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
};

module.exports = userModel;