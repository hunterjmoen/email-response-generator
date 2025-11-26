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

- [ ] **1.1 Database Migration** - Add new columns to track scheduled downgrades
  - `scheduled_tier` - The tier user is downgrading to (null if no pending downgrade)
  - `scheduled_tier_change_date` - When the downgrade takes effect

- [ ] **1.2 Update SubscriptionRow type** - Add new fields to TypeScript types

- [ ] **1.3 Update auth store** - Fetch and expose new scheduled downgrade fields

- [ ] **1.4 Create `scheduleDowngrade` endpoint** - New tRPC mutation that:
  - Calls Stripe's `subscriptions.update()` with `proration_behavior: 'none'`
  - Uses Stripe's subscription schedule to schedule change at period end
  - Stores scheduled tier in database

- [ ] **1.5 Create `cancelScheduledDowngrade` endpoint** - tRPC mutation to cancel pending downgrade

- [ ] **1.6 Update billing.tsx UI** - Show pending downgrade status with:
  - Message: "Your plan will change to [tier] on [date]"
  - Button to cancel pending downgrade
  - Modify downgrade button logic

- [ ] **1.7 Update webhook handler** - Handle subscription update at period end

### Policy 2: No Mid-cycle Annual to Monthly Switches

- [ ] **2.1 Update `switchBillingCycle` endpoint** - Add validation to block annual->monthly mid-cycle

- [ ] **2.2 Update billing.tsx UI** -
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

### Key Files to Modify
1. `database/migrations/` - New migration for scheduled_tier columns
2. `types/database.ts` - SubscriptionRow type
3. `stores/auth.ts` - Fetch scheduled tier fields
4. `server/routers/stripe.ts` - New/modified endpoints
5. `pages/api/webhooks/stripe.ts` - Handle scheduled changes
6. `pages/settings/billing.tsx` - UI for pending downgrades

---

## Review Section
_(To be completed after implementation)_
