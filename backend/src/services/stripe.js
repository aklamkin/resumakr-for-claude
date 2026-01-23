import Stripe from 'stripe';
import { query } from '../config/database.js';

// Initialize Stripe only if API key is provided
// This prevents the app from crashing if Stripe is not configured yet
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Helper to check if Stripe is configured
function ensureStripeConfigured() {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
  }
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(userId, email, fullName) {
  ensureStripeConfigured();

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
  ensureStripeConfigured();

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
  ensureStripeConfigured();

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
  ensureStripeConfigured();

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
}

/**
 * Handle checkout.session.completed webhook
 * This is the PRIMARY event for Stripe Checkout - fires immediately when payment succeeds
 */
export async function handleCheckoutSessionCompleted(session) {
  // IMMEDIATE logging to confirm handler is called
  console.log('=== handleCheckoutSessionCompleted CALLED ===');
  console.log('Session ID:', session.id);
  console.log('client_reference_id:', session.client_reference_id);
  console.log('mode:', session.mode);
  console.log('subscription:', session.subscription);

  try {
    ensureStripeConfigured();

    const userId = session.client_reference_id || session.metadata?.user_id;

    if (!userId) {
      console.error('No user_id in checkout session:', JSON.stringify({
        client_reference_id: session.client_reference_id,
        metadata: session.metadata
      }));
      return;
    }

    console.log(`Processing checkout.session.completed for user ${userId}`);
    console.log(`Session details: mode=${session.mode}, subscription=${session.subscription}`);

    // For subscription mode, the subscription is created automatically
    if (session.mode === 'subscription' && session.subscription) {
      // Retrieve the full subscription object from Stripe
      console.log(`Retrieving subscription ${session.subscription} from Stripe...`);
      let subscription;
      try {
        const rawSubscription = await stripe.subscriptions.retrieve(session.subscription, {
          expand: ['items.data.price']
        });
        console.log(`RAW subscription response type: ${typeof rawSubscription}`);
        console.log(`RAW subscription JSON: ${JSON.stringify(rawSubscription, null, 2).substring(0, 2000)}`);
        subscription = rawSubscription;
        console.log(`Subscription retrieved: status=${subscription.status}, current_period_end=${subscription.current_period_end}, id=${subscription.id}`);
        console.log(`Full subscription object keys: ${Object.keys(subscription).join(', ')}`);
      } catch (stripeError) {
        console.error(`Failed to retrieve subscription from Stripe: ${stripeError.message}`);
        throw stripeError;
      }

      // Get current_period_end - it may be on subscription root or on subscription item
      // Stripe API behavior varies - check both locations
      let currentPeriodEnd = subscription.current_period_end;
      if (!currentPeriodEnd && subscription.items?.data?.[0]?.current_period_end) {
        currentPeriodEnd = subscription.items.data[0].current_period_end;
        console.log(`Using current_period_end from subscription item: ${currentPeriodEnd}`);
      }

      // Validate current_period_end before using it
      if (!currentPeriodEnd || typeof currentPeriodEnd !== 'number') {
        console.error(`Invalid current_period_end: ${currentPeriodEnd} (type: ${typeof currentPeriodEnd})`);
        throw new Error('Subscription has invalid current_period_end');
      }

      const subscriptionEndDate = new Date(currentPeriodEnd * 1000);

      // Validate the date is valid
      if (isNaN(subscriptionEndDate.getTime())) {
        console.error(`Invalid date calculated from current_period_end: ${subscription.current_period_end}`);
        throw new Error('Invalid subscription end date calculated');
      }

      const priceId = subscription.items?.data?.[0]?.price?.id;
      console.log(`Stripe current_period_end: ${subscriptionEndDate.toISOString()}, priceId: ${priceId}`);

      // Get plan from database by stripe_price_id - including duration for accurate end date
      let planId = 'premium';
      let planDuration = null;
      if (priceId) {
        try {
          const planResult = await query('SELECT plan_id, duration FROM subscription_plans WHERE stripe_price_id = $1', [priceId]);
          if (planResult.rows.length > 0) {
            planId = planResult.rows[0].plan_id || 'premium';
            planDuration = planResult.rows[0].duration;
          }
          console.log(`Plan lookup: found=${planResult.rows.length > 0}, planId=${planId}, duration=${planDuration}`);
        } catch (dbError) {
          console.error(`Plan lookup failed: ${dbError.message}`);
          // Continue with default planId
        }
      }

      // Calculate subscription end date based on plan duration (not Stripe's billing period)
      // This ensures "Daily" plan = 1 day, "Weekly" = 7 days, etc.
      let finalEndDate = subscriptionEndDate;
      if (planDuration && typeof planDuration === 'number') {
        const calculatedEndDate = new Date();
        calculatedEndDate.setDate(calculatedEndDate.getDate() + planDuration);
        finalEndDate = calculatedEndDate;
        console.log(`Using plan duration (${planDuration} days) for end date: ${finalEndDate.toISOString()}`);
      } else {
        console.log(`No plan duration found, using Stripe current_period_end: ${finalEndDate.toISOString()}`);
      }

      console.log(`Updating user ${userId} with: planId=${planId}, endDate=${finalEndDate.toISOString()}, subId=${subscription.id}`);
      let updateResult;
      try {
        updateResult = await query(
          `UPDATE users SET
            is_subscribed = true,
            subscription_plan = $1,
            subscription_end_date = $2,
            stripe_subscription_id = $3,
            subscription_started_at = NOW(),
            updated_at = NOW()
          WHERE id = $4
          RETURNING id, email, is_subscribed`,
          [planId, finalEndDate, subscription.id, userId]
        );
        console.log(`UPDATE query completed, rows affected: ${updateResult.rows.length}`);
      } catch (dbError) {
        console.error(`Database UPDATE failed: ${dbError.message}`);
        console.error(`DB Error details: ${JSON.stringify(dbError)}`);
        throw dbError;
      }

      if (updateResult.rows.length === 0) {
        console.error(`User ${userId} not found in database - subscription update failed!`);
        return;
      }

      console.log(`SUCCESS: Subscription activated for user ${userId} (${updateResult.rows[0].email}), plan: ${planId}, ends: ${subscriptionEndDate.toISOString()}`);
    } else {
      // For one-time payments (if we ever support them)
      console.log(`Non-subscription checkout completed for user ${userId}`);
    }
  } catch (error) {
    console.error('Error in handleCheckoutSessionCompleted:', error.message);
    console.error('Stack trace:', error.stack);
    throw error; // Re-throw so webhook handler knows it failed
  }
}

