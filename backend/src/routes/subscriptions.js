import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/plans', async (req, res) => {
  try {
    const result = await query('SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

router.post('/activate', authenticate, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const planResult = await query('SELECT * FROM subscription_plans WHERE plan_id = $1 AND is_active = true', [plan_id]);
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = planResult.rows[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);
    const userResult = await query('UPDATE users SET is_subscribed = true, subscription_plan = $1, subscription_end_date = $2, updated_at = NOW() WHERE id = $3 RETURNING id, email, is_subscribed, subscription_plan, subscription_end_date', [plan_id, endDate.toISOString(), req.user.id]);
    res.json({ message: 'Subscription activated successfully', user: userResult.rows[0] });
  } catch (error) {
    console.error('Activate subscription error:', error);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

export default router;
