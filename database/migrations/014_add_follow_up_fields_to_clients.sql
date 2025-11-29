-- Migration: 014_add_follow_up_fields_to_clients
-- Description: Add follow-up tracking fields to clients table for smart reminders
-- Date: 2025-11-28

-- Add follow-up interval days (custom per client)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS follow_up_interval_days INTEGER CHECK (follow_up_interval_days IS NULL OR follow_up_interval_days > 0);

-- Add follow-up enabled flag
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS follow_up_enabled BOOLEAN DEFAULT TRUE;

-- Add last reminded timestamp to prevent reminder spam
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;

-- Add index for querying clients needing follow-up
CREATE INDEX IF NOT EXISTS idx_clients_follow_up_enabled ON clients (follow_up_enabled) WHERE follow_up_enabled = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN clients.follow_up_interval_days IS 'Number of days after last contact before follow-up reminder is triggered (null uses system default)';
COMMENT ON COLUMN clients.follow_up_enabled IS 'Whether follow-up reminders are enabled for this client';
COMMENT ON COLUMN clients.last_reminded_at IS 'Timestamp of when user was last reminded to follow up with this client';
