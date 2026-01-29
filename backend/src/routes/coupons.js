import express from 'express';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { validateCouponSchema } from '../validators/schemas.js';

const router = express.Router();

// Validate coupon code
router.post('/validate', validate(validateCouponSchema), async (req, res) => {
  try {
    const { coupon_code, plan_id } = req.body;

    // Find the coupon
    const result = await query(
      'SELECT * FROM coupon_codes WHERE code = $1',
      [coupon_code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ valid: false, error: 'Invalid coupon code' });
    }

    const coupon = result.rows[0];

    // Check if coupon is active
    if (!coupon.is_active) {
      return res.status(200).json({ valid: false, error: 'This coupon is no longer active' });
    }

    // Check if coupon has started (valid_from)
    if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) {
      return res.status(200).json({ valid: false, error: 'This coupon is not yet valid' });
    }

    // Check if coupon has expired (valid_until)
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return res.status(200).json({ valid: false, error: 'This coupon has expired' });
    }

    // Check if coupon has reached max uses
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return res.status(200).json({ valid: false, error: 'This coupon has reached its usage limit' });
    }

    // Check if coupon is applicable to the selected plan
    if (plan_id && coupon.applicable_plans && Array.isArray(coupon.applicable_plans) && coupon.applicable_plans.length > 0) {
      if (!coupon.applicable_plans.includes(plan_id)) {
        return res.status(200).json({ valid: false, error: 'This coupon is not applicable to the selected plan' });
      }
    }

    // Coupon is valid
    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: parseFloat(coupon.discount_value),
        description: coupon.description
      }
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ valid: false, error: 'Failed to validate coupon' });
  }
});

export default router;
