-- Debug script to check and fix authentication issues
-- Run this in Supabase SQL Editor

-- 1. Check if tables exist and permissions are correct
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'subscriptions');

-- 2. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'subscriptions');

-- 3. Temporarily disable RLS for testing (DANGEROUS - only for debugging)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- 4. Grant all permissions to authenticated users (temporary)
GRANT ALL ON users TO authenticated;
GRANT ALL ON subscriptions TO authenticated;
GRANT USAGE ON SEQUENCE users_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE subscriptions_user_id_seq TO authenticated;

-- 5. Check current auth user
SELECT auth.uid(), auth.role();

-- Note: Re-enable RLS after testing by running:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;