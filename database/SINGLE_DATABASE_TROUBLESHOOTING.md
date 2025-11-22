# Troubleshooting: Migration Not Applied (Single Database Setup)

Since you have only one Supabase database, the issue is that the migration either:
1. **Didn't run successfully** (had errors you didn't notice)
2. **Ran partially** (some parts failed)
3. **Didn't run at all** (maybe ran in wrong SQL editor tab or project by mistake)

## Step 1: Verify Current Database State

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on your project
3. In the left sidebar, click **SQL Editor**
4. Click **New query**
5. Copy **ALL** the contents from `database/VERIFY_DATABASE_STATE.sql`
6. Paste and click **Run**

### What to Look For

The results will show:
- **extensions_count**: Should be **3** (uuid-ossp, pg_trgm, btree_gin)
- **tables_count**: Should be **3** (users, subscriptions, response_history)
- **functions_count**: Should be **2** (update_updated_at_column, handle_new_user)

**If ANY of these counts are less than expected, the migration didn't run properly.**

---

## Step 2a: If Counts Are CORRECT (3, 3, 2)

If the verification shows everything exists, but tests are still failing, the issue is with **how the tests connect to the database**.

**Solution**: The test might be connecting with insufficient permissions.

Check:
1. Your `SUPABASE_SERVICE_ROLE_KEY` in GitHub secrets
2. Make sure it's the **service_role** key (not the anon key)
3. Service role key should have full database access

To get the correct service role key:
1. Go to Supabase project settings
2. Click **API** in the left sidebar
3. Find **service_role** key under "Project API keys"
4. Copy the full key
5. Update GitHub secret `SUPABASE_SERVICE_ROLE_KEY` with this value

---

## Step 2b: If Counts Are INCORRECT (Missing Items)

The migration didn't run successfully. Let's run it again **with error checking**.

### Re-run the Migration Properly

1. In Supabase SQL Editor, click **New query**
2. Copy **ALL** contents from `database/migrations/000_combined_test_setup.sql`
3. **Before clicking Run**, scroll down in the SQL Editor
4. Click **Run**
5. **IMPORTANT**: Watch the bottom panel for **any red error messages**

### Common Errors You Might See

**Error: "permission denied"**
- You need to be the project owner
- Make sure you're logged in as the correct user

**Error: "already exists"**
- This is OK for some items (like uuid_generate_v4 function)
- As long as the item exists, you're fine

**Error: "schema X does not exist"**
- The migration assumes public schema
- This shouldn't happen in standard Supabase setup

**Error: "syntax error"**
- Copy the entire SQL file again
- Make sure you didn't miss any characters

### After Running Migration

1. Run the verification query again (`database/VERIFY_DATABASE_STATE.sql`)
2. Confirm all counts are correct (3, 3, 2)
3. If counts are still wrong, **copy and paste the error messages you see**

---

## Step 3: Re-run GitHub Actions Tests

Once verification shows all counts are correct:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Find the failed workflow
4. Click **Re-run failed jobs**

Tests should now pass ✅

---

## Still Failing?

If tests still fail after:
- ✅ Verification query shows correct counts (3, 3, 2)
- ✅ Using correct service_role key in GitHub secrets
- ✅ Migration ran without errors

Then we need to check:
1. **GitHub Secrets**: Are they actually set correctly?
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Confirm these secrets exist:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`
     - `ENCRYPTION_KEY`

2. **GitHub Secrets Values**: Do they match your Supabase project?
   - The `NEXT_PUBLIC_SUPABASE_URL` should match your project URL
   - Get all values from: Supabase Dashboard → Your Project → Settings → API

---

## Quick Checklist

- [ ] I ran `VERIFY_DATABASE_STATE.sql` in Supabase SQL Editor
- [ ] The summary shows: extensions_count=3, tables_count=3, functions_count=2
- [ ] If counts were wrong, I re-ran `000_combined_test_setup.sql`
- [ ] I watched for error messages when running the migration
- [ ] I verified the migration completed successfully
- [ ] I confirmed GitHub secret `SUPABASE_SERVICE_ROLE_KEY` is the service_role key (not anon key)
- [ ] I re-ran the GitHub Actions workflow
- [ ] Tests now pass ✅
