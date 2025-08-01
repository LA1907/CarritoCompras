const express = require('express');
const cors = require('cors'); // Para permitir peticiones desde el frontend
const usuariosRoutes = require('./rutas/usuarios'); // Importa tus rutas de usuarios
const app = express();
const PORT = process.env.PORT || 5000; // Asegúrate de que escuche en el puerto 5000
// Middlewares
app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Para parsear el body de las peticiones en formato JSON
// Rutas de tu API
app.use('/api/usuarios', usuariosRoutes);
// --- Nueva ruta para el dashboard (ejemplo simple) ---
// Puedes mover esto a un nuevo controlador y ruta si lo deseas, como `dashboardController.js` y `dashboard.js`
app.get('/api/dashboard/stats', (req, res) => {
    // Aquí podrías obtener datos reales de tu base de datos
    // Por ahora, simulamos algunos datos
    const stats = {
        usuarios_totales: 1548,
        ingresos_totales: 25000.75,
        activos_hoy: 42
    };
   res.json(stats);
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});