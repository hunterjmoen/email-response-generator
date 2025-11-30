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

- [ ] **1. Add status check in `updateSubscription`**
  - After retrieving the subscription from Stripe, check if `subscription.status === 'canceled'`
  - If cancelled, throw a specific TRPC error with a message indicating the user needs to create a new subscription
  - Also sync the database to reflect the cancelled status

- [ ] **2. Handle the error in frontend** (if needed)
  - The frontend should catch this specific error and redirect to checkout flow
  - Check if this is already handled or needs to be added

## Files to Modify
- `server/routers/stripe.ts` - Add status check in `updateSubscription`
- `pages/settings/billing.tsx` - May need to handle the specific error (check first)

## Review Section
(To be filled after implementation)
