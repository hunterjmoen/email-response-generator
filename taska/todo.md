# Fix Pricing Page Button States

## Problem
User on Premium plan sees "Manage in Billing" on ALL tier cards instead of appropriate actions (Current Plan, Upgrade, Downgrade).

## Root Cause
The button logic uses `hasSubscription()` which only checks if user has ANY paid subscription, not the direction of the plan change relative to each card.

## Plan

- [x] Add tier ranking helper function to compare tiers (free=0, professional=1, premium=2)
- [x] Update Free tier button logic (line 267-288): Show "Downgrade" for paid subscribers
- [x] Update Professional tier button logic (line 370-395): Show "Current Plan" (disabled), or "Downgrade" based on comparison
- [x] Update Premium tier button logic (line 482-508): Show "Current Plan" (disabled) or "Upgrade" based on comparison
- [x] Verify changes don't break existing payment flow

## Expected Results
| User's Current Tier | Free Card | Professional Card | Premium Card |
|---------------------|-----------|-------------------|--------------|
| Free                | Current Plan (disabled) | Subscribe Now | Subscribe Now |
| Professional        | Downgrade | Current Plan (disabled) | Upgrade |
| Premium             | Downgrade | Downgrade | Current Plan (disabled) |

## Review

### Changes Made

**File: `pages/pricing.tsx`**

1. **Added tier ranking helper functions** (lines 53-66):
   - `getTierRank()`: Returns numeric rank (free=0, professional=1, premium=2)
   - `currentTierRank`: Current user's tier rank
   - `isUpgrade()`: Checks if target tier is higher than current
   - `isDowngrade()`: Checks if target tier is lower than current

2. **Updated Free tier button** (lines 267-288):
   - Changed "Manage in Billing" to "Downgrade" for paid subscribers
   - Keeps "Current Plan" (disabled) for free users
   - Keeps "Start Free" for non-authenticated users

3. **Updated Professional tier button** (lines 370-395):
   - Changed to show "Current Plan" (disabled button) when on Professional
   - Shows "Downgrade" for Premium users (via `hasSubscription() && isDowngrade('professional')`)
   - Shows "Subscribe Now" / "Start Free Trial" for Free users

4. **Updated Premium tier button** (lines 482-508):
   - Changed to show "Current Plan" (disabled button) when on Premium
   - Shows "Upgrade" button for Professional users (existing paid subscribers)
   - Shows "Subscribe Now" / "Start Free Trial" for Free users

### Key Design Decisions
- Downgrade buttons link to `/settings/billing` where the downgrade modal already exists
- Upgrade button for Premium triggers direct Stripe checkout via `handleSubscribe()`
- Current Plan buttons are disabled with gray styling for clarity
- Payment flow unchanged - existing `handleSubscribe()` function handles all checkout logic
