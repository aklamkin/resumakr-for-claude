import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let sql = 'SELECT * FROM ai_providers ORDER BY name ASC';
    const result = await query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

export default router;
