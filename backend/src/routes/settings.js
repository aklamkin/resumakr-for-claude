import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public frontend settings - no auth required
// Only exposes settings the frontend needs, not all app_settings
const PUBLIC_SETTING_KEYS = [
  'notifications_enabled',
  'notification_duration',
  'default_theme',
  'landing_animations_enabled',
  'maintenance_mode',
];

router.get('/public', async (req, res) => {
  try {
    const result = await query(
      'SELECT setting_key, setting_value, setting_type FROM app_settings WHERE setting_key = ANY($1)',
      [PUBLIC_SETTING_KEYS]
    );
    // Return as key-value object for easy consumption
    const settings = {};
    for (const row of result.rows) {
      if (row.setting_type === 'boolean') {
        settings[row.setting_key] = row.setting_value === 'true';
      } else if (row.setting_type === 'number') {
        settings[row.setting_key] = parseInt(row.setting_value, 10);
      } else {
        settings[row.setting_key] = row.setting_value;
      }
    }
    res.json(settings);
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get specific setting by key
router.get('/:key', authenticate, async (req, res) => {
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

export default router;
