import express from 'express';
import { query, pool } from '../../config/database.js';
import { authenticateAdmin } from '../../middleware/adminAuth.js';
import { clearStripeProfileCache, getPublishableKey, getStripeEnvironment } from '../../services/stripe.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * Get all Stripe profiles
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        id, name, description, environment,
        -- Mask sensitive keys for display (show last 8 chars)
        CONCAT('...', RIGHT(secret_key, 8)) as secret_key_masked,
        CONCAT('...', RIGHT(publishable_key, 8)) as publishable_key_masked,
        CASE WHEN webhook_secret IS NOT NULL THEN CONCAT('...', RIGHT(webhook_secret, 8)) ELSE NULL END as webhook_secret_masked,
        price_ids, product_config, is_active,
        created_at, updated_at
      FROM stripe_profiles
      ORDER BY is_active DESC, created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching Stripe profiles:', error);
    res.status(500).json({ error: 'Failed to fetch Stripe profiles' });
  }
});

/**
 * Get the active Stripe profile (with full keys for internal use)
 */
router.get('/active', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM stripe_profiles WHERE is_active = true LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active Stripe profile found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching active Stripe profile:', error);
    res.status(500).json({ error: 'Failed to fetch active Stripe profile' });
  }
});

/**
 * Get a single Stripe profile by ID (with full keys for editing)
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM stripe_profiles WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stripe profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching Stripe profile:', error);
    res.status(500).json({ error: 'Failed to fetch Stripe profile' });
  }
});

/**
 * Create a new Stripe profile
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      environment,
      secret_key,
      publishable_key,
      webhook_secret,
      price_ids,
      product_config,
      is_active
    } = req.body;

    // Validate required fields
    if (!name || !environment || !secret_key || !publishable_key) {
      return res.status(400).json({
        error: 'Missing required fields: name, environment, secret_key, publishable_key'
      });
    }

    // Validate environment
    if (!['test', 'live'].includes(environment)) {
      return res.status(400).json({ error: 'Environment must be "test" or "live"' });
    }

    // Validate key format matches environment
    if (environment === 'test' && !secret_key.startsWith('sk_test_')) {
      return res.status(400).json({ error: 'Test environment requires keys starting with sk_test_' });
    }
    if (environment === 'live' && !secret_key.startsWith('sk_live_')) {
      return res.status(400).json({ error: 'Live environment requires keys starting with sk_live_' });
    }

    const result = await query(`
      INSERT INTO stripe_profiles (
        name, description, environment, secret_key, publishable_key,
        webhook_secret, price_ids, product_config, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, description, environment, is_active, created_at
    `, [
      name,
      description || null,
      environment,
      secret_key,
      publishable_key,
      webhook_secret || null,
      JSON.stringify(price_ids || {}),
      JSON.stringify(product_config || {}),
      is_active || false,
      req.adminUser.id
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating Stripe profile:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A profile with this configuration already exists' });
    }
    res.status(500).json({ error: 'Failed to create Stripe profile' });
  }
});

/**
 * Update a Stripe profile
 */
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      environment,
      secret_key,
      publishable_key,
      webhook_secret,
      price_ids,
      product_config,
      is_active
    } = req.body;

    // Check if profile exists
    const existing = await query('SELECT * FROM stripe_profiles WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Stripe profile not found' });
    }

    // Validate key format if environment or keys are being changed
    const newEnv = environment || existing.rows[0].environment;
    const newSecretKey = secret_key || existing.rows[0].secret_key;

    if (newEnv === 'test' && !newSecretKey.startsWith('sk_test_')) {
      return res.status(400).json({ error: 'Test environment requires keys starting with sk_test_' });
    }
    if (newEnv === 'live' && !newSecretKey.startsWith('sk_live_')) {
      return res.status(400).json({ error: 'Live environment requires keys starting with sk_live_' });
    }

    const result = await query(`
      UPDATE stripe_profiles SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        environment = COALESCE($3, environment),
        secret_key = COALESCE($4, secret_key),
        publishable_key = COALESCE($5, publishable_key),
        webhook_secret = COALESCE($6, webhook_secret),
        price_ids = COALESCE($7, price_ids),
        product_config = COALESCE($8, product_config),
        is_active = COALESCE($9, is_active),
        updated_at = NOW()
      WHERE id = $10
      RETURNING id, name, description, environment, is_active, updated_at
    `, [
      name,
      description,
      environment,
      secret_key,
      publishable_key,
      webhook_secret,
      price_ids ? JSON.stringify(price_ids) : null,
      product_config ? JSON.stringify(product_config) : null,
      is_active,
      req.params.id
    ]);

    // If updating the active profile, clear the cache so changes take effect
    if (existing.rows[0].is_active) {
      clearStripeProfileCache();
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating Stripe profile:', error);
    res.status(500).json({ error: 'Failed to update Stripe profile' });
  }
});

/**
 * Activate a Stripe profile (deactivates all others).
 * Saves current plan Stripe IDs to the outgoing profile,
 * then loads the incoming profile's stored IDs into subscription_plans.
 */
