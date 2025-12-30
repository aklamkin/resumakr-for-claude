-- Add Stripe-specific columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR(4),
  ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR(50);

-- Add Stripe-specific columns to subscription_plans table
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255) UNIQUE;

-- Create payments table for transaction history
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_charge_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL, -- 'succeeded', 'pending', 'failed', 'refunded'
  payment_method_type VARCHAR(50), -- 'card', 'bank_account', etc.
  payment_method_last4 VARCHAR(4),
  payment_method_brand VARCHAR(50),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster payment history lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- Create index on stripe_payment_intent_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- Create subscription_events table for webhook event tracking
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL, -- 'customer.subscription.created', 'invoice.paid', etc.
  subscription_id VARCHAR(255),
  status VARCHAR(50),
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on stripe_event_id to prevent duplicate webhook processing
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);

-- Create index on processed for efficient webhook processing
CREATE INDEX IF NOT EXISTS idx_subscription_events_processed ON subscription_events(processed);

COMMENT ON TABLE payments IS 'Stores payment transaction history from Stripe';
COMMENT ON TABLE subscription_events IS 'Stores Stripe webhook events for subscription lifecycle tracking';
