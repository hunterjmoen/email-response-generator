# Testing Guide

This guide explains how to run tests for the FreelanceFlow application.

## Prerequisites

### 1. Environment Variables

Create a `.env.test` file in the project root with the following variables:

```bash
NODE_ENV=test

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Encryption Key (64 hex characters)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

See `.env.test.example` for a template.

### 2. Database Setup

**Option A: Use a Test Supabase Project (Recommended)**

1. Create a separate Supabase project for testing
2. Run all migrations from `database/migrations/` in order:
   ```sql
   -- In Supabase SQL Editor, run each file in order:
   -- 001_initial_schema.sql
   -- 002_fix_trigger.sql
   -- etc.
   ```
3. Ensure Row Level Security (RLS) policies are enabled

**Option B: Use Local Supabase**

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Apply migrations
supabase db reset
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Integration tests only
npm test tests/integration

# Specific test file
npm test tests/integration/infrastructure.test.ts
```

### Run in Watch Mode
```bash
npm test -- --watch
```

### Run with Coverage
```bash
npm test -- --coverage
```

## Test Structure

```
tests/
├── integration/          # Integration tests (require database)
│   └── infrastructure.test.ts
├── unit/                 # Unit tests (no external dependencies)
└── README.md            # This file
```

## Understanding Test Failures

### "Missing required environment variable"
- Ensure `.env.test` is created with all required variables
- Check that values are not empty
- Verify Supabase URL format: `https://xxx.supabase.co`

### "Cannot connect to Supabase"
- Verify Supabase project is running
- Check that API keys are correct
- Ensure service role key has admin access

### "Table does not exist"
- Run all database migrations in order
- Verify migrations were successful
- Check Supabase dashboard → Database → Tables

### "Function does not exist"
- Migrations were not fully applied
- Required functions:
  - `uuid_generate_v4()` - from uuid-ossp extension
  - `update_updated_at_column()` - from migrations
  - `handle_new_user()` - from migrations

**Fix**: Re-run migration 001_initial_schema.sql

### "Constraint violation"
- Check that test data meets database constraints
- Review `response_history` table constraints:
  - `original_message` must be non-empty
  - Character length limits apply

## CI/CD Testing

Tests run automatically in GitHub Actions on:
- Pull requests to main/master
- Pushes to main/master

### Required GitHub Secrets

Add these in: Repository Settings → Secrets → Actions

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ENCRYPTION_KEY`

See `docs/GITHUB_SECRETS_SETUP.md` for detailed instructions.

## Writing New Tests

### Integration Tests

Integration tests should:
- Test real database interactions
- Use the service role key for admin operations
- Clean up any test data after running
- Handle missing environment variables gracefully

Example:
```typescript
describe('My Feature', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Skipping tests: Missing credentials');
      return;
    }

    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  test('should do something', async () => {
    if (!supabase) return; // Skip if not initialized

    // Test implementation
  });
});
```

### Unit Tests

Unit tests should:
- Not require external dependencies
- Mock database/API calls
- Run quickly
- Be deterministic

## Troubleshooting

### Tests pass locally but fail in CI
- Check GitHub Secrets are configured
- Verify secret names match exactly (case-sensitive)
- Ensure test database has migrations applied

### Slow tests
- Integration tests can be slow due to network calls
- Consider using test database with minimal data
- Use `.only` to run specific tests during development

### Flaky tests
- Integration tests may be flaky due to network issues
- Add retries for network-dependent operations
- Use proper cleanup in afterEach/afterAll

## Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Clean up test data** - Use afterEach to remove test records
3. **Use descriptive names** - Test names should explain what's being tested
4. **Test edge cases** - Don't just test the happy path
5. **Keep tests fast** - Mock external dependencies when possible
6. **Document complex tests** - Add comments explaining test logic

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
