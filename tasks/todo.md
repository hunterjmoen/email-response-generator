# Fix TypeScript Build Errors

## Problem Analysis
TypeScript build is failing with ~60+ errors across multiple categories:

### Critical Issues (blocking build):
1. **Supabase 'never' type errors** (server/routers/*.ts) - Most critical, affects core TRPC routes
2. **Stripe API version mismatch** (server/lib/stripe.ts)
3. **Missing module**: @/data/faq-items
4. **Property name mismatches**: snake_case vs camelCase in database queries

### Medium Priority:
5. **Date vs String type mismatches** in Client/Project models
6. **Optional vs Required properties** in Activity and ActiveClient types
7. **Form type issues** in LoginModal

## Root Causes
1. Supabase types not properly generated or imported - causing 'never' types
2. Stripe API version hardcoded to old version
3. Missing FAQ data file
4. Inconsistent property naming between database (snake_case) and TypeScript (camelCase)

## Strategy
Focus on the BLOCKING issues first - the Supabase 'never' types are preventing all server-side code from compiling. Once that's fixed, tackle remaining issues.

## Todo List

- [ ] Check if Supabase types need to be regenerated
- [ ] Fix Stripe API version constant
- [ ] Create missing @/data/faq-items file
- [ ] Fix database property name mismatches (snake_case vs camelCase)
- [ ] Run type-check again to see remaining issues
- [ ] Fix remaining type errors
- [ ] Test and commit

---

## Review
(Will be filled after completing tasks)
