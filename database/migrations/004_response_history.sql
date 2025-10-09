-- Response History Table Migration
-- Stores AI-generated responses with user context and feedback

-- Response History table for storing AI-generated response data
CREATE TABLE response_history (
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

-- Indexes for performance
CREATE INDEX idx_response_history_user_id ON response_history USING btree (user_id);
CREATE INDEX idx_response_history_created_at ON response_history USING btree (created_at DESC);
CREATE INDEX idx_response_history_context ON response_history USING gin (context);

-- Row Level Security
ALTER TABLE response_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy - users can only access their own response history
CREATE POLICY "Users can only access their own response history" ON response_history
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON response_history TO authenticated;

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic updated_at updates
CREATE TRIGGER response_history_updated_at
    BEFORE UPDATE ON response_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();