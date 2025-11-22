# Troubleshooting: CI Tests Still Failing After Running Migration

## The Problem

You ran the migration SQL but CI tests are still failing with the same errors:
- Missing `subscriptions` table
- Missing functions (`update_updated_at_column`, `handle_new_user`, `uuid_generate_v4`)
- Missing `uuid-ossp` extension

**This means you ran the migration on the WRONG database.**

---

## Root Cause

GitHub Actions uses the Supabase credentials stored in your **GitHub repository secrets**, NOT your local development database.

You likely ran the migration on your local/development Supabase project, but your GitHub secrets point to a completely different Supabase project (your test/CI database).

---

## Solution: Apply Migration to the Correct Database

### Step 1: Find Your GitHub Secrets

1. Go to your GitHub repository: https://github.com/hunterjmoen/email-response-generator
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Look for the secret: `NEXT_PUBLIC_SUPABASE_URL`
5. **Note the project URL** (it will look like: `https://xxxxxxxxxxxxx.supabase.co`)

**Important**: You cannot view the full secret value in GitHub for security reasons. If you don't remember which Supabase project this URL points to:
- Check your Supabase dashboard (https://supabase.com/dashboard)
- Look at all your projects
- Match the project URL from the GitHub secret

### Step 2: Log Into the CORRECT Supabase Project

1. Go to https://supabase.com/dashboard
2. Find the project that matches the URL from your GitHub secret
3. **This is your CI/test database** - this is where you need to run the migration

### Step 3: Run the Migration on the Correct Database

1. In the correct Supabase project, navigate to: **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the entire contents of `database/migrations/000_combined_test_setup.sql`
4. Paste into the SQL editor
5. Click **Run**

### Step 4: Verify the Migration

Run this verification query in the same SQL Editor:

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
- ✅ 3 extensions (uuid-ossp, pg_trgm, btree_gin)
- ✅ 3 tables (users, subscriptions, response_history)
- ✅ 3 functions (update_updated_at_column, handle_new_user, uuid_generate_v4)
- ✅ 3 tables with `rowsecurity = true`

### Step 5: Re-run CI Tests

1. Go to your GitHub repository
2. Click **Actions** tab
3. Find the failed workflow run
4. Click **Re-run failed jobs**
5. Tests should now pass! ✅

---

## How to Confirm You're Using the Right Database

Before running the migration, double-check you're in the correct Supabase project:

1. Look at the project URL in the Supabase dashboard
2. Compare it to your GitHub secret `NEXT_PUBLIC_SUPABASE_URL`
3. They should match exactly

**Common mistake**: Running migrations on your development database when GitHub secrets point to a separate test/CI database.

---

## Quick Diagnostic Checklist

- [ ] I checked my GitHub repository secrets
- [ ] I identified the Supabase project URL in `NEXT_PUBLIC_SUPABASE_URL`
- [ ] I logged into the matching Supabase project
- [ ] I ran the migration SQL in that project's SQL Editor
- [ ] I verified all tables, functions, and extensions exist
- [ ] I re-ran the GitHub Actions workflow

---

## Still Having Issues?

If tests still fail after following all these steps:

1. **Double-check the Supabase project URL** - Make sure you're 100% certain you're in the right project
2. **Check other GitHub secrets** - Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` also match this project
3. **Review the migration output** - Did it show any errors when you ran it?
4. **Check for multiple Supabase organizations** - Do you have multiple Supabase accounts/organizations?

---

## Why This Happens

It's common to have separate Supabase projects for:
- 🔨 **Development** - Your local development database
- 🧪 **Test/CI** - For running automated tests (what GitHub Actions uses)
- 🚀 **Production** - Your live application

Your GitHub secrets should point to your **Test/CI** database, not your development or production database.
