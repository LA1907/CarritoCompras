const pool = require('../db');

const crearProducto = async (req, res) => {
  const { nombre, descripcion, precio, stock } = req.body;
  await pool.query(
    'INSERT INTO productos (nombre, descripcion, precio, stock) VALUES ($1, $2, $3, $4)',
    [nombre, descripcion, precio, stock]
  );
  res.json({ mensaje: 'Producto creado' });
};

const obtenerProductos = async (req, res) => {
  const result = await pool.query('SELECT * FROM productos');
  res.json(result.rows);
};

const actualizarProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock } = req.body;
  await pool.query(
    'UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, stock=$4 WHERE id=$5',
    [nombre, descripcion, precio, stock, id]
  );
  res.json({ mensaje: 'Producto actualizado' });
};

const eliminarProducto = async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM productos WHERE id=$1', [id]);
  res.json({ mensaje: 'Producto eliminado' });
};

module.exports = {
  crearProducto,
  obtenerProductos,
  actualizarProducto,
  eliminarProducto
};
