import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const isUniqueViolation = (error) => {
  return error.code === '23505';
};

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

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, provider_type, api_endpoint, model_name, config } = req.body;
    if (!name || !provider_type) {
      return res.status(400).json({ error: 'name and provider_type are required' });
    }
    const result = await query(
      'INSERT INTO ai_providers (name, provider_type, api_endpoint, model_name, config) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, provider_type, api_endpoint, model_name, config || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create provider error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A provider with this name already exists.' });
    }
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, provider_type, api_endpoint, model_name, config, is_active } = req.body;
    const result = await query(
      'UPDATE ai_providers SET name = COALESCE($1, name), provider_type = COALESCE($2, provider_type), api_endpoint = COALESCE($3, api_endpoint), model_name = COALESCE($4, model_name), config = COALESCE($5, config), is_active = COALESCE($6, is_active), updated_at = NOW() WHERE id = $7 RETURNING *',
      [name, provider_type, api_endpoint, model_name, config, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update provider error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A provider with this name already exists.' });
    }
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
