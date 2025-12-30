import express from 'express';
import { authenticate } from '../middleware/auth.js';
import stripeService from '../services/stripe.js';
import { query } from '../config/database.js';

const router = express.Router();
router.use(authenticate);

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe Checkout session for subscription payment
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan_id, coupon_code, return_url } = req.body;

    if (!plan_id) {
      return res.status(400).json({ error: 'plan_id is required' });
    }

    // Get plan details
    const planResult = await query('SELECT * FROM subscription_plans WHERE plan_id = $1 AND is_active = true', [plan_id]);

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    const plan = planResult.rows[0];

    if (!plan.stripe_price_id) {
      return res.status(400).json({ error: 'This plan is not configured for Stripe payments. Please contact support.' });
    }

    // Create checkout session
    const session = await stripeService.createCheckoutSession({
      userId: req.user.id,
      email: req.user.email,
      fullName: req.user.full_name,
      priceId: plan.stripe_price_id,
      successUrl: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.FRONTEND_URL}/pricing?${return_url ? `returnUrl=${return_url}` : ''}`,
      couponCode: coupon_code
    });

    // Increment coupon usage if applicable
    if (coupon_code) {
      await query(
        'UPDATE coupon_codes SET current_uses = current_uses + 1 WHERE code = $1',
        [coupon_code]
      );
    }

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

/**
 * POST /api/payments/create-billing-portal-session
 * Create a Stripe Billing Portal session for subscription management
 */
router.post('/create-billing-portal-session', async (req, res) => {
  try {
    const session = await stripeService.createBillingPortalSession(
      req.user.id,
      `${process.env.FRONTEND_URL}/subscription-management`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create billing portal session error:', error);
    res.status(500).json({ error: error.message || 'Failed to create billing portal session' });
  }
});

/**
 * POST /api/payments/cancel-subscription
 * Cancel the user's active subscription
 */
router.post('/cancel-subscription', async (req, res) => {
  try {
    await stripeService.cancelSubscription(req.user.id);

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

/**
 * GET /api/payments/history
 * Get payment history for the authenticated user
 */
router.get('/history', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to retrieve payment history' });
  }
});

export default router;
