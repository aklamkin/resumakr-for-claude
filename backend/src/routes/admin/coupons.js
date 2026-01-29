import express from 'express';
import { z } from 'zod';
import { query } from '../../config/database.js';
import { authenticateAdmin } from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../validators/schemas.js';

const router = express.Router();

const isUniqueViolation = (error) => {
  return error.code === '23505';
};

// Coupon creation schema
const createCouponSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50).transform(val => val.toUpperCase()),
  discount_type: z.enum(['percentage', 'fixed'], { required_error: 'Discount type is required' }),
  discount_value: z.number().positive('Discount value must be positive'),
  applicable_plans: z.array(z.number().int().positive()).optional().default([]),
  max_uses: z.number().int().positive().optional().nullable(),
  valid_until: z.string().datetime().optional().nullable(),
  valid_from: z.string().datetime().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional().default(true)
});

const updateCouponSchema = createCouponSchema.partial();

// All routes require admin authentication
router.use(authenticateAdmin);

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM coupon_codes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

router.post('/', validate(createCouponSchema), async (req, res) => {
  try {
    const { code, discount_type, discount_value, applicable_plans, max_uses, valid_until, description, is_active } = req.body;

    const result = await query(
      `INSERT INTO coupon_codes (code, discount_type, discount_value, applicable_plans, max_uses, valid_until, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        code,
        discount_type,
        discount_value,
        JSON.stringify(applicable_plans),
        max_uses || null,
        valid_until || null,
        description || null,
        is_active
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

router.put('/:id', validate(idParamSchema, 'params'), validate(updateCouponSchema), async (req, res) => {
  try {
    const { id } = req.params;

    const validColumns = ['code', 'discount_type', 'discount_value', 'applicable_plans', 'max_uses', 'valid_until', 'valid_from', 'description', 'is_active'];
    const fields = Object.keys(req.body).filter(key => validColumns.includes(key));
    const values = fields.map(field => {
      const value = req.body[field];
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

router.delete('/:id', validate(idParamSchema, 'params'), async (req, res) => {
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

export default router;
