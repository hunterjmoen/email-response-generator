# FreelanceFlow Fullstack Architecture Document

This document outlines the complete fullstack architecture for FreelanceFlow, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

## Starter Template or Existing Project

**Decision:** Custom monorepo setup with your preferred technologies rather than a starter template that might impose unwanted constraints.

**Rationale:** Since your PRD specifies React.js (not Next.js) + Express backend, a custom monorepo setup preserves your specific tech stack choices while providing the benefits of shared TypeScript types between frontend/backend, coordinated deployments, and simplified dependency management.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-08-24 | v1.0 | Initial full-stack architecture creation | Winston (Architect) |

## High Level Architecture

### Technical Summary

FreelanceFlow employs a **modern monorepo full-stack architecture** with React.js frontend and Node.js Express backend, deployed as separate services but developed as a unified codebase. The frontend focuses on copy-paste workflow optimization with responsive design, while the backend provides RESTful APIs for AI response generation, user management, and subscription handling. Key integration points include OpenAI API for response generation, Stripe for payments, and real-time WebSocket connections for generation progress. The infrastructure leverages cloud-native services (AWS/Vercel) for auto-scaling and global performance, ensuring the critical 2-second response generation requirement. This architecture achieves PRD goals through platform-agnostic design, maintaining authentic user voice through learned personalization, and supporting business scaling through efficient resource utilization.

### Platform and Infrastructure Choice

**Platform:** Vercel + Supabase
**Key Services:** Vercel (frontend + API routes), Supabase (PostgreSQL + Auth + Edge Functions + Storage), Vercel Edge Functions
**Deployment Host and Regions:** Global edge deployment via Vercel, Supabase multi-region (US + EU)

### Repository Structure

**Structure:** Monorepo with clear frontend/backend/shared separation
**Monorepo Tool:** Turborepo (optimal for TypeScript + deployment coordination)
**Package Organization:** Apps (web, api), packages (shared types, UI components, utilities)

### High Level Architecture Diagram

```mermaid
graph TD
    A[Freelancer User] --> B[Web Browser]
    B --> C[Vercel Frontend<br/>React SPA]
    C --> D[Vercel API Routes<br/>Next.js/Node.js]
    
    D --> E[Supabase PostgreSQL<br/>User Data & History]
    D --> F[Supabase Auth<br/>JWT + Social Login]
    D --> G[OpenAI API<br/>Response Generation]
    D --> H[Stripe API<br/>Payment Processing]
    
    I[Supabase Edge Functions<br/>Background Jobs] --> E
    I --> J[Resend/SendGrid<br/>Email Service]
    
    K[Supabase Realtime<br/>WebSocket Updates] --> C
    L[Vercel Analytics<br/>Performance Monitoring] --> C
    
    M[Supabase Storage<br/>File Uploads] --> D
    
    C --> N[Vercel Edge Network<br/>Global CDN]
```

### Architectural Patterns

- **API-First Architecture:** RESTful APIs enable future mobile app development - _Rationale:_ Your PRD mentions platform expansion potential
- **Component-Based Frontend:** Modular React components with TypeScript - _Rationale:_ Copy-paste workflow requires reusable UI patterns
- **Repository Pattern:** Abstract data access for user profiles and response history - _Rationale:_ Enables testing and future database optimizations
- **Strategy Pattern:** Pluggable AI providers and response templates - _Rationale:_ Reduces OpenAI lock-in and supports template customization
- **Event-Driven Background Processing:** Async jobs for analytics and email notifications - _Rationale:_ Keeps primary workflow fast while handling secondary features
- **Circuit Breaker Pattern:** Fault tolerance for OpenAI API calls - _Rationale:_ External AI dependency requires resilience planning

## Tech Stack

This is the DEFINITIVE technology selection for the entire project. All development must use these exact versions.

### Technology Stack Table

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

## Data Models

Define the core data models/entities that will be shared between frontend and backend:

### User

**Purpose:** Represents freelancers using the platform with their profile settings, subscription status, and communication preferences for AI response generation.

**Key Attributes:**
- id: string - Unique identifier (Supabase UUID)
- email: string - Primary authentication and communication
- profile: UserProfile - Communication style and preferences
- subscription: SubscriptionTier - Current plan and usage limits
- createdAt: Date - Account creation timestamp

