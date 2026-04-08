import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json());

// Conexión a la base de datos de Hostinger
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// Función genérica para manejar las consultas y evitar repetir código
const handleQuery = async (query, res) => {
  try {
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- RUTAS QUE PIDE TU CONSOLA ---
app.get('/api/productos', (req, res) => handleQuery('SELECT * FROM productos', res));
app.get('/api/clientes', (req, res) => handleQuery('SELECT * FROM clientes', res));
app.get('/api/apartados', (req, res) => handleQuery('SELECT * FROM apartados', res));
app.get('/api/transacciones', (req, res) => handleQuery('SELECT * FROM transacciones', res));
app.get('/api/proveedores', (req, res) => handleQuery('SELECT * FROM proveedores', res));
app.get('/api/pickups', (req, res) => handleQuery('SELECT * FROM pickups', res));
app.get('/api/inversiones', (req, res) => handleQuery('SELECT * FROM inversiones', res));
app.get('/api/caja_chica', (req, res) => handleQuery('SELECT * FROM caja_chica', res));
app.get('/api/salarios', (req, res) => handleQuery('SELECT * FROM salarios', res));
app.get('/api/gastos', (req, res) => handleQuery('SELECT * FROM gastos', res));

// Servir la aplicación de React
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor escuchando en ${PORT}`));
