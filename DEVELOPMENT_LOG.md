# Development Log

**Last Updated**: January 19, 2026
**Status**: Stripe integration fully functional with checkout.session.completed webhook fix

---

## Table of Contents

### January 2026
8. [Stripe Webhook Critical Fix - checkout.session.completed](#stripe-webhook-critical-fix---checkoutsessioncompleted)
9. [Subscription Success Redirect Fix](#subscription-success-redirect-fix)
10. [MyResumes React Query Refactor](#myresumes-react-query-refactor)
11. [Marketing Campaigns Removal](#marketing-campaigns-removal)
12. [Stripe Auto-Sync for Subscription Plans](#stripe-auto-sync-for-subscription-plans)

### December 2025
1. [Google OAuth Configuration](#google-oauth-configuration)
2. [OAuth UI Cleanup](#oauth-ui-cleanup)
3. [Stripe Payment Integration](#stripe-payment-integration)
4. [Paywall Protection](#paywall-protection)
5. [Configuration Requirements](#configuration-requirements)
6. [Testing Instructions](#testing-instructions)
7. [Remaining Tasks](#remaining-tasks)

---

# January 2026 Session

**Session Date**: January 19, 2026
**Previous State**: Stripe checkout completed payment but subscription was not being activated
**Current State**: Full payment flow working - checkout → webhook → subscription activation → redirect

---

## Stripe Webhook Critical Fix - checkout.session.completed

### Status: ✅ FIXED

### The Problem

After completing payment through Stripe Checkout, users were redirected back to the app but their subscription was not activated. They would see "Subscribe To Get Started" even after successful payment.

**Root Cause Analysis:**

The webhook handler was missing the `checkout.session.completed` event handler. This is the **primary** event that Stripe fires immediately when a Checkout Session payment succeeds. The existing code only handled `customer.subscription.created`, which has timing issues and relies on metadata that may not always be available.

**Event Flow (Before Fix):**
```
1. User clicks "Continue to Payment"
2. Stripe Checkout opens
3. User completes payment
4. Stripe fires checkout.session.completed    ← NOT HANDLED (BUG!)
5. Stripe fires customer.subscription.created ← Handled but may fail due to timing
6. User redirected to /subscription-success
7. Frontend fetches user data
8. User still shows as unsubscribed
```

**Event Flow (After Fix):**
```
1. User clicks "Continue to Payment"
2. Stripe Checkout opens
3. User completes payment
4. Stripe fires checkout.session.completed    ← NOW HANDLED
5. Database updated: is_subscribed = true
6. User redirected to /subscription-success
7. Frontend fetches user data (now correct)
8. User sees subscription active
```

### The Solution

#### 1. Added checkout.session.completed Handler to Webhook Route

**File:** `backend/src/routes/webhooks.js`

**Change:**
```javascript
// Handle different event types
switch (event.type) {
  case 'checkout.session.completed':
    // This is the primary event for successful Stripe Checkout payments
    await stripeService.handleCheckoutSessionCompleted(event.data.object);
    break;

  case 'customer.subscription.created':
    await stripeService.handleSubscriptionCreated(event.data.object);
    break;
  // ... rest of handlers
}
```

**Why This Event?**
- `checkout.session.completed` fires immediately when payment succeeds
- Contains `client_reference_id` which we set to the user ID during checkout creation
- Contains `subscription` ID which lets us fetch full subscription details
- Is the recommended primary handler for Stripe Checkout integrations

#### 2. Implemented handleCheckoutSessionCompleted Function

**File:** `backend/src/services/stripe.js`

**New Function:**
```javascript
/**
 * Handle checkout.session.completed webhook
 * This is the PRIMARY event for Stripe Checkout - fires immediately when payment succeeds
 */
export async function handleCheckoutSessionCompleted(session) {
  ensureStripeConfigured();

  const userId = session.client_reference_id || session.metadata?.user_id;

  if (!userId) {
    console.error('No user_id in checkout session');
    return;
  }

  console.log(`Processing checkout.session.completed for user ${userId}`);

  // For subscription mode, the subscription is created automatically
  if (session.mode === 'subscription' && session.subscription) {
    // Retrieve the full subscription object from Stripe
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    const priceId = subscription.items.data[0].price.id;

    // Get plan from database by stripe_price_id
    const planResult = await query(
      'SELECT plan_id FROM subscription_plans WHERE stripe_price_id = $1',
      [priceId]
    );
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

    console.log(`Subscription activated for user ${userId}, plan: ${planId}, ends: ${subscriptionEndDate}`);
  } else {
    // For one-time payments (if we ever support them)
    console.log(`Non-subscription checkout completed for user ${userId}`);
  }
}
```

**Key Design Decisions:**

1. **User ID Source Priority:**
   - Primary: `client_reference_id` (set during checkout session creation)
   - Fallback: `metadata.user_id` (also set during creation)
   - This dual approach ensures we always find the user

2. **Full Subscription Retrieval:**
   - The checkout session only contains the subscription ID, not full details
   - We call `stripe.subscriptions.retrieve()` to get period end date, price, etc.
   - This ensures accurate subscription end date calculation

3. **Plan ID Lookup:**
   - Map Stripe's `price_id` back to our internal `plan_id`
   - Fallback to 'premium' if plan not found (graceful degradation)

4. **Comprehensive Database Update:**
   - `is_subscribed = true` - Immediately activates subscription
   - `subscription_plan` - Links to our internal plan
   - `subscription_end_date` - From Stripe's `current_period_end`
   - `stripe_subscription_id` - For future Stripe API calls
   - `subscription_started_at` - Audit trail
   - `updated_at` - Standard timestamp update

#### 3. Added to Service Exports

**File:** `backend/src/services/stripe.js`

```javascript
export default {
  getOrCreateCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription,
  verifyWebhookSignature,
  handleCheckoutSessionCompleted,  // ← Added
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentSucceeded,
  handleInvoicePaymentSucceeded,
  // ... other exports
};
```

### Webhook Event Data Structure

Understanding the data structure is crucial for debugging:

**checkout.session.completed event:**
```json
{
  "id": "cs_test_...",
  "object": "checkout.session",
  "mode": "subscription",
  "client_reference_id": "user-uuid-here",
  "customer": "cus_...",
  "subscription": "sub_...",
  "payment_status": "paid",
  "status": "complete",
  "metadata": {
    "user_id": "user-uuid-here"
  }
}
```

**subscription object (from retrieve call):**
```json
{
  "id": "sub_...",
  "status": "active",
  "current_period_end": 1737504000,
  "items": {
    "data": [{
      "price": {
        "id": "price_...",
        "product": "prod_..."
      }
    }]
  }
}
```

### Why customer.subscription.created Alone Was Insufficient

The existing `handleSubscriptionCreated` handler has a subtle issue:

```javascript
export async function handleSubscriptionCreated(subscription) {
  const userId = subscription.metadata.user_id;  // ← Relies on metadata

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;  // ← Silently fails!
  }
  // ...
}
```

**Problem:** The metadata on the subscription object may not be immediately available or may be empty in some edge cases. The `checkout.session.completed` event is more reliable because:

1. It fires first (before subscription.created in most cases)
2. It has `client_reference_id` which we explicitly set
3. It has a direct reference to the subscription ID for lookup

### Git Commit

```
commit 471d4b93
Fix subscription activation via checkout.session.completed webhook

The core issue was that Stripe Checkout fires checkout.session.completed
as the primary event when payment succeeds, but this event wasn't being
handled. The webhook handler only processed customer.subscription.created
which has timing/metadata issues.

Added handleCheckoutSessionCompleted handler in stripe.js that:
- Extracts user ID from client_reference_id or metadata
- Retrieves the full subscription from Stripe
- Updates user's subscription status in database immediately

This ensures the subscription is activated right when payment completes,
before the user is redirected back to the app.
```

---

## Subscription Success Redirect Fix

### Status: ✅ FIXED

### The Problem

After payment, users were seeing a blank screen with just the sidebar instead of being redirected to My Resumes.

**Root Cause:** Route path mismatch

### The Solution

**File:** `frontend/src/pages/SubscriptionSuccess.jsx`

**Before (Bug):**
```javascript
useEffect(() => {
  const timer = setTimeout(async () => {
    try {
      await queryClient.invalidateQueries(["current-user"]);
      navigate("/my-resumes");  // ← WRONG CASE!
    } catch (err) {
      // ...
    }
  }, 2000);
  return () => clearTimeout(timer);
}, [queryClient, navigate]);
```

**After (Fix):**
```javascript
useEffect(() => {
  const timer = setTimeout(async () => {
    try {
      await queryClient.invalidateQueries(["current-user"]);
      navigate("/MyResumes");  // ← Correct case matches route
    } catch (err) {
      // ...
    }
  }, 2000);
  return () => clearTimeout(timer);
}, [queryClient, navigate]);
```

**Why This Matters:**

React Router routes are case-sensitive. The routes are defined in `pages/index.jsx`:

```javascript
<Route path="/MyResumes" element={<MyResumes />} />
```

Navigating to `/my-resumes` (lowercase) doesn't match any route, resulting in a blank Layout with no content.

---

## MyResumes React Query Refactor

### Status: ✅ FIXED

### The Problem

Even after fixing the redirect, the MyResumes page wasn't reflecting the updated subscription status. Users still saw "Subscribe To Get Started" after successful payment.

**Root Cause:** MyResumes used a separate `api.auth.me()` call in a local `useEffect`, not using React Query's shared cache.

### The Solution

**File:** `frontend/src/pages/MyResumes.jsx`

**Before (Bug):**
```javascript
const [user, setUser] = useState(null);
const [checkingSubscription, setCheckingSubscription] = useState(true);

useEffect(() => {
  const fetchUser = async () => {
    try {
      const userData = await api.auth.me();
      setUser(userData);
    } finally {
      setCheckingSubscription(false);
    }
  };
  fetchUser();
}, []);
```

**After (Fix):**
```javascript
// Use React Query for user data - this ensures we get fresh data after subscription
const { data: currentUser, isLoading: checkingSubscription } = useQuery({
  queryKey: ["current-user"],
  queryFn: () => api.auth.me(),
  staleTime: 0, // Always fetch fresh data
  retry: false,
});

// Compute subscription status from user data
const isSubscribed = React.useMemo(() => {
  if (!currentUser) return false;
  if (currentUser.is_subscribed && currentUser.subscription_end_date) {
    const endDate = new Date(currentUser.subscription_end_date);
    return endDate > new Date();
  }
  return false;
}, [currentUser]);
```

**Why This Matters:**

React Query maintains a shared cache across components. The key insight is:

1. **SubscriptionSuccess.jsx** calls:
   ```javascript
   queryClient.invalidateQueries(["current-user"]);
   ```

2. This invalidates the cache entry for `["current-user"]`

3. **MyResumes.jsx** uses the same query key:
   ```javascript
   useQuery({ queryKey: ["current-user"], ... });
   ```

4. When navigating to MyResumes, React Query automatically fetches fresh data because the cache was invalidated

**Before:** MyResumes fetched user data independently with `useState` + `useEffect`, completely bypassing React Query's cache. The `invalidateQueries` call in SubscriptionSuccess had no effect.

**After:** Both pages share the same React Query cache key, ensuring data consistency across navigation.

### Additional Details

**staleTime: 0** - Forces React Query to always fetch fresh data, never serve stale cache. Critical for subscription status which may have just changed.

**retry: false** - Don't retry failed requests. If the user is logged out, we want to fail fast.

**useMemo for isSubscribed** - Efficiently compute subscription status from user data without re-computing on every render.

---

## Marketing Campaigns Removal

### Status: ✅ COMPLETE

### What Was Removed

The Marketing Campaigns feature was removed entirely from the codebase as it was:
1. Not being used in production
2. Adding complexity to the Stripe checkout flow
3. Conflicting with Stripe's native trial period handling

### Files Deleted

**Backend:**
- `backend/src/routes/campaigns.js` - Campaigns API routes

**Frontend:**
- `frontend/src/pages/SettingsCampaigns.jsx` - Admin campaigns page
- `frontend/src/components/admin/AdminMonetization.jsx` - Admin monetization dashboard

### Files Modified

**Backend:**
- `backend/src/server.js` - Removed campaign route registration
- `backend/src/validators/schemas.js` - Removed campaign validation schemas

**Frontend:**
- `frontend/src/components/Layout.jsx` - Removed "Campaigns" nav item from admin menu
- `frontend/src/pages/index.jsx` - Removed campaigns route
- `frontend/src/api/apiClient.js` - Removed campaign API methods
- `frontend/src/pages/Pricing.jsx` - Removed campaign-related code
- `frontend/src/components/admin/SubscriptionPlanManager.jsx` - Removed campaign references

### Design Decision

**Why Remove Instead of Keep?**

1. **Stripe Native Trials**: Stripe has built-in trial period support through `subscription_data.trial_period_days`. Duplicating this in our app created confusion.

2. **Coupon Codes Suffice**: Marketing discounts are better handled through coupon codes which:
   - Sync with Stripe automatically at checkout
   - Are created/managed in our admin UI
   - Apply real discounts in Stripe (not fake frontend discounts)

3. **Simpler Checkout Flow**: Removing campaign logic simplified:
   - `createCheckoutSession` - No more campaign trial injection
   - `Pricing.jsx` - No more campaign banner/modal
   - Webhook handlers - No campaign-specific logic

### How to Handle Free Trials Now

Configure free trials directly in Stripe:
1. Go to Stripe Dashboard → Products
2. Edit the price and add trial days
3. Or use `subscription_data.trial_period_days` in checkout session creation

### Git Commit

```
commit 9b02b7c3
Remove Marketing Campaigns feature

Campaign removal completed:
- Backend: campaigns.js route deleted, server registration removed, validator schemas cleaned
- Frontend: SettingsCampaigns.jsx and AdminMonetization.jsx deleted, Layout nav item removed
- API client methods removed, routes removed
- Pricing.jsx and SubscriptionPlanManager.jsx cleaned up
```

---

## Stripe Auto-Sync for Subscription Plans

### Status: ✅ COMPLETE

### Overview

Implemented automatic synchronization of subscription plans between the database and Stripe. When plans are created or updated in the admin UI, they are automatically synced to Stripe.

### Implementation Details

**File:** `backend/src/services/stripe.js`

**New Functions:**

```javascript
/**
 * Create a Stripe Product for a subscription plan
 */
export async function createStripeProduct(planData) {
  const product = await stripe.products.create({
    name: planData.name,
    description: `${planData.name} - ${planData.duration} ${planData.period} access`,
    metadata: {
      plan_id: planData.plan_id,
      resumakr_plan: 'true'
    }
  });
  return product;
}

/**
 * Create a Stripe Price for a product
 */
export async function createStripePrice(productId, planData) {
  // Convert period to Stripe interval format
  let interval = 'month';
  let intervalCount = 1;

  if (planData.period === 'day') {
    interval = 'day';
    intervalCount = planData.duration;
  } else if (planData.period === 'week') {
    // ... etc
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(parseFloat(planData.price) * 100),
    currency: 'usd',
    recurring: {
      interval: interval,
      interval_count: intervalCount
    },
    metadata: { plan_id: planData.plan_id }
  });
  return price;
}

/**
 * Master sync function - creates or updates plan in Stripe
 */
export async function syncPlanToStripe(planData, options = {}) {
  // If no Stripe product ID, create new product + price
  if (!planData.stripe_product_id && createIfMissing) {
    product = await createStripeProduct(planData);
    price = await createStripePrice(product.id, planData);
    return { stripe_product_id: product.id, stripe_price_id: price.id, created: true };
  }

  // If has Stripe product ID, update and check if price changed
  if (planData.stripe_product_id) {
    product = await updateStripeProduct(planData.stripe_product_id, planData);

    // Check if price/billing changed - requires new Stripe price
    if (priceChanged || intervalChanged) {
      await archiveStripePrice(planData.stripe_price_id);
      price = await createStripePrice(planData.stripe_product_id, planData);
      return { stripe_price_id: price.id, priceChanged: true };
    }
  }
}
```

### Key Design Decisions

1. **Products vs Prices in Stripe:**
   - Products are the "thing" being sold (e.g., "Weekly Plan")
   - Prices are how much and how often (e.g., "$2.99/week")
   - Stripe allows multiple prices per product

2. **Price Immutability:**
   - Stripe prices cannot be modified (immutable)
   - When price or billing interval changes, we:
     1. Archive the old price (set `active: false`)
     2. Create a new price
     3. Update our database with the new `stripe_price_id`

3. **Metadata Tracking:**
   - All Stripe products/prices include our `plan_id` in metadata
   - Makes it easy to correlate Stripe data with our database
   - `resumakr_plan: 'true'` helps filter our products in Stripe Dashboard

4. **Period Conversion:**
   - Our database stores: `duration: 7`, `period: 'day'`
   - Stripe uses: `interval: 'day'`, `interval_count: 7`
   - Conversion happens in `createStripePrice`

### Usage in Admin UI

**File:** `frontend/src/components/admin/SubscriptionPlanManager.jsx`

When admin saves a plan:
1. Frontend calls `/api/subscriptions/plans` (POST or PUT)
2. Backend saves to database
3. Backend calls `syncPlanToStripe(planData)`
4. Stripe product/price created or updated
5. `stripe_product_id` and `stripe_price_id` saved to database
6. Plan is now available for checkout

### Git Commit

```
commit 79673b4f
Phase 2: Implement Stripe auto-sync for subscription plans
```

---

# December 2025 Session

**Session Date**: December 30, 2025
**Last Documented**: November 28, 2024 (CLAUDE.md)
**Status**: Initial Stripe integration and paywall protection implemented

---

## Google OAuth Configuration

### Status: ✅ COMPLETE

### What Was Done
Google OAuth was already fully implemented in the codebase but required configuration with actual API credentials.

### Implementation Details

**Files Modified:**
- `backend/.env` - Added Google OAuth credentials
- `.env` - Added Google OAuth credentials for docker-compose
- `docker-compose.yml` - Added environment variable passing for OAuth

**Credentials Configured:**
```env
GOOGLE_CLIENT_ID=your_google_client_id_from_console
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_console
SESSION_SECRET=generate_with_openssl_rand_base64_32
BACKEND_URL=http://localhost:3001
```

**Note:** Actual credentials are in the local `.env` files (not committed to Git).

**Infrastructure Already in Place:**
- Passport.js Google OAuth strategy (`backend/src/config/passport.js`)
- OAuth callback routes (`backend/src/routes/auth.js`)
- Database schema with oauth_provider fields (`002_add_oauth_support.sql`)
- Frontend OAuth buttons (`Login.jsx`, `Signup.jsx`)
- Token handling (`AuthCallback.jsx`)

**Documentation Created:**
- `GOOGLE_OAUTH_SETUP.md` - Comprehensive setup guide

### Container Management Learning
- `docker-compose restart` does NOT reload environment variables
- Must use `docker-compose up -d --force-recreate` to load new .env values

---

## OAuth UI Cleanup

### Status: ✅ COMPLETE

### What Was Done
Removed Microsoft, GitHub, and Apple OAuth buttons from login/signup pages as they are not being implemented.

### Files Modified

**`frontend/src/pages/Login.jsx`:**
- Removed Microsoft OAuth button
- Removed GitHub OAuth button
- Removed Apple OAuth button
- Kept only Google OAuth button
- Changed layout from `grid grid-cols-2` to `space-y-3` (single column)
- Updated button text to "Continue with Google"
- Made button full-width

**`frontend/src/pages/Signup.jsx`:**
- Identical changes to Login.jsx

### UI Before/After

**Before:**
```
[Google]  [Microsoft]
[GitHub]  [Apple]
```

**After:**
```
[Continue with Google]  (full-width)
```

---

## Stripe Payment Integration

### Status: ✅ COMPLETE (Backend & Frontend)

### Overview
Replaced the "fake" subscription system (manual activation without payment) with real Stripe Checkout integration. The system now processes actual payments through Stripe's hosted checkout.

---

### Phase 1: Backend Infrastructure

#### 1.1 Package Installation

**Backend:**
```bash
npm install stripe@latest
```

**Frontend:**
```bash
npm install @stripe/stripe-js@latest @stripe/react-stripe-js@latest
```

#### 1.2 Database Migrations

**File Created:** `backend/migrations/005_stripe_integration.sql`

**Tables Modified:**

**users table:**
```sql
ALTER TABLE users
  ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE,
  ADD COLUMN stripe_subscription_id VARCHAR(255),
  ADD COLUMN payment_method_last4 VARCHAR(4),
  ADD COLUMN payment_method_brand VARCHAR(50);
```

**subscription_plans table:**
```sql
ALTER TABLE subscription_plans
  ADD COLUMN stripe_product_id VARCHAR(255),
  ADD COLUMN stripe_price_id VARCHAR(255);
```

**New Tables:**

**payments** - Transaction history:
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL,
  payment_method_type VARCHAR(50),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**subscription_events** - Webhook event tracking:
```sql
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  subscription_id VARCHAR(255),
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.3 Stripe Service Module

**File Created:** `backend/src/services/stripe.js`

**Key Functions:**

```javascript
// Get or create Stripe customer
export async function getOrCreateCustomer(userId, email, fullName)

// Create checkout session for subscription payment
export async function createCheckoutSession({
  userId, email, fullName, priceId,
  successUrl, cancelUrl, couponCode, trialDays
})

// Create billing portal session for subscription management
export async function createBillingPortalSession(userId, returnUrl)

// Cancel user's subscription
export async function cancelSubscription(userId)

// Verify webhook signature
export function verifyWebhookSignature(rawBody, signature)

// Webhook event handlers
export async function handleSubscriptionCreated(subscription)
export async function handleSubscriptionUpdated(subscription)
export async function handleSubscriptionDeleted(subscription)
export async function handlePaymentSucceeded(paymentIntent)
export async function handleInvoicePaymentSucceeded(invoice)
```

**Features:**
- Automatic Stripe customer creation
- Coupon code validation and application
- Trial period support via campaigns
- Metadata tracking (user_id, plan_id, email)
- Idempotent webhook processing

#### 1.4 Payment API Routes

**File Created:** `backend/src/routes/payments.js`

**Endpoints:**

```javascript
POST /api/payments/create-checkout-session
// Creates Stripe Checkout session
// Body: { plan_id, coupon_code?, success_url?, cancel_url? }
// Returns: { sessionId, url }

POST /api/payments/create-billing-portal-session
// Opens Stripe billing portal
// Returns: { url }

POST /api/payments/cancel-subscription
// Cancels active subscription
// Returns: { message }

GET /api/payments/history
// Gets user's payment history
// Returns: Array of payment records
```

**Features:**
- JWT authentication required (`authenticate` middleware)
- Validates subscription plans exist and have `stripe_price_id`
- Increments coupon usage automatically
- Custom success/cancel URLs supported
- Falls back to default URLs if not provided

#### 1.5 Webhook Handler

**File Created:** `backend/src/routes/webhooks.js`

**Endpoint:**
```javascript
POST /api/webhooks/stripe
// Processes Stripe webhook events
// Requires raw body for signature verification
```

**Events Handled:**
- `customer.subscription.created` → Activate subscription
- `customer.subscription.updated` → Update subscription status
- `customer.subscription.deleted` → Deactivate subscription
- `payment_intent.succeeded` → Record payment
- `invoice.payment_succeeded` → Update payment method
- `invoice.payment_failed` → Log failure
- `customer.subscription.trial_will_end` → Log reminder

**Features:**
- Signature verification with `STRIPE_WEBHOOK_SECRET`
- Duplicate event prevention (checks `subscription_events` table)
- Event storage for audit trail
- Marks events as processed after handling

**Critical Implementation Detail:**
```javascript
// In server.js - MUST come before express.json()
app.use('/api/webhooks', webhookRoutes);
app.use(express.json({ limit: '10mb' }));
```

Webhook route MUST be registered BEFORE `express.json()` because Stripe signature verification requires the raw request body.

#### 1.6 Server Configuration

**File Modified:** `backend/src/server.js`

**Changes:**
```javascript
import paymentRoutes from './routes/payments.js';
import webhookRoutes from './routes/webhooks.js';

// CRITICAL ORDER: webhooks before express.json()
app.use('/api/webhooks', webhookRoutes);
app.use(express.json({ limit: '10mb' }));

// Register payment routes
app.use('/api/payments', paymentRoutes);
```

#### 1.7 Environment Configuration

**Files Modified:**
- `backend/.env.example`
- `.env.example`
- `docker-compose.yml`

**Environment Variables Added:**
```env
# Backend
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend (via docker-compose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Docker Compose:**
```yaml
backend:
  environment:
    STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY}
    STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
```

---

### Phase 2: Frontend Integration

#### 2.1 Pricing Page Updates

**File Modified:** `frontend/src/pages/Pricing.jsx`

**Removed:**
- Fake payment form fields (card number, expiry, CVV, ZIP code)
- "Do NOT renew automatically" checkbox
- ZIP code validation logic (`handleZipCodeChange`, `handleZipCodePaste`)
- Conditional "Let Me In!" button
- State variables: `cardNumber`, `expiryDate`, `cvv`, `zipCode`, `doNotRenew`, `showButton`

**Added/Updated:**

```javascript
const handleActivateSubscription = async () => {
  if (!currentUser) {
    navigate('/login?returnUrl=Pricing');
    return;
  }

  setActivating(true);
  try {
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

    const response = await fetch('/api/payments/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('resumakr_token')}`
      },
      body: JSON.stringify({
        plan_id: selectedPlan,
        coupon_code: appliedCoupon?.code || null,
        success_url: `${frontendUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/pricing?canceled=true`
      })
    });

    const data = await response.json();
    window.location.href = data.url; // Redirect to Stripe Checkout
  } catch (err) {
    alert(err.message || "Failed to start checkout. Please try again.");
    setActivating(false);
  }
};
```

**New UI:**
```jsx
<Button
  onClick={handleActivateSubscription}
  disabled={activating}
  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600..."
>
  {activating ? (
    <>
      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      Processing...
    </>
  ) : (
    <>
      <CreditCard className="w-5 h-5 mr-2" />
      Continue to Payment
    </>
  )}
</Button>
<p className="text-xs text-slate-500 text-center mt-3">
  Secure payment powered by Stripe
</p>
```

**Coupon Code Feature:**
- Retained existing coupon code validation
- Integrated with Stripe Checkout session creation
- Shows discount in price breakdown before checkout

#### 2.2 Subscription Success Page

**File Created:** `frontend/src/pages/SubscriptionSuccess.jsx`

**Features:**
- Animated success confirmation with Framer Motion
- 2-second verification delay (waits for webhook processing)
- Auto-refreshes user data via `queryClient.invalidateQueries`
- Shows premium features unlocked
- Displays session ID for reference
- "Start Building Resumes" CTA button
- Error handling with user-friendly messages

**Route:** `/subscription-success?session_id={CHECKOUT_SESSION_ID}`

**UI Components:**
- Green checkmark animation
- Premium features list
- Session ID display
- Navigate to MyResumes button

#### 2.3 Route Registration

**File Modified:** `frontend/src/pages/index.jsx`

**Changes:**
```javascript
import SubscriptionSuccess from "./SubscriptionSuccess";

// In Routes:
<Route path="/subscription-success" element={<SubscriptionSuccess />} />
```

---

### Test Discount Code

**Status:** ✅ CREATED

**Database Record:**
```sql
INSERT INTO coupon_codes (
  code,
  description,
  discount_type,
  discount_value,
  applicable_plans,
  is_active,
  max_uses
) VALUES (
  'TESTFREE',
  'Test discount code - 100% off for development and testing',
  'percentage',
  100.00,
  '[]',
  true,
  999999
);
```

**Usage:**
- Enter `TESTFREE` at checkout
- Provides 100% discount
- Works for all plans
- Unlimited uses (999,999 max)
- Perfect for testing complete checkout flow without charges

---

## Paywall Protection

### Status: ✅ COMPLETE (Backend)

### Overview
Implemented comprehensive subscription-required paywall to prevent circumvention while supporting marketing campaign free trials.

---

### Paywall Model

**Previous (Removed):**
- ❌ Free users: 1 resume limit
- ❌ Subscribed users: Unlimited resumes

**Current (Implemented):**
- ✅ Subscription required for ALL resume operations
- ✅ Marketing campaigns provide free trial periods
- ✅ No resume limits - just subscription check

---

### Protected Routes

#### 1. Resume Operations
**File:** `backend/src/routes/resumes.js`

**Protection:**
```javascript
router.use(authenticate);
router.use(requireSubscription); // All resume operations require subscription
```

**Protected Endpoints:**
- `GET /api/resumes` - List all user's resumes
- `GET /api/resumes/:id` - Get resume details
- `POST /api/resumes` - Create new resume
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

#### 2. Resume Data Operations
**File:** `backend/src/routes/resumeData.js`

**Protection:**
```javascript
router.use(authenticate);
router.use(requireSubscription); // Resume data operations require subscription
```

**Protected Endpoints:**
- `GET /api/resume-data/by-resume/:resumeId` - Get resume content
- `POST /api/resume-data` - Create resume data
- `PUT /api/resume-data/:id` - Update resume data

**Protected Fields:**
- personal_info, professional_summary, work_experience
- education, skills, certifications, projects, languages
- job_description, template settings, cover letters
- ai_metadata, ats_analysis_results

#### 3. Version History
**File:** `backend/src/routes/versions.js`

**Protection:**
```javascript
router.use(authenticate);
router.use(requireSubscription); // Version history is a premium feature
```

**Protected Endpoints:**
- `GET /api/versions` - List versions
- `POST /api/versions` - Create version snapshot
- `PUT /api/versions/:id` - Update version
- `DELETE /api/versions/:id` - Delete version

#### 4. AI Features
**File:** `backend/src/routes/ai.js`

**Protection:**
```javascript
router.use(authenticate);
router.use(requireSubscription); // Existing protection
```

**Protected Endpoints:**
- All AI improvement endpoints
- ATS analysis
- Cover letter generation
- Job description tailoring

---

### Subscription Validation Logic

**File:** `backend/src/middleware/auth.js`

```javascript
export const requireSubscription = async (req, res, next) => {
  // Check subscription flag
  if (!req.user.is_subscribed) {
    return res.status(403).json({
      error: 'Active subscription required'
    });
  }

  // Check expiration date
  if (req.user.subscription_end_date) {
    const endDate = new Date(req.user.subscription_end_date);
    if (endDate < new Date()) {
      // Auto-expire subscription
      await query(
        'UPDATE users SET is_subscribed = false WHERE id = $1',
        [req.user.id]
      );
      return res.status(403).json({
        error: 'Subscription expired'
      });
    }
  }

  next();
};
```

**Features:**
- Validates `is_subscribed` flag
- Checks `subscription_end_date` against current date
- Auto-updates expired subscriptions to `is_subscribed = false`
- Returns 403 with clear error message

---

### Trial Support (Updated January 2026)

**Note:** Marketing Campaigns feature was removed. Free trials are now handled directly through Stripe.

**How to Configure Free Trials:**

1. **Via Stripe Dashboard:**
   - Go to Stripe Dashboard → Products
   - Edit the price and add trial days

2. **Via Checkout Session (programmatic):**
```javascript
// In stripe.js createCheckoutSession()
sessionParams.subscription_data = {
  trial_period_days: 7  // 7 days free
};
```

**How It Works:**
1. User completes checkout with trial period configured
2. Stripe creates subscription with `status: 'trialing'`
3. `checkout.session.completed` webhook fires
4. Our handler activates subscription immediately
5. User has access during trial
6. Stripe auto-charges when trial ends
7. If payment fails, `customer.subscription.deleted` webhook updates our database

---

### Error Response Format

**Standard Error:**
```json
{
  "error": "Active subscription required"
}
```

**With Flag (Optional):**
```json
{
  "error": "Resume limit reached. Upgrade to Premium to create unlimited resumes.",
  "requiresSubscription": true
}
```

Frontend can detect `requiresSubscription` flag to show upgrade prompts.

---

## Configuration Requirements

### Environment Variables Needed

**Backend `.env`:**
```env
# Database
DATABASE_URL=postgresql://resumakr_user:your_password@localhost:5432/resumakr
DB_PASSWORD=your_password

# JWT
JWT_SECRET=generate_with_openssl_rand_base64_32
SESSION_SECRET=generate_with_openssl_rand_base64_32

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Root `.env`:**
```env
DB_PASSWORD=your_secure_database_password
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Important:** `.env` files are in `.gitignore` and should NEVER be committed to Git.

---

### Stripe Configuration Steps

1. **Create Stripe Account:**
   - Go to https://dashboard.stripe.com/register
   - Use test mode for development

2. **Get API Keys:**
   - Dashboard → Developers → API Keys
   - Copy Publishable Key (`pk_test_...`)
   - Copy Secret Key (`sk_test_...`)

3. **Create Products & Prices:**
   ```sql
   -- Update subscription_plans with Stripe IDs
   UPDATE subscription_plans
   SET stripe_product_id = 'prod_...',
       stripe_price_id = 'price_...'
   WHERE plan_id = 'weekly';
   ```

4. **Configure Webhook:**
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events:
     - **`checkout.session.completed`** ← CRITICAL: Primary handler for Stripe Checkout
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `payment_intent.succeeded`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.trial_will_end`
   - Copy Webhook Secret (`whsec_...`)

5. **Test Mode:**
   - Use Stripe test cards: https://stripe.com/docs/testing
   - Test card: `4242 4242 4242 4242`
   - Any future expiry, any 3-digit CVC

---

## Testing Instructions

### 1. Test Stripe Checkout Flow

**Steps:**
1. Start application: `docker-compose up -d`
2. Navigate to http://localhost:5173/pricing
3. Click "Select Plan" on any plan
4. Enter coupon code `TESTFREE` (100% off)
5. Click "Continue to Payment"
6. You'll be redirected to Stripe Checkout
7. Use test card: `4242 4242 4242 4242`
8. Complete checkout
9. Verify redirect to `/subscription-success`
10. Check database: User should have `is_subscribed = true`

**Verification Queries:**
```sql
-- Check user subscription
SELECT email, is_subscribed, subscription_end_date, stripe_customer_id
FROM users WHERE email = 'test@example.com';

-- Check payment record
SELECT * FROM payments WHERE user_id = 'user-id';

-- Check subscription events
SELECT event_type, processed, created_at
FROM subscription_events
ORDER BY created_at DESC
LIMIT 5;
```

### 2. Test Paywall Protection

**Without Subscription:**
```bash
# Try to create resume (should fail with 403)
curl -X POST http://localhost:3001/api/resumes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Resume", "source_type": "upload"}'

# Expected response:
{"error": "Active subscription required"}
```

**With Subscription:**
```bash
# Create resume (should succeed)
curl -X POST http://localhost:3001/api/resumes \
  -H "Authorization: Bearer $SUBSCRIBED_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Resume", "source_type": "upload"}'

# Expected response:
{"id": "...", "title": "Test Resume", ...}
```

### 3. Test Webhook Processing

**Using Stripe CLI:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger payment_intent.succeeded
```

**Check Processing:**
```sql
SELECT * FROM subscription_events
WHERE processed = true
ORDER BY created_at DESC;
```

### 4. Test Trial Period

**Create Campaign with Trial:**
```sql
INSERT INTO marketing_campaigns (
  name,
  target_plan,
  free_trial_duration,
  is_active
) VALUES (
  'New Year Trial',
  'weekly',
  7,
  true
);
```

**Subscribe through Campaign:**
1. Navigate to pricing page
2. Campaign banner should show "7 days FREE trial!"
3. Complete checkout
4. Verify `subscription_end_date` is 7 days + billing period from now

---

## Remaining Tasks

### 1. Frontend Paywall Components
**Status:** ⏳ PENDING

**Tasks:**
- [ ] Create subscription upgrade prompt component
- [ ] Add "Upgrade to Premium" banners in protected areas
- [ ] Show subscription status indicator in navigation
- [ ] Display subscription expiry countdown
- [ ] Add billing portal link in account settings
- [ ] Handle 403 errors with upgrade prompts
- [ ] Add feature comparison table

**Suggested Locations:**
- MyResumes page: "Upgrade to create more resumes"
- Resume editor: Premium feature badges
- Version history: "Premium feature - Subscribe to access"
- Account settings: Subscription status card with manage button

### 2. End-to-End Testing
**Status:** ⏳ PENDING

**Test Cases:**
- [ ] Complete signup → subscribe → checkout → success flow
- [ ] Test coupon code application in checkout
- [ ] Verify webhook processing updates user subscription
- [ ] Test subscription expiration (manual date change)
- [ ] Verify auto-renewal (Stripe test mode)
- [ ] Test subscription cancellation
- [ ] Test billing portal access
- [ ] Verify paywall blocks unsubscribed users
- [ ] Test campaign trial flow
- [ ] Test payment failure handling

### 3. Production Configuration
**Status:** ⏳ PENDING

**Tasks:**
- [ ] Add production Stripe keys to environment
- [ ] Configure production webhook endpoint
- [ ] Set up Stripe live mode products/prices
- [ ] Update subscription_plans with live Stripe IDs
- [ ] Configure domain in Stripe dashboard
- [ ] Set up SSL for webhook endpoint
- [ ] Configure CORS for production frontend URL
- [ ] Test production webhook delivery
- [ ] Set up Stripe webhook monitoring/alerts

### 4. Documentation
**Status:** ⏳ PENDING

**Tasks:**
- [ ] User guide for subscription management
- [ ] Admin guide for managing plans/coupons
- [ ] Webhook troubleshooting guide
- [ ] Stripe test mode vs production guide
- [ ] FAQ for subscription questions

---

## Git Commits Reference

**Relevant Commits (January 2026):**

1. `471d4b93` - **Fix subscription activation via checkout.session.completed webhook** (CRITICAL)
2. `a962b47a` - Fix SubscriptionSuccess redirect and MyResumes React Query refactor
3. `9b02b7c3` - Remove Marketing Campaigns feature
4. `79673b4f` - Phase 2: Implement Stripe auto-sync for subscription plans
5. `d4102366` - Fix sidebar footer positioning
6. `db030120` - Fix system theme mode to respect system preference
7. `950dac02` - Fix sidebar user info to stick to bottom
8. `29373b71` - Fix theme persistence and add user info to sidebar

**Relevant Commits (Dec 30, 2025):**

1. `068f565d` - Implement Stripe payment backend infrastructure
2. `735172a0` - Update Pricing page to use real Stripe Checkout
3. `9c732062` - Implement paywall protection on API endpoints
4. `446f0c1f` - Update paywall to require subscription for all features

**Files Changed (January 2026):**
- `backend/src/routes/webhooks.js` - Added checkout.session.completed handler
- `backend/src/services/stripe.js` - Added handleCheckoutSessionCompleted function
- `frontend/src/pages/SubscriptionSuccess.jsx` - Fixed route case
- `frontend/src/pages/MyResumes.jsx` - Refactored to use React Query
- Multiple files - Removed Marketing Campaigns feature

**Files Changed (December 2025):**
- Backend: 8 files modified, 5 files created
- Frontend: 3 files modified, 1 file created
- Migrations: 1 file created
- Documentation: 1 file created (GOOGLE_OAUTH_SETUP.md)

---

## Key Architectural Decisions

### 1. Subscription Model Choice
**Decision:** Subscription-required (not freemium with limits)

**Rationale:**
- Cleaner codebase (no limit tracking logic)
- Better security (single subscription check)
- Marketing campaigns handle trials
- Aligns with SaaS best practices

### 2. Stripe Checkout vs Elements
**Decision:** Stripe Checkout (hosted)

**Rationale:**
- Faster implementation
- PCI compliance handled by Stripe
- Mobile-optimized UI
- Built-in payment method support
- Easier to maintain

**Trade-off:** Less UI customization vs Elements

### 3. Webhook Event Storage
**Decision:** Store all events in subscription_events table

**Rationale:**
- Audit trail for debugging
- Prevents duplicate processing
- Allows event replay if needed
- Supports compliance requirements

### 4. Middleware-Based Paywall
**Decision:** Use middleware for subscription checks

**Rationale:**
- DRY principle (define once, apply everywhere)
- Consistent error responses
- Easy to apply to route groups
- Centralized logic updates

---

## Known Limitations & Future Improvements

### Current Limitations

1. **No Proration Handling:**
   - Plan changes don't calculate prorated amounts
   - Future: Implement Stripe subscription schedule API

2. **Single Subscription Per User:**
   - Users can only have one active subscription
   - Future: Support multiple subscriptions (team plans)

3. **Basic Error Handling:**
   - Generic error messages in frontend
   - Future: Parse Stripe errors for user-friendly messages

4. **No Invoice Management:**
   - Users can't view/download invoices in-app
   - Future: Integrate Stripe invoices API

5. **No Failed Payment Recovery:**
   - No retry logic or dunning emails
   - Future: Implement Stripe Smart Retries

### Future Enhancements

1. **Subscription Analytics:**
   - MRR tracking dashboard
   - Churn rate analysis
   - Cohort analysis

2. **Advanced Coupon Features:**
   - Referral codes
   - Partner discount codes
   - Automatic coupon application via URL params

3. **Team/Organization Plans:**
   - Multiple users per subscription
   - Role-based access control
   - Usage tracking per team member

4. **Metered Billing:**
   - Pay-per-use for AI features
   - Usage-based pricing tiers

5. **Self-Service Portal:**
   - In-app invoice viewing
   - Payment method management
   - Subscription upgrade/downgrade

---

## Critical Files for Next Developer

### Must Read First:
1. `DEVELOPMENT_LOG.md` (this file) - Complete context
2. `CLAUDE.md` - Project architecture overview
3. `backend/src/services/stripe.js` - Payment logic
4. `backend/src/middleware/auth.js` - Subscription validation

### Key Configuration:
1. `.env.example` - Required environment variables
2. `docker-compose.yml` - Service orchestration
3. `backend/migrations/005_stripe_integration.sql` - Database schema

### Testing Resources:
1. `TESTFREE` coupon code - 100% off testing
2. Stripe test cards: https://stripe.com/docs/testing
3. Webhook test events: Use Stripe CLI

### Debugging Tips:
1. Check backend logs: `docker-compose logs -f backend`
2. Check webhook events table: `SELECT * FROM subscription_events`
3. Verify Stripe dashboard for checkout sessions
4. Use Stripe CLI for local webhook testing

---

## Questions for Next Developer

If you're picking up this work, consider:

1. **Stripe Configuration:**
   - Do you have Stripe test mode keys?
   - Have you configured webhook endpoint?
   - Are subscription_plans populated with stripe_price_id?

2. **Environment Setup:**
   - Are all .env variables set?
   - Did you recreate containers after .env changes?
   - Is the database migration applied?

3. **Testing:**
   - Can you access http://localhost:5173/pricing?
   - Does the checkout redirect to Stripe?
   - Are webhooks being received (check subscription_events)?

4. **Frontend Integration:**
   - Should we add upgrade prompts to specific pages?
   - What should the subscription status UI look like?
   - Where should billing portal link appear?

---

## Summary for Claude/AI

**What's Done (as of January 19, 2026):**
- ✅ Google OAuth configured and working
- ✅ Stripe backend completely implemented
- ✅ Stripe frontend checkout flow complete
- ✅ **checkout.session.completed webhook handler** - CRITICAL FIX
- ✅ Paywall protection on all API endpoints
- ✅ Test discount code created (`TESTFREE`)
- ✅ Database migrations applied
- ✅ Webhooks handling subscription lifecycle
- ✅ Marketing Campaigns feature removed (simplified)
- ✅ Stripe auto-sync for subscription plans
- ✅ React Query cache consistency for user data

**What's Left:**
- ⏳ Frontend paywall UI components
- ⏳ Production Stripe configuration

**Quick Start for Testing:**
1. Set Stripe keys in `.env`
2. Restart containers: `docker-compose up -d --force-recreate`
3. Use coupon code `TESTFREE` at checkout
4. Test card: `4242 4242 4242 4242`

**Critical Context:**
- **Webhook order matters**: `checkout.session.completed` is the PRIMARY handler, not `customer.subscription.created`
- Paywall model is subscription-required (not freemium)
- Free trials are handled via Stripe (not marketing campaigns)
- All resume operations protected
- Webhook processing is idempotent
- React Query `["current-user"]` key is shared across pages
- Route paths are case-sensitive (`/MyResumes` not `/my-resumes`)
- .env files are in .gitignore (don't commit!)

---

## Troubleshooting Guide

### Problem: Subscription not activating after payment

**Symptoms:**
- User completes Stripe Checkout successfully
- Redirected to app but still shows "Subscribe To Get Started"
- Database shows `is_subscribed = false`

**Check:**
1. **Webhook received?**
   ```sql
   SELECT * FROM subscription_events
   WHERE event_type = 'checkout.session.completed'
   ORDER BY created_at DESC LIMIT 5;
   ```

2. **Webhook processed?**
   - Check backend logs for: `Processing checkout.session.completed for user {userId}`
   - If missing, webhook handler may not be registered

3. **client_reference_id present?**
   - Check the event data in `subscription_events.data`
   - Must have `client_reference_id` set to user UUID

4. **Stripe webhook secret correct?**
   - Error in logs: `Webhook Error: No signatures found matching the expected signature`
   - Solution: Update `STRIPE_WEBHOOK_SECRET` in `.env`

### Problem: Blank screen after payment redirect

**Symptoms:**
- Payment completes
- Redirected to app
- Shows Layout (sidebar) but no page content

**Check:**
1. **Route case sensitivity:**
   - Must navigate to `/MyResumes` not `/my-resumes`
   - React Router is case-sensitive

2. **Console errors:**
   - Check browser console for navigation errors

### Problem: Subscription status not updating in UI

**Symptoms:**
- Database shows `is_subscribed = true`
- UI still shows unsubscribed state

**Check:**
1. **React Query cache invalidation:**
   - `SubscriptionSuccess.jsx` must call `queryClient.invalidateQueries(["current-user"])`
   - Target page must use same query key: `useQuery({ queryKey: ["current-user"], ... })`

2. **staleTime setting:**
   - Should be `staleTime: 0` to always fetch fresh data

### Problem: Webhook signature verification fails

**Symptoms:**
- Webhook endpoint returns 400
- Error: `Webhook Error: Webhook signature verification failed`

**Check:**
1. **Raw body middleware order:**
   ```javascript
   // In server.js - MUST come before express.json()
   app.use('/api/webhooks', webhookRoutes);
   app.use(express.json({ limit: '10mb' }));
   ```

2. **Stripe webhook secret:**
   - Must match the webhook endpoint's secret from Stripe Dashboard
   - Different secrets for test vs production

---

**Last Updated:** January 19, 2026
**Next Session Should Start With:** Production configuration and deployment testing
