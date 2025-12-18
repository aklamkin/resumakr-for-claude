-- Add subscription tracking fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS coupon_code_used VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS campaign_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_price NUMERIC(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;

-- Add foreign key for campaign_id
ALTER TABLE users ADD CONSTRAINT fk_users_campaign
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL;
