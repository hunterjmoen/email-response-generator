# CI Database Diagnostic Instructions

## What's Happening

Your database verification shows everything exists (tables, functions, extensions), but CI tests are still failing. This diagnostic will show us **exactly** what database the CI tests are connecting to.

## Step 1: Run the Diagnostic Test

The diagnostic test has been added: `tests/diagnostic/ci-database.test.ts`

**Commit and push the diagnostic test:**

```bash
git add tests/diagnostic/ci-database.test.ts
git commit -m "test: Add CI database diagnostic"
git push
```

## Step 2: Trigger GitHub Actions

1. Go to GitHub → **Actions** tab
2. The workflow will run automatically after the push
3. Click on the running/failed workflow
4. Click on the **test** job
5. Expand the "Run tests" step
6. **Look for the diagnostic output**

## Step 3: Read the Diagnostic Output

Look for this section in the test logs:

```
=== CI DATABASE DIAGNOSTIC ===
Supabase URL: https://xxxxxxxxxxxxx.supabase.co
Project ID: xxxxxxxxxxxxx
Has Anon Key: true
Has Service Role Key: true
================================
```

**CRITICAL: Copy the Project ID and tell me what it is!**

## Step 4: Compare Project IDs

Now, go to your Supabase dashboard:

1. Go to https://supabase.com/dashboard
2. Click on your project
3. Look at the URL in your browser - it will be like:
   `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`
4. **Compare this PROJECT ID with the one from the CI diagnostic**

### If Project IDs Match ✅

The CI is connecting to the correct database. The issue is something else (likely permissions or API endpoint configuration).

### If Project IDs DON'T Match ❌

**You have two different Supabase projects!** The GitHub secrets point to a different project than the one you're using. You need to either:

**Option A**: Update GitHub secrets to point to your actual project
- Get the correct values from: Supabase Dashboard → Your Project → Settings → API
- Update all GitHub secrets with values from YOUR project

**Option B**: Run the migration on the OTHER project
- The project ID from the CI diagnostic is the one GitHub is using
- Log into that project in Supabase
- Run the migration SQL there

## Step 5: Check Database Access

The diagnostic will also show:

```
=== CHECKING DATABASE STATE ===
✅ Successfully connected to database
✅ Subscriptions table exists and is accessible
✅ Response_history table exists and is accessible
```

**If you see ❌ errors**, copy them and tell me exactly what they say.

## Common Diagnostic Outputs

### Good Output (Everything Working):
```
✅ Successfully connected to database
✅ Subscriptions table exists and is accessible
✅ Response_history table exists and is accessible
```
→ Database is fine, issue is elsewhere in tests

### Bad Output (Wrong Key):
```
❌ Cannot connect to database: JWT expired
❌ Subscriptions table error: permission denied
```
→ Service role key is wrong or expired

### Bad Output (Wrong Database):
```
❌ Subscriptions table error: relation "subscriptions" does not exist
```
→ CI is connecting to a different database that doesn't have migrations

## What to Do Next

After running the diagnostic, tell me:

1. **What is the Project ID from the CI output?**
2. **Does it match your Supabase dashboard project ID?**
3. **What errors (if any) appear in the database state checks?**

This will tell us exactly what's wrong!
