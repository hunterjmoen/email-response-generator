# Tech Stack

This is the DEFINITIVE technology selection for the entire project. All development must use these exact versions.

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.x | Type-safe development | Essential for AI response interfaces and shared types |
| Frontend Framework | Next.js | 14.x | React-based full-stack framework | Vercel optimization + API routes for monorepo simplicity |
| UI Component Library | Tailwind CSS + Headless UI | 3.x + 1.x | Utility-first styling + accessible components | Matches your UI spec's professional minimalism |
| State Management | Zustand | 4.x | Lightweight client state | Perfect for copy-paste workflow state without Redux complexity |
| Backend Language | TypeScript (Node.js) | Node 18+ | Server-side logic | Consistent language across stack, excellent AI SDK support |
| Backend Framework | Vercel API Routes | Next.js 14 | Serverless API endpoints | Simplified deployment, excellent performance for AI calls |
| API Style | REST + tRPC | tRPC 10.x | Type-safe API calls | End-to-end TypeScript safety for AI response types |
| Database | Supabase PostgreSQL | PostgreSQL 15 | Primary data store | Built-in auth, real-time features, excellent TypeScript support |
| Cache | Vercel KV (Redis) | Redis-compatible | Session and response caching | Optimized for Vercel deployment, reduces AI API calls |
| File Storage | Supabase Storage | Built-in | User uploads and exports | Integrated with auth, CDN-backed |
| Authentication | Supabase Auth | Built-in | User management + JWT | Social login support, integrated with database |
| Frontend Testing | Vitest + Testing Library | Latest | Component and unit tests | Modern, fast alternative to Jest |
| Backend Testing | Vitest | Latest | API and business logic tests | Consistent testing across stack |
| E2E Testing | Playwright | Latest | Full workflow testing | Critical for copy-paste workflow validation |
| Build Tool | Turborepo | 1.x | Monorepo build coordination | Excellent caching, optimal for TypeScript projects |
| Bundler | Next.js (Turbopack) | Built-in | Frontend bundling | Vercel-optimized, fastest for development |
| IaC Tool | Vercel CLI + Supabase CLI | Latest | Infrastructure management | Declarative config, Git-based deployments |
| CI/CD | Vercel (Frontend) + GitHub Actions | Built-in | Automated deployment | Preview deployments, integrated with Vercel |
| Monitoring | Vercel Analytics + Sentry | Latest | Performance and error tracking | Built-in performance monitoring + error reporting |
| Logging | Vercel Functions Logs + Axiom | Latest | Centralized logging | Serverless-optimized logging and analytics |
| CSS Framework | Tailwind CSS | 3.x | Utility-first styling | Matches UI spec requirements, excellent DX |
