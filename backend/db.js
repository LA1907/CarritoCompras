const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('carrito_compras', 'postgres', '2025', {
    host: 'localhost',
    dialect: 'postgres',
    port: 5432,
});

module.exports = sequelize;
