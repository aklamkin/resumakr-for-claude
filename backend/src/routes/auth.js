import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import passport from 'passport';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { generateOAuthToken } from '../config/passport.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/schemas.js';
import { log } from '../utils/logger.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = express.Router();

// Token expiry time in milliseconds (1 hour)
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    // Data is already validated and sanitized by middleware
    const { email, password, full_name } = req.body;

    log.auth('Registration attempt', { email, requestId: req.requestId });

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      log.auth('Registration failed - user exists', { email, requestId: req.requestId });
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (email, password, full_name, role, is_subscribed) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, is_subscribed, created_at',
      [email, hashedPassword, full_name, 'user', false]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    log.auth('Registration successful', { userId: user.id, email, requestId: req.requestId });
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_subscribed: user.is_subscribed
      },
      token
    });
  } catch (error) {
    log.error('Registration failed', {
      error: error.message,
      code: error.code,
      requestId: req.requestId
    });
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    // Data is already validated by middleware
    const { email, password } = req.body;

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      log.auth('Login failed - user not found', { email, requestId: req.requestId });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];

    // Check if user has a password (not OAuth-only)
    if (!user.password) {
      log.auth('Login failed - OAuth only account', { email, requestId: req.requestId });
      return res.status(401).json({ error: 'Please use your OAuth provider to sign in' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      log.auth('Login failed - invalid password', { email, requestId: req.requestId });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    log.auth('Login successful', { userId: user.id, email, requestId: req.requestId });
    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, is_subscribed: user.is_subscribed, subscription_plan: user.subscription_plan, subscription_end_date: user.subscription_end_date }, token });
  } catch (error) {
    log.error('Login failed', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, full_name: req.user.full_name, role: req.user.role, is_subscribed: req.user.is_subscribed, subscription_plan: req.user.subscription_plan, subscription_end_date: req.user.subscription_end_date });
});

router.put('/me', authenticate, validate(updateProfileSchema), async (req, res) => {
  try {
    // Data is validated by middleware, only allowed fields pass through
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

    log.auth('Profile updated', { userId: req.user.id, fields, requestId: req.requestId });
    res.json(result.rows[0]);
  } catch (error) {
    log.error('Profile update failed', { userId: req.user.id, error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Update failed' });
  }
});

router.get('/check', authenticate, (req, res) => {
  res.json({ authenticated: true });
});

router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res) => {
  try {
    // Data is validated by middleware
    const { current_password, new_password } = req.body;

    // Get user's current password hash
    const result = await query('SELECT password, oauth_provider FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check if user has a password (not OAuth-only)
    if (!user.password) {
      log.auth('Password change failed - OAuth only account', { userId: req.user.id, requestId: req.requestId });
      return res.status(400).json({ error: 'Cannot change password for OAuth-only accounts. Please set a password first.' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(current_password, user.password);
    if (!validPassword) {
      log.auth('Password change failed - invalid current password', { userId: req.user.id, requestId: req.requestId });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);

    log.auth('Password changed successfully', { userId: req.user.id, requestId: req.requestId });
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    log.error('Password change failed', { userId: req.user.id, error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ====================================
// Password Reset Routes
// ====================================

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 * Always returns success to prevent email enumeration
 */
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;

    log.auth('Password reset requested', { email, requestId: req.requestId });

    // Find user by email
    const userResult = await query(
      'SELECT id, email, full_name, password, oauth_provider FROM users WHERE email = $1',
      [email]
    );

    // Always return success to prevent email enumeration
    const successMessage = 'If an account with that email exists, a password reset link has been sent.';

    if (userResult.rows.length === 0) {
      log.auth('Password reset - user not found', { email, requestId: req.requestId });
      return res.json({ message: successMessage });
    }

    const user = userResult.rows[0];

    // Check if user has a password (not OAuth-only)
    if (!user.password) {
      log.auth('Password reset - OAuth only account', { email, requestId: req.requestId });
      return res.json({ message: successMessage });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    // Invalidate any existing tokens for this user
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.id]);

    // Store new token
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    // Send email
    const emailResult = await sendPasswordResetEmail(email, token, user.full_name || 'there');

    if (!emailResult.success && !emailResult.devMode) {
      log.error('Failed to send password reset email', { email, error: emailResult.error, requestId: req.requestId });
      // Still return success to prevent enumeration
    } else {
      log.auth('Password reset email sent', { email, userId: user.id, requestId: req.requestId });
    }

    res.json({ message: successMessage });
  } catch (error) {
    log.error('Password reset request failed', { error: error.message, requestId: req.requestId });
    // Still return success message to prevent enumeration
    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  }
});

/**
 * GET /api/auth/verify-reset-token/:token
 * Verify if a password reset token is valid
 */
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 10) {
      return res.json({ valid: false, error: 'Invalid token format' });
    }

    const result = await query(
      `SELECT prt.*, u.email FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      log.auth('Invalid or expired reset token', { requestId: req.requestId });
      return res.json({ valid: false, error: 'Invalid or expired token' });
    }

    // Mask email for privacy (j***@example.com)
    const email = result.rows[0].email;
    const maskedEmail = email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => {
      return first + '*'.repeat(Math.min(middle.length, 5)) + domain;
    });

    res.json({ valid: true, email: maskedEmail });
  } catch (error) {
    log.error('Token verification failed', { error: error.message, requestId: req.requestId });
    res.json({ valid: false, error: 'Failed to verify token' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using a valid token
 */
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, new_password } = req.body;

    // Find valid token
    const tokenResult = await query(
      `SELECT prt.*, u.id as user_id, u.email FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      log.auth('Password reset failed - invalid token', { requestId: req.requestId });
      return res.status(400).json({ error: 'Invalid or expired token. Please request a new password reset.' });
    }

    const tokenData = tokenResult.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, tokenData.user_id]);

    // Mark token as used
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [tokenData.id]);

    // Invalidate all other tokens for this user
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND id != $2', [tokenData.user_id, tokenData.id]);

    log.auth('Password reset successful', { userId: tokenData.user_id, email: tokenData.email, requestId: req.requestId });

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    log.error('Password reset failed', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// ====================================
// OAuth Routes
// ====================================

// Google OAuth - Initiate
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'  // Force account selection to prevent caching
}));

// Google OAuth - Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed` }),
  (req, res) => {
    const token = generateOAuthToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }
);

// Microsoft OAuth - Initiate
router.get('/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));

// Microsoft OAuth - Callback
router.get(
  '/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed` }),
  (req, res) => {
    const token = generateOAuthToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }
);

// GitHub OAuth - Initiate
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// GitHub OAuth - Callback
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed` }),
  (req, res) => {
    const token = generateOAuthToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }
);

// Apple OAuth - Initiate
router.get('/apple', passport.authenticate('apple', { scope: ['name', 'email'] }));

// Apple OAuth - Callback
router.post(
  '/apple/callback',
  passport.authenticate('apple', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed` }),
  (req, res) => {
    const token = generateOAuthToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }
);

export default router;
