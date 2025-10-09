# Database Schema

Transform the conceptual data models into concrete Supabase PostgreSQL schemas:

```sql
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
    
    -- Stripe integration
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    
    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,
    monthly_limit INTEGER NOT NULL DEFAULT 10, -- Free tier limit
    usage_reset_date TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()) + interval '1 month',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Response history table with encryption for sensitive data
CREATE TABLE response_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- ENCRYPTED sensitive content (implement application-level encryption)
    original_message_encrypted TEXT NOT NULL,
    selected_response_encrypted TEXT,
    encryption_key_id TEXT NOT NULL,
    
    -- Context and metadata
    context JSONB NOT NULL,
    generated_options JSONB NOT NULL,
    
    -- User feedback
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    refinement_count INTEGER NOT NULL DEFAULT 0,
    
    -- Privacy compliance
    data_retention_date TIMESTAMPTZ NOT NULL DEFAULT NOW() + interval '12 months',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Templates table (system and user-created)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('project_updates', 'scope_discussions', 'payment_reminders', 'timeline_changes', 'deliverables', 'custom')),
    description TEXT NOT NULL,
    system_template BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    default_context JSONB NOT NULL,
    prompt_template TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_users_email ON users USING btree (email);
CREATE INDEX idx_response_history_user_id ON response_history USING btree (user_id);
CREATE INDEX idx_response_history_created_at ON response_history USING btree (created_at);
CREATE INDEX idx_templates_user_id ON templates USING btree (user_id);
CREATE INDEX idx_templates_category ON templates USING btree (category);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data isolation
CREATE POLICY "Users can only access their own data" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access their own subscription" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access system templates and their own custom templates" ON templates
    FOR SELECT USING (system_template = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can only access their own response history" ON response_history
    FOR ALL USING (auth.uid() = user_id);
```
