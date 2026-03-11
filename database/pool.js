/**
 * MySQL Connection Pool
 * Manages database connections
 */

const mysql = require('mysql2/promise');
const config = require('../config');

let pool = null;

async function initPool() {
  try {
    pool = mysql.createPool(config.database);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[DB] ✔ Connection pool initialized');
    return pool;
  } catch (error) {
    console.error('[DB] ✗ Failed to initialize pool:', error.message);
    process.exit(1);
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Connection pool not initialized');
  }
  return pool;
}

module.exports = {
  initPool,
  getPool
};
