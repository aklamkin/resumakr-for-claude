import express from 'express';
import { query } from '../../config/database.js';
import { authenticateAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// Get all FAQ items (including unpublished, for admin)
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM faq_items ORDER BY order_index ASC, created_at ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get FAQ error:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ items' });
  }
});

// Get help config
router.get('/config', async (req, res) => {
  try {
    const result = await query('SELECT * FROM help_config LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Update help config
router.put('/config', async (req, res) => {
  try {
    const { intro_text, recipient_emails, sender_name, contact_form_enabled } = req.body;
    const result = await query(
      'UPDATE help_config SET intro_text = COALESCE($1, intro_text), recipient_emails = COALESCE($2, recipient_emails), sender_name = COALESCE($3, sender_name), contact_form_enabled = COALESCE($4, contact_form_enabled), updated_at = NOW() RETURNING *',
      [intro_text, recipient_emails ? JSON.stringify(recipient_emails) : null, sender_name, contact_form_enabled]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Create FAQ item
router.post('/', async (req, res) => {
  try {
    const { question, answer, category, order_index, is_published } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const result = await query(
      `INSERT INTO faq_items (question, answer, category, order_index, is_published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [question, answer, category || null, order_index || 0, is_published !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create FAQ error:', error);
    res.status(500).json({ error: 'Failed to create FAQ item' });
  }
});

// Update FAQ item
router.put('/:id', async (req, res) => {
  try {
    const { question, answer, category, order_index, is_published } = req.body;

    const result = await query(
      `UPDATE faq_items SET
        question = COALESCE($1, question),
        answer = COALESCE($2, answer),
        category = COALESCE($3, category),
        order_index = COALESCE($4, order_index),
        is_published = COALESCE($5, is_published),
        updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [question, answer, category, order_index, is_published, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'FAQ item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({ error: 'Failed to update FAQ item' });
  }
});

// Delete FAQ item
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM faq_items WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'FAQ item not found' });
    }

    res.json({ message: 'FAQ item deleted successfully' });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: 'Failed to delete FAQ item' });
  }
});

export default router;
