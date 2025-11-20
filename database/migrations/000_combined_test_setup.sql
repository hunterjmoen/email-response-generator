-- Combined Migration for Test Environment
-- Run this in your test Supabase project's SQL Editor
-- This ensures all required tables, functions, and policies exist

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================
-- TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    industry TEXT,
    communication_style JSONB NOT NULL DEFAULT '{"formality": "professional", "tone": "neutral", "length": "standard"}'::jsonb,
    preferences JSONB NOT NULL DEFAULT '{"defaultContext": {"relationshipStage": "established", "projectPhase": "active", "urgency": "standard", "messageType": "update"}, "emailNotifications": true}'::jsonb,
    privacy_settings JSONB NOT NULL DEFAULT '{"styleLearningConsent": false, "analyticsConsent": false, "marketingConsent": false, "dataRetentionPeriod": 12}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'professional')) DEFAULT 'free',
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')) DEFAULT 'active',
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    monthly_limit INTEGER NOT NULL DEFAULT 10,
    usage_reset_date TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()) + interval '1 month',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Response history table
CREATE TABLE IF NOT EXISTS response_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_message TEXT NOT NULL CHECK (char_length(original_message) >= 10 AND char_length(original_message) <= 2000),
    context JSONB NOT NULL DEFAULT '{"urgency": "standard", "formality": "professional", "messageType": "update", "relationshipStage": "established", "projectPhase": "active"}'::jsonb,
    generated_options JSONB NOT NULL,
    selected_response INTEGER,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    template_used UUID,
    refinement_count INTEGER NOT NULL DEFAULT 0,
    refinement_instructions TEXT,
    openai_model TEXT NOT NULL DEFAULT 'gpt-4',
    generation_cost_cents INTEGER,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_response_history_user_id ON response_history USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_response_history_created_at ON response_history USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_response_history_context ON response_history USING gin (context);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can only access their own data" ON users;
DROP POLICY IF EXISTS "Users can only access their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can only access their own response history" ON response_history;

-- Create RLS policies
CREATE POLICY "Users can only access their own data" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access their own subscription" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own response history" ON response_history
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS response_history_updated_at ON response_history;

-- Create triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER response_history_updated_at
    BEFORE UPDATE ON response_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.response_history TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify everything was created:
-- SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin');
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT proname FROM pg_proc WHERE proname IN ('update_updated_at_column', 'handle_new_user', 'uuid_generate_v4');
