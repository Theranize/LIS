/**
 * Analyzer Database Operations
 * Handles all database queries for analyzer data
 */

const { getPool } = require('./pool');
const { getAnalyzerParameterMapping } = require('./masterPool');

class AnalyzerDatabase {
  
  // ===== RAW MESSAGES =====
  
  async insertRawMessage(analyzerId, messageFormat, rawMessage) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const [result] = await conn.execute(
        `INSERT INTO analyzer_raw_messages 
         (analyzer_id, message_format, raw_message, parsed) 
         VALUES (?, ?, ?, 0)`,
        [analyzerId, messageFormat, rawMessage]
      );
      
      return result.insertId;
    } finally {
      conn.release();
    }
  }

  async markMessageAsParsed(rawMessageId) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      await conn.execute(
        `UPDATE analyzer_raw_messages SET parsed = 1 WHERE id = ?`,
        [rawMessageId]
      );
    } finally {
      conn.release();
    }
  }

  // ===== ANALYZER RESULTS =====

  async insertAnalyzerResult(rawMessageId, resultData) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      // Try to get master parameter mapping
      let masterParameterMapping = null;
      try {
        masterParameterMapping = await getAnalyzerParameterMapping(
          resultData.lab_id,
          resultData.analyzer_id,
          resultData.test_code
        );
      } catch (error) {
        console.warn('[DB] Could not get master parameter mapping:', error.message);
      }

      const [result] = await conn.execute(
        `INSERT INTO analyzer_results 
         (analyzer_id, lab_id, raw_message_id, analyzer_sample_id, patient_id, 
          sample_uid, test_code, test_name, result_value, unit, 
          reference_range, normal_flag, result_timestamp, status, consumed) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VALID', 0)`,
        [
          resultData.analyzer_id,
          resultData.lab_id,
          rawMessageId,
          resultData.analyzer_sample_id,
          resultData.patient_id,
          `${resultData.analyzer_id}_${resultData.analyzer_sample_id}_${resultData.test_code}`,
          resultData.test_code,
          resultData.test_name || resultData.test_code,
          resultData.result_value,
          resultData.unit,
          resultData.reference_range,
          resultData.normal_flag,
          resultData.result_timestamp
        ]
      );
      
      // Log master parameter mapping if found
      if (masterParameterMapping) {
        console.log(`[DB] Result saved with master parameter mapping: ${resultData.test_code} → master_id ${masterParameterMapping.master_parameter_id} (${masterParameterMapping.master_parameter_name})`);
      } else {
        console.log(`[DB] Result saved without master parameter mapping: ${resultData.test_code}`);
      }
      
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('[DB] Duplicate result ignored (already exists)');
        return null;
      }
      throw error;
    } finally {
      conn.release();
    }
  }

  // ===== CONSUMPTION TRACKING =====

  async getResultById(resultId) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const [rows] = await conn.execute(
        `SELECT * FROM analyzer_results WHERE id = ?`,
        [resultId]
      );
      
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }

  // ===== ANALYTICS =====

  async getAnalyzerStats(analyzerId) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const [stats] = await conn.execute(
        `SELECT 
           COUNT(*) as total_results,
           SUM(IF(consumed = 1, 1, 0)) as consumed_count,
           SUM(IF(consumed = 0, 1, 0)) as unconsumed_count,
           COUNT(DISTINCT DATE(created_at)) as days_with_results
         FROM analyzer_results
         WHERE analyzer_id = ?`,
        [analyzerId]
      );
      
      return stats[0] || {};
    } finally {
      conn.release();
    }
  }

  // ===== ANALYZER CONFIGURATION =====

  /**
   * Get all active analyzers from database
   */
  async getActiveAnalyzers() {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const [rows] = await conn.execute(
        `SELECT id, analyzer_code, analyzer_name, manufacturer, 
                communication_type, parser_type, ip_address, lab_id
         FROM analyzer_master
         WHERE is_active = 1
         ORDER BY id ASC`
      );
      
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Get all analyzers (including inactive)
   */
  async getAllAnalyzers() {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const [rows] = await conn.execute(
        `SELECT id, analyzer_code, analyzer_name, manufacturer, 
                communication_type, parser_type, ip_address, port_number, is_active
         FROM analyzer_master
         ORDER BY id ASC`
      );
      
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Get analyzer by ID
   */
  async getAnalyzerById(analyzerId) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const [rows] = await conn.execute(
        `SELECT * FROM analyzer_master WHERE id = ?`,
        [analyzerId]
      );
      
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }

  /**
   * Update analyzer status (RUNNING, STOPPED, ERROR, etc.)
   */
  async updateAnalyzerStatus(analyzerId, status) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      await conn.execute(
        `UPDATE analyzer_master 
         SET installed_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [analyzerId]
      );
    } finally {
      conn.release();
    }
  }

  /**
   * Get analyzer ports configuration
   */
  async getAnalyzerPorts(analyzerId) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const [rows] = await conn.execute(
        `SELECT id, port_number, protocol, is_active
         FROM analyzer_ports
         WHERE analyzer_id = ? AND is_active = 1`,
        [analyzerId]
      );
      
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Get results by analyzer ID
   */
  async getResultsByAnalyzer(analyzerId, limit = 100) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const [rows] = await conn.execute(
        `SELECT ar.* FROM analyzer_results ar
         WHERE ar.analyzer_id = ? AND ar.consumed = 0 AND ar.status = 'VALID'
         ORDER BY ar.created_at ASC
         LIMIT ?`,
        [analyzerId, limit]
      );
      
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Get analyzer statistics for reporting
   */
  async getAnalyzerReportStats() {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const [stats] = await conn.execute(
        `SELECT 
           am.id,
           am.analyzer_code,
           am.analyzer_name,
           COUNT(ar.id) as total_results,
           SUM(IF(ar.consumed = 1, 1, 0)) as consumed_count,
           SUM(IF(ar.consumed = 0, 1, 0)) as unconsumed_count,
           MAX(ar.created_at) as last_result_at
         FROM analyzer_master am
         LEFT JOIN analyzer_results ar ON am.id = ar.analyzer_id
         WHERE am.is_active = 1
         GROUP BY am.id, am.analyzer_code, am.analyzer_name`
      );
      
      return stats;
    } finally {
      conn.release();
    }
  }

  /**
   * Get unconsumed analyzer results (NEW - for LIS integration)
   */
  async getUnconsumedResults(limit = 100) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const [rows] = await conn.execute(
        `SELECT 
           ar.id,
           ar.analyzer_id,
           ar.lab_id,
           am.analyzer_code,
           am.analyzer_name,
           ar.analyzer_sample_id,
           ar.patient_id,
           ar.sample_uid,
           ar.test_code,
           ar.test_name,
           ar.result_value,
           ar.unit,
           ar.reference_range,
           ar.normal_flag,
           ar.result_timestamp,
           ar.created_at
         FROM analyzer_results ar
         LEFT JOIN analyzer_master am ON ar.analyzer_id = am.id
         WHERE ar.consumed = 0
         ORDER BY ar.created_at ASC
         LIMIT ?`,
        [limit]
      );
      
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Mark results as consumed (NEW - for LIS integration)
   */
  async markResultsAsConsumed(resultIds, consumerSystem = 'LIS') {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      const placeholders = resultIds.map(() => '?').join(',');
      const [result] = await conn.execute(
        `UPDATE analyzer_results 
         SET consumed = 1, consumed_by = ?, consumed_at = NOW()
         WHERE id IN (${placeholders})`,
        [consumerSystem, ...resultIds]
      );
      
      return result.affectedRows;
    } finally {
      conn.release();
    }
  }
}

module.exports = new AnalyzerDatabase();
