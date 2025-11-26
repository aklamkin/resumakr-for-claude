import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users with optional search/filter
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { search, role, auth_method, sort = 'created_at', order = 'desc' } = req.query;
    
    let sql = 'SELECT id, email, role, auth_method, created_at, updated_at FROM users WHERE 1=1';
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
    if (auth_method) {
      params.push(auth_method);
      sql += ` AND auth_method = $${params.length}`;
    }
    
    // Sorting
    const validSortFields = ['email', 'role', 'created_at', 'auth_method'];
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
      'SELECT id, email, role, auth_method, created_at, updated_at FROM users WHERE id = ',
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
    const { email, password, role = 'user', auth_method } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Validate auth_method
    if (!auth_method || !['email', 'google'].includes(auth_method)) {
      return res.status(400).json({ error: 'auth_method must be either "email" or "google"' });
    }
    
    // For email auth, password is required
    if (auth_method === 'email' && !password) {
      return res.status(400).json({ error: 'Password is required for email authentication' });
    }
    
    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = ', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    let hashedPassword = null;
    if (auth_method === 'email' && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    const result = await query(
      'INSERT INTO users (email, password, role, auth_method) VALUES (, , , ) RETURNING id, email, role, auth_method, created_at',
      [email, hashedPassword, role, auth_method]
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
    const { email, password, role, auth_method } = req.body;
    const userId = req.params.id;
    
    // Prevent admin from demoting themselves
    if (userId == req.user.id && role && role !== 'admin') {
      return res.status(403).json({ error: 'You cannot change your own admin role' });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (email) {
      params.push(email);
      updates.push(`email = $${params.length}`);
    }
    
    if (password && auth_method === 'email') {
      const hashedPassword = await bcrypt.hash(password, 10);
      params.push(hashedPassword);
      updates.push(`password = $${params.length}`);
    }
    
    if (role) {
      params.push(role);
      updates.push(`role = $${params.length}`);
    }
    
    if (auth_method) {
      if (!['email', 'google'].includes(auth_method)) {
        return res.status(400).json({ error: 'auth_method must be either "email" or "google"' });
      }
      params.push(auth_method);
      updates.push(`auth_method = $${params.length}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(userId);
    updates.push('updated_at = NOW()');
    
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id, email, role, auth_method, created_at, updated_at`;
    
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
      'DELETE FROM users WHERE id =  RETURNING id, email',
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
