-- Migration: 012_add_missing_subscription_columns
-- Description: Add missing billing_interval, has_used_trial, and cancel_at_period_end columns
-- These columns are required by the Stripe integration but were never added to the schema
-- Date: 2025-11-26

-- Add billing_interval column to track monthly vs annual billing
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_interval TEXT CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'annual'));

-- Add has_used_trial column to prevent multiple free trials
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN NOT NULL DEFAULT false;

-- Add cancel_at_period_end column to track pending cancellations
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN subscriptions.billing_interval IS 'Whether the subscription is billed monthly or annually';
COMMENT ON COLUMN subscriptions.has_used_trial IS 'Whether the user has already used their free trial';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether the subscription will cancel at the end of the current billing period';

-- Also update the status CHECK constraint to include 'trialing' if not already present
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_status_check
CHECK (status IN ('active', 'cancelled', 'past_due', 'expired', 'trialing'));
