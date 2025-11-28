-- Migration: 015_create_follow_up_templates
-- Description: Create follow_up_templates table for storing pre-written message templates
-- Date: 2025-11-28

-- Create follow_up_templates table
CREATE TABLE follow_up_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    message_template TEXT NOT NULL CHECK (char_length(message_template) >= 10),
    category TEXT NOT NULL CHECK (category IN ('general_checkin', 'project_update', 'payment_reminder', 'proposal_followup', 'reengagement')),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active templates ordering
CREATE INDEX idx_follow_up_templates_active_sort ON follow_up_templates (is_active, sort_order);

-- Index for category filtering
CREATE INDEX idx_follow_up_templates_category ON follow_up_templates (category);

-- Trigger for automatic updated_at
CREATE TRIGGER update_follow_up_templates_updated_at
    BEFORE UPDATE ON follow_up_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (no RLS - these are global templates)
GRANT SELECT ON follow_up_templates TO authenticated;

-- Add comments
COMMENT ON TABLE follow_up_templates IS 'Pre-written follow-up message templates for common scenarios';
COMMENT ON COLUMN follow_up_templates.message_template IS 'Template text with optional placeholders like {client_name}, {project_name}';
COMMENT ON COLUMN follow_up_templates.category IS 'Template category for organization and filtering';
