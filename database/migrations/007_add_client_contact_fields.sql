-- Migration: 007_add_client_contact_fields
-- Description: Add phone and website fields to clients table
-- Date: 2025-10-22

ALTER TABLE clients
ADD COLUMN phone VARCHAR(50),
ADD COLUMN website VARCHAR(255);
