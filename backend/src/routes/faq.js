import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';

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

router.put('/config', authenticate, requireAdmin, async (req, res) => {
  try {
    const { intro_text, recipient_emails, sender_name, contact_form_enabled } = req.body;
    const result = await query('UPDATE help_config SET intro_text = COALESCE($1, intro_text), recipient_emails = COALESCE($2, recipient_emails), sender_name = COALESCE($3, sender_name), contact_form_enabled = COALESCE($4, contact_form_enabled), updated_at = NOW() RETURNING *', [intro_text, recipient_emails ? JSON.stringify(recipient_emails) : null, sender_name, contact_form_enabled]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

export default router;
