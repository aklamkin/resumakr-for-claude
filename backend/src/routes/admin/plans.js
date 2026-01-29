import express from 'express';
import { query } from '../../config/database.js';
import { authenticateAdmin } from '../../middleware/adminAuth.js';
import { syncPlanToStripe } from '../../services/stripe.js';

const router = express.Router();

const isUniqueViolation = (error) => {
  return error.code === '23505';
};

// All routes require admin authentication
router.use(authenticateAdmin);

// Get all plans (including inactive)
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM subscription_plans ORDER BY price ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Create plan
router.post('/', async (req, res) => {
  try {
    const { plan_id, name, price, period, duration, features, is_popular, is_active } = req.body;

    const result = await query(
      `INSERT INTO subscription_plans (plan_id, name, price, period, duration, features, is_popular, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [plan_id, name, price, period, duration, JSON.stringify(features || []), is_popular || false, is_active !== false]
    );

    const newPlan = result.rows[0];

    // Auto-sync to Stripe (non-blocking)
    try {
      const syncResult = await syncPlanToStripe(newPlan, { createIfMissing: true });

      if (syncResult.stripe_product_id && syncResult.stripe_price_id) {
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

// Update plan
router.put('/:id', async (req, res) => {
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

// Delete plan
router.delete('/:id', async (req, res) => {
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
router.post('/:id/sync-stripe', async (req, res) => {
  try {
    const { id } = req.params;

    const planResult = await query('SELECT * FROM subscription_plans WHERE id = $1', [id]);

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const plan = planResult.rows[0];

    const syncResult = await syncPlanToStripe(plan, { createIfMissing: true });

    if (syncResult.error) {
      return res.status(400).json({ error: syncResult.error });
    }

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

export default router;
