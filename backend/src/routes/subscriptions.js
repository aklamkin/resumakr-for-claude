import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if error is a unique constraint violation
const isUniqueViolation = (error) => {
  return error.code === '23505';
};

router.get('/plans', async (req, res) => {
  try {
    // Return ALL plans (both active and inactive) for admins to manage
    const result = await query('SELECT * FROM subscription_plans ORDER BY price ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

router.post('/plans', authenticate, requireAdmin, async (req, res) => {
  try {
    const { plan_id, name, price, period, duration, features, is_popular, is_active } = req.body;
    
    const result = await query(
      `INSERT INTO subscription_plans (plan_id, name, price, period, duration, features, is_popular, is_active)
       VALUES (, , , , , , , )
       RETURNING *`,
      [plan_id, name, price, period, duration, JSON.stringify(features || []), is_popular || false, is_active !== false]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create plan error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A plan with this name already exists. Plan names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

router.put('/plans/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only allow valid columns that exist in the database
    const validColumns = ['plan_id', 'name', 'price', 'period', 'duration', 'features', 'is_popular', 'is_active'];
    const fields = Object.keys(req.body).filter(key => validColumns.includes(key));
    const values = fields.map(field => {
      const value = req.body[field];
      return typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    
    const result = await query(
      `UPDATE subscription_plans SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update plan error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A plan with this name already exists. Plan names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

router.delete('/plans/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM subscription_plans WHERE id =  RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

export default router;
