/**
 * REST endpoints for analyzer results (multi-analyzer support)
 */

const express = require('express');
const router = express.Router();
const db = require('../database/analyzerDb');
const analyzerManager = require('../managers/AnalyzerManager');

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// ===== ANALYZER MANAGEMENT =====

/**
 * GET /api/analyzers
 * List all analyzers with their status
 */
router.get('/analyzers', async (req, res) => {
  try {
    const status = await analyzerManager.getAllAnalyzerStatus();
    
    res.json({
      success: true,
      count: Object.keys(status).length,
      data: status
    });
  } catch (error) {
    console.error('[API] Error fetching analyzers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analyzers/:id
 * Get specific analyzer details
 */
router.get('/analyzers/:id', async (req, res) => {
  try {
    const analyzer = await db.getAnalyzerById(req.params.id);
    
    if (!analyzer) {
      return res.status(404).json({
        success: false,
        error: 'Analyzer not found'
      });
    }

    const status = await analyzerManager.getAnalyzerStatus(req.params.id);
    const ports = await db.getAnalyzerPorts(req.params.id);
    
    res.json({
      success: true,
      data: {
        ...analyzer,
        status,
        ports: ports.map(p => ({ 
          id: p.id, 
          port: p.port_number, 
          protocol: p.protocol, 
          active: p.is_active 
        }))
      }
    });
  } catch (error) {
    console.error('[API] Error fetching analyzer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analyzers/:id/results
 * Get results from specific analyzer
 */
router.get('/analyzers/:id/results', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const results = await db.getResultsByAnalyzer(req.params.id, limit);
    
    res.json({
      success: true,
      analyzer_id: req.params.id,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('[API] Error fetching results:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analyzers/:id/stats
 * Get statistics for specific analyzer
 */
router.get('/analyzers/:id/stats', async (req, res) => {
  try {
    const stats = await db.getAnalyzerStats(req.params.id);
    
    res.json({
      success: true,
      analyzer_id: req.params.id,
      data: stats
    });
  } catch (error) {
    console.error('[API] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== RESULTS ENDPOINTS =====

/**
 * GET /api/analyzer-results/unconsumed
 * Get unconsumed results from ALL analyzers
 */
router.get('/analyzer-results/unconsumed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const results = await db.getUnconsumedResults(limit);
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('[API] Error fetching unconsumed results:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analyzer-results/:id
 * Get specific result by ID
 */
router.get('/analyzer-results/:id', async (req, res) => {
  try {
    const result = await db.getResultById(req.params.id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Result not found'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[API] Error fetching result:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analyzer-results/mark-consumed
 * Mark results as consumed
 */
router.post('/analyzer-results/mark-consumed', async (req, res) => {
  try {
    const { resultIds, consumerSystem } = req.body;

    if (!Array.isArray(resultIds) || resultIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'resultIds must be a non-empty array'
      });
    }

    const affectedRows = await db.markResultsAsConsumed(
      resultIds,
      consumerSystem || 'LIS'
    );

    res.json({
      success: true,
      affectedRows,
      message: `Marked ${affectedRows} results as consumed`
    });
  } catch (error) {
    console.error('[API] Error marking results as consumed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/analyzer-stats
 * Get statistics for all analyzers
 */
router.get('/reports/analyzer-stats', async (req, res) => {
  try {
    const stats = await db.getAnalyzerReportStats();
    
    res.json({
      success: true,
      count: stats.length,
      data: stats
    });
  } catch (error) {
    console.error('[API] Error fetching report stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
