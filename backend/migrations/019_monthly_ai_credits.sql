-- Migration 019: Move AI credits from lifetime (users table) to monthly tracking (user_monthly_usage table)
-- AI credits now reset monthly, same as PDF downloads.
-- Free users get 5 AI credits per calendar month.
-- Paid users have unlimited AI credits (not tracked).

-- Add ai_credits_used column to monthly usage table
ALTER TABLE user_monthly_usage ADD COLUMN IF NOT EXISTS ai_credits_used INTEGER DEFAULT 0;
