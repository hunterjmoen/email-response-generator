# Deployment Architecture

Define deployment strategy based on Vercel + Supabase platform choice:

## Deployment Strategy

**Frontend Deployment:**
- **Platform:** Vercel (automatic deployments from Git)
- **Build Command:** `turbo run build --filter=web`
- **Output Directory:** `apps/web/.next`
- **CDN/Edge:** Vercel Edge Network (global distribution)

**Backend Deployment:**
- **Platform:** Vercel API Routes (serverless functions)
- **Build Command:** `turbo run build --filter=api`
- **Deployment Method:** Automatic with frontend deployment

## CI/CD Pipeline

```yaml