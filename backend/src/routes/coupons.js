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
    const result = await query('SELECT * FROM coupon_codes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { code, discount_type, discount_value, applicable_plans, max_uses, valid_until, description, is_active } = req.body;

    if (!code || !discount_type || discount_value === undefined) {
      return res.status(400).json({ error: 'code, discount_type, and discount_value are required' });
    }

    const result = await query(
      `INSERT INTO coupon_codes (code, discount_type, discount_value, applicable_plans, max_uses, valid_until, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        code,
        discount_type,
        discount_value,
        JSON.stringify(applicable_plans || []),
        max_uses || null,
        valid_until || null,
        description || null,
        is_active !== false
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create coupon error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A coupon with this code already exists. Coupon codes must be unique.' });
    }
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Only allow valid columns that exist in the database
    const validColumns = ['code', 'discount_type', 'discount_value', 'applicable_plans', 'max_uses', 'valid_until', 'valid_from', 'description', 'is_active'];
    const fields = Object.keys(req.body).filter(key => validColumns.includes(key));
    const values = fields.map(field => {
      const value = req.body[field];
      // Handle date fields
      if ((field === 'valid_until' || field === 'valid_from') && value) {
        return value;
      }
      return typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');

    const result = await query(
      `UPDATE coupon_codes SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update coupon error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A coupon with this code already exists. Coupon codes must be unique.' });
    }
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM coupon_codes WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// Validate coupon code
router.post('/validate', async (req, res) => {
  try {
    const { coupon_code, plan_id } = req.body;

    if (!coupon_code) {
      return res.status(400).json({ valid: false, error: 'Coupon code is required' });
    }

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
