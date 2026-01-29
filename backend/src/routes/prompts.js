import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all prompts with optional filtering by prompt_type
router.get('/', authenticate, async (req, res) => {
  try {
    const { prompt_type } = req.query;
    let sql = 'SELECT cp.*, ap.name as provider_name, ap.provider_type FROM custom_prompts cp LEFT JOIN ai_providers ap ON cp.provider_id = ap.id WHERE cp.created_by = $1';
    const params = [req.user.id];

    if (prompt_type) {
      params.push(prompt_type);
      sql += ` AND cp.prompt_type = $${params.length}`;
    }

    sql += ' ORDER BY cp.prompt_type, cp.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get prompts error:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// Get distinct prompt types
router.get('/types', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT DISTINCT prompt_type FROM custom_prompts WHERE prompt_type IS NOT NULL ORDER BY prompt_type'
    );
    res.json(result.rows.map(row => row.prompt_type));
  } catch (error) {
    console.error('Get prompt types error:', error);
    res.status(500).json({ error: 'Failed to fetch prompt types' });
  }
});

export default router;
