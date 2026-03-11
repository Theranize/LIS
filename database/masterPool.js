/**
 * Master Database Pool Manager
 * Manages connection to diagnostic_master_db for configuration queries
 */

const mysql = require('mysql2/promise');
const config = require('../config');

let masterPool = null;

async function initMasterPool() {
  try {
    masterPool = mysql.createPool(config.masterDatabase);
    const conn = await masterPool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[Master DB] ✔ Master database connection pool initialized');
    return masterPool;
  } catch (error) {
    console.error('[Master DB] ✗ Failed to initialize master pool:', error.message);
    // Don't exit process, just log error - master db is optional for basic operations
    return null;
  }
}

function getMasterPool() {
  if (!masterPool) {
    console.warn('[Master DB] ⚠ Master database pool not initialized');
    return null;
  }
  return masterPool;
}

/**
 * Get analyzer parameter mapping from master database
 */
async function getAnalyzerParameterMapping(labId, analyzerId, testCode) {
  const pool = getMasterPool();
  if (!pool) {
    console.warn('[Master DB] No master database connection for parameter mapping');
    return null;
  }

  try {
    const query = `
      SELECT 
        apm.master_parameter_id,
        mp.parameter_name as master_parameter_name,
        lpm.lis_parameter_id,
        lpm.lis_parameter_name
      FROM analyzer_parameter_mapping apm
      INNER JOIN master_parameters mp ON apm.master_parameter_id = mp.id
      INNER JOIN lab_parameter_mapping lpm ON mp.id = lpm.master_parameter_id AND lpm.lab_id = apm.lab_id
      WHERE apm.machine_parameter_code = ?
        AND apm.is_active = 1
        AND lpm.is_active = 1
        ${labId ? 'AND apm.lab_id = ?' : ''}
        ${analyzerId ? 'AND apm.analyzer_id = ?' : ''}
      ORDER BY apm.lab_id DESC
      LIMIT 1
    `;
    
    const params = [testCode];
    if (labId) params.push(labId);
    if (analyzerId) params.push(analyzerId);
    
    const [rows] = await pool.execute(query, params);
    
    if (rows.length > 0) {
      console.log(`[Master DB] Found parameter mapping for ${testCode}: master_id ${rows[0].master_parameter_id}`);
      return rows[0];
    }
    
    console.log(`[Master DB] No parameter mapping found for test_code: ${testCode}, lab_id: ${labId || 'NULL'}`);
    return null;
    
  } catch (error) {
    console.error('[Master DB] Error getting parameter mapping:', error.message);
    return null;
  }
}

/**
 * Get analyzer configuration by analyzer code
 */
async function getAnalyzerConfig(analyzerCode, labId = null) {
  const pool = getMasterPool();
  if (!pool) {
    return null;
  }

  try {
    const query = `
      SELECT *
      FROM analyzer_master
      WHERE analyzer_code = ?
        ${labId ? 'AND lab_id = ?' : ''}
        AND is_active = 1
      ORDER BY lab_id DESC
      LIMIT 1
    `;
    
    const params = [analyzerCode];
    if (labId) params.push(labId);
    
    const [rows] = await pool.execute(query, params);
    return rows.length > 0 ? rows[0] : null;
    
  } catch (error) {
    console.error('[Master DB] Error getting analyzer config:', error.message);
    return null;
  }
}

module.exports = {
  initMasterPool,
  getMasterPool,
  getAnalyzerParameterMapping,
  getAnalyzerConfig
};