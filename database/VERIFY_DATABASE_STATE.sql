-- =====================================================
-- DATABASE STATE VERIFICATION QUERY
-- =====================================================
-- Run this in your Supabase SQL Editor to check what's actually in your database
-- This will show if the migration ran successfully or not

-- Check 1: Extensions
-- Expected: uuid-ossp, pg_trgm, btree_gin
SELECT 'EXTENSIONS' as check_type, extname as name, 'EXISTS' as status
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin')
ORDER BY extname;

-- Check 2: Tables
-- Expected: users, subscriptions, response_history
SELECT 'TABLES' as check_type, tablename as name, 'EXISTS' as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'subscriptions', 'response_history', 'api_keys', 'clients')
ORDER BY tablename;

-- Check 3: Functions
-- Expected: update_updated_at_column, handle_new_user, uuid_generate_v4
SELECT 'FUNCTIONS' as check_type, proname as name, 'EXISTS' as status
FROM pg_proc
WHERE proname IN ('update_updated_at_column', 'handle_new_user', 'uuid_generate_v4')
ORDER BY proname;

-- Check 4: RLS Status
-- Expected: All tables should have rowsecurity = true
SELECT 'RLS' as check_type, tablename as name,
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'subscriptions', 'response_history', 'api_keys', 'clients')
ORDER BY tablename;

-- Check 5: Triggers
-- Expected: update_updated_at trigger on response_history
SELECT 'TRIGGERS' as check_type,
       trigger_name as name,
       event_object_table || '.' || trigger_name as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- SUMMARY COUNT
-- =====================================================
-- Quick summary of what exists
SELECT
  'SUMMARY' as type,
  (SELECT COUNT(*) FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin')) as extensions_count,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'subscriptions', 'response_history')) as tables_count,
  (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('update_updated_at_column', 'handle_new_user')) as functions_count;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- extensions_count: 3
-- tables_count: 3
-- functions_count: 2 (uuid_generate_v4 comes from uuid-ossp extension)
-- =====================================================
