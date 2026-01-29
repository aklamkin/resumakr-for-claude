import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { getMonthlyUsage, getResumesCreatedLast24Hours, getUserAiCredits } from '../utils/usageTracking.js';

const router = express.Router();

router.get('/plans', async (req, res) => {
  try {
    // By default, return only active plans for public pricing page
    // Admin can pass ?all=true to see all plans (including inactive)
    const showAll = req.query.all === 'true';
    const sql = showAll
      ? 'SELECT * FROM subscription_plans ORDER BY price ASC'
      : 'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC';
    const result = await query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * GET /api/subscriptions/my-tier
 * Get current user's tier, limits, and usage information
 */
router.get('/my-tier', authenticate, async (req, res) => {
  try {
    const tier = req.user.effectiveTier;
    const limits = req.user.tierLimits;

    // Get monthly usage
    const monthlyUsage = await getMonthlyUsage(req.user.id);

    // Get resume creation count in last 24 hours
    const resumesCreatedToday = await getResumesCreatedLast24Hours(req.user.id);

    // Get AI credits
    const aiCredits = await getUserAiCredits(req.user.id);

    res.json({
      tier,
      limits,
      usage: {
        pdfDownloads: {
          used: monthlyUsage.pdf_downloads || 0,
          limit: limits.pdfDownloadsPerMonth,
          remaining: tier === 'paid' ? null : Math.max(0, limits.pdfDownloadsPerMonth - (monthlyUsage.pdf_downloads || 0))
        },
        resumesCreatedToday,
        maxResumesPerDay: limits.maxResumesPerDay,
        aiCredits: {
          used: aiCredits.used,
          total: aiCredits.total,
          remaining: tier === 'paid' ? null : aiCredits.remaining
        }
      },
      features: {
        coverLetters: limits.coverLetters,
        versionHistory: limits.versionHistory,
        resumeParsing: limits.resumeParsing,
        atsDetailedInsights: limits.atsDetailedInsights,
        premiumTemplates: limits.premiumTemplates,
        watermarkPdf: limits.watermarkPdf
      },
      upgradeUrl: tier === 'free' ? '/pricing' : null
    });
  } catch (error) {
    console.error('Get tier error:', error);
    res.status(500).json({ error: 'Failed to get tier information' });
  }
});

// Activate subscription for current user
router.post('/activate', authenticate, async (req, res) => {
  try {
    const { plan_id, coupon_code, final_price } = req.body;
    const userId = req.user.id;

    if (!plan_id) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    // Fetch the plan details
    const planResult = await query(
      'SELECT * FROM subscription_plans WHERE plan_id = $1 AND is_active = true',
      [plan_id]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }

    const plan = planResult.rows[0];

    // Calculate subscription end date based on plan duration
    const endDate = new Date();
    if (plan.period === 'day') {
      endDate.setDate(endDate.getDate() + plan.duration);
    } else if (plan.period === 'week') {
      endDate.setDate(endDate.getDate() + (plan.duration * 7));
    } else if (plan.period === 'month') {
      endDate.setMonth(endDate.getMonth() + plan.duration);
    } else if (plan.period === 'year') {
      endDate.setFullYear(endDate.getFullYear() + plan.duration);
    }

    // Update user subscription
    const updateResult = await query(
      `UPDATE users
       SET is_subscribed = true,
           subscription_plan = $1,
           subscription_end_date = $2,
           coupon_code_used = $3,
           subscription_price = $4,
           subscription_started_at = NOW(),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, full_name, is_subscribed, subscription_plan, subscription_end_date, coupon_code_used, subscription_price, subscription_started_at`,
      [plan_id, endDate, coupon_code || null, final_price || plan.price, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Subscription activated successfully',
      user: updateResult.rows[0],
      plan: plan
    });
  } catch (error) {
    console.error('Activate subscription error:', error);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

export default router;
