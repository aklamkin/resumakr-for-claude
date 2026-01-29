-- Migration 020: Move monthly usage counters from user_monthly_usage to users table.
-- This eliminates a separate table lookup on every credit check.
-- The usage_period column (YYYY-MM) acts as a lazy reset: when the month changes,
-- counters are reset to 0 on the next authenticated request.

ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_period VARCHAR(7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_credits_used_this_period INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pdf_downloads_this_period INTEGER DEFAULT 0;
