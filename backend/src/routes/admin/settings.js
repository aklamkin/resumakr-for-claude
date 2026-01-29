import express from 'express';
import { query } from '../../config/database.js';
import { authenticateAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// Get all settings
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM app_settings ORDER BY setting_key ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get specific setting by key
router.get('/:key', async (req, res) => {
  try {
    const result = await query('SELECT * FROM app_settings WHERE setting_key = $1', [req.params.key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update setting
router.put('/:key', async (req, res) => {
  try {
    const { setting_value, setting_type } = req.body;
    const result = await query(
      'UPDATE app_settings SET setting_value = $1, setting_type = COALESCE($2, setting_type), updated_at = NOW() WHERE setting_key = $3 RETURNING *',
      [setting_value, setting_type, req.params.key]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;
