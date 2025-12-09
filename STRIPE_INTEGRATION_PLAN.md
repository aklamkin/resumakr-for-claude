# Stripe Payment Integration Plan for Resumakr

**Status:** Awaiting Approval
**Created:** December 9, 2025
**Author:** Claude (Planning Document)

---

## Executive Summary

This document outlines a comprehensive plan to integrate Stripe payment processing into Resumakr, enabling users to purchase subscriptions directly through the application. The integration will leverage existing subscription infrastructure while adding secure payment processing, webhook handling, and a seamless checkout experience.

---

## Current State Analysis

### Existing Infrastructure

**Database Schema:**
- `users` table with subscription fields:
  - `is_subscribed` (BOOLEAN)
  - `subscription_plan` (VARCHAR)
  - `subscription_end_date` (TIMESTAMP)
- `subscription_plans` table with:
  - `plan_id`, `name`, `price`, `period`, `duration`
  - `features` (JSONB), `is_popular`, `is_active`
- `coupon_codes` table for discounts
- Full auth system with JWT tokens

**Backend:**
- Express API with `/api/subscriptions/plans` routes
- `requireSubscription` middleware checking subscription status
- User authentication via JWT
- Coupon validation system already in place

**Frontend:**
- Pricing page showing subscription plans
- Admin subscription management UI
- User account settings

### Gaps to Fill

1. **No payment processing** - Currently subscriptions are managed manually
2. **No webhook handling** - No real-time subscription status updates
3. **No payment history** - No record of customer payments
4. **No billing portal** - Users can't manage their subscriptions
5. **No checkout flow** - No payment capture interface

---

## Implementation Plan

### Phase 1: Stripe Setup & Configuration

#### 1.1 Stripe Account Configuration
- [ ] Access existing Stripe account
- [ ] Enable test mode for development
- [ ] Generate API keys (publishable and secret)
- [ ] Configure webhook endpoints
- [ ] Set up products and pricing in Stripe Dashboard

#### 1.2 Environment Variables
Add to `.env` files:
```env
# Backend
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...  # For passing to frontend

# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### 1.3 NPM Dependencies
```bash
# Backend
npm install stripe

# Frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

---

### Phase 2: Database Schema Updates

#### 2.1 New Migration: `002_stripe_integration.sql`

```sql
-- Store Stripe customer IDs
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Link Stripe product IDs to our plans
ALTER TABLE subscription_plans ADD COLUMN stripe_price_id VARCHAR(255) UNIQUE;
ALTER TABLE subscription_plans ADD COLUMN stripe_product_id VARCHAR(255);

-- Payment history table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_invoice_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,  -- succeeded, failed, pending, refunded
    plan_id VARCHAR(50) REFERENCES subscription_plans(plan_id),
    coupon_code VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- Subscription records (for Stripe subscription tracking)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) REFERENCES subscription_plans(plan_id),
    status VARCHAR(50) NOT NULL,  -- active, canceled, past_due, unpaid, trialing
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    trial_end TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Update trigger for new tables
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 2.2 Data Migration Strategy
- Existing subscription_plans need Stripe product/price IDs
- Run script to create Stripe products for each plan
- Update database with Stripe IDs
- Existing subscribed users (if any) need manual migration

---

### Phase 3: Backend Implementation

#### 3.1 Stripe Service Module: `backend/src/services/stripe.js`

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeService = {
  // Customer Management
  async createCustomer(user) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.full_name,
      metadata: { userId: user.id }
    });
    return customer;
  },

  async getCustomer(stripeCustomerId) {
    return await stripe.customers.retrieve(stripeCustomerId);
  },

  // Payment Intents
  async createPaymentIntent(amount, currency, customerId, metadata) {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      metadata,
      automatic_payment_methods: { enabled: true }
    });
  },

  // Subscriptions
  async createSubscription(customerId, priceId, couponCode = null) {
    const params = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {}
    };

    if (couponCode) {
      params.coupon = couponCode;
    }

    return await stripe.subscriptions.create(params);
  },

  async cancelSubscription(stripeSubscriptionId, cancelAtPeriodEnd = true) {
    if (cancelAtPeriodEnd) {
      return await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    } else {
      return await stripe.subscriptions.cancel(stripeSubscriptionId);
    }
  },

  async getSubscription(stripeSubscriptionId) {
    return await stripe.subscriptions.retrieve(stripeSubscriptionId);
  },

  // Billing Portal
  async createBillingPortalSession(customerId, returnUrl) {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });
  },

  // Checkout Sessions (alternative to custom checkout)
  async createCheckoutSession(customerId, priceId, successUrl, cancelUrl, couponCode) {
    const params = {
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {}
      }
    };

    if (couponCode) {
      params.discounts = [{ coupon: couponCode }];
    }

    return await stripe.checkout.sessions.create(params);
  },

  // Products & Prices
  async createProduct(name, description) {
    return await stripe.products.create({ name, description });
  },

  async createPrice(productId, amount, currency, interval) {
    return await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(amount * 100),
      currency,
      recurring: { interval } // 'month' or 'year'
    });
  },

  // Coupons
  async createCoupon(couponData) {
    return await stripe.coupons.create(couponData);
  },

  // Webhooks
  constructEvent(payload, signature, secret) {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }
};
```

