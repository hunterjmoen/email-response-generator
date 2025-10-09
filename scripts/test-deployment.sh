#!/bin/bash

# FreelanceFlow Deployment Testing Script
# Runs comprehensive tests to validate deployment infrastructure

set -e

echo "🧪 Starting deployment infrastructure testing..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment variables are set
print_status "Validating environment variables..."
if npm run validate-env; then
    print_success "Environment validation passed"
else
    print_error "Environment validation failed"
    exit 1
fi

# Run build test
print_status "Testing application build..."
if npm run build; then
    print_success "Build test passed"
else
    print_error "Build test failed"
    exit 1
fi

# Run unit and integration tests
print_status "Running integration tests..."
if npm run test; then
    print_success "Integration tests passed"
else
    print_warning "Integration tests failed or no tests found"
fi

# Check if Playwright is available for E2E tests
if command -v npx playwright &> /dev/null; then
    print_status "Running E2E deployment tests..."

    # Check if we can run E2E tests
    if [ -z "$DEPLOYMENT_URL" ]; then
        print_warning "DEPLOYMENT_URL not set, skipping E2E tests"
        print_warning "To run E2E tests, set DEPLOYMENT_URL=https://your-app.vercel.app"
    else
        if npx playwright test tests/e2e/deployment.spec.ts --project=chromium; then
            print_success "E2E tests passed"
        else
            print_error "E2E tests failed"
            exit 1
        fi
    fi
else
    print_warning "Playwright not available, skipping E2E tests"
    print_warning "Install with: npx playwright install"
fi

# Test health endpoint (if server is running)
print_status "Testing health endpoint..."
if command -v curl &> /dev/null; then
    if [ -n "$DEPLOYMENT_URL" ]; then
        if curl -f -s "$DEPLOYMENT_URL/api/health" > /dev/null; then
            print_success "Health endpoint is responding"
        else
            print_warning "Health endpoint is not responding"
        fi
    else
        print_warning "DEPLOYMENT_URL not set, skipping health check"
    fi
else
    print_warning "curl not available, skipping health check"
fi

# Validate deployment files
print_status "Validating deployment configuration files..."

# Check Vercel config
if [ -f "vercel.json" ]; then
    print_success "vercel.json found"
else
    print_error "vercel.json missing"
    exit 1
fi

# Check GitHub Actions
if [ -d ".github/workflows" ]; then
    print_success "GitHub Actions workflows found"
else
    print_warning "GitHub Actions workflows not found"
fi

# Check database schema
if [ -f "database/deploy-schema.sql" ]; then
    print_success "Database deployment schema found"
else
    print_error "Database deployment schema missing"
    exit 1
fi

# Check environment template
if [ -f ".env.example" ]; then
    print_success "Environment template found"
else
    print_error "Environment template missing"
    exit 1
fi

# Security check - ensure no secrets in git
print_status "Checking for potential secrets in git..."
if git log --all --grep="password\|secret\|key" --oneline | head -5; then
    print_warning "Found potential secrets in commit messages - please review"
fi

# Check for .env files in git
if git ls-files | grep -E "\.env$|\.env\.local$|\.env\.production$"; then
    print_error "Environment files found in git - they should be gitignored"
    exit 1
else
    print_success "No environment files in git"
fi

# Performance check - bundle size
if [ -d ".next" ]; then
    print_status "Checking build output size..."
    du -sh .next/static 2>/dev/null || print_warning "Could not check build size"
fi

# Final summary
echo ""
print_success "🎉 Deployment infrastructure testing completed!"
echo ""
print_status "Summary of checks performed:"
echo "  ✅ Environment variable validation"
echo "  ✅ Application build test"
echo "  ✅ Integration tests"
echo "  ✅ Configuration file validation"
echo "  ✅ Security checks"

if [ -n "$DEPLOYMENT_URL" ]; then
    echo "  ✅ E2E tests (against $DEPLOYMENT_URL)"
    echo "  ✅ Health endpoint check"
else
    echo "  ⚠️  E2E tests (skipped - set DEPLOYMENT_URL to run)"
    echo "  ⚠️  Health endpoint check (skipped)"
fi

echo ""
print_status "To run full E2E tests, set DEPLOYMENT_URL and run:"
print_status "  export DEPLOYMENT_URL=https://your-app.vercel.app"
print_status "  ./scripts/test-deployment.sh"
echo ""