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
    const result = await query('SELECT * FROM marketing_campaigns ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { campaign_name, campaign_type, target_plan, discount_percentage, discount_amount, free_trial_duration, is_active } = req.body;
    
    if (!campaign_name || !campaign_type) {
      return res.status(400).json({ error: 'campaign_name and campaign_type are required' });
    }
    
    const result = await query(
      `INSERT INTO marketing_campaigns (campaign_name, campaign_type, target_plan, discount_percentage, discount_amount, free_trial_duration, is_active)
       VALUES (, , , , , , )
       RETURNING *`,
      [
        campaign_name,
        campaign_type,
        target_plan || null,
        discount_percentage || null,
        discount_amount || null,
        free_trial_duration || null,
        is_active !== false
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create campaign error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A campaign with this name already exists. Campaign names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only allow valid columns that exist in the database
    const validColumns = ['campaign_name', 'campaign_type', 'target_plan', 'discount_percentage', 'discount_amount', 'free_trial_duration', 'is_active'];
    const fields = Object.keys(req.body).filter(key => validColumns.includes(key));
    const values = fields.map(field => req.body[field]);
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    
    const result = await query(
      `UPDATE marketing_campaigns SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update campaign error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A campaign with this name already exists. Campaign names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM marketing_campaigns WHERE id =  RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