/**
 * Handle subscription created webhook
 * Note: checkout.session.completed is the primary handler for Stripe Checkout.
 * This handler is a backup for subscriptions created through other means.
 */
export async function handleSubscriptionCreated(subscription) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.log('No user_id in subscription metadata, skipping (checkout.session.completed handles this)');
    return;
  }

  // Check if user is already subscribed (checkout.session.completed may have already processed)
  const existingUser = await query('SELECT is_subscribed, stripe_subscription_id FROM users WHERE id = $1', [userId]);
  if (existingUser.rows[0]?.is_subscribed && existingUser.rows[0]?.stripe_subscription_id) {
    console.log(`User ${userId} already has active subscription, skipping duplicate update`);
    return;
  }

  // Validate current_period_end exists - retrieve full subscription if missing
  if (!subscription.current_period_end || typeof subscription.current_period_end !== 'number') {
    console.log('Invalid current_period_end in subscription, retrieving full subscription from Stripe');
    try {
      ensureStripeConfigured();
      subscription = await stripe.subscriptions.retrieve(subscription.id, {
        expand: ['items.data.price']
      });
    } catch (error) {
      console.error('Failed to retrieve subscription from Stripe:', error.message);
      return;
    }
  }

  // Get current_period_end - it may be on subscription root or on subscription item
  // Stripe API behavior varies - check both locations
  let currentPeriodEnd = subscription.current_period_end;
  if (!currentPeriodEnd && subscription.items?.data?.[0]?.current_period_end) {
    currentPeriodEnd = subscription.items.data[0].current_period_end;
    console.log(`Using current_period_end from subscription item: ${currentPeriodEnd}`);
  }

  // Final validation
  if (!currentPeriodEnd || typeof currentPeriodEnd !== 'number') {
    console.error(`Invalid current_period_end after all attempts: ${currentPeriodEnd}`);
    return;
  }

  const subscriptionEndDate = new Date(currentPeriodEnd * 1000);

  // Validate the date is valid before database update
  if (isNaN(subscriptionEndDate.getTime())) {
    console.error('Invalid subscription end date calculated, skipping update');
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;

  // Get plan from database by stripe_price_id - including duration for accurate end date
  let planId = 'premium';
  let planDuration = null;
  if (priceId) {
    const planResult = await query('SELECT plan_id, duration FROM subscription_plans WHERE stripe_price_id = $1', [priceId]);
    if (planResult.rows.length > 0) {
      planId = planResult.rows[0].plan_id || 'premium';
      planDuration = planResult.rows[0].duration;
    }
  }

  // Calculate subscription end date based on plan duration (not Stripe's billing period)
  let finalEndDate = subscriptionEndDate;
  if (planDuration && typeof planDuration === 'number') {
    const calculatedEndDate = new Date();
    calculatedEndDate.setDate(calculatedEndDate.getDate() + planDuration);
    finalEndDate = calculatedEndDate;
    console.log(`Using plan duration (${planDuration} days) for end date: ${finalEndDate.toISOString()}`);
  }

  await query(
    `UPDATE users SET
      is_subscribed = true,
      subscription_plan = $1,
      subscription_end_date = $2,
      stripe_subscription_id = $3,
      subscription_started_at = NOW(),
      updated_at = NOW()
    WHERE id = $4`,
    [planId, finalEndDate, subscription.id, userId]
  );

  console.log(`Subscription created for user ${userId}`);
}

