require('dotenv').config();

module.exports = {
  // MySQL Database - Analyzer Engine Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'analyzer_engine_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },

  // Diagnostic Master Database - Configuration Database
  masterDatabase: {
    host: process.env.MASTER_DB_HOST || process.env.DB_HOST || 'localhost',
    user: process.env.MASTER_DB_USER || process.env.DB_USER || 'root',
    password: process.env.MASTER_DB_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MASTER_DB_NAME || 'diagnostic_master_db',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  },

  // TCP Server
  tcp: {
    port: process.env.TCP_PORT || 8017,
    host: process.env.TCP_HOST || '127.0.0.1'
  },

  // Express API Server
  api: {
    port: process.env.API_PORT || 8018,
    host: process.env.API_HOST || '127.0.0.1'
  },

  // Default values
  defaults: {
    analyzer_id: process.env.DEFAULT_ANALYZER_ID || 1
  }
};
