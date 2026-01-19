import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { syncPlanToStripe } from '../services/stripe.js';

const router = express.Router();

// Helper to check if error is a unique constraint violation
const isUniqueViolation = (error) => {
  return error.code === '23505';
};

router.get('/plans', async (req, res) => {
  try {
    // Return ALL plans (both active and inactive) for admins to manage
    const result = await query('SELECT * FROM subscription_plans ORDER BY price ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

router.post('/plans', authenticate, requireAdmin, async (req, res) => {
  try {
    const { plan_id, name, price, period, duration, features, is_popular, is_active } = req.body;

    const result = await query(
      `INSERT INTO subscription_plans (plan_id, name, price, period, duration, features, is_popular, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [plan_id, name, price, period, duration, JSON.stringify(features || []), is_popular || false, is_active !== false]
    );

    const newPlan = result.rows[0];

    // Auto-sync to Stripe (non-blocking - don't fail plan creation if Stripe sync fails)
    try {
      const syncResult = await syncPlanToStripe(newPlan, { createIfMissing: true });

      if (syncResult.stripe_product_id && syncResult.stripe_price_id) {
        // Update plan with Stripe IDs
        const updateResult = await query(
          `UPDATE subscription_plans
           SET stripe_product_id = $1, stripe_price_id = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [syncResult.stripe_product_id, syncResult.stripe_price_id, newPlan.id]
        );

        console.log(`Plan ${plan_id} synced with Stripe successfully`);
        return res.status(201).json(updateResult.rows[0]);
      }
    } catch (stripeError) {
      console.error('Stripe sync failed (non-fatal):', stripeError.message);
      // Return plan anyway - admin can manually sync later
    }

    res.status(201).json(newPlan);
  } catch (error) {
    console.error('Create plan error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A plan with this name already exists. Plan names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

router.put('/plans/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Get existing plan for comparison
    const existingPlanResult = await query('SELECT * FROM subscription_plans WHERE id = $1', [id]);

    if (existingPlanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const existingPlan = existingPlanResult.rows[0];

    // If trying to activate the plan, verify it's synced with Stripe
    if (is_active === true && !existingPlan.stripe_price_id) {
      return res.status(400).json({
        error: 'Cannot activate plan without Stripe integration. Create in Stripe first.'
      });
    }

    // Only allow valid columns that exist in the database
    const validColumns = ['plan_id', 'name', 'price', 'period', 'duration', 'features', 'is_popular', 'is_active'];
    const fields = Object.keys(req.body).filter(key => validColumns.includes(key));
    const values = fields.map(field => {
      const value = req.body[field];
      return typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');

    const result = await query(
      `UPDATE subscription_plans SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const updatedPlan = result.rows[0];

    // Auto-sync to Stripe if plan has Stripe IDs and sync-worthy fields changed
    const syncWorthyFields = ['name', 'price', 'period', 'duration', 'is_active'];
    const shouldSync = fields.some(field => syncWorthyFields.includes(field)) && existingPlan.stripe_product_id;

    if (shouldSync) {
      try {
        const syncResult = await syncPlanToStripe(updatedPlan);

        // If price changed, update the stripe_price_id
        if (syncResult.priceChanged && syncResult.stripe_price_id) {
          const finalResult = await query(
            `UPDATE subscription_plans
             SET stripe_price_id = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [syncResult.stripe_price_id, id]
          );

          console.log(`Plan ${updatedPlan.plan_id} synced with Stripe (price changed)`);
          return res.json(finalResult.rows[0]);
        }

        console.log(`Plan ${updatedPlan.plan_id} synced with Stripe`);
      } catch (stripeError) {
        console.error('Stripe sync failed (non-fatal):', stripeError.message);
        // Return updated plan anyway - admin can manually sync later
      }
    }

    res.json(updatedPlan);
  } catch (error) {
    console.error('Update plan error:', error);
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A plan with this name already exists. Plan names must be unique.' });
    }
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

router.delete('/plans/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM subscription_plans WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// Manual Stripe sync endpoint
router.post('/plans/:id/sync-stripe', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the plan
    const planResult = await query('SELECT * FROM subscription_plans WHERE id = $1', [id]);

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const plan = planResult.rows[0];

    // Sync to Stripe
    const syncResult = await syncPlanToStripe(plan, { createIfMissing: true });

    if (syncResult.error) {
      return res.status(400).json({ error: syncResult.error });
    }

    // Update plan with Stripe IDs
    const updateResult = await query(
      `UPDATE subscription_plans
       SET stripe_product_id = $1, stripe_price_id = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [syncResult.stripe_product_id, syncResult.stripe_price_id, id]
    );

    console.log(`Plan ${plan.plan_id} manually synced with Stripe`);

    res.json({
      message: 'Plan synced with Stripe successfully',
      plan: updateResult.rows[0],
      sync: {
        created: syncResult.created,
        updated: syncResult.updated,
        priceChanged: syncResult.priceChanged
      }
    });

  } catch (error) {
    console.error('Stripe sync error:', error);
    res.status(500).json({
      error: error.message || 'Failed to sync with Stripe'
    });
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
