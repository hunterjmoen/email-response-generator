# Unified Project Structure

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
