#  Fintech API - Gestor de Finanzas Personales

API RESTful para gestionar finanzas personales con autenticación JWT, transacciones, categorías y límites de gasto.

##  Descripción

Aplicación completa (backend + frontend) que permite a usuarios registrar sus ingresos y gastos, categorizarlos, y establecer límites mensuales de gasto con alertas visuales.

##  Funcionalidades

- **Usuarios**: Registro, login con JWT, perfil con balance actualizado
- **Transacciones**: Crear, listar, editar y eliminar ingresos/gastos
- **Categorías**: Globales y personalizadas por usuario
- **Límites de gasto**: Establecer límites mensuales por categoría
- **Alertas**: OK, CUIDADO, EXCEDIDO
- **Dashboard**: Balance actual y últimas transacciones
- **Filtros**: Por tipo, categoría y fechas

## Tecnologías

### Backend
- Node.js + Express
- PostgreSQL
- JWT
- Bcrypt
- Dotenv

### Frontend
- HTML5
- JavaScript vanilla
- Fetch API

## 📡 Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Obtener perfil y balance |
| GET | `/api/transactions` | Listar transacciones |
| POST | `/api/transactions` | Crear transacción |
| PUT | `/api/transactions/:id` | Actualizar transacción |
| DELETE | `/api/transactions/:id` | Eliminar transacción |
| GET | `/api/transactions/categories` | Listar categorías |
| POST | `/api/transactions/categories` | Crear categoría |
| PUT | `/api/transactions/categories/:id` | Actualizar categoría |
| DELETE | `/api/transactions/categories/:id` | Eliminar categoría |
| POST | `/api/transactions/limits` | Establecer límite de gasto |
| GET | `/api/transactions/limits` | Ver límites de gasto |
| DELETE | `/api/transactions/limits/:categoryId` | Eliminar límite de gasto |

