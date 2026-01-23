import express from 'express';
import stripeService from '../services/stripe.js';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * IMPORTANT: This endpoint must receive the raw body, not JSON parsed
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(req.body, sig);

    // Log event for debugging
    console.log(`Received Stripe webhook: ${event.type}`, event.id);

    // Check if we've already processed this event
    const existingEvent = await query(
      'SELECT id FROM subscription_events WHERE stripe_event_id = $1',
      [event.id]
    );

    if (existingEvent.rows.length > 0) {
      console.log(`Event ${event.id} already processed, skipping`);
      return res.json({ received: true, skipped: true });
    }

    // Store event in database
    await query(
      `INSERT INTO subscription_events (stripe_event_id, event_type, subscription_id, data, processed)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        event.id,
        event.type,
        event.data.object.id,
        JSON.stringify(event.data.object),
        false
      ]
    );
    console.log(`Event ${event.id} stored in database, processing...`);

    // Handle different event types
    console.log('=== PROCESSING EVENT TYPE:', event.type, '===');
    switch (event.type) {
      case 'checkout.session.completed':
        // This is the primary event for successful Stripe Checkout payments
        console.log('>>> ENTERING checkout.session.completed case');
        console.log('>>> client_reference_id:', event.data.object.client_reference_id);
        console.log('>>> subscription:', event.data.object.subscription);
        try {
          await stripeService.handleCheckoutSessionCompleted(event.data.object);
          console.log('>>> handleCheckoutSessionCompleted completed successfully');
        } catch (handlerError) {
          console.error('>>> handleCheckoutSessionCompleted FAILED:', handlerError.message);
          console.error('>>> Stack:', handlerError.stack);
          throw handlerError;
        }
        break;

      case 'customer.subscription.created':
        await stripeService.handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await stripeService.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await stripeService.handleSubscriptionDeleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await stripeService.handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await stripeService.handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        console.log('Invoice payment failed:', event.data.object.id);
        // Could send email notification here
        break;

      case 'customer.subscription.trial_will_end':
        console.log('Subscription trial ending soon:', event.data.object.id);
        // Could send reminder email here
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await query(
      'UPDATE subscription_events SET processed = true WHERE stripe_event_id = $1',
      [event.id]
    );

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
});

export default router;
