# Fix Gmail Content Sidebar Push Issue

## Problem
The FreelanceFlow sidebar (360px wide, fixed position on right) currently overlaps Gmail's content instead of pushing it to the left. Previous attempts using CSS `margin-right` on html/body don't work because Gmail uses a complex nested layout with absolute positioning.

## Root Cause Analysis
1. Gmail uses a specific DOM structure with containers like `.nH`, `.aeF`, and `.ae4`
2. Gmail's main content areas use `position: absolute` with `left/right` properties
3. Adding `margin-right` to html/body has no effect on absolutely positioned child elements
4. Need to directly manipulate the `right` CSS property of Gmail's main containers

## Research: How Gmail's Own Panels Work
Gmail's native right-side panels (Google Chat, Calendar, Keep) work by:
1. **Setting a class on the main container** - Gmail adds/removes classes to toggle layout
2. **Using `right` property on absolutely positioned containers** - Not margins
3. **Targeting multiple container levels** - `.nH`, `.aeF`, `.ae4`, navigation bar
4. **Maintaining responsive behavior** - Handles window resize gracefully
5. **Using MutationObserver** - Handles Gmail's dynamic content loading

## Solution: JavaScript-Based Layout Adjuster
Create a robust `GmailLayoutAdjuster` class that:
- Directly manipulates Gmail container styles
- Stores and restores original styles
- Handles dynamic content with MutationObserver
- Supports smooth transitions

## Plan

### Todo Items
- [ ] Create `GmailLayoutAdjuster` class with core layout manipulation
- [ ] Implement `adjustLayout()` to push Gmail content left by 360px
- [ ] Implement `resetLayout()` to restore original Gmail layout
- [ ] Add MutationObserver to handle Gmail's dynamic loading
- [ ] Integrate with `SidebarInjector.show()` and `hide()` methods
- [ ] Remove ineffective CSS margin rules from content.css
- [ ] Test with inbox view, conversation view, and compose modal

## Implementation Details

### Gmail Selectors Strategy
Target these containers in order of importance:
1. `.nH` - Main wrapper (position: absolute, needs right adjustment)
2. `.aeF` - Content frame (position: absolute)
3. `.Tm.aeJ` - Top navigation bar (position: absolute)
4. `[role="main"]` - Main content area (fallback)

### Key Implementation Points
1. **Store original styles** - Save `right` values before modification
2. **Set right property** - Apply `right: 360px` (sidebar width)
3. **Add transitions** - `transition: right 0.3s ease` for smooth animation
4. **Handle edge cases** - Gmail might reload containers dynamically
5. **Clean restoration** - Remove inline styles or restore exact original values

### Files to Create/Modify
- `src/content/gmail-layout-adjuster.ts` (NEW) - Core layout adjustment logic
- `src/content/sidebar-injector.ts` (MODIFY) - Integrate layout adjuster
- `src/content/content.css` (MODIFY) - Remove ineffective margin rules

## Review
(Will be filled in after implementation)
