-- Migration: Add account lockout tracking
-- Description: Track failed login attempts and implement account lockout for security

-- Create login_attempts table to track failed login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  client_ip VARCHAR(45) NOT NULL, -- IPv6 support
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for performance
  INDEX idx_login_attempts_email (user_email),
  INDEX idx_login_attempts_ip (client_ip),
  INDEX idx_login_attempts_created_at (created_at)
);

-- Create account_lockouts table to track locked accounts
CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL UNIQUE,
  lockout_until TIMESTAMP WITH TIME ZONE NOT NULL,
  failed_attempts_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_ip VARCHAR(45),
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index for performance
  INDEX idx_account_lockouts_email (user_email),
  INDEX idx_account_lockouts_until (lockout_until)
);

-- Enable Row Level Security
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;

-- Only admins can access these tables (no user access)
-- You can modify this to allow users to see their own lockout status if needed
CREATE POLICY "Service role can access login_attempts" ON login_attempts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access account_lockouts" ON account_lockouts
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_lockouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_lockouts_updated_at
  BEFORE UPDATE ON account_lockouts
  FOR EACH ROW
  EXECUTE FUNCTION update_account_lockouts_updated_at();

-- Create function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_email VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_lockout_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT lockout_until INTO v_lockout_until
  FROM account_lockouts
  WHERE user_email = p_email
  AND lockout_until > NOW();

  RETURN v_lockout_until IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get lockout info
CREATE OR REPLACE FUNCTION get_lockout_info(p_email VARCHAR)
RETURNS TABLE (
  is_locked BOOLEAN,
  lockout_until TIMESTAMP WITH TIME ZONE,
  failed_attempts INTEGER,
  minutes_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.lockout_until > NOW() AS is_locked,
    al.lockout_until,
    al.failed_attempts_count,
    EXTRACT(EPOCH FROM (al.lockout_until - NOW()))::INTEGER / 60 AS minutes_remaining
  FROM account_lockouts al
  WHERE al.user_email = p_email
  AND al.lockout_until > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_email VARCHAR,
  p_ip VARCHAR,
  p_user_agent TEXT,
  p_success BOOLEAN,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO login_attempts (user_email, client_ip, user_agent, success, failure_reason)
  VALUES (p_email, p_ip, p_user_agent, p_success, p_failure_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cleanup old login attempts (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM login_attempts
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE login_attempts IS 'Tracks all login attempts for security monitoring and account lockout';
COMMENT ON TABLE account_lockouts IS 'Tracks accounts that are temporarily locked due to too many failed login attempts';
COMMENT ON FUNCTION is_account_locked IS 'Check if an account is currently locked';
COMMENT ON FUNCTION get_lockout_info IS 'Get detailed lockout information for an account';
COMMENT ON FUNCTION record_login_attempt IS 'Record a login attempt in the database';
COMMENT ON FUNCTION cleanup_old_login_attempts IS 'Cleanup login attempts older than 30 days';
