import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users with optional search/filter
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { search, role, auth_method, sort = 'created_at', order = 'desc' } = req.query;

    let sql = `SELECT
      id, email, full_name, role,
      is_subscribed, subscription_plan, subscription_end_date, subscription_price, subscription_started_at,
      coupon_code_used, campaign_id,
      oauth_provider, oauth_id, avatar_url,
      last_login, created_at, updated_at,
      CASE WHEN oauth_provider IS NULL THEN 'email' ELSE oauth_provider END as auth_method
    FROM users WHERE 1=1`;
    const params = [];

    // Search by email
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND email ILIKE $${params.length}`;
    }

    // Filter by role
    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }

    // Filter by auth method
    if (auth_method && auth_method !== 'all') {
      if (auth_method === 'email') {
        sql += ` AND oauth_provider IS NULL`;
      } else {
        params.push(auth_method);
        sql += ` AND oauth_provider = $${params.length}`;
      }
    }

    // Sorting
    const validSortFields = ['email', 'role', 'created_at', 'full_name'];
    const validOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get specific user
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT
        id, email, full_name, role,
        is_subscribed, subscription_plan, subscription_end_date, subscription_price, subscription_started_at,
        coupon_code_used, campaign_id,
        oauth_provider, oauth_id, avatar_url,
        last_login, created_at, updated_at,
        CASE WHEN oauth_provider IS NULL THEN 'email' ELSE oauth_provider END as auth_method
      FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, full_name, role = 'user' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, created_at',
      [email, hashedPassword, full_name, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, full_name, role, is_subscribed, subscription_plan, subscription_end_date, subscription_price } = req.body;
    const userId = req.params.id;

    // Prevent admin from demoting themselves
    if (userId == req.user.id && role && role !== 'admin') {
      return res.status(403).json({ error: 'You cannot change your own admin role' });
    }

    // Validate subscription fields - all three must be set together
    const hasSubscription = is_subscribed === true;
    const hasPlan = subscription_plan && subscription_plan !== null;
    const hasEndDate = subscription_end_date && subscription_end_date !== null;

    // Check if any subscription fields are being updated
    const isUpdatingSubscription = is_subscribed !== undefined || subscription_plan !== undefined || subscription_end_date !== undefined;

    if (isUpdatingSubscription) {
      if (hasSubscription && (!hasPlan || !hasEndDate)) {
        return res.status(400).json({
          error: 'When marking a subscription as active, you must also provide the subscription plan and expiration date'
        });
      }

      if ((hasPlan || hasEndDate) && !hasSubscription) {
        return res.status(400).json({
          error: 'When setting a subscription plan or expiration date, the subscription must be marked as active'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (email) {
      params.push(email);
      updates.push(`email = $${params.length}`);
    }

    if (full_name !== undefined) {
      params.push(full_name);
      updates.push(`full_name = $${params.length}`);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      params.push(hashedPassword);
      updates.push(`password = $${params.length}`);
    }

    if (role) {
      params.push(role);
      updates.push(`role = $${params.length}`);
    }

    if (is_subscribed !== undefined) {
      params.push(is_subscribed);
      updates.push(`is_subscribed = $${params.length}`);
    }

    if (subscription_plan !== undefined) {
      params.push(subscription_plan);
      updates.push(`subscription_plan = $${params.length}`);
    }

    if (subscription_end_date !== undefined) {
      params.push(subscription_end_date);
      updates.push(`subscription_end_date = $${params.length}`);
    }

    if (subscription_price !== undefined) {
      params.push(subscription_price);
      updates.push(`subscription_price = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(userId);
    updates.push('updated_at = NOW()');

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING
      id, email, full_name, role,
      is_subscribed, subscription_plan, subscription_end_date, subscription_price, subscription_started_at,
      coupon_code_used, campaign_id,
      oauth_provider, oauth_id, avatar_url,
      last_login, created_at, updated_at`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId == req.user.id) {
      return res.status(403).json({ error: 'You cannot delete your own account' });
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
