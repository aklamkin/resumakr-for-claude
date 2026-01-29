import Stripe from 'stripe';
import { query } from '../config/database.js';

// Cache for the active Stripe profile to avoid DB queries on every request
let cachedProfile = null;
let profileCacheTime = 0;
const PROFILE_CACHE_TTL = 60000; // 1 minute cache

/**
 * Get the active Stripe profile from database.
 * A fully configured profile in the database is required - no env var fallback.
 */
async function getActiveStripeProfile() {
  // Check cache first
  if (cachedProfile && (Date.now() - profileCacheTime) < PROFILE_CACHE_TTL) {
    return cachedProfile;
  }

  try {
    const result = await query('SELECT * FROM stripe_profiles WHERE is_active = true LIMIT 1');

    if (result.rows.length > 0) {
      const profile = result.rows[0];
      // Don't cache placeholder keys
      if (!profile.secret_key.includes('placeholder')) {
        cachedProfile = profile;
        profileCacheTime = Date.now();
        return profile;
      }
    }
  } catch (error) {
    console.error('Failed to query stripe_profiles:', error.message);
  }

  return null;
}

/**
 * Get a configured Stripe instance from the active database profile.
 */
async function getStripeInstance() {
  const profile = await getActiveStripeProfile();

  if (!profile || !profile.secret_key || profile.secret_key.includes('placeholder')) {
    return null;
  }

  return new Stripe(profile.secret_key);
}

/**
 * Clear the profile cache (call when profile is switched)
 */
export function clearStripeProfileCache() {
  cachedProfile = null;
  profileCacheTime = 0;
}

/**
 * Get the active profile's publishable key (for frontend)
 */
export async function getPublishableKey() {
  const profile = await getActiveStripeProfile();
  return profile?.publishable_key || null;
}

/**
 * Get the current Stripe environment (test or live)
 */
export async function getStripeEnvironment() {
  const profile = await getActiveStripeProfile();
  return profile?.environment || 'test';
}

/**
 * Get the active Stripe profile's ID (UUID).
 */
export async function getActiveProfileId() {
  const profile = await getActiveStripeProfile();
  return profile?.id || null;
}

/**
 * Get a user's Stripe data for the active profile.
 * Returns { stripe_customer_id, stripe_subscription_id, payment_method_last4, payment_method_brand } or null.
 */
async function getUserStripeData(userId) {
  const profileId = await getActiveProfileId();
  if (!profileId) return null;

  const result = await query(
    `SELECT stripe_customer_id, stripe_subscription_id, payment_method_last4, payment_method_brand
     FROM user_stripe_data
     WHERE user_id = $1 AND stripe_profile_id = $2`,
    [userId, profileId]
  );

  return result.rows[0] || null;
}

/**
 * Upsert a user's Stripe data for the active profile.
 * Only updates fields that are provided (non-null).
 */
async function upsertUserStripeData(userId, data) {
  const profileId = await getActiveProfileId();
  if (!profileId) {
    console.error('Cannot upsert user Stripe data: no active profile');
    return;
  }

  const { stripe_customer_id, stripe_subscription_id, payment_method_last4, payment_method_brand } = data;

  await query(
    `INSERT INTO user_stripe_data (user_id, stripe_profile_id, stripe_customer_id, stripe_subscription_id, payment_method_last4, payment_method_brand)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, stripe_profile_id) DO UPDATE SET
       stripe_customer_id = COALESCE($3, user_stripe_data.stripe_customer_id),
       stripe_subscription_id = COALESCE($4, user_stripe_data.stripe_subscription_id),
       payment_method_last4 = COALESCE($5, user_stripe_data.payment_method_last4),
       payment_method_brand = COALESCE($6, user_stripe_data.payment_method_brand),
       updated_at = NOW()`,
    [userId, profileId, stripe_customer_id || null, stripe_subscription_id || null, payment_method_last4 || null, payment_method_brand || null]
  );
}