/**
 * Handle subscription updated webhook
 */
export async function handleSubscriptionUpdated(subscription) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.log('No user_id in subscription metadata, skipping');
    return;
  }

  // Get current_period_end - check both root and item locations
  let currentPeriodEnd = subscription.current_period_end;
  if (!currentPeriodEnd && subscription.items?.data?.[0]?.current_period_end) {
    currentPeriodEnd = subscription.items.data[0].current_period_end;
  }

  if (!currentPeriodEnd || typeof currentPeriodEnd !== 'number') {
    console.error(`Invalid current_period_end in subscription update: ${currentPeriodEnd}`);
    return;
  }

  const subscriptionEndDate = new Date(currentPeriodEnd * 1000);
  const isActive = subscription.status === 'active';

  // Get plan duration to calculate accurate end date
  const priceId = subscription.items?.data?.[0]?.price?.id;
  let finalEndDate = subscriptionEndDate;

  if (priceId) {
    try {
      const planResult = await query('SELECT duration FROM subscription_plans WHERE stripe_price_id = $1', [priceId]);
      if (planResult.rows.length > 0 && planResult.rows[0].duration) {
        const planDuration = planResult.rows[0].duration;
        const calculatedEndDate = new Date();
        calculatedEndDate.setDate(calculatedEndDate.getDate() + planDuration);
        finalEndDate = calculatedEndDate;
        console.log(`Subscription updated: using plan duration (${planDuration} days) for end date: ${finalEndDate.toISOString()}`);
      }
    } catch (err) {
      console.error(`Failed to lookup plan duration: ${err.message}`);
    }
  }

  await query(
    `UPDATE users SET
      is_subscribed = $1,
      subscription_end_date = $2,
      updated_at = NOW()
    WHERE id = $3`,
    [isActive, finalEndDate, userId]
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

/**
 * Create a Stripe Product for a subscription plan
 */
export async function createStripeProduct(planData) {
  ensureStripeConfigured();

  const product = await stripe.products.create({
    name: planData.name,
    description: `${planData.name} - ${planData.duration} ${planData.period} access`,
    metadata: {
      plan_id: planData.plan_id,
      resumakr_plan: 'true'
    }
  });

  console.log(`Created Stripe product ${product.id} for plan ${planData.plan_id}`);
  return product;
}

/**
 * Create a Stripe Price for a product
 */
export async function createStripePrice(productId, planData) {
  ensureStripeConfigured();

  // Convert period to Stripe interval format
  let interval = 'month';
  let intervalCount = 1;

  if (planData.period === 'day') {
    interval = 'day';
    intervalCount = planData.duration;
  } else if (planData.period === 'week') {
    interval = 'week';
    intervalCount = planData.duration;
  } else if (planData.period === 'month') {
    interval = 'month';
    intervalCount = planData.duration;
  } else if (planData.period === 'year') {
    interval = 'year';
    intervalCount = planData.duration;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(parseFloat(planData.price) * 100), // Convert to cents
    currency: 'usd',
    recurring: {
      interval: interval,
      interval_count: intervalCount
    },
    metadata: {
      plan_id: planData.plan_id
    }
  });

  console.log(`Created Stripe price ${price.id} for product ${productId}`);
  return price;
}

