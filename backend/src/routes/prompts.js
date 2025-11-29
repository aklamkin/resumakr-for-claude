import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if error is a unique constraint violation
const isUniqueViolation = (error) => {
  return error.code === '23505';
};

// Get all prompts with optional filtering by prompt_type
router.get('/', authenticate, async (req, res) => {
  try {
    const { created_by, prompt_type } = req.query;
    let sql = 'SELECT cp.*, ap.name as provider_name, ap.provider_type FROM custom_prompts cp LEFT JOIN ai_providers ap ON cp.provider_id = ap.id WHERE 1=1';
    const params = [];

    if (created_by) {
      params.push(created_by);
      sql += ` AND cp.created_by = $${params.length}`;
    }

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

// Create new prompt
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, prompt_text, is_active, created_by, prompt_type, provider_id } = req.body;

    if (!name || !prompt_text) {
      return res.status(400).json({ error: 'name and prompt_text are required' });
    }

    // If setting this as active and prompt_type is specified, deactivate other prompts of same type
    if (is_active === true && prompt_type) {
      await query(
        'UPDATE custom_prompts SET is_active = false WHERE prompt_type = $1 AND is_active = true',
        [prompt_type]
      );
    }

    const result = await query(
      'INSERT INTO custom_prompts (name, prompt_text, is_active, created_by, prompt_type, provider_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, prompt_text, is_active !== false, created_by || req.user.email, prompt_type, provider_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create prompt error:', error);
    if (isUniqueViolation(error)) {
      if (error.constraint === 'unique_active_prompt_per_type') {
        return res.status(409).json({ error: 'Only one prompt can be active per type. Please deactivate the existing active prompt first.' });
      }
      return res.status(409).json({ error: 'A prompt with this name already exists. Prompt names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to create prompt', details: error.message });
  }
});

// Update prompt
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, prompt_text, is_active, prompt_type, provider_id } = req.body;

    // Get current prompt to check its type
    const currentPrompt = await query('SELECT prompt_type FROM custom_prompts WHERE id = $1', [req.params.id]);
    if (currentPrompt.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const effectivePromptType = prompt_type || currentPrompt.rows[0].prompt_type;

    // If setting this as active and prompt_type is specified, deactivate other prompts of same type
    if (is_active === true && effectivePromptType) {
      await query(
        'UPDATE custom_prompts SET is_active = false WHERE prompt_type = $1 AND is_active = true AND id != $2',
        [effectivePromptType, req.params.id]
      );
    }

    const result = await query(
      'UPDATE custom_prompts SET name = COALESCE($1, name), prompt_text = COALESCE($2, prompt_text), is_active = COALESCE($3, is_active), prompt_type = COALESCE($4, prompt_type), provider_id = COALESCE($5, provider_id), updated_at = NOW() WHERE id = $6 RETURNING *',
      [name, prompt_text, is_active, prompt_type, provider_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update prompt error:', error);
    if (isUniqueViolation(error)) {
      if (error.constraint === 'unique_active_prompt_per_type') {
        return res.status(409).json({ error: 'Only one prompt can be active per type. Please deactivate the existing active prompt first.' });
      }
      return res.status(409).json({ error: 'A prompt with this name already exists. Prompt names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to update prompt', details: error.message });
  }
});

// Delete prompt
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM custom_prompts WHERE id = $1 RETURNING id', [req.params.id]);
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
