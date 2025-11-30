# Fix Premium Resubscription Error

## Problem Analysis
When a user tries to resubscribe to Premium after their subscription was scheduled to cancel:
1. The subscription period ended (11/26/2025)
2. Stripe automatically cancelled the subscription
3. The local database may still show `status: 'active'` and have the old `stripe_subscription_id`
4. When user clicks "Resubscribe", the frontend sees `canUpdateExisting = true`
5. It calls `updateSubscription` with the old (cancelled) subscription ID
6. Stripe's `subscriptions.update()` fails because you can't update a cancelled subscription → 500 error

## Root Cause
In `server/routers/stripe.ts`, the `updateSubscription` mutation doesn't check if the Stripe subscription is already cancelled before trying to update it.

## Fix Plan

- [x] **1. Add status check in `updateSubscription`**
  - After retrieving the subscription from Stripe, check if `subscription.status === 'canceled'`
  - If cancelled, throw a specific TRPC error with a message indicating the user needs to create a new subscription
  - Also sync the database to reflect the cancelled status

- [x] **2. Handle the error in frontend** (if needed)
  - The frontend should catch this specific error and redirect to checkout flow
  - Check if this is already handled or needs to be added

## Files Modified
- `server/routers/stripe.ts` - Added status check in `updateSubscription` (lines 384-406)
- `pages/settings/billing.tsx` - Added error handling in `handleUpgrade` (lines 207-233)

## Review Section

### Summary of Changes

**Backend (`server/routers/stripe.ts`)**:
- Added check after retrieving Stripe subscription: if `status === 'canceled'`, sync the database to free tier and throw `SUBSCRIPTION_CANCELLED` error
- This ensures the database is kept in sync when Stripe has already cancelled a subscription

**Frontend (`pages/settings/billing.tsx`)**:
- Wrapped the `updateSubscription` call in a try-catch
- If the error is `SUBSCRIPTION_CANCELLED`, the code falls through to create a new checkout session
- Other errors are re-thrown to be handled by the outer catch block

### How the Fix Works
1. User clicks "Resubscribe" on a cancelled subscription
2. Frontend calls `updateSubscription` with the old subscription ID
3. Backend retrieves subscription from Stripe, sees `status: 'canceled'`
4. Backend syncs database (sets tier to free, clears subscription ID)
5. Backend throws `SUBSCRIPTION_CANCELLED` error
6. Frontend catches this error, refreshes local state, falls through to checkout flow
7. User is redirected to Stripe checkout to create a new subscription

### Impact
- Minimal code changes (~30 lines added)
- No breaking changes to existing functionality
- Database stays in sync with Stripe
- User gets a seamless experience - automatically redirected to checkout
