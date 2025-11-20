#!/bin/bash

echo "Creating all backend files..."

# Create middleware/auth.js
cat > backend/src/middleware/auth.js << 'EOF'
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT id, email, full_name, role, is_subscribed, subscription_plan, subscription_end_date FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireSubscription = async (req, res, next) => {
  if (!req.user.is_subscribed) {
    return res.status(403).json({ error: 'Active subscription required' });
  }
  if (req.user.subscription_end_date) {
    const endDate = new Date(req.user.subscription_end_date);
    if (endDate < new Date()) {
      await query('UPDATE users SET is_subscribed = false WHERE id = $1', [req.user.id]);
      return res.status(403).json({ error: 'Subscription expired' });
    }
  }
  next();
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT id, email, full_name, role, is_subscribed FROM users WHERE id = $1', [decoded.userId]);
    req.user = result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    req.user = null;
  }
  next();
};
EOF

# Create middleware/errorHandler.js
cat > backend/src/middleware/errorHandler.js << 'EOF'
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};
EOF

# Create middleware/notFound.js
cat > backend/src/middleware/notFound.js << 'EOF'
export const notFound = (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
};
EOF

echo "✓ Middleware files created"

