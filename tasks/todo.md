# Pricing Page Repositioning

## Goal
Reposition pricing page from "AI replies with limits" to "Protect Scope + Change Orders" as the primary value prop.

## Context
- Protect Scope + Change Orders feature exists (components/workflow/ProtectScopePanel.tsx, ChangeOrderBuilder.tsx)
- Currently no tier gating on these features in the UI
- Pricing page doesn't mention scope protection at all
- 75 responses/month is too low and creates churn
- "Unlimited responses" is weak premium value prop

## Changes

### 1. Update Pricing Tier Copy (pages/pricing.tsx)
- [x] **Free tier**: "Reply Fast" - Detection preview only
  - 10 responses/month (keep)
  - "Scope Creep Detection" - see alerts only
  - 7-day response history (add this limit language)
  - Basic AI responses

- [x] **Professional tier ($10)**: "Protect Scope" - Core scope protection
  - **200 responses/month** (increase from 75)
  - "Protect Scope Mode" - full detection + boundary responses
  - "Change Order Builder" - create professional pricing responses
  - "Lock & Copy" - verify pricing and copy response
  - Client management + unlimited history

- [x] **Premium tier ($19)**: "Policies + Voice"
  - Unlimited responses
  - Everything in Professional
  - "TonePrint" / AI Style Learning (renamed to TonePrint Voice Matching)
  - Advanced analytics
  - De-emphasize "Priority Support" and "Early Access" (moved to bottom with muted styling)

### 2. Fix Math Issues
- [x] Premium annual: User decided to keep "Save 20%" as-is (no change)

### 3. Update FAQ
- [x] Add FAQ about Protect Scope + Change Orders
- [x] Update "Which plan is right for me?" to mention scope protection
- [x] Rename "AI Style Learning" FAQ to "TonePrint Voice Matching"
- [x] Update monthly limit FAQ from 75 to 200

## Not Changing (separate tasks)
- Actual feature gating logic (requires backend work)
- Backend tier limits (requires migration + Stripe update)
- Stripe product configuration

---

## Review

### Changes Made (2025-12-11)

**File modified:** `pages/pricing.tsx`

**Free Tier (lines 321-360):**
- Changed "Context Selection" → "Scope Creep Detection" with "Preview alerts only"
- Changed "Copy-Paste Workflow" → "7-Day Response History" with "Access recent responses"

**Professional Tier (lines 447-506):**
- Changed "75 responses per month" → "200 responses per month"
- Changed "All Free features" → "Protect Scope Mode" with "Detect & respond to scope creep"
- Changed "Full Client Management" → "Change Order Builder" with "Create pricing responses in one click"
- Added "Lock & Copy" with "Verify pricing before sending"
- Kept "Client Management" and "Unlimited Response History"
- Removed "Priority Support" (moved to Premium only)

**Premium Tier (lines 586-645):**
- Renamed "AI Style Learning" → "TonePrint Voice Matching"
- Updated "All Professional features" subtitle to "Protect Scope, Change Orders & more"
- Muted styling on "Priority Support" and "Early Access" (gray text instead of green)

**FAQ Section:**
- Added new FAQ: "What is Protect Scope?" explaining the feature
- Updated "Which plan is right for me?" to emphasize Protect Scope for Professional
- Renamed "AI Style Learning" FAQ to "TonePrint Voice Matching"
- Updated monthly limit reference from 75 to 200

### Impact
- Pricing page now leads with Protect Scope + Change Orders as the core value prop
- Professional tier is positioned as the "shut up and take my money" tier for scope protection
- Premium tier emphasizes TonePrint voice matching as the upgrade path
- Low-value features (Priority Support, Early Access) de-emphasized