/**
 * Find a user ID by their Stripe customer ID within the active profile.
 * Used by webhook handlers that receive a customer ID from Stripe.
 */
async function findUserByStripeCustomerId(stripeCustomerId) {
  const profileId = await getActiveProfileId();
  if (!profileId) return null;

  const result = await query(
    `SELECT user_id FROM user_stripe_data
     WHERE stripe_profile_id = $1 AND stripe_customer_id = $2`,
    [profileId, stripeCustomerId]
  );

  return result.rows[0]?.user_id || null;
}

// Helper to check if Stripe is configured and get instance
async function ensureStripeConfigured() {
  const stripeInstance = await getStripeInstance();
  if (!stripeInstance) {
    throw new Error('Stripe is not configured. Please configure a Stripe profile in Admin Settings > Stripe.');
  }
  return stripeInstance;
}

/**
 * Get the webhook secret from active profile
 */
async function getWebhookSecret() {
  const profile = await getActiveStripeProfile();
  return profile?.webhook_secret || null;
}

/**
 * Calculate subscription end date based on plan period and duration.
 * Monthly plans use calendar month increments (Jan 23 -> Feb 23),
 * not fixed day counts, to keep billing dates consistent.
 */
function calculateSubscriptionEndDate(period, duration) {
  const endDate = new Date();

  switch (period) {
    case 'month':
      endDate.setMonth(endDate.getMonth() + duration);
      break;
    case 'year':
      endDate.setFullYear(endDate.getFullYear() + duration);
      break;
    case 'week':
      endDate.setDate(endDate.getDate() + (duration * 7));
      break;
    case 'day':
    default:
      endDate.setDate(endDate.getDate() + duration);
      break;
  }

  return endDate;
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(userId, email, fullName) {
  const stripe = await ensureStripeConfigured();

  // Check if user already has a Stripe customer ID for the active profile
  const stripeData = await getUserStripeData(userId);

  if (stripeData?.stripe_customer_id) {
    return stripeData.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: fullName,
    metadata: {
      user_id: userId
    }
  });

  // Store customer ID in junction table for the active profile
  await upsertUserStripeData(userId, { stripe_customer_id: customer.id });

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
  const stripe = await ensureStripeConfigured();
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
  const stripe = await ensureStripeConfigured();

  const stripeData = await getUserStripeData(userId);

  if (!stripeData?.stripe_customer_id) {
    throw new Error('No Stripe customer found for this user');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeData.stripe_customer_id,
    return_url: returnUrl
  });

  return session;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(userId) {
  const stripe = await ensureStripeConfigured();

  const stripeData = await getUserStripeData(userId);

  if (!stripeData?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  const subscription = await stripe.subscriptions.cancel(stripeData.stripe_subscription_id);

  // Update application-level state on users table
  await query(
    'UPDATE users SET is_subscribed = false, cancelled_at = NOW() WHERE id = $1',
    [userId]
  );

  return subscription;
}

/**
 * Verify webhook signature (async to support DB-stored webhook secret)
 */
export async function verifyWebhookSignature(payload, signature) {
  const stripe = await ensureStripeConfigured();
  const endpointSecret = await getWebhookSecret();

  if (!endpointSecret) {
    throw new Error('Webhook secret not configured');
  }

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
    const stripe = await ensureStripeConfigured();

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

      // Also try billing_cycle_anchor as fallback (some API versions use this)
      if (!currentPeriodEnd && subscription.billing_cycle_anchor) {
        console.log(`current_period_end not found, billing_cycle_anchor: ${subscription.billing_cycle_anchor}`);
      }

      // Log available subscription fields for debugging
      console.log(`Subscription fields check: current_period_end=${currentPeriodEnd}, type=${typeof currentPeriodEnd}`);

      let subscriptionEndDate = null;

      // Try to use Stripe's current_period_end if valid
      if (currentPeriodEnd && typeof currentPeriodEnd === 'number') {
        subscriptionEndDate = new Date(currentPeriodEnd * 1000);
        if (isNaN(subscriptionEndDate.getTime())) {
          console.warn(`Invalid date from current_period_end ${currentPeriodEnd}, will use plan duration`);
          subscriptionEndDate = null;
        }
      } else {
        console.log(`current_period_end not available or not a number: ${currentPeriodEnd} (type: ${typeof currentPeriodEnd})`);
      }

      const priceId = subscription.items?.data?.[0]?.price?.id;
      console.log(`Stripe current_period_end result: ${subscriptionEndDate?.toISOString() || 'N/A'}, priceId: ${priceId}`);

      // Get plan from database by stripe_price_id - including period and duration for accurate end date
      let planId = 'premium';
      let planDuration = null;
      let planPeriod = null;
      if (priceId) {
        try {
          const planResult = await query('SELECT plan_id, duration, period FROM subscription_plans WHERE stripe_price_id = $1', [priceId]);
          if (planResult.rows.length > 0) {
            planId = planResult.rows[0].plan_id || 'premium';
            planDuration = planResult.rows[0].duration;
            planPeriod = planResult.rows[0].period;
          }
          console.log(`Plan lookup: found=${planResult.rows.length > 0}, planId=${planId}, duration=${planDuration}, period=${planPeriod}`);
        } catch (dbError) {
          console.error(`Plan lookup failed: ${dbError.message}`);
          // Continue with default planId
        }
      }

      // Calculate subscription end date based on plan period and duration
      // Monthly plans use calendar month increments (Jan 23 -> Feb 23) to keep billing date consistent
      // PRIORITY: Plan-based calculation > Stripe's current_period_end
      let finalEndDate = null;

      if (planDuration && typeof planDuration === 'number' && planPeriod) {
        // Preferred: Use plan duration for accurate billing alignment
        finalEndDate = calculateSubscriptionEndDate(planPeriod, planDuration);
        console.log(`Using plan period=${planPeriod}, duration=${planDuration} for end date: ${finalEndDate.toISOString()}`);
      } else if (subscriptionEndDate) {
        // Fallback: Use Stripe's current_period_end if plan info unavailable
        finalEndDate = subscriptionEndDate;
        console.log(`No plan period/duration found, using Stripe current_period_end: ${finalEndDate.toISOString()}`);
      } else {
        // Last resort: Calculate 30 days from now as a safe default
        finalEndDate = new Date();
        finalEndDate.setDate(finalEndDate.getDate() + 30);
        console.warn(`Neither plan duration nor Stripe current_period_end available, defaulting to 30 days: ${finalEndDate.toISOString()}`);
      }

      console.log(`Updating user ${userId} with: planId=${planId}, endDate=${finalEndDate.toISOString()}, subId=${subscription.id}`);
      let updateResult;
      try {
        // Update application-level subscription state on users table
        updateResult = await query(
          `UPDATE users SET
            is_subscribed = true,
            subscription_plan = $1,
            subscription_end_date = $2,
            subscription_started_at = NOW(),
            user_tier = 'paid',
            tier_updated_at = NOW(),
            updated_at = NOW()
          WHERE id = $3
          RETURNING id, email, is_subscribed`,
          [planId, finalEndDate, userId]
        );
        console.log(`UPDATE query completed, rows affected: ${updateResult.rows.length}`);

        // Store Stripe-specific subscription ID in junction table (per-profile)
        await upsertUserStripeData(userId, { stripe_subscription_id: subscription.id });
      } catch (dbError) {
        console.error(`Database UPDATE failed: ${dbError.message}`);
        console.error(`DB Error details: ${JSON.stringify(dbError)}`);
        throw dbError;
      }

      if (updateResult.rows.length === 0) {
        console.error(`User ${userId} not found in database - subscription update failed!`);
        return;
      }

      console.log(`SUCCESS: Subscription activated for user ${userId} (${updateResult.rows[0].email}), plan: ${planId}, ends: ${finalEndDate.toISOString()}`);
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
  const existingUser = await query('SELECT is_subscribed FROM users WHERE id = $1', [userId]);
  const existingStripeData = await getUserStripeData(userId);
  if (existingUser.rows[0]?.is_subscribed && existingStripeData?.stripe_subscription_id) {
    console.log(`User ${userId} already has active subscription, skipping duplicate update`);
    return;
  }

  // Validate current_period_end exists - retrieve full subscription if missing
  if (!subscription.current_period_end || typeof subscription.current_period_end !== 'number') {
    console.log('Invalid current_period_end in subscription, retrieving full subscription from Stripe');
    try {
      const stripe = await ensureStripeConfigured();
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

  console.log(`handleSubscriptionCreated: current_period_end=${currentPeriodEnd}, type=${typeof currentPeriodEnd}`);

  let subscriptionEndDate = null;
  if (currentPeriodEnd && typeof currentPeriodEnd === 'number') {
    subscriptionEndDate = new Date(currentPeriodEnd * 1000);
    if (isNaN(subscriptionEndDate.getTime())) {
      console.warn(`Invalid date from current_period_end ${currentPeriodEnd}, will use plan duration`);
      subscriptionEndDate = null;
    }
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;

  // Get plan from database by stripe_price_id - including period and duration for accurate end date
  let planId = 'premium';
  let planDuration = null;
  let planPeriod = null;
  if (priceId) {
    const planResult = await query('SELECT plan_id, duration, period FROM subscription_plans WHERE stripe_price_id = $1', [priceId]);
    if (planResult.rows.length > 0) {
      planId = planResult.rows[0].plan_id || 'premium';
      planDuration = planResult.rows[0].duration;
      planPeriod = planResult.rows[0].period;
    }
  }

  // Calculate subscription end date based on plan period and duration
  // PRIORITY: Plan-based calculation > Stripe's current_period_end
  let finalEndDate = null;

  if (planDuration && typeof planDuration === 'number' && planPeriod) {
    finalEndDate = calculateSubscriptionEndDate(planPeriod, planDuration);
    console.log(`Using plan period=${planPeriod}, duration=${planDuration} for end date: ${finalEndDate.toISOString()}`);
  } else if (subscriptionEndDate) {
    finalEndDate = subscriptionEndDate;
    console.log(`No plan info, using Stripe current_period_end: ${finalEndDate.toISOString()}`);
  } else {
    // Default to 30 days if nothing else available
    finalEndDate = new Date();
    finalEndDate.setDate(finalEndDate.getDate() + 30);
    console.warn(`No date source available, defaulting to 30 days: ${finalEndDate.toISOString()}`);
  }

  // Update application-level subscription state on users table
  await query(
    `UPDATE users SET
      is_subscribed = true,
      subscription_plan = $1,
      subscription_end_date = $2,
      subscription_started_at = NOW(),
      user_tier = 'paid',
      tier_updated_at = NOW(),
      updated_at = NOW()
    WHERE id = $3`,
    [planId, finalEndDate, userId]
  );

  // Store Stripe subscription ID in junction table (per-profile)
  await upsertUserStripeData(userId, { stripe_subscription_id: subscription.id });

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

  // Get plan period and duration to calculate accurate end date
  const priceId = subscription.items?.data?.[0]?.price?.id;
  let finalEndDate = subscriptionEndDate;

  if (priceId) {
    try {
      const planResult = await query('SELECT duration, period FROM subscription_plans WHERE stripe_price_id = $1', [priceId]);
      if (planResult.rows.length > 0 && planResult.rows[0].duration && planResult.rows[0].period) {
        const planDuration = planResult.rows[0].duration;
        const planPeriod = planResult.rows[0].period;
        finalEndDate = calculateSubscriptionEndDate(planPeriod, planDuration);
        console.log(`Subscription updated: using period=${planPeriod}, duration=${planDuration} for end date: ${finalEndDate.toISOString()}`);
      }
    } catch (err) {
      console.error(`Failed to lookup plan period/duration: ${err.message}`);
    }
  }

  await query(
    `UPDATE users SET
      is_subscribed = $1,
      subscription_end_date = $2,
      user_tier = $4,
      tier_updated_at = NOW(),
      updated_at = NOW()
    WHERE id = $3`,
    [isActive, finalEndDate, userId, isActive ? 'paid' : 'free']
  );

  console.log(`Subscription updated for user ${userId}, status: ${subscription.status}`);
}

/**
 * Handle subscription deleted/cancelled webhook
 */
export async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.log('No user_id in subscription metadata, skipping');
    return;
  }

  await query(
    `UPDATE users SET
      is_subscribed = false,
      user_tier = 'free',
      tier_updated_at = NOW(),
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = $1`,
    [userId]
  );

  console.log(`Subscription deleted for user ${userId}, tier reset to free`);
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

  // Update user's payment method info in junction table (per-profile)
  if (paymentIntent.charges?.data[0]?.payment_method_details?.card) {
    const card = paymentIntent.charges.data[0].payment_method_details.card;
    await upsertUserStripeData(userId, {
      payment_method_last4: card.last4,
      payment_method_brand: card.brand
    });
  }

  console.log(`Payment succeeded for user ${userId}, amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}`);
}

/**
 * Handle invoice payment succeeded webhook
 */
export async function handleInvoicePaymentSucceeded(invoice) {
  const customerId = invoice.customer;

  // Get user by stripe_customer_id within the active profile
  const userId = await findUserByStripeCustomerId(customerId);

  if (!userId) {
    console.error(`No user found for Stripe customer ${customerId} in active profile`);
    return;
  }

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
  const stripe = await ensureStripeConfigured();

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
  const stripe = await ensureStripeConfigured();

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
  const stripe = await ensureStripeConfigured();

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
  const stripe = await ensureStripeConfigured();

  const price = await stripe.prices.update(priceId, {
    active: false
  });

  console.log(`Archived Stripe price ${priceId}`);
  return price;
}

/**
 * Save a plan's Stripe IDs to the active profile's price_ids JSONB.
 * This keeps each profile's plan mappings in sync.
 */
async function savePlanIdToActiveProfile(planId, stripeProductId, stripePriceId) {
  try {
    const profileResult = await query('SELECT id, price_ids FROM stripe_profiles WHERE is_active = true LIMIT 1');
    if (profileResult.rows.length === 0) return;

    const profile = profileResult.rows[0];
    const priceIds = profile.price_ids || {};
    priceIds[planId] = {
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId
    };

    await query(
      'UPDATE stripe_profiles SET price_ids = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(priceIds), profile.id]
    );
    console.log(`Saved plan ${planId} Stripe IDs to active profile ${profile.id}`);
  } catch (error) {
    console.error('Failed to save plan IDs to active profile:', error.message);
  }
}

/**
 * Master sync function - creates or updates plan in Stripe.
 * Also stores the resulting IDs in the active profile's price_ids for profile switching.
 * Returns { stripe_product_id, stripe_price_id, created, updated }
 */
export async function syncPlanToStripe(planData, options = {}) {
  const stripe = await ensureStripeConfigured();

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

      // Save to active profile
      await savePlanIdToActiveProfile(planData.plan_id, product.id, price.id);

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

      const finalPriceId = price ? price.id : planData.stripe_price_id;

      // Save to active profile
      await savePlanIdToActiveProfile(planData.plan_id, planData.stripe_product_id, finalPriceId);

      return {
        stripe_product_id: planData.stripe_product_id,
        stripe_price_id: finalPriceId,
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
  syncPlanToStripe,
  getPublishableKey,
  getStripeEnvironment,
  getActiveProfileId,
  clearStripeProfileCache
};
