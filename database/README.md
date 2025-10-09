# FreelanceFlow Database Configuration

## Overview

This directory contains the database schema and deployment scripts for FreelanceFlow's PostgreSQL database hosted on Supabase.

## Database Architecture

### Tables

1. **users** - User profiles with communication preferences and privacy settings
2. **subscriptions** - User subscription tiers and usage tracking
3. **response_history** - AI-generated responses with user feedback and context

### Security Features

- **Row Level Security (RLS)** enabled on all tables
- User data isolation through RLS policies
- Encrypted sensitive data fields
- GDPR compliance features

### Performance Optimizations

- Proper indexing on frequently queried columns
- GIN indexes for JSONB columns
- Optimized query patterns for user data

## Deployment

### Production Deployment

1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Execute the contents of `database/deploy-schema.sql`

### Using Supabase CLI

```bash
# Deploy schema
supabase db push --db-url 'your-connection-string'

# Or for local development
supabase start
supabase db reset
```

### Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Migration History

- `001_initial_schema.sql` - Initial users and subscriptions tables
- `002_fix_trigger.sql` - Trigger fixes
- `003_disable_trigger.sql` - Trigger adjustments
- `004_response_history.sql` - Response history table with RLS

## Data Models

### User Context Structure

```json
{
  "urgency": "standard|immediate|non_urgent",
  "formality": "professional|casual|formal",
  "messageType": "update|question|concern|deliverable|payment|scope_change",
  "relationshipStage": "new|established|difficult|long_term",
  "projectPhase": "discovery|active|completion|maintenance|onboarding"
}
```

### Privacy Settings

```json
{
  "styleLearningConsent": false,
  "analyticsConsent": false,
  "marketingConsent": false,
  "dataRetentionPeriod": 12
}
```

## Connection Pooling

Supabase automatically handles connection pooling for optimal performance. The recommended settings for production:

- Pool size: 15 connections
- Max lifetime: 60 minutes
- Idle timeout: 10 minutes

## Backup Strategy

Supabase provides:
- Automatic daily backups
- Point-in-time recovery
- Manual backup creation
- Cross-region replication (on paid plans)

## Monitoring

Monitor database performance through:
- Supabase Dashboard metrics
- Query performance insights
- Connection pool monitoring
- Storage usage tracking