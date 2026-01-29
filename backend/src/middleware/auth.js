import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { getUserTier, getTierLimits } from '../utils/tierLimits.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      `SELECT id, email, full_name, role, is_subscribed, subscription_plan, subscription_end_date,
              user_tier, ai_credits_total, ai_credits_used
       FROM users WHERE id = $1`,
      [decoded.userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    const user = result.rows[0];

    // Calculate effective tier based on subscription status
    user.effectiveTier = getUserTier(user);
    user.tierLimits = getTierLimits(user.effectiveTier);

    req.user = user;
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
    const result = await query(
      `SELECT id, email, full_name, role, is_subscribed, subscription_end_date,
              user_tier, ai_credits_total, ai_credits_used
       FROM users WHERE id = $1`,
      [decoded.userId]
    );
    if (result.rows.length > 0) {
      const user = result.rows[0];
      user.effectiveTier = getUserTier(user);
      user.tierLimits = getTierLimits(user.effectiveTier);
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }
  next();
};

/**
 * Middleware to require a specific feature based on user tier
 * Use: requireFeature('coverLetters'), requireFeature('versionHistory'), etc.
 */
export const requireFeature = (featureName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limits = req.user.tierLimits;
    if (!limits[featureName]) {
      return res.status(403).json({
        error: 'Upgrade required',
        message: `This feature requires a paid subscription.`,
        feature: featureName,
        currentTier: req.user.effectiveTier,
        upgradeUrl: '/pricing'
      });
    }

    next();
  };
};

/**
 * Middleware to require paid tier for certain routes
 */
export const requirePaidTier = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.effectiveTier !== 'paid') {
    return res.status(403).json({
      error: 'Subscription required',
      message: 'This feature requires an active subscription.',
      currentTier: req.user.effectiveTier,
      upgradeUrl: '/pricing'
    });
  }

  next();
};
