const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const authController = {
  // REGISTRO de usuario
    async register(req, res) {
    try {
        const { name, email, password } = req.body;

      // Validar que llegaron todos los datos
        if (!name || !email || !password) {
        return res.status(400).json({ 
            error: 'Nombre, email y contraseña son requeridos' 
            });
        }

      // Validar longitud de contraseña
        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'La contraseña debe tener al menos 6 caracteres' 
            });
        }

      // Verificar si el email ya existe
        const existingUser = await userModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ 
                error: 'El email ya está registrado' 
            });
        }

      // Crear usuario
        const newUser = await userModel.create(name, email, password);

      // Generar token JWT
        const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
        );

      // Responder con éxito
        res.status(201).json({
        message: 'Usuario creado exitosamente',
        user: newUser,
        token
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
            });
        }
    },

  // LOGIN de usuario
    async login(req, res) {
    try {
        const { email, password } = req.body;

      // Validar datos
        if (!email || !password) {
        return res.status(400).json({ 
            error: 'Email y contraseña son requeridos' 
        });
        }

      // Buscar usuario
        const user = await userModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({ 
                error: 'Email o contraseña incorrectos' 
            });
        }

      // Validar contraseña
        const isValidPassword = await userModel.validatePassword(
        password, 
        user.password_hash
        );

        if (!isValidPassword) {
            return res.status(401).json({ 
            error: 'Email o contraseña incorrectos' 
            });
        }

      // Generar token
        const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
        );

      // No enviar el hash de la contraseña
        const { password_hash, ...userWithoutPassword } = user;

        res.json({
        message: 'Login exitoso',
        user: userWithoutPassword,
        token
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
            });
        }
    },

      // Obtener perfil del usuario
  async getProfile(req, res) {
    try {
      const userId = req.userId;
      const user = await userModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({
        user,
        message: 'Balance actual: $' + user.balance
      });

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = authController;