import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    if (!decoded.adminId || !decoded.isAdmin) {
      return res.status(401).json({ error: 'Invalid admin token' });
    }

    const result = await query(
      'SELECT id, email, full_name, oauth_provider, avatar_url, is_active, last_login, created_at FROM admin_users WHERE id = $1 AND is_active = true',
      [decoded.adminId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Admin user not found or inactive' });
    }

    req.adminUser = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Admin session expired' });
    }
    console.error('Admin auth error:', error);
    res.status(401).json({ error: 'Admin authentication failed' });
  }
};
