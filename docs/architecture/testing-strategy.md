# Testing Strategy

Define comprehensive testing approach for fullstack application:

## Testing Pyramid

```
        E2E Tests (Playwright)
        /                    \
   Integration Tests (Vitest)
   /                        \
Frontend Unit Tests    Backend Unit Tests
   (Vitest + RTL)         (Vitest)
```

## Test Organization

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
