const axios = require('axios');

const PRODUCTOS_SERVICE_URL = 'http://localhost:3001';

module.exports = (app, pool) => {
  // Obtener carrito del usuario
  app.get('/api/carrito/:usuarioId', async (req, res) => {
    try {
      const { usuarioId } = req.params;

      // Buscar carrito activo del usuario
      let carritoResult = await pool.query(
        'SELECT * FROM carritos WHERE usuario_id = $1 AND activo = true ORDER BY fecha_creacion DESC LIMIT 1',
        [usuarioId]
      );

      let carrito;
      if (carritoResult.rows.length === 0) {
        // Crear nuevo carrito si no existe
        const nuevoCarrito = await pool.query(
          'INSERT INTO carritos (usuario_id) VALUES ($1) RETURNING *',
          [usuarioId]
        );
        carrito = nuevoCarrito.rows[0];
      } else {
        carrito = carritoResult.rows[0];
      }

      // Obtener items del carrito con información del producto
      const itemsResult = await pool.query(`
        SELECT 
          ci.id, 
          ci.producto_id, 
          ci.cantidad, 
          ci.precio_unitario as precio,
          ci.fecha_agregado
        FROM carrito_items ci
        WHERE ci.carrito_id = $1
        ORDER BY ci.fecha_agregado DESC
      `, [carrito.id]);

      // Enriquecer con información de productos
      const itemsEnriquecidos = [];
      for (const item of itemsResult.rows) {
        try {
          const productoResponse = await axios.get(`${PRODUCTOS_SERVICE_URL}/api/productos/${item.producto_id}`);
          const producto = productoResponse.data.data || productoResponse.data;
          
          itemsEnriquecidos.push({
            ...item,
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            imagen: producto.imagen,
            stock: producto.stock
          });
        } catch (error) {
          console.warn(`No se pudo obtener info del producto ${item.producto_id}:`, error.message);
          // Mantener el item pero con información limitada
          itemsEnriquecidos.push({
            ...item,
            nombre: 'Producto no disponible',
            descripcion: '',
            imagen: null,
            stock: 0
          });
        }
      }

      const total = itemsEnriquecidos.reduce((sum, item) => sum + (parseFloat(item.precio) * item.cantidad), 0);

      res.json({
        success: true,
        data: itemsEnriquecidos,
        carrito,
        total: total.toFixed(2),
        cantidadTotal: itemsEnriquecidos.reduce((sum, item) => sum + item.cantidad, 0)
      });
    } catch (error) {
      console.error('Error al obtener carrito:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor', 
        error: error.message 
      });
    }
  });

  // Agregar producto al carrito (POST /api/carrito)
  app.post('/api/carrito', async (req, res) => {
    try {
      const { usuario_id, producto_id, cantidad = 1 } = req.body;

      if (!usuario_id || !producto_id) {
        return res.status(400).json({ 
          success: false, 
          message: 'usuario_id y producto_id son requeridos' 
        });
      }

      // Verificar que el producto existe y tiene stock
      let producto;
      try {
        const productoResponse = await axios.get(`${PRODUCTOS_SERVICE_URL}/api/productos/${producto_id}`);
        producto = productoResponse.data.data || productoResponse.data;
      } catch (error) {
        return res.status(404).json({ 
          success: false, 
          message: 'Producto no encontrado' 
        });
      }

      if (producto.stock < cantidad) {
        return res.status(400).json({ 
          success: false, 
          message: 'Stock insuficiente' 
        });
      }

      // Buscar o crear carrito
      let carritoResult = await pool.query(
        'SELECT * FROM carritos WHERE usuario_id = $1 AND activo = true ORDER BY fecha_creacion DESC LIMIT 1',
        [usuario_id]
      );

      let carrito;
      if (carritoResult.rows.length === 0) {
        const nuevoCarrito = await pool.query(
          'INSERT INTO carritos (usuario_id) VALUES ($1) RETURNING *',
          [usuario_id]
        );
        carrito = nuevoCarrito.rows[0];
      } else {
        carrito = carritoResult.rows[0];
      }

      // Verificar si el producto ya está en el carrito
      const itemExistente = await pool.query(
        'SELECT * FROM carrito_items WHERE carrito_id = $1 AND producto_id = $2',
        [carrito.id, producto_id]
      );

      let result;
      if (itemExistente.rows.length > 0) {
        // Actualizar cantidad si ya existe
        const nuevaCantidad = itemExistente.rows[0].cantidad + cantidad;
        if (producto.stock < nuevaCantidad) {
          return res.status(400).json({ 
            success: false, 
            message: 'Stock insuficiente para la cantidad solicitada' 
          });
        }
        
        result = await pool.query(
          'UPDATE carrito_items SET cantidad = $1, fecha_agregado = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [nuevaCantidad, itemExistente.rows[0].id]
        );
      } else {
        // Crear nuevo item
        result = await pool.query(
          `INSERT INTO carrito_items (carrito_id, producto_id, cantidad, precio_unitario)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [carrito.id, producto_id, cantidad, producto.precio]
        );
      }

      res.status(201).json({ 
        success: true, 
        message: 'Producto agregado al carrito exitosamente', 
        data: result.rows[0] 
      });
    } catch (error) {
      console.error('Error al agregar producto al carrito:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor', 
        error: error.message 
      });
    }
  });

  // Actualizar cantidad de item del carrito
  app.put('/api/carrito/:itemId', async (req, res) => {
    try {
      const { itemId } = req.params;
      const { cantidad } = req.body;

      if (cantidad <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'La cantidad debe ser mayor a 0' 
        });
      }

      // Verificar que el item existe
      const itemResult = await pool.query('SELECT * FROM carrito_items WHERE id = $1', [itemId]);
      if (itemResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Item no encontrado en el carrito' 
        });
      }

      const item = itemResult.rows[0];

      // Verificar stock del producto
      try {
        const productoResponse = await axios.get(`${PRODUCTOS_SERVICE_URL}/api/productos/${item.producto_id}`);
        const producto = productoResponse.data.data || productoResponse.data;
        
        if (producto.stock < cantidad) {
          return res.status(400).json({ 
            success: false, 
            message: `Stock insuficiente. Stock disponible: ${producto.stock}` 
          });
        }
      } catch (error) {
        return res.status(404).json({ 
          success: false, 
          message: 'Producto no encontrado' 
        });
      }

      // Actualizar cantidad
      const result = await pool.query(
        'UPDATE carrito_items SET cantidad = $1, fecha_agregado = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [cantidad, itemId]
      );

      res.json({ 
        success: true, 
        message: 'Cantidad actualizada exitosamente', 
        data: result.rows[0] 
      });
    } catch (error) {
      console.error('Error al actualizar cantidad:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor', 
        error: error.message 
      });
    }
  });

  // Eliminar item del carrito
  app.delete('/api/carrito/:itemId', async (req, res) => {
    try {
      const { itemId } = req.params;
      
      const result = await pool.query('DELETE FROM carrito_items WHERE id = $1 RETURNING *', [itemId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Item no encontrado en el carrito' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Producto eliminado del carrito exitosamente', 
        data: result.rows[0] 
      });
    } catch (error) {
      console.error('Error al eliminar item del carrito:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor', 
        error: error.message 
      });
    }
  });

  // Vaciar carrito completo
  app.delete('/api/carrito/:usuarioId/vaciar', async (req, res) => {
    try {
      const { usuarioId } = req.params;

      const carritoResult = await pool.query(
        'SELECT * FROM carritos WHERE usuario_id = $1 AND activo = true ORDER BY fecha_creacion DESC LIMIT 1',
        [usuarioId]
      );

      if (carritoResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Carrito no encontrado' 
        });
      }

      await pool.query('DELETE FROM carrito_items WHERE carrito_id = $1', [carritoResult.rows[0].id]);

      res.json({ 
        success: true, 
        message: 'Carrito vaciado exitosamente' 
      });
    } catch (error) {
      console.error('Error al vaciar carrito:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor', 
        error: error.message 
      });
    }
  });

  // Checkout - Finalizar compra
  app.post('/api/carrito/:usuarioId/checkout', async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { usuarioId } = req.params;
      const { direccionEnvio, telefonoContacto } = req.body;

      // Buscar carrito activo
      const carritoResult = await client.query(
        'SELECT * FROM carritos WHERE usuario_id = $1 AND activo = true ORDER BY fecha_creacion DESC LIMIT 1',
        [usuarioId]
      );

      if (carritoResult.rows.length === 0) {
        throw new Error('Carrito no encontrado');
      }

      const carrito = carritoResult.rows[0];

      // Obtener items del carrito
      const itemsResult = await client.query(`
        SELECT ci.*, p.stock, p.nombre
        FROM carrito_items ci
        LEFT JOIN productos p ON ci.producto_id = p.id
        WHERE ci.carrito_id = $1
      `, [carrito.id]);

      if (itemsResult.rows.length === 0) {
        throw new Error('El carrito está vacío');
      }

      // Verificar stock para todos los productos
      for (const item of itemsResult.rows) {
        if (!item.stock || item.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para ${item.nombre || 'producto ID: ' + item.producto_id}`);
        }
      }

      // Calcular total
      const total = itemsResult.rows.reduce((sum, item) => 
        sum + (parseFloat(item.precio_unitario) * item.cantidad), 0
      );

      // Crear pedido (esto debería ir al microservicio de pedidos)
      // Por ahora simular respuesta exitosa
      
      // Actualizar stock de productos
      for (const item of itemsResult.rows) {
        try {
          await axios.put(`${PRODUCTOS_SERVICE_URL}/api/productos/${item.producto_id}/stock`, {
            cantidad: item.cantidad,
            operacion: 'restar'
          });
        } catch (error) {
          console.warn(`No se pudo actualizar stock del producto ${item.producto_id}`);
        }
      }

      // Desactivar carrito y limpiar items
      await client.query('UPDATE carritos SET activo = false WHERE id = $1', [carrito.id]);
      await client.query('DELETE FROM carrito_items WHERE carrito_id = $1', [carrito.id]);

      await client.query('COMMIT');

      res.status(201).json({ 
        success: true, 
        message: 'Compra realizada exitosamente', 
        data: { 
          total: total.toFixed(2),
          items: itemsResult.rows.length,
          carritoId: carrito.id
        } 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en checkout:', error);
      res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    } finally {
      client.release();
    }
  });

  // Ruta adicional para obtener estadísticas del carrito
  app.get('/api/carrito/:usuarioId/stats', async (req, res) => {
    try {
      const { usuarioId } = req.params;

      const result = await pool.query(`
        SELECT 
          COUNT(ci.id) as total_items,
          COALESCE(SUM(ci.cantidad), 0) as total_productos,
          COALESCE(SUM(ci.cantidad * ci.precio_unitario), 0) as total_valor
        FROM carritos c
        LEFT JOIN carrito_items ci ON c.id = ci.carrito_id
        WHERE c.usuario_id = $1 AND c.activo = true
      `, [usuarioId]);

      const stats = result.rows[0];

      res.json({
        success: true,
        data: {
          totalItems: parseInt(stats.total_items),
          totalProductos: parseInt(stats.total_productos),
          totalValor: parseFloat(stats.total_valor).toFixed(2)
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas del carrito:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor', 
        error: error.message 
      });
    }
  });
};