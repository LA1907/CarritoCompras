const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const carritoController = require('./carritoController');

const app = express();
const PORT = 3002;

// Configuración de la base de datos
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'carrito_compras',
  password: 'tu_password',
  port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());

// Pasar pool a los handlers
carritoController(app, pool);

// Ruta de salud del servicio
app.get('/health', (req, res) => {
  res.json({ 
    service: 'carrito-service', 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🛒 Carrito Service running on port ${PORT}`);
});
