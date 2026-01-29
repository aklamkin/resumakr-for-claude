-- Stripe Profiles for managing test/production environments
-- Allows hot-switching between Stripe environments without server restart

CREATE TABLE IF NOT EXISTS stripe_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('test', 'live')),

    -- Stripe API Keys (encrypted at rest recommended)
    secret_key VARCHAR(255) NOT NULL,
    publishable_key VARCHAR(255) NOT NULL,
    webhook_secret VARCHAR(255),

    -- Price IDs for subscription plans (keyed by plan_id)
    price_ids JSONB DEFAULT '{}',
    -- Example: {"monthly_basic": "price_xxx", "yearly_basic": "price_yyy", "monthly_pro": "price_zzz"}

    -- Product configuration
    product_config JSONB DEFAULT '{}',
    -- Example: {"product_id": "prod_xxx", "tax_behavior": "exclusive", "allow_promotion_codes": true}

    -- Only one profile can be active at a time
    is_active BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Ensure only one active profile at a time using a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_profiles_single_active
ON stripe_profiles (is_active) WHERE is_active = true;

-- Index for quick lookup of active profile
CREATE INDEX IF NOT EXISTS idx_stripe_profiles_active ON stripe_profiles (is_active);

-- Function to ensure only one active profile
CREATE OR REPLACE FUNCTION ensure_single_active_stripe_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE stripe_profiles SET is_active = false WHERE id != NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single active profile
DROP TRIGGER IF EXISTS trigger_single_active_stripe_profile ON stripe_profiles;
CREATE TRIGGER trigger_single_active_stripe_profile
    BEFORE INSERT OR UPDATE ON stripe_profiles
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION ensure_single_active_stripe_profile();

-- Profiles are created via Admin > Stripe settings page.
-- No placeholder data is inserted by this migration.
