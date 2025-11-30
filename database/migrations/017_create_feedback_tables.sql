-- Create feedback table for storing user feedback submissions
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'widget',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  category VARCHAR(50),
  message TEXT NOT NULL,
  page_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Create feedback_email_log table to track automated emails sent
CREATE TABLE IF NOT EXISTS feedback_email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email_type)
);

CREATE INDEX IF NOT EXISTS idx_feedback_email_log_user_id ON feedback_email_log(user_id);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_email_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for feedback - users can only see their own feedback
CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for admin/webhook operations)
CREATE POLICY "Service role full access to feedback" ON feedback
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to feedback_email_log" ON feedback_email_log
  FOR ALL USING (auth.role() = 'service_role');
