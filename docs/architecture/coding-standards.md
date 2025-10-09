# Coding Standards

Define MINIMAL but CRITICAL standards for AI agents. Focus only on project-specific rules that prevent common mistakes:

## Critical Fullstack Rules

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

## Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `ResponseGenerator.tsx` |
| Hooks | camelCase with 'use' | - | `useResponseGeneration.ts` |
| API Routes | - | camelCase | `responses.generate` |
| Database Tables | - | snake_case | `response_history` |
| Environment Variables | SCREAMING_SNAKE_CASE | SCREAMING_SNAKE_CASE | `OPENAI_API_KEY` |
| tRPC Procedures | camelCase | camelCase | `responses.generate` |

---
