-- FreelanceFlow Client Enhancements
-- Migration for tags, priority, and other productivity features

-- Add new fields to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100);

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_clients_priority ON clients (priority);
CREATE INDEX IF NOT EXISTS idx_clients_is_archived ON clients (is_archived);
CREATE INDEX IF NOT EXISTS idx_clients_last_contact_date ON clients (last_contact_date);

-- Function to automatically update health score based on various factors
CREATE OR REPLACE FUNCTION calculate_client_health_score(client_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 50;
    project_count INTEGER;
    active_project_count INTEGER;
    days_since_contact INTEGER;
BEGIN
    -- Get project counts
    SELECT COUNT(*) INTO project_count FROM projects WHERE projects.client_id = client_id;
    SELECT COUNT(*) INTO active_project_count FROM projects WHERE projects.client_id = client_id AND status = 'active';

    -- Calculate days since last contact
    SELECT EXTRACT(DAY FROM NOW() - COALESCE(last_contact_date, created_at)) INTO days_since_contact
    FROM clients WHERE id = client_id;

    -- Base score adjustments
    -- More projects = better score (up to +30)
    IF project_count > 10 THEN
        score := score + 30;
    ELSIF project_count > 5 THEN
        score := score + 20;
    ELSIF project_count > 0 THEN
        score := score + 10;
    END IF;

    -- Active projects boost score (+20)
    IF active_project_count > 0 THEN
        score := score + 20;
    END IF;

    -- Recent contact boosts score
    IF days_since_contact < 7 THEN
        score := score + 15;
    ELSIF days_since_contact < 30 THEN
        score := score + 5;
    ELSIF days_since_contact > 90 THEN
        score := score - 20;
    ELSIF days_since_contact > 180 THEN
        score := score - 40;
    END IF;

    -- Clamp score between 0 and 100
    IF score < 0 THEN
        score := 0;
    ELSIF score > 100 THEN
        score := 100;
    END IF;

    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON public.clients TO authenticated;
