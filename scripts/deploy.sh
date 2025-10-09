#!/bin/bash

# FreelanceFlow Deployment Script
# This script handles deployment to Vercel with proper validation

set -e

echo "🚀 Starting FreelanceFlow deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run type checking
echo "🔍 Running type check..."
npm run type-check

# Run linting
echo "🧹 Running linting..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm run test

# Build the application
echo "🔨 Building application..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
if command -v vercel &> /dev/null; then
    vercel --prod
else
    echo "⚠️  Vercel CLI not found. Please install it with: npm install -g vercel"
    echo "🔗 Or deploy through the Vercel dashboard or GitHub integration"
fi

echo "✅ Deployment process completed!"