import express from 'express';
import { query } from '../../config/database.js';
import { authenticateAdmin } from '../../middleware/adminAuth.js';
import { clearCache, FACTORY_DEFAULTS } from '../../utils/promptLoader.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// Get all system prompts (for admin page)
router.get('/system', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM custom_prompts WHERE is_system = true ORDER BY prompt_type ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get system prompts error:', error);
    res.status(500).json({ error: 'Failed to fetch system prompts' });
  }
});

// Update a system prompt by prompt_type
router.put('/system/:prompt_type', async (req, res) => {
  try {
    const { prompt_type } = req.params;
    const { system_prompt, prompt_text, temperature, max_tokens } = req.body;

    const result = await query(
      `UPDATE custom_prompts
       SET system_prompt = COALESCE($1, system_prompt),
           prompt_text = COALESCE($2, prompt_text),
           temperature = COALESCE($3, temperature),
           max_tokens = COALESCE($4, max_tokens),
           updated_at = NOW()
       WHERE prompt_type = $5 AND is_system = true
       RETURNING *`,
      [system_prompt, prompt_text, temperature, max_tokens, prompt_type]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `System prompt '${prompt_type}' not found` });
    }

    // Clear prompt cache so changes take effect immediately
    clearCache();

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update system prompt error:', error);
    res.status(500).json({ error: 'Failed to update system prompt' });
  }
});

// Reset a system prompt to factory default
router.post('/system/:prompt_type/reset', async (req, res) => {
  try {
    const { prompt_type } = req.params;
    const factory = FACTORY_DEFAULTS[prompt_type];

    if (!factory) {
      return res.status(404).json({ error: `No factory default for prompt type '${prompt_type}'` });
    }

    const result = await query(
      `UPDATE custom_prompts
       SET system_prompt = $1,
           prompt_text = $2,
           temperature = $3,
           max_tokens = $4,
           updated_at = NOW()
       WHERE prompt_type = $5 AND is_system = true
       RETURNING *`,
      [factory.system_prompt, factory.prompt_text, factory.temperature, factory.max_tokens, prompt_type]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `System prompt '${prompt_type}' not found in database` });
    }

    // Clear prompt cache
    clearCache();

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Reset system prompt error:', error);
    res.status(500).json({ error: 'Failed to reset system prompt' });
  }
});

// Create new prompt
router.post('/', async (req, res) => {
  try {
    const { name, prompt_text, is_active, prompt_type, provider_id } = req.body;

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
      [name, prompt_text, is_active !== false, req.adminUser.email, prompt_type, provider_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create prompt error:', error);
    if (error.code === '23505') {
      if (error.constraint === 'unique_active_prompt_per_type') {
        return res.status(409).json({ error: 'Only one prompt can be active per type. Please deactivate the existing active prompt first.' });
      }
      return res.status(409).json({ error: 'A prompt with this name already exists. Prompt names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to create prompt', details: error.message });
  }
});

// Update prompt
router.put('/:id', async (req, res) => {
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
    if (error.code === '23505') {
      if (error.constraint === 'unique_active_prompt_per_type') {
        return res.status(409).json({ error: 'Only one prompt can be active per type. Please deactivate the existing active prompt first.' });
      }
      return res.status(409).json({ error: 'A prompt with this name already exists. Prompt names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to update prompt', details: error.message });
  }
});

// Delete prompt
router.delete('/:id', async (req, res) => {
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
