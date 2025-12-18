import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getAIClient, callAI } from './ai.js';

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
    const { name, provider_type, api_endpoint, api_url, model_name, config, api_key, is_default } = req.body;
    if (!name || !provider_type) {
      return res.status(400).json({ error: 'name and provider_type are required' });
    }

    if (!api_key) {
      return res.status(400).json({ error: 'api_key is required' });
    }

    // Build config object with api_key if provided
    const configObj = config || {};
    if (api_key) {
      configObj.api_key = api_key;
    }

    // Use api_url if provided, otherwise api_endpoint
    const endpoint = api_url || api_endpoint;

    // If setting this provider as default, unset all other defaults atomically
    if (is_default === true) {
      await query('UPDATE ai_providers SET is_default = false');
    }

    const result = await query(
      'INSERT INTO ai_providers (name, provider_type, api_key, api_endpoint, model_name, config, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, provider_type, api_key, endpoint, model_name, configObj, is_default || false]
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
    const { name, provider_type, api_endpoint, api_url, model_name, config, is_active, is_default, api_key } = req.body;

    // Get existing provider to merge config
    const existing = await query('SELECT * FROM ai_providers WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Build config object, merging with existing config
    let configObj = existing.rows[0].config || {};
    if (config) {
      configObj = { ...configObj, ...config };
    }
    // Update api_key in config if provided
    if (api_key) {
      configObj.api_key = api_key;
    }

    // Use api_url if provided, otherwise api_endpoint
    const endpoint = api_url || api_endpoint;

    // If setting this provider as default, unset all other defaults atomically
    if (is_default === true) {
      await query('UPDATE ai_providers SET is_default = false WHERE id != $1', [req.params.id]);
    }

    const result = await query(
      'UPDATE ai_providers SET name = COALESCE($1, name), provider_type = COALESCE($2, provider_type), api_key = COALESCE($3, api_key), api_endpoint = COALESCE($4, api_endpoint), model_name = COALESCE($5, model_name), config = COALESCE($6, config), is_active = COALESCE($7, is_active), is_default = COALESCE($8, is_default), updated_at = NOW() WHERE id = $9 RETURNING *',
      [name, provider_type, api_key, endpoint, model_name, configObj, is_active, is_default, req.params.id]
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

router.post('/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const { provider_type, api_key, model_name, api_endpoint, api_url, config } = req.body;

    if (!provider_type) {
      return res.status(400).json({ error: 'provider_type is required' });
    }

    // Build config object with api_key if provided
    const configObj = config || {};
    if (api_key) {
      configObj.api_key = api_key;
    }

    // Create a temporary provider object for testing
    const testProvider = {
      provider_type,
      api_key: api_key || configObj.api_key,
      model_name: model_name || 'gpt-4o-mini',
      api_endpoint: api_url || api_endpoint,
      api_url: api_url,
      config: configObj
    };

    if (!testProvider.api_key && !configObj.api_key) {
      return res.status(400).json({ error: 'API key is required for testing' });
    }

    // Test the provider with a simple prompt
    const aiClient = getAIClient(testProvider);
    const modelToUse = testProvider.model_name;
    const testPrompt = "Say 'hello' in one word.";
    const systemPrompt = "You are a test assistant.";

    const result = await callAI(aiClient, testPrompt, systemPrompt, modelToUse, {
      temperature: 0.5,
      max_tokens: 50
    });

    res.json({
      success: true,
      message: 'Provider configuration is valid',
      test_response: result.content
    });
  } catch (error) {
    console.error('Provider test error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Provider test failed'
    });
  }
});

export default router;
