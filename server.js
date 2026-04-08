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

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// Rutas de API unificadas
const tables = ['productos', 'clientes', 'apartados', 'transacciones', 'proveedores', 'pickups', 'inversiones', 'caja_chica', 'salarios', 'gastos'];

tables.forEach(table => {
  app.get(`/api/${table}`, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${table}`);
      res.json(rows);
    } catch (err) {
      res.status(500).json([]);
    }
  });
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));

app.listen(process.env.PORT || 8080, () => console.log('Servidor OK'));
