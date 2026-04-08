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

// Conexión segura
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5
});

// Ruta de prueba para saber si el backend está vivo
app.get('/api/health', (req, res) => res.json({ status: 'operativo', base_de_datos: 'conectando...' }));

// Ruta de productos (la que necesita tu inventario)
app.get('/api/productos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error en DB', detalles: err.message });
  }
});

// SIRVE LOS ARCHIVOS DE REACT (Carpeta dist)
app.use(express.static(path.join(__dirname, 'dist')));

// REDIRECCIÓN TOTAL (Para que al refrescar no dé 404)
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor en puerto ${PORT}`));
