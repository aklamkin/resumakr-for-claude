import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let sql = 'SELECT * FROM ai_providers';
    if (req.user.role !== 'admin') {
      sql += ' WHERE is_active = true';
    }
    sql += ' ORDER BY is_default DESC, name ASC';
    const result = await query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, provider_type, api_key, custom_prompt, is_default, is_active } = req.body;
    if (!name || !provider_type || !api_key) {
      return res.status(400).json({ error: 'name, provider_type, and api_key are required' });
    }
    if (is_default) {
      await query('UPDATE ai_providers SET is_default = false');
    }
    const result = await query('INSERT INTO ai_providers (name, provider_type, api_key, custom_prompt, is_default, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [name, provider_type, api_key, custom_prompt, is_default || false, is_active !== false]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create provider error:', error);
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, provider_type, api_key, custom_prompt, is_default, is_active } = req.body;
    if (is_default) {
      await query('UPDATE ai_providers SET is_default = false WHERE id != $1', [req.params.id]);
    }
    const result = await query('UPDATE ai_providers SET name = COALESCE($1, name), provider_type = COALESCE($2, provider_type), api_key = COALESCE($3, api_key), custom_prompt = COALESCE($4, custom_prompt), is_default = COALESCE($5, is_default), is_active = COALESCE($6, is_active), updated_at = NOW() WHERE id = $7 RETURNING *', [name, provider_type, api_key, custom_prompt, is_default, is_active, req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update provider error:', error);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM ai_providers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    res.json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});

export default router;
