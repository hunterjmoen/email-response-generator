-- FreelanceFlow Client & Project Management
-- Migration for Client and Project tables

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for storing client information
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    notes TEXT,
    -- Denormalized from ResponseContext for easy access
    relationship_stage TEXT NOT NULL DEFAULT 'established' CHECK (relationship_stage IN ('new', 'established', 'difficult', 'long_term')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policy: Users can only manage their own clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access and manage their own clients" ON clients
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_clients_user_id ON clients USING btree (user_id);

-- Table for storing project information
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    -- Denormalized from ResponseContext for easy access
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('discovery', 'active', 'completion', 'maintenance', 'on_hold')),
    budget NUMERIC(10, 2),
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policy: Users can only manage their own projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access and manage their own projects" ON projects
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects USING btree (user_id);
CREATE INDEX idx_projects_client_id ON projects USING btree (client_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.projects TO authenticated;