#### TypeScript Interface
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  industry?: string;
  communicationStyle: {
    formality: 'casual' | 'professional' | 'formal';
    tone: 'friendly' | 'neutral' | 'direct';
    length: 'brief' | 'standard' | 'detailed';
  };
  subscription: {
    tier: 'free' | 'premium';
    status: 'active' | 'cancelled' | 'expired';
    usageCount: number;
    billingCycle?: Date;
  };
  preferences: {
    defaultContext: ResponseContext;
    emailNotifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Relationships
- One-to-many with ResponseHistory
- One-to-many with CustomTemplates

### ResponseHistory

**Purpose:** Stores all AI-generated responses with context and user feedback for learning patterns, reuse, and analytics.

**Key Attributes:**
- id: string - Unique response identifier
- userId: string - Owner reference
- originalMessage: string - Client message input
- context: ResponseContext - Communication context used
- generatedOptions: AIResponse[] - All generated variants
- selectedResponse: string - User's chosen response
- userRating: number - Quality feedback (1-5 stars)

#### TypeScript Interface
```typescript
interface ResponseHistory {
  id: string;
  userId: string;
  originalMessage: string;
  context: ResponseContext;
  generatedOptions: AIResponse[];
  selectedResponse?: string;
  userRating?: number;
  templateUsed?: string;
  refinementCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AIResponse {
  id: string;
  content: string;
  tone: 'professional' | 'casual' | 'formal';
  length: number;
  confidence: number;
  reasoning?: string;
}
```

#### Relationships
- Many-to-one with User
- Many-to-one with Template (optional)

### ResponseContext

**Purpose:** Captures the communication situation context that drives AI response generation quality and appropriateness.

**Key Attributes:**
- relationshipStage: string - Client relationship phase
- projectPhase: string - Current project status
- urgency: string - Communication urgency level
- messageType: string - Type of client communication

#### TypeScript Interface
```typescript
interface ResponseContext {
  relationshipStage: 'new' | 'established' | 'difficult' | 'long_term';
  projectPhase: 'discovery' | 'active' | 'completion' | 'maintenance' | 'on_hold';
  urgency: 'immediate' | 'standard' | 'non_urgent';
  messageType: 'update' | 'question' | 'concern' | 'deliverable' | 'payment' | 'scope_change';
  customNotes?: string;
}
```

#### Relationships
- Used by ResponseHistory
- Used by Template definitions

### Template

**Purpose:** Pre-built scenario frameworks for common freelancer communication situations, enabling consistent and efficient response generation.

**Key Attributes:**
- id: string - Template identifier
- name: string - Human-readable template name
- category: string - Template grouping
- systemTemplate: boolean - Built-in vs user-created
- defaultContext: ResponseContext - Pre-configured context
- variables: TemplateVariable[] - Customizable placeholders

#### TypeScript Interface
```typescript
interface Template {
  id: string;
  name: string;
  category: 'project_updates' | 'scope_discussions' | 'payment_reminders' | 'timeline_changes' | 'deliverables' | 'custom';
  description: string;
  systemTemplate: boolean;
  userId?: string; // null for system templates
  defaultContext: ResponseContext;
  promptTemplate: string;
  variables: TemplateVariable[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  defaultValue?: string;
  options?: string[]; // for select type
}
```

#### Relationships
- One-to-many with ResponseHistory
- Many-to-one with User (for custom templates)

### Subscription

**Purpose:** Manages user billing, usage limits, and feature access for freemium business model implementation.

**Key Attributes:**
- userId: string - User reference
- tier: SubscriptionTier - Current plan level
- status: string - Billing status
- usageTracking: UsageMetrics - Monthly limits and consumption

#### TypeScript Interface
```typescript
interface Subscription {
  userId: string;
  tier: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  usage: {
    responsesGenerated: number;
    monthlyLimit: number;
    resetDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Relationships
- One-to-one with User
- One-to-many with UsageEvents (for analytics)

## API Specification

Based on our chosen tRPC approach for end-to-end TypeScript safety, here are the router definitions for FreelanceFlow's API:

### tRPC Router Definitions

```typescript
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './trpc';

// Input validation schemas
const ResponseContextSchema = z.object({
  relationshipStage: z.enum(['new', 'established', 'difficult', 'long_term']),
  projectPhase: z.enum(['discovery', 'active', 'completion', 'maintenance', 'on_hold']),
  urgency: z.enum(['immediate', 'standard', 'non_urgent']),
  messageType: z.enum(['update', 'question', 'concern', 'deliverable', 'payment', 'scope_change']),
  customNotes: z.string().optional(),
});

const GenerateResponseSchema = z.object({
  originalMessage: z.string().min(10).max(2000),
  context: ResponseContextSchema,
  templateId: z.string().optional(),
  refinementInstructions: z.string().optional(),
});

// Main application router
export const appRouter = router({
  // Authentication & User Management
  auth: router({
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        industry: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Supabase Auth integration
        // Returns: { user: User, session: Session }
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Returns: { user: User, session: Session }
      }),
  }),

  // User Profile Management
  user: router({
    getProfile: protectedProcedure
      .query(async ({ ctx }) => {
        // Returns: User profile
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        industry: z.string().optional(),
        communicationStyle: z.object({
          formality: z.enum(['casual', 'professional', 'formal']).optional(),
          tone: z.enum(['friendly', 'neutral', 'direct']).optional(),
          length: z.enum(['brief', 'standard', 'detailed']).optional(),
        }).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Returns: Updated User
      }),

    exportData: protectedProcedure
      .mutation(async ({ ctx }) => {
        // GDPR compliance - export all user data
      }),

    deleteAccount: protectedProcedure
      .input(z.object({ confirmation: z.literal('DELETE') }))
      .mutation(async ({ input, ctx }) => {
        // GDPR compliance - complete account deletion
      }),
  }),

  // Core AI Response Generation
  responses: router({
    generate: protectedProcedure
      .input(GenerateResponseSchema)
      .mutation(async ({ input, ctx }) => {
        // 1. Check usage limits
        // 2. Call OpenAI API with context
        // 3. Generate 2-3 response variants
        // 4. Save to ResponseHistory
        // Returns: { responses: AIResponse[], historyId: string }
      }),

    getHistory: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        searchQuery: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        // Returns: { responses: ResponseHistory[], total: number }
      }),
  }),

  // Template Management
  templates: router({
    getSystemTemplates: protectedProcedure
      .query(async ({ ctx }) => {
        // Returns: Template[] (system templates only)
      }),

    createTemplate: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        category: z.enum(['project_updates', 'scope_discussions', 'payment_reminders', 'timeline_changes', 'deliverables', 'custom']),
        description: z.string().max(500),
        defaultContext: ResponseContextSchema,
        promptTemplate: z.string().min(10).max(1000),
      }))
      .mutation(async ({ input, ctx }) => {
        // Returns: Created Template
      }),
  }),

  // Subscription & Billing
  subscription: router({
    getStatus: protectedProcedure
      .query(async ({ ctx }) => {
        // Returns: Current subscription status and usage
      }),

    createCheckoutSession: protectedProcedure
      .input(z.object({
        priceId: z.string(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Create Stripe checkout session
        // Returns: { sessionUrl: string }
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

## Components

Based on the architectural patterns, tech stack, and data models from above, here are the major logical components across the full-stack:

### AIResponseService

**Responsibility:** Core AI response generation orchestration, managing OpenAI API calls, prompt engineering, and response processing with context awareness and user personalization.

**Key Interfaces:**
- `generateResponses(message: string, context: ResponseContext, userStyle: CommunicationStyle): Promise<AIResponse[]>`
- `regenerateWithRefinement(historyId: string, refinement: string): Promise<AIResponse[]>`
- `evaluateResponseQuality(response: string, context: ResponseContext): number`

**Dependencies:** OpenAI SDK, ResponseHistoryManager, UserProfileService, TemplateEngine

**Technology Stack:** Vercel API Routes (Next.js), OpenAI SDK v4, Zod validation, custom prompt engineering utilities

### UserProfileService

**Responsibility:** User authentication, profile management, communication style learning, and preference persistence with privacy-compliant data handling.

**Key Interfaces:**
- `authenticateUser(credentials: LoginCredentials): Promise<AuthSession>`
- `updateCommunicationStyle(userId: string, feedback: StyleFeedback): Promise<void>`
- `getPersonalizedPrompts(userId: string): Promise<PromptPersonalization>`

**Dependencies:** Supabase Auth, UserRepository, CommunicationStyleAnalyzer

**Technology Stack:** Supabase Auth SDK, JWT handling, encryption utilities for sensitive data

### TemplateEngine

**Responsibility:** Template management, variable substitution, and context-aware template selection for common freelancer communication scenarios.

**Key Interfaces:**
- `renderTemplate(templateId: string, variables: TemplateVariables): Promise<string>`
- `suggestTemplates(context: ResponseContext): Promise<Template[]>`
- `createCustomTemplate(userId: string, template: TemplateDefinition): Promise<Template>`

**Dependencies:** TemplateRepository, ContextAnalyzer

**Technology Stack:** Custom template engine, Handlebars.js for variable substitution, context matching algorithms

### CopyPasteWorkflowComponent (Frontend)

**Responsibility:** Primary user interface orchestrating the core copy-paste workflow with optimized UX for speed and efficiency.

**Key Interfaces:**
- `handleMessageInput(message: string): void`
- `generateResponses(context: ResponseContext): Promise<void>`
- `copyToClipboard(responseId: string): Promise<boolean>`
- `provideUserFeedback(rating: number, selectedResponse: string): void`

**Dependencies:** AIResponseService (via tRPC), ContextSelector, ResponseDisplay, ClipboardManager

**Technology Stack:** React + TypeScript, Zustand state management, Clipboard API, custom hooks for workflow optimization

### ResponseHistoryManager

**Responsibility:** Response storage, search functionality, privacy-compliant data retention, and user feedback collection with GDPR compliance.

**Key Interfaces:**
- `saveResponse(response: ResponseRecord): Promise<string>`
- `searchHistory(userId: string, query: SearchQuery): Promise<ResponseHistory[]>`
- `exportUserData(userId: string): Promise<DataExport>`

**Dependencies:** Supabase Database, EncryptionService, SearchIndexer

**Technology Stack:** Supabase PostgreSQL, full-text search, field-level encryption, automated data retention

### SubscriptionManager

**Responsibility:** Usage tracking, billing integration, subscription lifecycle management, and feature access control with Stripe integration.

**Key Interfaces:**
- `trackUsage(userId: string, action: UsageAction): Promise<void>`
- `checkUsageLimit(userId: string): Promise<UsageLimitResult>`
- `handleStripeWebhook(event: StripeEvent): Promise<void>`

**Dependencies:** Stripe SDK, SubscriptionRepository, UsageTracker

**Technology Stack:** Stripe SDK, webhook signature validation, usage analytics aggregation

### Component Diagrams

```mermaid
graph TD
    A[CopyPasteWorkflowComponent] --> B[ContextSelectorComponent]
    A --> C[ResponseDisplayComponent]
    A --> D[AIResponseService]
    
    D --> E[OpenAI API]
    D --> F[UserProfileService]
    D --> G[TemplateEngine]
    D --> H[ResponseHistoryManager]
    
    F --> I[Supabase Auth]
    F --> J[EncryptionService]
    
    G --> K[TemplateRepository]
    H --> L[Supabase Database]
    
    M[SubscriptionManager] --> N[Stripe API]
    M --> O[UsageTracker]
    
    P[Privacy ComplianceService] --> J
    P --> H
    P --> F
    
    style A fill:#e1f5fe
    style D fill:#f3e5f5
    style I fill:#e8f5e8
    style E fill:#fff3e0
```

## Database Schema

Transform the conceptual data models into concrete Supabase PostgreSQL schemas:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- Users table with privacy controls
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    industry TEXT,
    
    -- Communication style preferences (JSONB for flexibility)
    communication_style JSONB NOT NULL DEFAULT '{
        "formality": "professional",
        "tone": "neutral", 
        "length": "standard"
    }'::jsonb,
    
    -- User preferences
    preferences JSONB NOT NULL DEFAULT '{
        "defaultContext": {
            "relationshipStage": "established",
            "projectPhase": "active", 
            "urgency": "standard",
            "messageType": "update"
        },
        "emailNotifications": true
    }'::jsonb,
    
    -- Privacy and GDPR compliance
    privacy_settings JSONB NOT NULL DEFAULT '{
        "styleLearningConsent": false,
        "analyticsConsent": false,
        "marketingConsent": false,
        "dataRetentionPeriod": 12
    }'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'premium')) DEFAULT 'free',
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')) DEFAULT 'active',
    
    -- Stripe integration
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    
    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,
    monthly_limit INTEGER NOT NULL DEFAULT 10, -- Free tier limit
    usage_reset_date TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()) + interval '1 month',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Response history table with encryption for sensitive data
CREATE TABLE response_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- ENCRYPTED sensitive content (implement application-level encryption)
    original_message_encrypted TEXT NOT NULL,
    selected_response_encrypted TEXT,
    encryption_key_id TEXT NOT NULL,
    
    -- Context and metadata
    context JSONB NOT NULL,
    generated_options JSONB NOT NULL,
    
    -- User feedback
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    refinement_count INTEGER NOT NULL DEFAULT 0,
    
    -- Privacy compliance
    data_retention_date TIMESTAMPTZ NOT NULL DEFAULT NOW() + interval '12 months',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Templates table (system and user-created)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('project_updates', 'scope_discussions', 'payment_reminders', 'timeline_changes', 'deliverables', 'custom')),
    description TEXT NOT NULL,
    system_template BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    default_context JSONB NOT NULL,
    prompt_template TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_users_email ON users USING btree (email);
CREATE INDEX idx_response_history_user_id ON response_history USING btree (user_id);
CREATE INDEX idx_response_history_created_at ON response_history USING btree (created_at);
CREATE INDEX idx_templates_user_id ON templates USING btree (user_id);
CREATE INDEX idx_templates_category ON templates USING btree (category);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data isolation
CREATE POLICY "Users can only access their own data" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access their own subscription" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access system templates and their own custom templates" ON templates
    FOR SELECT USING (system_template = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can only access their own response history" ON response_history
    FOR ALL USING (auth.uid() = user_id);
```

## Unified Project Structure

Create a monorepo structure that accommodates both frontend and backend. Adapted based on chosen tools and frameworks:

```plaintext
freelance-flow/
├── .github/                          # CI/CD workflows
│   └── workflows/
│       ├── ci.yml                    # Test and lint on PR
│       ├── deploy-production.yml     # Deploy to production
│       └── deploy-preview.yml        # Deploy preview environments
├── apps/                             # Application packages
│   ├── web/                          # Next.js frontend application
│   │   ├── src/
│   │   │   ├── components/           # React components
│   │   │   │   ├── ui/              # Base UI components
│   │   │   │   ├── workflow/         # Copy-paste workflow components
│   │   │   │   ├── templates/        # Template management components
│   │   │   │   └── history/         # Response history components
│   │   │   ├── pages/               # Next.js pages/routes
│   │   │   │   ├── api/             # Vercel API routes (tRPC endpoints)
│   │   │   │   ├── auth/            # Authentication pages
│   │   │   │   ├── dashboard/       # Main application views
│   │   │   │   └── settings/        # User settings and subscription
│   │   │   ├── hooks/               # Custom React hooks
│   │   │   ├── services/            # Frontend service layer (tRPC clients)
│   │   │   ├── stores/              # Zustand stores for state management
│   │   │   ├── styles/              # Tailwind CSS and global styles
│   │   │   └── utils/               # Frontend utilities and helpers
│   │   ├── public/                  # Static assets
│   │   ├── tests/                   # Frontend tests (Vitest + Testing Library)
│   │   └── package.json
│   └── api/                          # Serverless API functions (tRPC routers)
│       ├── src/
│       │   ├── routers/             # tRPC route handlers
│       │   │   ├── auth.ts          # Authentication routes
│       │   │   ├── responses.ts     # AI response generation
│       │   │   ├── templates.ts     # Template management
│       │   │   └── subscription.ts  # Billing and subscription
│       │   ├── services/            # Business logic services
│       │   │   ├── ai-response.ts   # OpenAI integration
│       │   │   ├── template-engine.ts # Template processing
│       │   │   └── encryption.ts    # Data encryption service
│       │   ├── repositories/        # Data access layer
│       │   └── utils/               # Backend utilities
│       ├── tests/                   # Backend tests (Vitest)
│       └── package.json
├── packages/                         # Shared packages
│   ├── shared/                       # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/               # TypeScript interfaces
│   │   │   ├── constants/           # Shared constants
│   │   │   ├── utils/               # Shared utilities
│   │   │   └── schemas/             # Zod validation schemas
│   │   └── package.json
│   ├── ui/                          # Shared UI components library
│   │   ├── src/
│   │   │   ├── components/          # Reusable UI components
│   │   │   └── styles/              # Base styles and design tokens
│   │   └── package.json
│   ├── config/                      # Shared configuration
│   │   ├── eslint/                  # ESLint configurations
│   │   ├── typescript/              # TypeScript configurations
│   │   ├── tailwind/                # Tailwind CSS configurations
│   │   └── vitest/                  # Test configurations
│   └── database/                    # Database schema and migrations
│       ├── migrations/              # Supabase migration files
│       ├── seed/                    # Database seed data
│       └── types/                   # Database type definitions
├── infrastructure/                   # Infrastructure as Code
│   ├── vercel/                      # Vercel configuration
│   └── supabase/                    # Supabase configuration
├── scripts/                         # Build and deployment scripts
├── docs/                            # Documentation
├── tests/                           # E2E and integration tests
│   ├── e2e/                         # Playwright end-to-end tests
│   └── integration/                 # Cross-service integration tests
├── .env.example                     # Environment variables template
├── package.json                     # Root package.json with workspaces
├── turbo.json                       # Turborepo configuration
├── prettier.config.js               # Prettier formatting config
└── README.md                        # Project documentation
```

## Development Workflow

Define the development setup and workflow for the fullstack application:

### Local Development Setup

#### Prerequisites
```bash
# Required software versions
node --version  # v18.0.0 or higher
npm --version   # v9.0.0 or higher
git --version   # v2.30.0 or higher

# Install global dependencies
npm install -g @supabase/cli
npm install -g vercel
npm install -g turbo
```

#### Initial Setup
```bash
# Clone and setup the repository
git clone https://github.com/your-org/freelance-flow.git
cd freelance-flow

# Install all dependencies (uses workspace configuration)
npm install

# Copy environment variables template
cp .env.example .env.local

# Setup Supabase local development
supabase init
supabase start

# Generate database types
npm run db:generate-types

# Setup Vercel (optional for local development)
vercel login
vercel link
```

#### Development Commands
```bash
# Start all services in development mode
npm run dev

# Start frontend only (Next.js dev server)
npm run dev:web

# Start API development (tRPC with hot reload)  
npm run dev:api

# Run database migrations
npm run db:migrate

# Run all tests (unit + integration)
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build

# Lint and format code
npm run lint
npm run format

# Type checking across all packages
npm run type-check
```

### Environment Configuration

#### Required Environment Variables
```bash
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend (.env)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=sk-your_openai_api_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
DATABASE_URL=postgresql://postgres:[password]@localhost:54322/postgres

# Shared (both environments)
NODE_ENV=development
LOG_LEVEL=debug
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key
```

## Deployment Architecture

Define deployment strategy based on Vercel + Supabase platform choice:

### Deployment Strategy

**Frontend Deployment:**
- **Platform:** Vercel (automatic deployments from Git)
- **Build Command:** `turbo run build --filter=web`
- **Output Directory:** `apps/web/.next`
- **CDN/Edge:** Vercel Edge Network (global distribution)

**Backend Deployment:**
- **Platform:** Vercel API Routes (serverless functions)
- **Build Command:** `turbo run build --filter=api`
- **Deployment Method:** Automatic with frontend deployment

### CI/CD Pipeline

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Type check
        run: npm run type-check
      
      - name: Build applications
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|-------------|-------------|---------|
| Development | http://localhost:3000 | http://localhost:3000/api | Local development |
| Staging | https://staging-freelance-flow.vercel.app | https://staging-freelance-flow.vercel.app/api | Pre-production testing |
| Production | https://freelanceflow.com | https://freelanceflow.com/api | Live environment |

## Security and Performance

Define security and performance considerations for the fullstack application:

### Security Requirements

**Frontend Security:**
- CSP Headers: `default-src 'self'; connect-src 'self' https://*.supabase.co https://api.openai.com`
- XSS Prevention: React's built-in XSS protection + input sanitization
- Secure Storage: Sensitive data in httpOnly cookies, tokens in secure storage

**Backend Security:**
- Input Validation: Zod schemas on all API endpoints with strict type checking
- Rate Limiting: 100 requests/minute per user, 10 requests/minute for AI generation
- CORS Policy: Restricted to production domain and development localhost

**Authentication Security:**
- Token Storage: JWT tokens in httpOnly cookies with secure and sameSite flags
- Session Management: Supabase Auth with automatic token refresh
- Password Policy: Minimum 8 characters with complexity requirements

### Performance Optimization

**Frontend Performance:**
- Bundle Size Target: < 300KB initial JS bundle
- Loading Strategy: Progressive loading with React.lazy() and code splitting
- Caching Strategy: Static assets cached for 1 year, API responses cached for 5 minutes

**Backend Performance:**
- Response Time Target: < 2 seconds for AI response generation
- Database Optimization: Indexed queries, connection pooling, read replicas for analytics
- Caching Strategy: User profiles cached for 1 hour, templates cached for 24 hours

## Testing Strategy

Define comprehensive testing approach for fullstack application:

### Testing Pyramid

```
        E2E Tests (Playwright)
        /                    \
   Integration Tests (Vitest)
   /                        \
Frontend Unit Tests    Backend Unit Tests
   (Vitest + RTL)         (Vitest)
```

### Test Organization

**Frontend Tests:**
```
apps/web/tests/
├── components/           # Component unit tests
├── hooks/               # Custom hook tests  
├── services/            # Frontend service tests
└── utils/               # Utility function tests
```

**Backend Tests:**
```
apps/api/tests/
├── routers/             # tRPC router tests
├── services/            # Business logic tests
├── repositories/        # Data access tests
└── utils/               # Backend utility tests
```

**E2E Tests:**
```
tests/e2e/
├── auth.spec.ts         # Authentication flows
├── response-generation.spec.ts  # Core workflow
├── templates.spec.ts    # Template functionality
└── subscription.spec.ts # Billing workflows
```

## Coding Standards

Define MINIMAL but CRITICAL standards for AI agents. Focus only on project-specific rules that prevent common mistakes:

### Critical Fullstack Rules

- **Type Sharing:** Always define types in packages/shared and import from there - prevents API contract mismatches
- **API Calls:** Never make direct HTTP calls - use the tRPC client service layer for all backend communication
- **Environment Variables:** Access only through config objects, never process.env directly - ensures consistent configuration management
- **Error Handling:** All API routes must use the standard tRPC error handler with proper error types
- **State Updates:** Never mutate state directly - use proper Zustand patterns with immer for complex state updates
- **Database Access:** Always use repository pattern through Supabase client, never raw SQL in business logic
- **Authentication:** Check user authentication in protected tRPC procedures, never assume user is authenticated
- **Input Validation:** All user inputs must be validated with Zod schemas before processing
- **Encryption:** Sensitive data fields must use the EncryptionService, never store PII in plaintext
- **Rate Limiting:** AI generation endpoints must check usage limits before calling OpenAI API

### Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `ResponseGenerator.tsx` |
| Hooks | camelCase with 'use' | - | `useResponseGeneration.ts` |
| API Routes | - | camelCase | `responses.generate` |
| Database Tables | - | snake_case | `response_history` |
| Environment Variables | SCREAMING_SNAKE_CASE | SCREAMING_SNAKE_CASE | `OPENAI_API_KEY` |
| tRPC Procedures | camelCase | camelCase | `responses.generate` |

---

## Summary

This comprehensive full-stack architecture document provides the complete technical foundation for FreelanceFlow development. The architecture prioritizes:

**Key Strategic Decisions:**
- **Vercel + Supabase Platform:** Rapid development with excellent performance and built-in features
- **Monorepo with Turborepo:** Type-safe development with efficient build caching
- **tRPC for API Layer:** End-to-end TypeScript safety eliminating API contract issues
- **Privacy-First Design:** GDPR compliance built into data models and workflows
- **Copy-Paste Workflow Optimization:** Every architectural decision supports the core user experience

The architecture is ready for implementation with clear guidance for AI development agents, comprehensive testing strategies, and scalable infrastructure that supports the business goals outlined in the PRD.

🏗️ **Architecture document complete!** Ready for development team handoff and implementation planning.
