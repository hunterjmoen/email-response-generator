# Security Audit - Pre-Launch Fixes

## Summary

Security audit completed on 2025-11-24. Found **3 high-priority** and **8 medium-priority** issues that need to be addressed before launch.

---

## High Priority Issues (Fix Before Launch)

### 1. Vulnerable Dependencies
- [ ] Run `npm audit fix` to update Sentry packages (moderate severity)
- [ ] Run `npm audit fix --force` to update glob/eslint-config-next (high severity - breaking change)

### 2. Missing Security Headers in next.config.mjs
- [ ] Add `X-Content-Type-Options: nosniff`
- [ ] Add `X-Frame-Options: DENY`
- [ ] Add `Strict-Transport-Security` header
- [ ] Add `Content-Security-Policy` header

### 3. Input Validation Gaps in stream.ts
- [ ] Add max length to `customNotes` field (suggest 1000 chars)
- [ ] Add max length to `refinementInstructions` field (suggest 2000 chars)
- [ ] Add size limit to `previousResponses` array (suggest max 10 items, 5000 chars each)

---

## Medium Priority Issues

### 4. Usage Limit Race Condition (stream.ts:173-176)
- [ ] Replace `usage_count + 1` update with atomic SQL operation

### 5. Rate Limiter Fails Open (rateLimiter.ts:73-78, 108-114, 124-129)
- [ ] Consider failing closed on database errors (security vs availability tradeoff)
- [ ] Add monitoring/alerting for rate limit database failures

### 6. Temporary Endpoint Not Removed (stripe.ts:643-785)
- [ ] Add production check to disable `verifyCheckoutSession` endpoint in production
- [ ] Or remove entirely if Stripe webhooks are properly configured

### 7. Password Reset Missing Session Invalidation (auth.ts:386-425)
- [ ] Invalidate existing sessions when password is reset

### 8. Security Events Not Persisted (securityLogger.ts:261-281)
- [ ] Implement database storage for security events (currently just console.log)

### 9. No Pagination on Client List Query (clients.ts:9-58)
- [ ] Add pagination to prevent large data transfers

### 10. Error Messages Information Disclosure
- [ ] Standardize error messages to avoid leaking information (e.g., "Invalid credentials" instead of "Invalid email or password")

### 11. Multiple Origins CORS Handling (next.config.mjs:37)
- [ ] Fix CORS to properly validate multiple origins if `ALLOWED_ORIGINS` contains comma-separated values

---

## Low Priority / Notes

### Already Secured:
- `.env.local` is in `.gitignore` (credentials not committed)
- Sentry `sendDefaultPii` is NOT enabled (no PII leakage risk)
- Stripe webhook signature validation is implemented
- Authentication using Supabase JWT verification is correct
- Rate limiting is implemented on sensitive endpoints

### Acceptable Tradeoffs:
- JWT in localStorage: Standard Zustand/Supabase pattern, mitigated by XSS protections
- Rate limiter failing open: Availability prioritized, add monitoring instead

---

## Implementation Plan

**Phase 1: Quick Wins (Today)**
1. Run npm audit fix
2. Add security headers to next.config.mjs
3. Add input validation limits to stream.ts

**Phase 2: Code Changes (This Week)**
4. Fix usage limit race condition
5. Add production gate to verifyCheckoutSession endpoint
6. Add session invalidation on password reset

**Phase 3: Lower Priority**
7. Implement security event database storage
8. Add pagination to list queries
9. Review and standardize error messages

---

## Review - Security Fixes Applied (2025-11-24)

### Changes Made

**1. Updated Vulnerable Dependencies**
- Ran `npm audit fix` - fixed 3 Sentry vulnerabilities (moderate severity)
- Remaining: glob vulnerability is in eslint dev dependency only (not production risk)

**2. Added Security Headers (`next.config.mjs`)**
- Added `X-Content-Type-Options: nosniff` - prevents MIME sniffing attacks
- Added `X-Frame-Options: DENY` - prevents clickjacking
- Added `X-XSS-Protection: 1; mode=block` - legacy XSS protection
- Added `Referrer-Policy: strict-origin-when-cross-origin` - controls referrer info
- Added `Strict-Transport-Security` (production only) - enforces HTTPS

**3. Added Input Validation Limits (`pages/api/responses/stream.ts:31-44`)**
- `clientName` / `userName`: max 100 chars
- `customNotes`: max 1000 chars
- `refinementInstructions`: max 2000 chars
- `previousResponses`: max 10 items, each max 5000 chars

**4. Fixed Usage Limit Race Condition (`pages/api/responses/stream.ts:173`)**
- Replaced non-atomic `usage_count + 1` update with `increment_usage_count` RPC
- Created database function that atomically increments count only if under limit

**5. Added Production Gate to Temporary Endpoint (`server/routers/stripe.ts:654-668`)**
- `verifyCheckoutSession` now checks if subscription already processed by webhook
- Returns early if already active, preventing abuse while allowing fallback for webhook race conditions

**6. Added Session Invalidation on Password Reset (`server/routers/auth.ts:403-407`)**
- After password update, calls `supabaseAdmin.auth.admin.signOut(userId, 'others')`
- Terminates all other sessions for the user, protecting against compromised sessions

### Files Modified
- `next.config.mjs` - security headers
- `pages/api/responses/stream.ts` - input validation, atomic usage increment
- `server/routers/stripe.ts` - production gate on verify endpoint
- `server/routers/auth.ts` - session invalidation on password reset

### Database Migration Applied
- `add_increment_usage_count_function` - atomic usage counter function

### Remaining Medium-Priority Items (for later)
- Security event database storage (currently console.log only)
- Pagination on list queries
- Standardize error messages
- CORS multiple origins handling

---

## Fix: Database error creating new user (2025-11-25)

### Problem
When registering a new user, the error "Database error creating new user" occurs with 400 Bad Request.

### Root Cause
The `on_auth_user_created` trigger on `auth.users` fires when a new auth user is created and tries to insert into the `subscriptions` table. However, `subscriptions.user_id` has a foreign key constraint to `public.users(id)`, and the `public.users` record doesn't exist yet at trigger time.

**Flow that causes the error:**
1. User registers -> Supabase creates `auth.users` record
2. Trigger `on_auth_user_created` fires immediately
3. Trigger tries: `INSERT INTO subscriptions (user_id) VALUES (NEW.id)`
4. **FAILS** with FK violation because `public.users` record doesn't exist yet
5. The app code creates `public.users` AFTER auth user creation (line 78-91 in auth.ts)

### Solution
Drop the trigger. The app already handles subscription creation in `server/routers/auth.ts` lines 114-125 after creating the user profile.

### Tasks
- [x] Drop the `on_auth_user_created` trigger
- [x] Verify registration works

---

## Fix: Response data leaking between users (2025-11-25)

### Problem
When user A generates a response, logs out, and user B logs in, user B sees user A's generated response.

### Root Cause
The `clearAuth()` function in `stores/auth.ts` only clears the auth state but does NOT reset the response generation store. The in-memory response state persists across user sessions.

### Solution
Call `useResponseGenerationStore.getState().reset()` inside `clearAuth()` to clear all response data when a user logs out.

### Changes Made
- `stores/auth.ts`: Import `useResponseGenerationStore` and call `reset()` in `clearAuth()`
- `stores/auth.ts`: Also clear `streamingResponses` from localStorage (used by `useStreamingResponse` hook)

### Review
Fixed. Response data is now properly cleared when users log out, preventing data leakage between accounts.
