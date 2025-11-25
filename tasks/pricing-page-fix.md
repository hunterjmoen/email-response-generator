# Pricing Page Complete Fix - Todo List

## Phase 1: Database Schema (Supabase)
- [ ] Add `billing_interval` column to subscriptions table
- [ ] Add `has_used_trial` column to track trial usage
- [ ] Backfill existing subscriptions with billing_interval from Stripe

## Phase 2: TypeScript Type Updates
- [ ] Update User type in packages/shared/src/types/user.ts
- [ ] Update types/database.ts with new schema columns

## Phase 3: Stripe Webhook Handler
- [ ] Update webhook to capture billing_interval on subscription.created
- [ ] Update webhook to set has_used_trial when trial starts
- [ ] Update webhook to handle billing_interval changes

## Phase 4: Stripe Router (Subscription Creation)
- [ ] Update stripe router to store billing_interval
- [ ] Add endpoint for switching billing cycles
- [ ] Implement Stripe API call for interval updates

## Phase 5: Auth Store
- [ ] Update auth store to fetch billing_interval
- [ ] Update auth store to fetch has_used_trial
- [ ] Update user state management

## Phase 6: Pricing Page - Core Logic
- [ ] Add isExactCurrentPlan(tier, interval) helper
- [ ] Update isCurrentTier() to check billing_interval
- [ ] Add canSwitchBillingCycle() helper

## Phase 7: Pricing Page - Button Logic
- [ ] Fix "Start Trial" button logic with has_used_trial check
- [ ] Add "Switch to Annual/Monthly" button
- [ ] Fix "Manage Subscription" button to check exact match
- [ ] Verify "Upgrade" buttons for different tiers

## Phase 8: Pricing Page - UI/Badges
- [ ] Fix "Current Plan" badge logic
- [ ] Update subscription banner with billing type
- [ ] Add confirmation modal for billing cycle switches

## Review Section
(Will be filled upon completion)
