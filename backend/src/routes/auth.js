import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const result = await query(
      'INSERT INTO users (email, password, full_name, role, is_subscribed) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, is_subscribed, created_at',
      [email, hashedPassword, full_name || '', 'user', false]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, is_subscribed: user.is_subscribed }, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, is_subscribed: user.is_subscribed, subscription_plan: user.subscription_plan, subscription_end_date: user.subscription_end_date }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, full_name: req.user.full_name, role: req.user.role, is_subscribed: req.user.is_subscribed, subscription_plan: req.user.subscription_plan, subscription_end_date: req.user.subscription_end_date });
});

router.put('/me', authenticate, async (req, res) => {
  try {
    const allowedFields = ['full_name', 'is_subscribed', 'subscription_plan', 'subscription_end_date'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const result = await query(`UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING id, email, full_name, role, is_subscribed, subscription_plan, subscription_end_date`, [...values, req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.get('/check', authenticate, (req, res) => {
  res.json({ authenticated: true });
});

export default router;
