-- FreelanceFlow Complete Database Schema for Production Deployment
-- This file combines all migrations for deployment to Supabase production

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- Users table with privacy controls
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    industry TEXT,

    -- Communication style preferences (JSONB for flexibility)
    communication_style JSONB NOT NULL DEFAULT '{
        "formality": "professional",
        "tone": "neutral",
        "length": "standard"
    }'::jsonb,

    -- User preferences
    preferences JSONB NOT NULL DEFAULT '{
        "defaultContext": {
            "relationshipStage": "established",
            "projectPhase": "active",
            "urgency": "standard",
            "messageType": "update"
        },
        "emailNotifications": true
    }'::jsonb,

    -- Privacy and GDPR compliance
    privacy_settings JSONB NOT NULL DEFAULT '{
        "styleLearningConsent": false,
        "analyticsConsent": false,
        "marketingConsent": false,
        "dataRetentionPeriod": 12
    }'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'premium')) DEFAULT 'free',
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')) DEFAULT 'active',

    -- Stripe integration (for future use)
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,

    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,
    monthly_limit INTEGER NOT NULL DEFAULT 10, -- Free tier limit
    usage_reset_date TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()) + interval '1 month',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Response History table for storing AI-generated response data
CREATE TABLE IF NOT EXISTS response_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Original user input
    original_message TEXT NOT NULL CHECK (char_length(original_message) >= 10 AND char_length(original_message) <= 2000),

    -- Context data (JSONB for flexible structure)
    context JSONB NOT NULL DEFAULT '{
        "urgency": "standard",
        "formality": "professional",
        "messageType": "update",
        "relationshipStage": "established",
        "projectPhase": "active"
    }'::jsonb,

    -- AI-generated response options (array of response objects)
    generated_options JSONB NOT NULL,

    -- User interaction data
    selected_response INTEGER, -- Index of selected response (0-based)
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,

    -- Template and refinement tracking
    template_used UUID, -- Future reference to template system
    refinement_count INTEGER NOT NULL DEFAULT 0,
    refinement_instructions TEXT,

    -- AI generation metadata
    openai_model TEXT NOT NULL DEFAULT 'gpt-4',
    generation_cost_cents INTEGER, -- Track API costs
    confidence_score DECIMAL(3,2), -- AI confidence in response quality

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_response_history_user_id ON response_history USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_response_history_created_at ON response_history USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_response_history_context ON response_history USING gin (context);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data isolation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can only access their own data' AND tablename = 'users') THEN
        CREATE POLICY "Users can only access their own data" ON users
            FOR ALL USING (auth.uid() = id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can only access their own subscription' AND tablename = 'subscriptions') THEN
        CREATE POLICY "Users can only access their own subscription" ON subscriptions
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can only access their own response history' AND tablename = 'response_history') THEN
        CREATE POLICY "Users can only access their own response history" ON response_history
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'response_history_updated_at') THEN
        CREATE TRIGGER response_history_updated_at
            BEFORE UPDATE ON response_history
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.response_history TO authenticated;