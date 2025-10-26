-- Style Learning Migration
-- Adds support for communication style learning and tracking

-- Add a JSONB column to the users table to store the learned style profile
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS style_profile JSONB;

-- Add a column to response_history to track which response was copied
ALTER TABLE public.response_history
ADD COLUMN IF NOT EXISTS copied_response_id TEXT;

-- Add columns to track encrypted data (for security)
ALTER TABLE public.response_history
ADD COLUMN IF NOT EXISTS original_message_encrypted TEXT,
ADD COLUMN IF NOT EXISTS selected_response_encrypted TEXT;

-- Add an index for faster lookup of high-quality responses for a user
CREATE INDEX IF NOT EXISTS idx_response_history_high_rating
ON public.response_history (user_id)
WHERE (user_rating >= 4);

-- Add an index for faster lookup of copied responses
CREATE INDEX IF NOT EXISTS idx_response_history_copied
ON public.response_history (user_id)
WHERE (copied_response_id IS NOT NULL);

-- Add comment for documentation
COMMENT ON COLUMN public.users.style_profile IS 'Learned communication style profile (JSONB): formality, tone, sentenceComplexity, emojiUsage, commonPhrases, structuralHabits, summary';
COMMENT ON COLUMN public.response_history.copied_response_id IS 'ID of the response variant that was copied by the user (indicates strong positive signal)';
COMMENT ON COLUMN public.response_history.original_message_encrypted IS 'Encrypted version of original_message for enhanced security';
COMMENT ON COLUMN public.response_history.selected_response_encrypted IS 'Encrypted version of selected_response for enhanced security';
