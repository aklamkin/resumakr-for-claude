/**
 * Templates Routes
 * Handles template listing and access control for freemium model
 */

import express from 'express';
import { query } from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { getTemplatesForTier, checkTemplateAccess } from '../utils/usageTracking.js';

const router = express.Router();

/**
 * GET /api/templates
 * List all templates with availability based on user tier
 * Accessible without auth (shows all as locked for anonymous users)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    // If no user, treat as free tier
    const tier = req.user?.effectiveTier || 'free';

    const templates = await getTemplatesForTier(tier);

    // Group templates by category
    const grouped = templates.reduce((acc, template) => {
      const category = template.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {});

    res.json({
      templates,
      grouped,
      tier,
      totalCount: templates.length,
      availableCount: templates.filter(t => t.available).length,
      premiumCount: templates.filter(t => t.is_premium).length
    });
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/templates/:id
 * Get a specific template with access check
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const tier = req.user?.effectiveTier || 'free';
    const { allowed, template, reason } = await checkTemplateAccess(req.params.id, tier);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      ...template,
      allowed,
      reason: allowed ? null : reason,
      upgradeUrl: allowed ? null : '/pricing'
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * POST /api/templates/:id/select
 * Attempt to select a template (validates access)
 */
router.post('/:id/select', authenticate, async (req, res) => {
  try {
    const tier = req.user.effectiveTier;
    const { allowed, template, reason } = await checkTemplateAccess(req.params.id, tier);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!allowed) {
      return res.status(403).json({
        error: 'Upgrade required',
        message: reason,
        template: {
          id: template.id,
          name: template.name,
          is_premium: template.is_premium
        },
        upgradeUrl: '/pricing'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Select template error:', error);
    res.status(500).json({ error: 'Failed to select template' });
  }
});

/**
 * GET /api/templates/categories
 * Get template categories with counts
 */
router.get('/meta/categories', optionalAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT category, COUNT(*) as count,
             SUM(CASE WHEN is_premium THEN 1 ELSE 0 END) as premium_count,
             SUM(CASE WHEN NOT is_premium THEN 1 ELSE 0 END) as free_count
      FROM templates
      WHERE is_active = true
      GROUP BY category
      ORDER BY MIN(sort_order)
    `);

    res.json({
      categories: result.rows
    });
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;
