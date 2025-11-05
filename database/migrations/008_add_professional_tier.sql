-- Migration: 008_add_professional_tier
-- Description: Add 'professional' tier support to enable three-tier pricing structure
-- Date: 2025-11-04

-- Add 'professional' to the tier CHECK constraint
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_tier_check
CHECK (tier IN ('free', 'professional', 'premium'));

-- Note: Existing data is unaffected as we're only adding a new valid option
-- Monthly limits will be handled at application level:
-- - free: 10
-- - professional: 75
-- - premium: 999999 (unlimited)

