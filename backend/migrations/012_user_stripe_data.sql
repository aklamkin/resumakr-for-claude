-- Migration 012: Per-profile Stripe user data
-- Moves environment-specific Stripe IDs from users table to a junction table
-- keyed by (user_id, stripe_profile_id) so test/live profiles don't collide.

CREATE TABLE IF NOT EXISTS user_stripe_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_profile_id UUID NOT NULL REFERENCES stripe_profiles(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    payment_method_last4 VARCHAR(4),
    payment_method_brand VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, stripe_profile_id),
    UNIQUE(stripe_profile_id, stripe_customer_id)
);

-- Index for webhook lookups: find user by (profile_id, customer_id)
CREATE INDEX IF NOT EXISTS idx_user_stripe_data_profile_customer
ON user_stripe_data(stripe_profile_id, stripe_customer_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_stripe_data_user
ON user_stripe_data(user_id);

-- Auto-update updated_at
CREATE TRIGGER update_user_stripe_data_updated_at
BEFORE UPDATE ON user_stripe_data
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data: copy users.stripe_* fields into junction table
-- associated with the currently active profile
INSERT INTO user_stripe_data (user_id, stripe_profile_id, stripe_customer_id, stripe_subscription_id, payment_method_last4, payment_method_brand)
SELECT
    u.id,
    sp.id,
    u.stripe_customer_id,
    u.stripe_subscription_id,
    u.payment_method_last4,
    u.payment_method_brand
FROM users u
CROSS JOIN stripe_profiles sp
WHERE sp.is_active = true
  AND u.stripe_customer_id IS NOT NULL;

-- Mark legacy columns as deprecated (informational only)
COMMENT ON COLUMN users.stripe_customer_id IS 'DEPRECATED: Use user_stripe_data table. Kept for rollback safety.';
COMMENT ON COLUMN users.stripe_subscription_id IS 'DEPRECATED: Use user_stripe_data table. Kept for rollback safety.';
COMMENT ON COLUMN users.payment_method_last4 IS 'DEPRECATED: Use user_stripe_data table. Kept for rollback safety.';
COMMENT ON COLUMN users.payment_method_brand IS 'DEPRECATED: Use user_stripe_data table. Kept for rollback safety.';
