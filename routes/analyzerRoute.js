import express from "express";
import db from "../config/db.js";

const router = express.Router();

// Get all analyzers
router.get("/analyzers", async (req, res) => {

  try {
    const sql = `
      SELECT id, name, code, manufacturer, model, protocol, parser, status, created_at 
      FROM analyzers 
      ORDER BY created_at DESC
    `;

    const [rows] = await db.execute(sql);

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

// Get analyzer by ID
router.get("/analyzers/:id", async (req, res) => {

  try {
    const sql = `SELECT * FROM analyzers WHERE id = ?`;
    const [rows] = await db.execute(sql, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Analyzer not found'
      });
    }

    // Get parameters
    const paramSql = `SELECT * FROM analyzer_parameters WHERE analyzer_id = ?`;
    const [params] = await db.execute(paramSql, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...rows[0],
        parameters: params
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }

});

// Add new analyzer
router.post("/analyzers", async (req, res) => {

  try {
    const { name, code, manufacturer, model, protocol, parser } = req.body;

    const sql = `
      INSERT INTO analyzers (name, code, manufacturer, model, protocol, parser, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `;

    const [result] = await db.execute(sql, [name, code, manufacturer, model, protocol, parser]);

    res.json({
      success: true,
      message: 'Analyzer added successfully',
      analyzer_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }

});

// Update analyzer
router.put("/analyzers/:id", async (req, res) => {

  try {
    const { name, manufacturer, model, protocol, parser, status } = req.body;

    const sql = `
      UPDATE analyzers 
      SET name = ?, manufacturer = ?, model = ?, protocol = ?, parser = ?, status = ?
      WHERE id = ?
    `;

    await db.execute(sql, [name, manufacturer, model, protocol, parser, status, req.params.id]);

    res.json({
      success: true,
      message: 'Analyzer updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }

});

// Delete analyzer (deactivate)
router.delete("/analyzers/:id", async (req, res) => {

  try {
    const sql = `UPDATE analyzers SET status = 'inactive' WHERE id = ?`;
    await db.execute(sql, [req.params.id]);

    res.json({
      success: true,
      message: 'Analyzer deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }

});

export default router;