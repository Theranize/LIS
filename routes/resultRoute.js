import express from "express";
import db from "../config/db.js";

const router = express.Router();

// Get all results
router.get("/results", async (req, res) => {

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = (page - 1) * limit;

    const sql = `
      SELECT ar.*, ari.analyzer_parameter_code, ari.value, ari.unit
      FROM analyzer_results ar
      LEFT JOIN analyzer_result_items ari ON ar.request_ulid = ari.request_ulid
      ORDER BY ar.created_at DESC 
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.execute(sql, [limit, offset]);

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM analyzer_results`;
    const [countRows] = await db.execute(countSql);

    res.json({
      success: true,
      count: rows.length,
      total: countRows[0].total,
      page: page,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }

});

// Get unconsumed results for LIMS
router.get("/results/unconsumed", async (req, res) => {

  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const sql = `
      SELECT ar.*, ari.analyzer_parameter_code, ari.value, ari.unit
      FROM analyzer_results ar
      LEFT JOIN analyzer_result_items ari ON ar.request_ulid = ari.request_ulid
      WHERE ar.consumed = 0
      ORDER BY ar.created_at ASC LIMIT ?
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

// Get results by analyzer code
router.get("/results/analyzer/:code", async (req, res) => {

  const limit = Math.min(parseInt(req.query.limit) || 100, 500);

  const sql = `
    SELECT ar.*, ari.analyzer_parameter_code, ari.value, ari.unit
    FROM analyzer_results ar
    LEFT JOIN analyzer_result_items ari ON ar.request_ulid = ari.request_ulid
    WHERE ar.analyzer_code = ?
    ORDER BY ar.created_at DESC 
    LIMIT ?
  `;

  const [rows] = await db.execute(sql, [req.params.code, limit]);

  res.json({
    success: true,
    analyzer_code: req.params.code,
    count: rows.length,
    data: rows
  });

});

// Mark results as consumed by LIMS
router.post("/results/mark-consumed", async (req, res) => {

  const { resultIds, consumerSystem } = req.body;

  if (!Array.isArray(resultIds) || resultIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'resultIds must be a non-empty array'
    });
  }

  const placeholders = resultIds.map(() => '?').join(',');
  const params = [...resultIds, consumerSystem || 'LIMS'];

  const sql = `
    UPDATE analyzer_results 
    SET consumed = 1, consumed_by = ?, consumed_at = NOW() 
    WHERE id IN (${placeholders})
  `;

  const [result] = await db.execute(sql, params);

  res.json({
    success: true,
    affectedRows: result.affectedRows,
    message: `Marked ${result.affectedRows} results as consumed`
  });

});

// Get specific result details
router.get("/results/:id", async (req, res) => {

  const sql = `
    SELECT ar.*, ari.analyzer_parameter_code, ari.value, ari.unit
    FROM analyzer_results ar
    LEFT JOIN analyzer_result_items ari ON ar.request_ulid = ari.request_ulid
    WHERE ar.id = ?
  `;

  const [rows] = await db.execute(sql, [req.params.id]);

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Result not found'
    });
  }

  res.json({
    success: true,
    data: rows
  });

});

export default router;