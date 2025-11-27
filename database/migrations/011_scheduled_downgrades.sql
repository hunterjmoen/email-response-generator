-- Migration: 011_scheduled_downgrades
-- Description: Add columns to track scheduled tier downgrades
-- Date: 2025-11-26

-- Add scheduled_tier column to track pending downgrade destination
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS scheduled_tier TEXT CHECK (scheduled_tier IS NULL OR scheduled_tier IN ('free', 'professional', 'premium'));

-- Add scheduled_tier_change_date to track when downgrade takes effect
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS scheduled_tier_change_date TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.scheduled_tier IS 'The tier the user is scheduled to downgrade to at period end (null if no pending downgrade)';
COMMENT ON COLUMN subscriptions.scheduled_tier_change_date IS 'The date when the scheduled tier change will take effect';
