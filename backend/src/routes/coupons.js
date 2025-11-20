import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/validate', async (req, res) => {
  try {
    const { coupon_code, plan_id } = req.body;
    if (!coupon_code) {
      return res.status(400).json({ valid: false, error: 'Coupon code required' });
    }
    const result = await query('SELECT * FROM coupon_codes WHERE UPPER(code) = UPPER($1)', [coupon_code]);
    if (result.rows.length === 0) {
      return res.json({ valid: false, error: 'Invalid coupon code' });
    }
    const coupon = result.rows[0];
    if (!coupon.is_active) {
      return res.json({ valid: false, error: 'Coupon is no longer active' });
    }
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.json({ valid: false, error: 'Coupon not yet valid' });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.json({ valid: false, error: 'Coupon has expired' });
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return res.json({ valid: false, error: 'Coupon usage limit reached' });
    }
    const applicablePlans = coupon.applicable_plans || [];
    if (!applicablePlans.includes('all') && !applicablePlans.includes(plan_id)) {
      return res.json({ valid: false, error: 'Coupon not valid for this plan' });
    }
    res.json({ valid: true, coupon: { code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value, description: coupon.description } });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

router.post('/apply', authenticate, async (req, res) => {
  try {
    const { coupon_code } = req.body;
    const result = await query('UPDATE coupon_codes SET current_uses = current_uses + 1 WHERE UPPER(code) = UPPER($1) RETURNING *', [coupon_code]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ message: 'Coupon applied successfully' });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ error: 'Failed to apply coupon' });
  }
});

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM coupon_codes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('List coupons error:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

export default router;
