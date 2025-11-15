-- Migration: Add security event logging table
-- Description: Store security events for audit and monitoring purposes

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  client_ip VARCHAR(45) NOT NULL,
  user_agent TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB,
  session_id VARCHAR(255),
  endpoint VARCHAR(255),
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for performance
  INDEX idx_security_events_type (event_type),
  INDEX idx_security_events_user_id (user_id),
  INDEX idx_security_events_email (user_email),
  INDEX idx_security_events_severity (severity),
  INDEX idx_security_events_created_at (created_at),
  INDEX idx_security_events_ip (client_ip),
  INDEX idx_security_events_success (success)
);

-- Enable Row Level Security
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access security events (admin only)
CREATE POLICY "Service role can access security_events" ON security_events
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to log security event
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type VARCHAR,
  p_user_id UUID DEFAULT NULL,
  p_user_email VARCHAR DEFAULT NULL,
  p_client_ip VARCHAR DEFAULT 'unknown',
  p_user_agent TEXT DEFAULT NULL,
  p_severity VARCHAR DEFAULT 'medium',
  p_message TEXT DEFAULT '',
  p_metadata JSONB DEFAULT NULL,
  p_session_id VARCHAR DEFAULT NULL,
  p_endpoint VARCHAR DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_events (
    event_type,
    user_id,
    user_email,
    client_ip,
    user_agent,
    severity,
    message,
    metadata,
    session_id,
    endpoint,
    success
  ) VALUES (
    p_event_type,
    p_user_id,
    p_user_email,
    p_client_ip,
    p_user_agent,
    p_severity,
    p_message,
    p_metadata,
    p_session_id,
    p_endpoint,
    p_success
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get security events summary
CREATE OR REPLACE FUNCTION get_security_events_summary(
  p_hours INTEGER DEFAULT 24,
  p_severity VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  event_type VARCHAR,
  event_count BIGINT,
  severity VARCHAR,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.event_type,
    COUNT(*)::BIGINT AS event_count,
    se.severity,
    ROUND(
      (COUNT(*) FILTER (WHERE se.success = TRUE)::NUMERIC /
      NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
      2
    ) AS success_rate
  FROM security_events se
  WHERE se.created_at > NOW() - (p_hours || ' hours')::INTERVAL
    AND (p_severity IS NULL OR se.severity = p_severity)
  GROUP BY se.event_type, se.severity
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get recent suspicious activities
CREATE OR REPLACE FUNCTION get_recent_suspicious_activities(
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  event_type VARCHAR,
  user_email VARCHAR,
  client_ip VARCHAR,
  severity VARCHAR,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.event_type,
    se.user_email,
    se.client_ip,
    se.severity,
    se.message,
    se.created_at
  FROM security_events se
  WHERE se.severity IN ('high', 'critical')
    OR se.event_type IN ('RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_ACTIVITY', 'UNAUTHORIZED_ACCESS_ATTEMPT')
  ORDER BY se.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cleanup old security events (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep high and critical events for 180 days, others for 90 days
  DELETE FROM security_events
  WHERE (severity IN ('low', 'medium') AND created_at < NOW() - INTERVAL '90 days')
     OR (severity IN ('high', 'critical') AND created_at < NOW() - INTERVAL '180 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes on JSONB metadata for common queries
CREATE INDEX idx_security_events_metadata ON security_events USING GIN (metadata);

COMMENT ON TABLE security_events IS 'Stores all security events for audit and monitoring';
COMMENT ON FUNCTION log_security_event IS 'Log a security event to the database';
COMMENT ON FUNCTION get_security_events_summary IS 'Get summary of security events for the specified time period';
COMMENT ON FUNCTION get_recent_suspicious_activities IS 'Get recent suspicious security activities';
COMMENT ON FUNCTION cleanup_old_security_events IS 'Cleanup old security events (90-180 days)';