router.post('/:id/activate', async (req, res) => {
  const client = await pool.connect();
  try {
    // Check if profile exists
    const existing = await client.query('SELECT * FROM stripe_profiles WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Stripe profile not found' });
    }

    // Already active - nothing to do
    if (existing.rows[0].is_active) {
      client.release();
      return res.json({
        message: `Stripe profile "${existing.rows[0].name}" is already active`,
        profile: existing.rows[0]
      });
    }

    await client.query('BEGIN');

    // Step 1: Save current plan Stripe IDs to the currently active (outgoing) profile
    const currentActive = await client.query('SELECT id FROM stripe_profiles WHERE is_active = true LIMIT 1');
    if (currentActive.rows.length > 0) {
      const plans = await client.query('SELECT plan_id, stripe_product_id, stripe_price_id FROM subscription_plans WHERE stripe_product_id IS NOT NULL');
      const priceIds = {};
      for (const plan of plans.rows) {
        priceIds[plan.plan_id] = {
          stripe_product_id: plan.stripe_product_id,
          stripe_price_id: plan.stripe_price_id
        };
      }
      await client.query(
        'UPDATE stripe_profiles SET price_ids = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(priceIds), currentActive.rows[0].id]
      );
      console.log(`Saved ${Object.keys(priceIds).length} plan IDs to outgoing profile ${currentActive.rows[0].id}`);
    }

    // Step 2: Activate the new profile (DB trigger deactivates others)
    const result = await client.query(`
      UPDATE stripe_profiles SET is_active = true, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, environment, is_active, price_ids
    `, [req.params.id]);

    // Step 3: Load the incoming profile's stored plan IDs into subscription_plans
    const incomingPriceIds = result.rows[0].price_ids || {};
    let restoredCount = 0;
    let clearedCount = 0;

    const allPlans = await client.query('SELECT id, plan_id FROM subscription_plans');
    for (const plan of allPlans.rows) {
      const stored = incomingPriceIds[plan.plan_id];
      if (stored && stored.stripe_product_id && stored.stripe_price_id) {
        await client.query(
          'UPDATE subscription_plans SET stripe_product_id = $1, stripe_price_id = $2 WHERE id = $3',
          [stored.stripe_product_id, stored.stripe_price_id, plan.id]
        );
        restoredCount++;
      } else {
        await client.query(
          'UPDATE subscription_plans SET stripe_product_id = NULL, stripe_price_id = NULL WHERE id = $1',
          [plan.id]
        );
        clearedCount++;
      }
    }

    await client.query('COMMIT');

    console.log(`Profile switch: restored ${restoredCount} plan IDs, cleared ${clearedCount} (profile: ${result.rows[0].name})`);

    // Clear the Stripe service cache AFTER the transaction commits
    clearStripeProfileCache();

    res.json({
      message: `Stripe profile "${result.rows[0].name}" is now active`,
      profile: result.rows[0],
      plansRestored: restoredCount,
      plansCleared: clearedCount
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error activating Stripe profile:', error);
    res.status(500).json({ error: 'Failed to activate Stripe profile' });
  } finally {
    client.release();
  }
});

/**
 * Delete a Stripe profile
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if profile exists and is not active
    const existing = await query('SELECT * FROM stripe_profiles WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Stripe profile not found' });
    }

    if (existing.rows[0].is_active) {
      return res.status(400).json({
        error: 'Cannot delete active profile. Activate another profile first.'
      });
    }

    await query('DELETE FROM stripe_profiles WHERE id = $1', [req.params.id]);
    res.json({ message: 'Stripe profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting Stripe profile:', error);
    res.status(500).json({ error: 'Failed to delete Stripe profile' });
  }
});

/**
 * Test Stripe connection with a profile's credentials
 */
router.post('/:id/test', async (req, res) => {
  try {
    const result = await query('SELECT secret_key FROM stripe_profiles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stripe profile not found' });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(result.rows[0].secret_key);

    // Test the connection by fetching account info
    const account = await stripe.accounts.retrieve();

    res.json({
      success: true,
      message: 'Stripe connection successful',
      account: {
        id: account.id,
        business_type: account.business_type,
        country: account.country,
        default_currency: account.default_currency,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      }
    });
  } catch (error) {
    console.error('Error testing Stripe connection:', error);
    res.status(400).json({
      success: false,
      message: 'Stripe connection failed',
      error: error.message
    });
  }
});

/**
 * Sync price IDs from Stripe (fetch all prices and let admin map them)
 */
router.get('/:id/prices', async (req, res) => {
  try {
    const result = await query('SELECT secret_key FROM stripe_profiles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stripe profile not found' });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(result.rows[0].secret_key);

    // Fetch all active prices
    const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });

    res.json(prices.data.map(price => ({
      id: price.id,
      nickname: price.nickname,
      unit_amount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring,
      product: {
        id: price.product.id,
        name: price.product.name,
        description: price.product.description
      }
    })));
  } catch (error) {
    console.error('Error fetching Stripe prices:', error);
    res.status(400).json({ error: 'Failed to fetch prices: ' + error.message });
  }
});

export default router;
