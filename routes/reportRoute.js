import express from "express";
import db from "../config/db.js";

const router = express.Router();

/**
 * GET /api/reports/analyzer-stats
 * Get statistics for all analyzers
 */
router.get("/reports/analyzer-stats", async (req, res) => {
  try {
    const connection = await db.getConnection();
    
    const [stats] = await connection.execute(`
      SELECT 
        a.id,
        a.name,
        a.code as analyzer_code,
        a.manufacturer,
        a.model,
        a.status,
        COUNT(ar.id) as total_results,
        SUM(CASE WHEN ar.consumed = 1 THEN 1 ELSE 0 END) as consumed_results,
        SUM(CASE WHEN ar.consumed = 0 THEN 1 ELSE 0 END) as pending_results,
        MAX(ar.created_at) as last_result_time,
        COUNT(DISTINCT DATE(ar.created_at)) as active_days
      FROM analyzers a
      LEFT JOIN analyzer_results ar ON a.code = ar.analyzer_code
      WHERE a.status = 'active'
      GROUP BY a.id, a.name, a.code, a.manufacturer, a.model, a.status
      ORDER BY total_results DESC
    `);
    
    connection.release();
    
    res.json({
      success: true,
      count: stats.length,
      data: stats
    });
  } catch (error) {
    console.error('[API] Error fetching analyzer stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/daily-summary
 * Get daily summary of results
 */
router.get("/reports/daily-summary", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    const connection = await db.getConnection();
    
    const [summary] = await connection.execute(`
      SELECT 
        DATE(ar.created_at) as result_date,
        ar.analyzer_code,
        COUNT(ar.id) as total_results,
        COUNT(DISTINCT ar.request_ulid) as total_requests,
        SUM(CASE WHEN ar.consumed = 1 THEN 1 ELSE 0 END) as consumed_results,
        COUNT(DISTINCT ari.analyzer_parameter_code) as unique_tests
      FROM analyzer_results ar
      LEFT JOIN analyzer_result_items ari ON ar.request_ulid = ari.request_ulid
      WHERE ar.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(ar.created_at), ar.analyzer_code
      ORDER BY result_date DESC, ar.analyzer_code
    `, [days]);
    
    connection.release();
    
    res.json({
      success: true,
      period_days: days,
      count: summary.length,
      data: summary
    });
  } catch (error) {
    console.error('[API] Error fetching daily summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/test-frequency
 * Get test parameter frequency report
 */
router.get("/reports/test-frequency", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const connection = await db.getConnection();
    
    const [frequency] = await connection.execute(`
      SELECT 
        ari.analyzer_parameter_code,
        ap.name as parameter_name,
        ap.unit,
        COUNT(ari.id) as test_count,
        COUNT(DISTINCT ari.request_ulid) as sample_count,
        MIN(ari.created_at) as first_test,
        MAX(ari.created_at) as last_test,
        COUNT(DISTINCT DATE(ari.created_at)) as active_days
      FROM analyzer_result_items ari
      LEFT JOIN analyzer_parameters ap ON ari.analyzer_parameter_code = ap.code
      WHERE ari.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY ari.analyzer_parameter_code, ap.name, ap.unit
      ORDER BY test_count DESC
    `, [days]);
    
    connection.release();
    
    res.json({
      success: true,
      period_days: days,
      count: frequency.length,
      data: frequency
    });
  } catch (error) {
    console.error('[API] Error fetching test frequency:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/system-health
 * Get system health overview
 */
router.get("/reports/system-health", async (req, res) => {
  try {
    const connection = await db.getConnection();
    
    // Get overall stats
    const [overallStats] = await connection.execute(`
      SELECT 
        COUNT(DISTINCT a.id) as total_analyzers,
        SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) as active_analyzers,
        COUNT(DISTINCT ar.id) as total_results_today,
        COUNT(DISTINCT ar.request_ulid) as total_requests_today,
        SUM(CASE WHEN ar.consumed = 0 THEN 1 ELSE 0 END) as pending_results
      FROM analyzers a
      LEFT JOIN analyzer_results ar ON a.code = ar.analyzer_code 
        AND DATE(ar.created_at) = CURDATE()
    `);
    
    // Get recent activity
    const [recentActivity] = await connection.execute(`
      SELECT 
        ar.analyzer_code,
        COUNT(ar.id) as results_last_hour
      FROM analyzer_results ar
      WHERE ar.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY ar.analyzer_code
      ORDER BY results_last_hour DESC
    `);
    
    connection.release();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      system_health: overallStats[0],
      recent_activity: recentActivity
    });
  } catch (error) {
    console.error('[API] Error fetching system health:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;