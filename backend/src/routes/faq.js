import express from 'express';
import { query } from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    let sql = 'SELECT * FROM faq_items';
    if (!req.user || req.user.role !== 'admin') {
      sql += ' WHERE is_published = true';
    }
    sql += ' ORDER BY order_index ASC, created_at ASC';
    const result = await query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error('Get FAQ error:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ items' });
  }
});

router.get('/config', optionalAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM help_config LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

export default router;
