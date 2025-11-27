# Subscription Management Policies Implementation Plan

## Task Overview
Implement two subscription management policies:
1. **End-of-billing-cycle downgrades** - Schedule downgrades for period end instead of immediate
2. **No mid-cycle annual to monthly switches** - Block annual→monthly mid-cycle

## Pricing Tiers
- Free: $0 (10 responses/month)
- Professional: $10/month or $96/year (75 responses/month)
- Premium: $19/month or $180/year (Unlimited)

---

## TODO Items

### Policy 1: End-of-billing-cycle Downgrades

- [x] **1.1 Database Migration** - Add new columns to track scheduled downgrades
  - `scheduled_tier` - The tier user is downgrading to (null if no pending downgrade)
  - `scheduled_tier_change_date` - When the downgrade takes effect

- [x] **1.2 Update SubscriptionRow type** - Add new fields to TypeScript types

- [x] **1.3 Update auth store** - Fetch and expose new scheduled downgrade fields

- [x] **1.4 Create `scheduleDowngrade` endpoint** - New tRPC mutation that:
  - Calls Stripe's `subscriptions.update()` with `proration_behavior: 'none'`
  - Uses Stripe's subscription schedule to schedule change at period end
  - Stores scheduled tier in database

- [x] **1.5 Create `cancelScheduledDowngrade` endpoint** - tRPC mutation to cancel pending downgrade

- [x] **1.6 Update billing.tsx UI** - Show pending downgrade status with:
  - Message: "Your plan will change to [tier] on [date]"
  - Button to cancel pending downgrade
  - Modify downgrade button logic

- [x] **1.7 Update webhook handler** - Handle subscription update at period end

### Policy 2: No Mid-cycle Annual to Monthly Switches

- [x] **2.1 Update `switchBillingCycle` endpoint** - Add validation to block annual->monthly mid-cycle

- [x] **2.2 Update billing.tsx UI** -
  - Detect annual->monthly attempt
  - Show message: "Your annual plan is active through [date]. You can switch to monthly billing when your plan renews."
  - Disable monthly option for annual subscribers

---

## Implementation Notes

### Stripe API Approach for Downgrades
Use Stripe's subscription schedule API to schedule future price changes:
- Create schedule from existing subscription
- Schedule phase change at period end with new price
- This preserves current access until period end

### Key Files Modified
1. `database/migrations/011_scheduled_downgrades.sql` - New migration for scheduled_tier columns
2. `types/database.ts` - SubscriptionRow type with new fields
3. `packages/shared/src/types/user.ts` - User subscription type with new fields
4. `stores/auth.ts` - Fetch scheduled tier fields
5. `server/routers/stripe.ts` - New scheduleDowngrade and cancelScheduledDowngrade endpoints
6. `pages/api/webhooks/stripe.ts` - Handle scheduled changes, clear fields on completion
7. `pages/settings/billing.tsx` - UI for pending downgrades and annual restriction

---

## Review Section

### Summary of Changes

**Policy 1: End-of-billing-cycle Downgrades**
- Added `scheduled_tier` and `scheduled_tier_change_date` columns to subscriptions table
- Created `scheduleDowngrade` tRPC endpoint that uses Stripe subscription schedules for paid tier downgrades, and `cancel_at_period_end` for free tier downgrades
- Created `cancelScheduledDowngrade` endpoint to allow users to cancel pending downgrades
- Updated billing UI to show "Plan change scheduled" notification with cancel button
- Modal shows "Scheduled for end of billing period" message and "Schedule Downgrade" button for downgrades
- Webhook handler clears scheduled fields when the downgrade actually takes effect

**Policy 2: No Mid-cycle Annual to Monthly Switches**
- Added validation in `switchBillingCycle` to block annual→monthly switches mid-cycle
- Returns error message with renewal date when attempted
- Billing modal disables Monthly option for annual subscribers with explanation message

### Key Behaviors
- **Downgrades** (Premium→Professional, Professional→Free, Premium→Free) are scheduled for period end
- **Upgrades** happen immediately with proration
- **Annual subscribers** cannot switch to monthly mid-cycle; must wait for renewal
- Users can cancel scheduled downgrades before they take effect
- Full access to current tier features until scheduled change date
