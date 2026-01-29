import express from 'express';
import { getPublishableKey, getStripeEnvironment } from '../services/stripe.js';

const router = express.Router();

/**
 * PUBLIC ENDPOINT - Get current Stripe configuration for frontend (no auth required)
 * Returns only public information (publishable key, environment)
 */
router.get('/config/public', async (req, res) => {
  try {
    const publishableKey = await getPublishableKey();
    const environment = await getStripeEnvironment();

    if (!publishableKey) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    res.json({
      publishableKey,
      environment
    });
  } catch (error) {
    console.error('Error getting Stripe config:', error);
    res.status(500).json({ error: 'Failed to get Stripe configuration' });
  }
});

export default router;
