import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if error is a unique constraint violation
const isUniqueViolation = (error) => {
  return error.code === '23505';
};

router.get('/', authenticate, async (req, res) => {
  try {
    const { created_by } = req.query;
    let sql = 'SELECT * FROM custom_prompts WHERE 1=1';
    const params = [];
    
    if (created_by) {
      params.push(created_by);
      sql += ` AND created_by = $${params.length}`;
    }
    
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get prompts error:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, prompt_text, is_active, created_by } = req.body;
    
    if (!name || !prompt_text) {
      return res.status(400).json({ error: 'name and prompt_text are required' });
    }
    
    const result = await query(
      'INSERT INTO custom_prompts (name, prompt_text, is_active, created_by) VALUES (, , , ) RETURNING *',
      [name, prompt_text, is_active !== false, created_by || req.user.email]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create prompt error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A prompt with this name already exists. Prompt names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to create prompt', details: error.message });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, prompt_text, is_active } = req.body;
    
    const result = await query(
      'UPDATE custom_prompts SET name = COALESCE(, name), prompt_text = COALESCE(, prompt_text), is_active = COALESCE(, is_active), updated_at = NOW() WHERE id =  RETURNING *',
      [name, prompt_text, is_active, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update prompt error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A prompt with this name already exists. Prompt names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to update prompt', details: error.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM custom_prompts WHERE id =  RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    console.error('Delete prompt error:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

export default router;
