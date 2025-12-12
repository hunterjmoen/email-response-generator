-- Migration: 019_user_hourly_rate
-- Description: Add default hourly rate to users for change order calculations

ALTER TABLE users ADD COLUMN IF NOT EXISTS default_hourly_rate NUMERIC(10, 2) DEFAULT 100.00;

-- Add comment for documentation
COMMENT ON COLUMN users.default_hourly_rate IS 'Default hourly rate used for change order calculations';
