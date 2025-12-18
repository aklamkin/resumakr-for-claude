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
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
    const result = await query('DELETE FROM subscription_plans WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// Activate subscription for current user
router.post('/activate', authenticate, async (req, res) => {
  try {
    const { plan_id, coupon_code, campaign_id, final_price } = req.body;
    const userId = req.user.id;

    console.log('[SUBSCRIPTION ACTIVATE] Starting activation');
    console.log('[SUBSCRIPTION ACTIVATE] User ID:', userId);
    console.log('[SUBSCRIPTION ACTIVATE] Plan ID:', plan_id);
    console.log('[SUBSCRIPTION ACTIVATE] Coupon code:', coupon_code);
    console.log('[SUBSCRIPTION ACTIVATE] Campaign ID:', campaign_id);
    console.log('[SUBSCRIPTION ACTIVATE] Final price:', final_price);
    console.log('[SUBSCRIPTION ACTIVATE] Current user state:', { is_subscribed: req.user.is_subscribed, subscription_plan: req.user.subscription_plan });

    if (!plan_id) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    // Fetch the plan details
    const planResult = await query(
      'SELECT * FROM subscription_plans WHERE plan_id = $1 AND is_active = true',
      [plan_id]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }

    const plan = planResult.rows[0];
    console.log('[SUBSCRIPTION ACTIVATE] Found plan:', { name: plan.name, period: plan.period, duration: plan.duration });

    // Calculate subscription end date based on plan duration
    const endDate = new Date();
    if (plan.period === 'day') {
      endDate.setDate(endDate.getDate() + plan.duration);
    } else if (plan.period === 'week') {
      endDate.setDate(endDate.getDate() + (plan.duration * 7));
    } else if (plan.period === 'month') {
      endDate.setMonth(endDate.getMonth() + plan.duration);
    } else if (plan.period === 'year') {
      endDate.setFullYear(endDate.getFullYear() + plan.duration);
    }

    console.log('[SUBSCRIPTION ACTIVATE] Calculated end date:', endDate);
    console.log('[SUBSCRIPTION ACTIVATE] About to execute UPDATE query with params:', {
      plan_id,
      endDate: endDate.toISOString(),
      userId
    });

    // Update user subscription
    const updateResult = await query(
      `UPDATE users
       SET is_subscribed = true,
           subscription_plan = $1,
           subscription_end_date = $2,
           coupon_code_used = $3,
           campaign_id = $4,
           subscription_price = $5,
           subscription_started_at = NOW(),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, email, full_name, is_subscribed, subscription_plan, subscription_end_date, coupon_code_used, campaign_id, subscription_price, subscription_started_at`,
      [plan_id, endDate, coupon_code || null, campaign_id || null, final_price || plan.price, userId]
    );

    console.log('[SUBSCRIPTION ACTIVATE] UPDATE query completed');
    console.log('[SUBSCRIPTION ACTIVATE] Rows affected:', updateResult.rows.length);
    console.log('[SUBSCRIPTION ACTIVATE] Returned data:', updateResult.rows[0]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[SUBSCRIPTION ACTIVATE] Returning response to client');
    res.json({
      message: 'Subscription activated successfully',
      user: updateResult.rows[0],
      plan: plan
    });
  } catch (error) {
    console.error('Activate subscription error:', error);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

export default router;
