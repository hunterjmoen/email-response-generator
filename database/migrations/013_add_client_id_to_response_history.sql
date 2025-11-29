-- Migration: 013_add_client_id_to_response_history
-- Description: Add client_id foreign key to response_history to link responses to clients
-- Date: 2025-11-28

-- Add client_id column to response_history table
ALTER TABLE response_history
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index for performance on client-based queries
CREATE INDEX IF NOT EXISTS idx_response_history_client_id ON response_history USING btree (client_id);

-- Add comment for documentation
COMMENT ON COLUMN response_history.client_id IS 'Optional reference to the client this response was generated for';
