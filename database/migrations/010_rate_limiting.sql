-- Rate Limiting Table Migration
-- Stores rate limit tracking for distributed rate limiting

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    count INTEGER NOT NULL DEFAULT 0,
    reset_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by key
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON rate_limits(reset_time);

-- Auto-delete expired entries (older than 24 hours for safety margin)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE reset_time < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (no RLS needed - this is for anonymous rate limiting)
ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY;
GRANT ALL ON rate_limits TO authenticated, anon;

-- Add comment for documentation
COMMENT ON TABLE rate_limits IS 'Distributed rate limiting storage for authentication and API endpoints';
