# Test Database Setup Guide

This guide helps you set up your test Supabase database for CI/CD testing.

## Problem

CI tests are failing because the test database doesn't have the required tables, functions, and policies.

## Solution

Apply migrations to your **test Supabase project** (the one whose credentials are in your GitHub secrets).

---

## Quick Setup (Recommended)

### Step 1: Open Supabase SQL Editor

1. Go to your **test Supabase project** dashboard
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **New query**

### Step 2: Run Combined Migration

Copy the entire contents of `database/migrations/000_combined_test_setup.sql` and paste into the SQL editor, then click **Run**.

This single migration includes:
- ✅ All required extensions (`uuid-ossp`, `pg_trgm`, `btree_gin`)
- ✅ All tables (`users`, `subscriptions`, `response_history`)
- ✅ All functions (`handle_new_user`, `update_updated_at_column`)
- ✅ All RLS policies
- ✅ All indexes
- ✅ All triggers

### Step 3: Verify Setup

Run this verification query in SQL Editor:

```sql
-- Check extensions
SELECT extname FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin');

-- Check tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'subscriptions', 'response_history');

-- Check functions
SELECT proname FROM pg_proc
WHERE proname IN ('update_updated_at_column', 'handle_new_user', 'uuid_generate_v4');

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'subscriptions', 'response_history');
```

**Expected results:**
- 3 extensions
- 3 tables
- 3 functions
- 3 tables with `rowsecurity = true`

### Step 4: Re-run CI Tests

1. Go to GitHub Actions tab
2. Find your failed workflow
3. Click **"Re-run failed jobs"**
4. Tests should now pass! ✅

---

## Alternative: Manual Step-by-Step Setup

If you prefer to run migrations individually:

1. **In Supabase SQL Editor**, run each file in order:

```sql
-- 1. Extensions and initial schema
-- Run: database/migrations/001_initial_schema.sql

-- 2. Response history
-- Run: database/migrations/004_response_history.sql

-- 3. Client management (if needed)
-- Run: database/migrations/006_client_management.sql

-- Continue with remaining migrations...
```

---

## Troubleshooting

### "relation already exists" errors
This means the table is already created. Safe to ignore or use `CREATE TABLE IF NOT EXISTS`.

### "function already exists" errors
Use `CREATE OR REPLACE FUNCTION` (already in the combined migration).

### RLS policy errors
The combined migration drops existing policies before creating new ones.

### Tests still failing after setup
1. Verify all 3 functions exist (run verification query)
2. Verify RLS is enabled on all 3 tables
3. Check GitHub secrets match your test project credentials
4. Ensure you ran migrations on the **correct** Supabase project

### How to check which Supabase project is being used
Your GitHub secrets should point to your **test project**:
- `NEXT_PUBLIC_SUPABASE_URL` should be your test project URL
- Not your production database!

---

## Production vs Test Databases

**Important:** Keep separate Supabase projects for:
- 🧪 **Test/CI** - For running automated tests
- 🔨 **Development** - For local development
- 🚀 **Production** - For live application

Never run tests against production!

---

## Next Steps After Setup

Once your test database is set up and tests pass:

1. ✅ Merge your security fixes branch
2. ✅ Deploy to production
3. ✅ Apply migrations to production database
4. ✅ Monitor for any issues

---

## Need Help?

- Check test results in GitHub Actions for specific errors
- Review `tests/README.md` for testing documentation
- See `docs/GITHUB_SECRETS_SETUP.md` for secrets configuration
