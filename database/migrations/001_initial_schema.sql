-- FreelanceFlow Initial Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- Users table with privacy controls
CREATE TABLE users (
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
CREATE TABLE subscriptions (
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

-- Performance Indexes
CREATE INDEX idx_users_email ON users USING btree (email);
CREATE INDEX idx_subscriptions_user_id ON subscriptions USING btree (user_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data isolation
CREATE POLICY "Users can only access their own data" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access their own subscription" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Function to automatically create subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create subscription
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;