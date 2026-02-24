// config/db.js - PARA SUPABASE CON POSTGRES
const postgres = require('postgres');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no está definida');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    max: 20,
    idle_timeout: 30,
    connect_timeout: 5,
});

// Probar conexión
(async () => {
    try {
        await sql`SELECT 1`;
        console.log('✅ Conectado a Supabase');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
})();

module.exports = sql;