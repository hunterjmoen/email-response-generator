# Fix GitHub CI TypeScript Errors

## Problem
GitHub CI job failing with ~40 TypeScript errors. These are component-level issues unrelated to Supabase (which has been resolved).

## Plan

### Task 1: Fix LoginModal.tsx - Union Type Issues (11 errors)
**Root Cause**: Using conditional destructure creates a union type that TypeScript can't narrow.
**Files**: [components/auth/LoginModal.tsx](components/auth/LoginModal.tsx)
**Solution**: Separate destructures for login and register forms, use conditionally in JSX.
- [ ] Replace line 42 union destructure with separate form destructures
- [ ] Update form `onSubmit` to use correct handleSubmit function
- [ ] Update JSX to use mode-based register/errors for each field
- **Impact**: Only LoginModal.tsx, ~15 lines changed

### Task 2: Fix EnhancedClientList.tsx - SVG title Prop (1 error)
**Root Cause**: SVG `title` prop doesn't exist on SVGProps type.
**Files**: [components/clients/EnhancedClientList.tsx](components/clients/EnhancedClientList.tsx:478)
**Solution**: Move `title` attribute to `<title>` child element inside SVG.
- [ ] Replace title prop with `<title>` child in warning icon SVG (line ~478)
- **Impact**: Only EnhancedClientList.tsx, 1 line changed

### Task 3: Fix Date vs String Type Mismatches (4 errors)
**Root Cause**: Database returns ISO strings, but some types expect Date objects.
**Files**:
- [components/projects/ProjectForm.tsx](components/projects/ProjectForm.tsx:37)
- [pages/dashboard/clients.tsx](pages/dashboard/clients.tsx:140)
- [pages/dashboard/clients/[id].tsx](pages/dashboard/clients/[id].tsx:322)
**Solution**: Update shared types to use `string` for date fields (they're already ISO strings from DB).
- [ ] Update Client type: `lastContactDate?: string` (already a string in DB)
- [ ] Update Project type: `deadline?: string` (already a string in DB)
- **Impact**: Only type definitions in shared package, no logic changes

### Task 4: Fix CopyPasteWorkflowComponent - Null Arguments (3 errors)
**Root Cause**: Passing `null` where specific types expected.
**Files**: [components/workflow/CopyPasteWorkflowComponent.tsx](components/workflow/CopyPasteWorkflowComponent.tsx:176-178)
**Solution**: Use proper initial/undefined values instead of null.
- [ ] Replace null initializations with proper typed values or undefined
- **Impact**: Only CopyPasteWorkflowComponent.tsx, 3 lines changed

### Task 5: Fix StreamingResponseDisplay - Ref Type (1 error)
**Root Cause**: Ref callback returning wrong type.
**Files**: [components/workflow/StreamingResponseDisplay.tsx](components/workflow/StreamingResponseDisplay.tsx:254)
**Solution**: Fix ref callback to return void.
- [ ] Update ref callback to not return value (just assign)
- **Impact**: Only StreamingResponseDisplay.tsx, 1 line changed

### Task 6: Fix ThemeToggle Import (1 error)
**Root Cause**: Incorrect import path.
**Files**: [packages/shared/pages/dashboard/generate.tsx](packages/shared/pages/dashboard/generate.tsx:1)
**Solution**: Update import path to correct location.
- [ ] Find correct ThemeToggle path and update import
- **Impact**: Only generate.tsx, 1 line changed

### Task 7: Fix Dashboard Activity/Client Types (2 errors)
**Root Cause**: Optional id fields where required.
**Files**: [pages/dashboard/index.tsx](pages/dashboard/index.tsx:37,42)
**Solution**: Make id required in mock data objects.
- [ ] Add required id fields to Activity and ActiveClient mock data
- **Impact**: Only index.tsx, add missing id fields

### Task 8: Fix Client Detail Page - Undefined Arguments (3 errors)
**Root Cause**: Passing potentially undefined string to functions requiring string.
**Files**: [pages/dashboard/clients/[id].tsx](pages/dashboard/clients/[id].tsx:211,236,265)
**Solution**: Add nullish checks or default values.
- [ ] Add guards or fallbacks for undefined values before function calls
- **Impact**: Only clients/[id].tsx, 3 lines with guards

### Task 9: Fix Auth Store Type Mismatches (6 errors)
**Root Cause**: localStorage returns `string | null`, types expect specific unions or undefined.
**Files**: [stores/auth.ts](stores/auth.ts:103-107,115,151-152)
**Solution**: Add proper null handling and type guards/casts.
- [ ] Handle null from localStorage with proper defaults
- [ ] Add type guards for enum values (billingPlan, subscriptionStatus)
- [ ] Validate JSON parsed values before assignment
- **Impact**: Only auth.ts, ~10 lines of null handling

### Task 10: Fix Test RPC Type Issues (6 errors)
**Root Cause**: Calling RPC functions not in typed union.
**Files**: [tests/integration/infrastructure.test.ts](tests/integration/infrastructure.test.ts), [tests/integration/migrations.test.ts](tests/integration/migrations.test.ts)
**Solution**: Cast RPC calls in tests or update Supabase types.
- [ ] Cast test RPC calls to `any` for test-only functions
- **Impact**: Only test files, type casts on RPC calls

### Task 11: Fix TRPC Settings Type Conversion (1 error)
**Root Cause**: Json type conversion without validation.
**Files**: [server/trpc.ts](server/trpc.ts:110)
**Solution**: Use `unknown` intermediate cast or validate.
- [ ] Add `as unknown as` cast for Json → typed object conversion
- **Impact**: Only trpc.ts, 1 line changed

### Task 12: Fix Monitoring Undefined Type (1 error)
**Root Cause**: `string | undefined` doesn't match `string | null`.
**Files**: [utils/monitoring.ts](utils/monitoring.ts:38)
**Solution**: Convert undefined to null or widen type.
- [ ] Use `?? null` to convert undefined to null
- **Impact**: Only monitoring.ts, 1 line changed

### Task 13: Verify Build Passes
- [ ] Run `npm run type-check` to confirm 0 errors
- [ ] Push to GitHub to verify CI passes

---

## Review

### Changes Made
(Will be filled in as tasks are completed)

### Files Modified
(Will be listed as changes are made)

### Status
**Current Errors**: 40
**Target**: 0
**Approach**: Minimal, surgical fixes to each error - no complex refactors
