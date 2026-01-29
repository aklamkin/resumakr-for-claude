import express from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { query } from '../../config/database.js';
import { authenticateAdmin } from '../../middleware/adminAuth.js';
import { generateAdminToken } from '../../config/passportAdmin.js';

const router = express.Router();

// POST /api/admin/auth/login - Email/password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT * FROM admin_users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];

    if (!admin.password) {
      return res.status(401).json({ error: 'This account uses Google authentication. Please sign in with Google.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [admin.id]);

    const token = generateAdminToken(admin);
    res.json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        avatar_url: admin.avatar_url,
        oauth_provider: admin.oauth_provider
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/admin/auth/me - Current admin user
router.get('/me', authenticateAdmin, async (req, res) => {
  res.json(req.adminUser);
});

// GET /api/admin/auth/google - Initiate Google OAuth for admin
router.get('/google', passport.authenticate('google-admin', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
  session: false
}));

// GET /api/admin/auth/google/callback - Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google-admin', { session: false, failureRedirect: '/config/login?error=not_admin' }),
  (req, res) => {
    if (!req.user) {
      return res.redirect('/config/login?error=auth_failed');
    }

    const token = generateAdminToken(req.user);
    const configUrl = process.env.CONFIG_APP_URL || 'http://localhost:5174';
    res.redirect(`${configUrl}/config/auth/callback?token=${token}`);
  }
);

export default router;
