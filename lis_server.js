/**
 * Laboratory Information System (LIS) Server
 * Multi-analyzer TCP listener + Express REST API
 */

const express = require('express');
const { initPool } = require('./database/pool');
const { initMasterPool } = require('./database/masterPool');
const config = require('./config');
const apiRoutes = require('./api/routes');
const analyzerManager = require('./managers/AnalyzerManager');

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

// ===== EXPRESS API SERVER =====

const apiServer = app.listen(config.api.port, config.api.host, () => {
  console.log(`[API] Server running on http://${config.api.host}:${config.api.port}`);
 // console.log(`[API] Available endpoints:`);
 // console.log(`  GET  /api/health`);
  //console.log(`  GET  /api/analyzers                    (list all analyzers)`);
  //console.log(`  GET  /api/analyzers/:id               (analyzer details)`);
  //console.log(`  GET  /api/analyzers/:id/results       (analyzer results)`);
 // console.log(`  GET  /api/analyzers/:id/stats         (analyzer stats)`);
 // console.log(`  GET  /api/analyzer-results/unconsumed (all unconsumed)`);
  //console.log(`  POST /api/analyzer-results/mark-consumed`);
  //console.log(`  GET  /api/reports/analyzer-stats      (statistics)`);
});

// ===== START SERVER =====

async function start() {
  try {
    // Initialize database pools
    await initPool();
    console.log('[✔] Main database (analyzer_engine_db) initialized');

    // Initialize master database pool (optional - for configuration)
    await initMasterPool();
    console.log('[✔] Master database (diagnostic_master_db) initialized');

    // Initialize all analyzers from database
    const analyzerCount = await analyzerManager.initializeAnalyzers();
    console.log(`[✔] Initialized ${analyzerCount} analyzer(s)`);

    console.log('[✔] LIS Server started successfully - Combined LIS+LIMS Architecture');
  } catch (error) {
    console.error('[✗] Failed to start server:', error.message);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[SHUTDOWN] SIGTERM received');
  await analyzerManager.shutdown();
  apiServer.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[SHUTDOWN] SIGINT received');
  await analyzerManager.shutdown();
  apiServer.close();
  process.exit(0);
});
