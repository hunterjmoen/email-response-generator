#!/bin/bash

# FreelanceFlow Database Deployment Script
# This script deploys the complete database schema to Supabase

set -e

echo "🗄️  Starting database deployment to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it with:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo "📋 Checking database schema file..."
if [ ! -f "database/deploy-schema.sql" ]; then
    echo "❌ Database schema file not found at database/deploy-schema.sql"
    exit 1
fi

echo "🚀 Deploying database schema..."

# Option 1: Deploy via SQL file (manual step)
echo "📋 Database schema ready for deployment."
echo "💡 To deploy the schema to your Supabase project:"
echo "   1. Go to your Supabase dashboard"
echo "   2. Navigate to SQL Editor"
echo "   3. Execute the contents of database/deploy-schema.sql"
echo ""
echo "   Or use Supabase CLI:"
echo "   supabase db push --db-url 'postgresql://[user]:[pass]@[host]:5432/[db]'"

# Alternative: If using Supabase CLI with local development
echo ""
echo "🔧 For local development, you can also run:"
echo "   supabase start"
echo "   supabase db reset"

echo "✅ Database deployment preparation completed!"
echo "📁 Schema file location: database/deploy-schema.sql"