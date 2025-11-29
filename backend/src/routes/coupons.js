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
    const { code, discount_type, discount_value, applicable_plans, max_uses, expires_at, description, is_active } = req.body;
    
    if (!code || !discount_type || discount_value === undefined) {
      return res.status(400).json({ error: 'code, discount_type, and discount_value are required' });
    }
    
    const result = await query(
      `INSERT INTO coupon_codes (code, discount_type, discount_value, applicable_plans, max_uses, expires_at, description, is_active)
       VALUES (, , , , , , , )
       RETURNING *`,
      [
        code,
        discount_type,
        discount_value,
        JSON.stringify(applicable_plans || []),
        max_uses || null,
        expires_at || null,
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
    const validColumns = ['code', 'discount_type', 'discount_value', 'applicable_plans', 'max_uses', 'expires_at', 'description', 'is_active'];
    const fields = Object.keys(req.body).filter(key => validColumns.includes(key));
    const values = fields.map(field => {
      const value = req.body[field];
      // Handle date fields
      if (field === 'expires_at' && value) {
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
    const result = await query('DELETE FROM coupon_codes WHERE id =  RETURNING *', [id]);
    
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
