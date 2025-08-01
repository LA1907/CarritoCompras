const express = require('express');
const router = express.Router();
const {
  registrarUsuario,
  obtenerUsuarios,
  modificarUsuario,
  eliminarUsuario,
  loginUsuario
} = require('../controladores/usuariosController');

// Crear usuario
router.post('/', registrarUsuario);

// Ver todos los usuarios
router.get('/', obtenerUsuarios);

// Modificar usuario
router.put('/:id', modificarUsuario);

// Eliminar usuario
router.delete('/:id', eliminarUsuario);

// Login de usuario
router.post('/login', loginUsuario);

module.exports = router;