#### 3.2 Payment Routes: `backend/src/routes/payments.js`

```javascript
import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { stripeService } from '../services/stripe.js';

const router = express.Router();

// Create/Get Stripe customer
router.post('/customer', authenticate, async (req, res) => {
  try {
    let customerId = req.user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripeService.createCustomer(req.user);
      await query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, req.user.id]
      );
      customerId = customer.id;
    }

    res.json({ customerId });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Create subscription checkout session
router.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { planId, couponCode } = req.body;

    // Get plan details
    const planResult = await query(
      'SELECT * FROM subscription_plans WHERE plan_id = $1 AND is_active = true',
      [planId]
    );
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = planResult.rows[0];

    // Validate coupon if provided
    if (couponCode) {
      const couponResult = await query(
        'SELECT * FROM coupon_codes WHERE code = $1 AND is_active = true',
        [couponCode]
      );
      if (couponResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid coupon code' });
      }
      // Additional validation (expiry, usage limits, applicable plans)
    }

    // Ensure customer exists
    let customerId = req.user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeService.createCustomer(req.user);
      await query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, req.user.id]
      );
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripeService.createCheckoutSession(
      customerId,
      plan.stripe_price_id,
      `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      `${process.env.FRONTEND_URL}/pricing`,
      couponCode
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get user's payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get user's active subscription
router.get('/subscription', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Cancel subscription
router.post('/subscription/cancel', authenticate, async (req, res) => {
  try {
    const { cancelAtPeriodEnd = true } = req.body;

    const result = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = result.rows[0];
    await stripeService.cancelSubscription(
      subscription.stripe_subscription_id,
      cancelAtPeriodEnd
    );

    await query(
      'UPDATE subscriptions SET cancel_at_period_end = $1, canceled_at = NOW() WHERE id = $2',
      [cancelAtPeriodEnd, subscription.id]
    );

    res.json({ message: 'Subscription canceled' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Create billing portal session
router.post('/billing-portal', authenticate, async (req, res) => {
  try {
    if (!req.user.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripeService.createBillingPortalSession(
      req.user.stripe_customer_id,
      `${process.env.FRONTEND_URL}/account/subscription`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

export default router;
```

#### 3.3 Webhook Handler: `backend/src/routes/webhooks.js`

```javascript
import express from 'express';
import { query } from '../config/database.js';
import { stripeService } from '../services/stripe.js';

const router = express.Router();

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripeService.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleSubscriptionUpdate(subscription) {
  const customerId = subscription.customer;
  const userResult = await query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length === 0) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const userId = userResult.rows[0].id;
  const status = subscription.status;
  const isActive = ['active', 'trialing'].includes(status);

  // Upsert subscription record
  await query(
    `INSERT INTO subscriptions (
      user_id, stripe_subscription_id, stripe_customer_id, status,
      current_period_start, current_period_end, cancel_at_period_end
    ) VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6), $7)
    ON CONFLICT (stripe_subscription_id)
    DO UPDATE SET
      status = $4,
      current_period_start = to_timestamp($5),
      current_period_end = to_timestamp($6),
      cancel_at_period_end = $7,
      updated_at = NOW()`,
    [
      userId,
      subscription.id,
      customerId,
      status,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.cancel_at_period_end
    ]
  );

  // Update user subscription status
  await query(
    `UPDATE users SET
      is_subscribed = $1,
      subscription_end_date = to_timestamp($2)
    WHERE id = $3`,
    [isActive, subscription.current_period_end, userId]
  );
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  const userResult = await query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length > 0) {
    const userId = userResult.rows[0].id;

    await query(
      `UPDATE subscriptions SET status = 'canceled', canceled_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );

    await query(
      'UPDATE users SET is_subscribed = false WHERE id = $1',
      [userId]
    );
  }
}

async function handlePaymentSucceeded(invoice) {
  const customerId = invoice.customer;
  const userResult = await query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length > 0) {
    const userId = userResult.rows[0].id;

    // Record payment
    await query(
      `INSERT INTO payments (
        user_id, stripe_payment_intent_id, stripe_invoice_id,
        amount, currency, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        invoice.payment_intent,
        invoice.id,
        invoice.amount_paid / 100,
        invoice.currency,
        'succeeded',
        JSON.stringify({ invoice_number: invoice.number })
      ]
    );
  }
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  const userResult = await query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length > 0) {
    const userId = userResult.rows[0].id;

    // Record failed payment
    await query(
      `INSERT INTO payments (
        user_id, stripe_payment_intent_id, stripe_invoice_id,
        amount, currency, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        invoice.payment_intent,
        invoice.id,
        invoice.amount_due / 100,
        invoice.currency,
        'failed',
        JSON.stringify({
          attempt_count: invoice.attempt_count,
          next_payment_attempt: invoice.next_payment_attempt
        })
      ]
    );

    // TODO: Send email notification about failed payment
  }
}

async function handleCheckoutCompleted(session) {
  // Optional: Handle additional checkout completion logic
  console.log('Checkout completed:', session.id);
}

export default router;
```

#### 3.4 Server Configuration Update: `backend/src/server.js`

```javascript
// Add webhook route BEFORE body parsing middleware
import webhookRoutes from './routes/webhooks.js';
app.use('/api/webhooks', webhookRoutes);

// Then add other body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add payment routes
import paymentRoutes from './routes/payments.js';
app.use('/api/payments', paymentRoutes);
```

#### 3.5 Setup Script: `backend/scripts/setup-stripe-products.js`

```javascript
// Script to sync subscription plans with Stripe products
import { query } from '../src/config/database.js';
import { stripeService } from '../src/services/stripe.js';

async function setupStripeProducts() {
  const result = await query('SELECT * FROM subscription_plans WHERE is_active = true');

  for (const plan of result.rows) {
    if (plan.stripe_product_id && plan.stripe_price_id) {
      console.log(`Plan ${plan.name} already has Stripe IDs`);
      continue;
    }

    // Create Stripe product
    const product = await stripeService.createProduct(
      plan.name,
      JSON.stringify(plan.features)
    );

    // Create Stripe price
    const interval = plan.period.toLowerCase(); // 'month' or 'year'
    const price = await stripeService.createPrice(
      product.id,
      plan.price,
      'usd',
      interval
    );

    // Update database
    await query(
      'UPDATE subscription_plans SET stripe_product_id = $1, stripe_price_id = $2 WHERE id = $3',
      [product.id, price.id, plan.id]
    );

    console.log(`Created Stripe product for ${plan.name}`);
  }

  console.log('Stripe products setup complete');
  process.exit(0);
}

setupStripeProducts().catch(console.error);
```

---

### Phase 4: Frontend Implementation

#### 4.1 Stripe Provider Setup: `frontend/src/contexts/StripeContext.jsx`

```jsx
import { createContext, useContext } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const StripeContext = createContext(null);

export function StripeProvider({ children }) {
  return (
    <StripeContext.Provider value={stripePromise}>
      {children}
    </StripeContext.Provider>
  );
}

export const useStripePromise = () => useContext(StripeContext);
```

#### 4.2 Checkout Component: `frontend/src/components/payment/CheckoutButton.jsx`

```jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import api from '@/api/apiClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export function CheckoutButton({ plan, couponCode, children }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data } = await api.payments.createCheckoutSession(plan.plan_id, couponCode);
      window.location.href = data.url;
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to start checkout',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleCheckout} disabled={loading} className="w-full">
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        children || 'Subscribe'
      )}
    </Button>
  );
}
```

#### 4.3 Success Page: `frontend/src/pages/SubscriptionSuccess.jsx`

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-green-500">
            <CheckCircle className="h-full w-full" />
          </div>
          <CardTitle className="text-2xl">Subscription Activated!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your subscription has been successfully activated. You now have full access to all features.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 4.4 Subscription Management: `frontend/src/pages/SubscriptionManagement.jsx`

```jsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/api/apiClient';
import { useToast } from '@/components/ui/use-toast';

export default function SubscriptionManagement() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const { data } = await api.payments.getSubscription();
      setSubscription(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load subscription',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    try {
      const { data } = await api.payments.createBillingPortalSession();
      window.location.href = data.url;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open billing portal',
        variant: 'destructive'
      });
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      await api.payments.cancelSubscription();
      toast({
        title: 'Success',
        description: 'Subscription will be canceled at the end of the billing period'
      });
      loadSubscription();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive'
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You don't have an active subscription.</p>
          <Button onClick={() => navigate('/pricing')} className="mt-4">
            View Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="font-medium capitalize">{subscription.status}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Period Ends</p>
          <p className="font-medium">
            {new Date(subscription.current_period_end).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleBillingPortal} variant="outline">
            Manage Billing
          </Button>
          {!subscription.cancel_at_period_end && (
            <Button onClick={handleCancel} variant="destructive">
              Cancel Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 4.5 Update API Client: `frontend/src/api/apiClient.js`

```javascript
// Add to api object
payments: {
  async createCheckoutSession(planId, couponCode) {
    const { data } = await client.post('/payments/create-checkout-session', {
      planId,
      couponCode
    });
    return data;
  },

  async getSubscription() {
    const { data } = await client.get('/payments/subscription');
    return data;
  },

  async cancelSubscription(cancelAtPeriodEnd = true) {
    const { data } = await client.post('/payments/subscription/cancel', {
      cancelAtPeriodEnd
    });
    return data;
  },

  async getPaymentHistory() {
    const { data } = await client.get('/payments/history');
    return data;
  },

  async createBillingPortalSession() {
    const { data } = await client.post('/payments/billing-portal');
    return data;
  }
}
```

#### 4.6 Update Pricing Page: `frontend/src/pages/Pricing.jsx`

```jsx
// Add CheckoutButton to each plan card
import { CheckoutButton } from '@/components/payment/CheckoutButton';

// In the plan card rendering:
{isAuthenticated ? (
  <CheckoutButton plan={plan}>
    Subscribe Now
  </CheckoutButton>
) : (
  <Button onClick={() => navigate('/signup')}>
    Get Started
  </Button>
)}
```

---

### Phase 5: Testing Strategy

#### 5.1 Stripe Test Mode
- Use test credit cards: `4242 4242 4242 4242`
- Test payment failures: `4000 0000 0000 0002`
- Test 3D Secure: `4000 0025 0000 3155`

#### 5.2 Test Scenarios

**Successful Subscription Flow:**
1. User selects plan on pricing page
2. Clicks checkout → redirected to Stripe Checkout
3. Enters test card → payment succeeds
4. Redirect to success page
5. Webhook updates database
6. User sees subscription active in account settings

**Coupon Application:**
1. User enters valid coupon code
2. Discount applied at checkout
3. Payment processed with discounted amount
4. Coupon usage count incremented

**Subscription Management:**
1. User accesses billing portal
2. Can update payment method
3. Can view invoices
4. Can cancel subscription
5. Cancellation reflected in UI

**Webhook Handling:**
1. Subscription created → DB updated
2. Payment succeeded → payment recorded
3. Payment failed → user notified
4. Subscription canceled → access revoked

#### 5.3 Edge Cases to Test
- User already has active subscription → prevent duplicate
- Payment fails → show error, allow retry
- Webhook arrives before checkout redirect → handle gracefully
- Multiple rapid subscription attempts → idempotency
- Subscription expires → access automatically revoked

---

### Phase 6: Security Considerations

#### 6.1 Environment Variables
- Never expose secret keys in frontend
- Use separate test/production keys
- Rotate webhook secrets periodically

#### 6.2 Webhook Security
- Verify Stripe signature on all webhook requests
- Use HTTPS for webhook endpoint
- Implement idempotency for webhook handlers

#### 6.3 Payment Security
- Never store card details (Stripe handles this)
- Use Stripe's PCI-compliant hosted checkout
- Validate all amounts server-side

#### 6.4 Access Control
- Verify user owns subscription before canceling
- Prevent subscription status manipulation
- Audit all payment-related actions

---

### Phase 7: Deployment Checklist

#### 7.1 Pre-Production
- [ ] Run database migration on production DB
- [ ] Set production environment variables
- [ ] Create Stripe products in production account
- [ ] Run setup script to link plans with Stripe
- [ ] Configure Stripe webhook in production (point to https://yourdomain.com/api/webhooks/stripe)
- [ ] Test webhook delivery in Stripe Dashboard

#### 7.2 Production Launch
- [ ] Switch from test to production Stripe keys
- [ ] Monitor webhook event logs
- [ ] Set up error alerting for payment failures
- [ ] Configure email notifications for customers
- [ ] Set up Stripe tax collection (if applicable)
- [ ] Enable Stripe Radar for fraud prevention

#### 7.3 Post-Launch Monitoring
- [ ] Track successful payment rate
- [ ] Monitor failed payment reasons
- [ ] Track subscription churn
- [ ] Monitor webhook delivery success rate
- [ ] Review Stripe Dashboard daily for issues

---

## Alternative Approaches Considered

### Option 1: Stripe Elements (Custom Form)
**Pros:**
- Full UI control
- Better branding
- Custom checkout experience

**Cons:**
- More complex implementation
- Additional PCI compliance burden
- More error handling required

**Decision:** Use Stripe Checkout for MVP, consider custom Elements later

### Option 2: Stripe Billing (Legacy)
**Pros:**
- Simpler API

**Cons:**
- Deprecated
- Less flexible
- Missing modern features

**Decision:** Use current Stripe Subscriptions API

### Option 3: One-Time Payments Only
**Pros:**
- Simpler implementation
- No recurring billing complexity

**Cons:**
- Poor user experience
- Manual renewal required
- Lower retention

**Decision:** Implement recurring subscriptions from the start

---

## Timeline Estimate

**Phase 1:** Stripe Setup & Config (2 hours)
**Phase 2:** Database Migration (2 hours)
**Phase 3:** Backend Implementation (8 hours)
**Phase 4:** Frontend Implementation (6 hours)
**Phase 5:** Testing (4 hours)
**Phase 6:** Security Review (2 hours)
**Phase 7:** Deployment (2 hours)

**Total Estimated Time:** 26 hours

**Suggested Schedule:**
- Day 1-2: Backend implementation + database
- Day 3: Frontend implementation
- Day 4: Testing + security review
- Day 5: Deployment + monitoring

---

## Success Metrics

**Technical Metrics:**
- Webhook success rate > 99%
- Payment success rate > 95%
- Checkout completion rate > 80%
- Average checkout time < 2 minutes

**Business Metrics:**
- Subscription conversion rate
- Monthly recurring revenue (MRR)
- Customer lifetime value (LTV)
- Churn rate < 5%

---

## Risk Mitigation

**Risk:** Webhook delivery failures
**Mitigation:** Implement retry logic, monitor webhook logs, set up alerts

**Risk:** Payment disputes/chargebacks
**Mitigation:** Clear refund policy, enable Stripe Radar, track dispute reasons

**Risk:** Database sync issues
**Mitigation:** Implement webhook idempotency, add reconciliation script

**Risk:** PCI compliance violations
**Mitigation:** Never handle card data directly, use Stripe hosted checkout

**Risk:** Unauthorized subscription access
**Mitigation:** Verify subscription status on every protected endpoint

---

## Future Enhancements

**Phase 2 Features:**
1. Custom Stripe Elements checkout for better branding
2. Team/multi-user subscriptions
3. Usage-based billing for AI features
4. Annual plan discounts
5. Free trial periods
6. Promo codes with auto-apply
7. Subscription upgrade/downgrade flow
8. Invoice PDF generation
9. Revenue analytics dashboard
10. Dunning management for failed payments

**Integrations:**
1. Email notifications via SendGrid/Postmark
2. Analytics tracking (Segment, Mixpanel)
3. Customer support integration (Intercom)
4. Accounting sync (QuickBooks, Xero)

---

## Questions for Review

Before implementation, please confirm:

1. **Pricing Strategy:** Are the existing subscription plans final? Any changes to pricing/features?

2. **Tax Collection:** Do we need to collect sales tax? (Stripe Tax can handle this)

3. **Free Trial:** Should users get a free trial period?

4. **Billing Intervals:** Monthly and yearly only, or other periods?

5. **Coupon Strategy:** How should coupons integrate with existing coupon_codes table? Sync with Stripe or keep separate?

6. **Email Notifications:** What email service for subscription notifications? (payment receipts, failed payments, etc.)

7. **Refund Policy:** What's the refund policy? Should we enable automatic proration?

8. **International Payments:** Do we need to support currencies other than USD?

9. **Subscription Features:** Any feature gating based on subscription tier? (e.g., AI provider access, resume limits)

10. **Migration Strategy:** Do you have any existing paid users that need to be migrated?

---

## Approval Required

Please review this plan and provide feedback on:
- Overall architecture and approach
- Any missing requirements
- Timeline and phasing
- Answers to questions above

Once approved, implementation can begin immediately.

---

**Document Version:** 1.0
**Last Updated:** December 9, 2025
