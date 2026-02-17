const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Conexión a BD (desde src)
require('./models/db');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ 
        message: 'API Fintech funcionando 🚀',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Ruta para probar BD
app.get('/test-db', async (req, res) => {
    try {
        const pool = require('./models/db');
        const result = await pool.query('SELECT NOW()');
        res.json({ 
            success: true, 
            time: result.rows[0],
            message: 'Conexión a BD exitosa'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Importar rutas de autenticación
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const scheduledRoutes = require('./routes/scheduledRoutes');
app.use('/api/scheduled', scheduledRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});