import Stripe from 'stripe';
import { query } from '../config/database.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(userId, email, fullName) {
  // Check if user already has a Stripe customer ID
  const userResult = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);

  if (userResult.rows[0]?.stripe_customer_id) {
    return userResult.rows[0].stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: fullName,
    metadata: {
      user_id: userId
    }
  });

  // Store customer ID in database
  await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customer.id, userId]);

  return customer.id;
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession({
  userId,
  email,
  fullName,
  priceId,
  successUrl,
  cancelUrl,
  couponCode = null,
  trialDays = null
}) {
  const customerId = await getOrCreateCustomer(userId, email, fullName);

  const sessionParams = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    subscription_data: {
      metadata: {
        user_id: userId
      }
    },
    metadata: {
      user_id: userId
    }
  };

  // Apply coupon if provided
  if (couponCode) {
    // Validate coupon exists in our database
    const couponResult = await query(
      'SELECT * FROM coupon_codes WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR current_uses < max_uses)',
      [couponCode]
    );

    if (couponResult.rows.length > 0) {
      const dbCoupon = couponResult.rows[0];

      // Create or get Stripe coupon
      let stripeCouponId;
      try {
        const stripeCoupon = await stripe.coupons.retrieve(couponCode);
        stripeCouponId = stripeCoupon.id;
      } catch (error) {
        // Create coupon in Stripe if it doesn't exist
        const couponParams = {};
        if (dbCoupon.discount_type === 'percentage') {
          couponParams.percent_off = parseFloat(dbCoupon.discount_value);
        } else {
          couponParams.amount_off = Math.round(parseFloat(dbCoupon.discount_value) * 100); // Convert to cents
          couponParams.currency = 'usd';
        }
        couponParams.name = couponCode;
        const newCoupon = await stripe.coupons.create({ id: couponCode, ...couponParams });
        stripeCouponId = newCoupon.id;
      }

      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }
  }

  // Apply trial period if specified
  if (trialDays && trialDays > 0) {
    sessionParams.subscription_data.trial_period_days = trialDays;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return session;
}

/**
 * Create a billing portal session for subscription management
 */
export async function createBillingPortalSession(userId, returnUrl) {
  const userResult = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);

  if (!userResult.rows[0]?.stripe_customer_id) {
    throw new Error('No Stripe customer found for this user');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: userResult.rows[0].stripe_customer_id,
    return_url: returnUrl
  });

  return session;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(userId) {
  const userResult = await query('SELECT stripe_subscription_id FROM users WHERE id = $1', [userId]);

  if (!userResult.rows[0]?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  const subscription = await stripe.subscriptions.cancel(userResult.rows[0].stripe_subscription_id);

  // Update user record
  await query(
    'UPDATE users SET is_subscribed = false, cancelled_at = NOW() WHERE id = $1',
    [userId]
  );

  return subscription;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload, signature) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
}

/**
 * Handle subscription created webhook
 */
export async function handleSubscriptionCreated(subscription) {
  const userId = subscription.metadata.user_id;

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }

  const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
  const priceId = subscription.items.data[0].price.id;

  // Get plan from database by stripe_price_id
  const planResult = await query('SELECT plan_id FROM subscription_plans WHERE stripe_price_id = $1', [priceId]);
  const planId = planResult.rows[0]?.plan_id || 'premium';

  await query(
    `UPDATE users SET
      is_subscribed = true,
      subscription_plan = $1,
      subscription_end_date = $2,
      stripe_subscription_id = $3,
      subscription_started_at = NOW(),
      updated_at = NOW()
    WHERE id = $4`,
    [planId, subscriptionEndDate, subscription.id, userId]
  );

  console.log(`Subscription created for user ${userId}`);
}

/**
 * Handle subscription updated webhook
 */
export async function handleSubscriptionUpdated(subscription) {
  const userId = subscription.metadata.user_id;

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }

  const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
  const isActive = subscription.status === 'active';

  await query(
    `UPDATE users SET
      is_subscribed = $1,
      subscription_end_date = $2,
      updated_at = NOW()
    WHERE id = $3`,
    [isActive, subscriptionEndDate, userId]
  );

  console.log(`Subscription updated for user ${userId}, status: ${subscription.status}`);
}

/**
 * Handle subscription deleted/cancelled webhook
 */
export async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata.user_id;

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }

  await query(
    `UPDATE users SET
      is_subscribed = false,
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = $1`,
    [userId]
  );

  console.log(`Subscription deleted for user ${userId}`);
}

/**
 * Handle payment succeeded webhook
 */
export async function handlePaymentSucceeded(paymentIntent) {
  const userId = paymentIntent.metadata?.user_id;

  if (!userId) {
    console.log('No user_id in payment intent metadata');
    return;
  }

  // Store payment record
  await query(
    `INSERT INTO payments (
      user_id,
      stripe_payment_intent_id,
      stripe_charge_id,
      amount,
      currency,
      status,
      payment_method_type,
      payment_method_last4,
      payment_method_brand,
      description,
      metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = NOW()`,
    [
      userId,
      paymentIntent.id,
      paymentIntent.charges?.data[0]?.id || null,
      paymentIntent.amount / 100, // Convert from cents
      paymentIntent.currency,
      paymentIntent.status,
      paymentIntent.charges?.data[0]?.payment_method_details?.type || null,
      paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4 || null,
      paymentIntent.charges?.data[0]?.payment_method_details?.card?.brand || null,
      paymentIntent.description || 'Subscription payment',
      JSON.stringify(paymentIntent.metadata || {})
    ]
  );

  // Update user's payment method info
  if (paymentIntent.charges?.data[0]?.payment_method_details?.card) {
    const card = paymentIntent.charges.data[0].payment_method_details.card;
    await query(
      'UPDATE users SET payment_method_last4 = $1, payment_method_brand = $2 WHERE id = $3',
      [card.last4, card.brand, userId]
    );
  }

  console.log(`Payment succeeded for user ${userId}, amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}`);
}

/**
 * Handle invoice payment succeeded webhook
 */
export async function handleInvoicePaymentSucceeded(invoice) {
  const customerId = invoice.customer;

  // Get user by stripe_customer_id
  const userResult = await query('SELECT id FROM users WHERE stripe_customer_id = $1', [customerId]);

  if (userResult.rows.length === 0) {
    console.error(`No user found for Stripe customer ${customerId}`);
    return;
  }

  const userId = userResult.rows[0].id;

  // Ensure subscription is marked as active
  await query(
    'UPDATE users SET is_subscribed = true, updated_at = NOW() WHERE id = $1',
    [userId]
  );

  console.log(`Invoice payment succeeded for user ${userId}`);
}

export default {
  getOrCreateCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription,
  verifyWebhookSignature,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentSucceeded,
  handleInvoicePaymentSucceeded
};
