import express from "express";
import db from "../config/db.js";

const router = express.Router();

// Get unconsumed results for LIMS
router.get("/lims/results", async (req, res) => {

  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const sql = `
      SELECT 
        ar.id,
        ar.request_ulid,
        ar.analyzer_code,
        ar.patient_id,
        ar.sample_id,
        ar.created_at,
        ari.analyzer_parameter_code as test_code,
        ari.value as result_value,
        ari.unit,
        ap.name as test_name,
        a.name as analyzer_name,
        a.manufacturer
      FROM analyzer_results ar
      LEFT JOIN analyzer_result_items ari ON ar.request_ulid = ari.request_ulid
      LEFT JOIN analyzer_parameters ap ON ari.analyzer_parameter_code = ap.code
      LEFT JOIN analyzers a ON ar.analyzer_code = a.code
      WHERE ar.consumed = 0
      ORDER BY ar.created_at ASC 
      LIMIT ?
    `;

    const [rows] = await db.execute(sql, [limit]);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }

});

// Mark results as consumed by LIMS
router.post("/lims/mark-consumed", async (req, res) => {

  try {
    const { resultIds } = req.body;

    if (!Array.isArray(resultIds) || resultIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'resultIds must be a non-empty array'
      });
    }

    const placeholders = resultIds.map(() => '?').join(',');

    const sql = `
      UPDATE analyzer_results 
      SET consumed = 1, consumed_by = 'LIMS', consumed_at = NOW() 
      WHERE id IN (${placeholders})
    `;

    const [result] = await db.execute(sql, resultIds);

    res.json({
      success: true,
      affectedRows: result.affectedRows,
      message: `Marked ${result.affectedRows} results as consumed by LIMS`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }

});

// Get LIMS integration statistics
router.get("/lims/stats", async (req, res) => {

  try {
    const sql = `
      SELECT 
        COUNT(*) as total_results,
        SUM(CASE WHEN consumed = 0 THEN 1 ELSE 0 END) as pending_results,
        SUM(CASE WHEN consumed = 1 AND consumed_by = 'LIMS' THEN 1 ELSE 0 END) as lims_consumed,
        COUNT(DISTINCT analyzer_code) as total_analyzers,
        MAX(created_at) as last_result_time
      FROM analyzer_results
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;

    const [stats] = await db.execute(sql);

    res.json({
      success: true,
      period: "Last 24 hours",
      data: stats[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }

});

export default router;