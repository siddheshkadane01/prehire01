// src/services/neonDb.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon DB
  },
});

pool.on('connect', () => {
  console.log('Connected to Neon PostgreSQL DB');
});

pool.on('error', (err) => {
  console.error('Neon DB pool error:', err.message);
});

module.exports = pool;