/**
 * Update a Stripe Product
 * Note: Price changes require creating a new price, not updating the product
 */
export async function updateStripeProduct(productId, planData) {
  ensureStripeConfigured();

  const product = await stripe.products.update(productId, {
    name: planData.name,
    description: `${planData.name} - ${planData.duration} ${planData.period} access`,
    active: planData.is_active !== false
  });

  console.log(`Updated Stripe product ${productId} for plan ${planData.plan_id}`);
  return product;
}

/**
 * Archive a Stripe Price (makes it inactive)
 */
export async function archiveStripePrice(priceId) {
  ensureStripeConfigured();

  const price = await stripe.prices.update(priceId, {
    active: false
  });

  console.log(`Archived Stripe price ${priceId}`);
  return price;
}

/**
 * Master sync function - creates or updates plan in Stripe
 * Returns { stripe_product_id, stripe_price_id, created, updated }
 */
export async function syncPlanToStripe(planData, options = {}) {
  ensureStripeConfigured();

  const { createIfMissing = true } = options;
  let product;
  let price;
  let created = false;
  let updated = false;
  let priceChanged = false;

  try {
    // Case 1: Plan has no Stripe IDs - create new product and price
    if (!planData.stripe_product_id && createIfMissing) {
      console.log(`Creating new Stripe product for plan ${planData.plan_id}`);
      product = await createStripeProduct(planData);
      price = await createStripePrice(product.id, planData);
      created = true;

      return {
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        created: true,
        updated: false,
        priceChanged: false
      };
    }

    // Case 2: Plan has Stripe IDs - update existing
    if (planData.stripe_product_id) {
      // Update product (name, description, active status)
      product = await updateStripeProduct(planData.stripe_product_id, planData);
      updated = true;

      // Check if we need to create a new price (price or billing period changed)
      // We need to compare with the existing price in Stripe
      if (planData.stripe_price_id) {
        const existingPrice = await stripe.prices.retrieve(planData.stripe_price_id);
        const newPriceAmount = Math.round(parseFloat(planData.price) * 100);

        // Determine if period/duration changed
        let newInterval = 'month';
        let newIntervalCount = 1;
        if (planData.period === 'day') {
          newInterval = 'day';
          newIntervalCount = planData.duration;
        } else if (planData.period === 'week') {
          newInterval = 'week';
          newIntervalCount = planData.duration;
        } else if (planData.period === 'month') {
          newInterval = 'month';
          newIntervalCount = planData.duration;
        } else if (planData.period === 'year') {
          newInterval = 'year';
          newIntervalCount = planData.duration;
        }

        const priceAmountChanged = existingPrice.unit_amount !== newPriceAmount;
        const intervalChanged = existingPrice.recurring.interval !== newInterval;
        const intervalCountChanged = existingPrice.recurring.interval_count !== newIntervalCount;

        if (priceAmountChanged || intervalChanged || intervalCountChanged) {
          console.log(`Price/billing changed for plan ${planData.plan_id}, creating new Stripe price`);
          // Archive old price
          await archiveStripePrice(planData.stripe_price_id);
          // Create new price
          price = await createStripePrice(planData.stripe_product_id, planData);
          priceChanged = true;
        }
      }

      return {
        stripe_product_id: planData.stripe_product_id,
        stripe_price_id: price ? price.id : planData.stripe_price_id,
        created: false,
        updated: true,
        priceChanged: priceChanged
      };
    }

    // Case 3: No product ID and createIfMissing is false
    return {
      stripe_product_id: null,
      stripe_price_id: null,
      created: false,
      updated: false,
      error: 'Plan has no Stripe product ID and createIfMissing is false'
    };

  } catch (error) {
    console.error('Stripe sync error:', error);
    throw error;
  }
}

export default {
  getOrCreateCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription,
  verifyWebhookSignature,
  handleCheckoutSessionCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentSucceeded,
  handleInvoicePaymentSucceeded,
  createStripeProduct,
  createStripePrice,
  updateStripeProduct,
  archiveStripePrice,
  syncPlanToStripe
};
