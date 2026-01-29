import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../config/database.js';
import { authenticateAdmin } from '../../middleware/adminAuth.js';
import { sendAdminInviteEmail, sendAdminRemovedEmail } from '../../services/email.js';

const router = express.Router();
router.use(authenticateAdmin);

// GET /api/admin/admin-users - List all admin users
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, oauth_provider, avatar_url, is_active, last_login, created_by, created_at, updated_at
       FROM admin_users ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// POST /api/admin/admin-users - Create new admin user
router.post('/', async (req, res) => {
  try {
    const { email, password, full_name, oauth_provider } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existing = await query('SELECT id FROM admin_users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Admin user with this email already exists' });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const result = await query(
      `INSERT INTO admin_users (email, password, full_name, oauth_provider, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, oauth_provider, is_active, created_at`,
      [email.toLowerCase().trim(), hashedPassword, full_name || '', oauth_provider || null, req.adminUser.id]
    );

    const newAdmin = result.rows[0];

    // Send invite email
    try {
      await sendAdminInviteEmail(newAdmin.email, req.adminUser.full_name || req.adminUser.email);
    } catch (emailError) {
      console.error('Failed to send admin invite email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json(newAdmin);
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// PUT /api/admin/admin-users/:id - Update admin user
router.put('/:id', async (req, res) => {
  try {
    const { full_name, is_active, password } = req.body;
    const adminId = req.params.id;

    const updates = [];
    const params = [];

    if (full_name !== undefined) {
      params.push(full_name);
      updates.push(`full_name = $${params.length}`);
    }

    if (is_active !== undefined) {
      // Prevent self-deactivation
      if (adminId === req.adminUser.id && !is_active) {
        return res.status(403).json({ error: 'You cannot deactivate your own account' });
      }
      params.push(is_active);
      updates.push(`is_active = $${params.length}`);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      params.push(hashedPassword);
      updates.push(`password = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(adminId);
    updates.push('updated_at = NOW()');

    const sql = `UPDATE admin_users SET ${updates.join(', ')} WHERE id = $${params.length}
                 RETURNING id, email, full_name, oauth_provider, avatar_url, is_active, last_login, created_at, updated_at`;
    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({ error: 'Failed to update admin user' });
  }
});

// DELETE /api/admin/admin-users/:id - Remove admin user
router.delete('/:id', async (req, res) => {
  try {
    const adminId = req.params.id;

    if (adminId === req.adminUser.id) {
      return res.status(403).json({ error: 'You cannot delete your own account' });
    }

    const result = await query(
      'DELETE FROM admin_users WHERE id = $1 RETURNING id, email, full_name',
      [adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const deletedAdmin = result.rows[0];

    // Send removal email
    try {
      await sendAdminRemovedEmail(deletedAdmin.email, req.adminUser.full_name || req.adminUser.email);
    } catch (emailError) {
      console.error('Failed to send admin removal email:', emailError);
    }

    res.json({ message: 'Admin user removed', user: deletedAdmin });
  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({ error: 'Failed to delete admin user' });
  }
});

export default router;
