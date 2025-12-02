# Collapsible Sidebar Feature

## Overview
Make the dashboard sidebar collapsible so users can maximize screen space while still being able to navigate between pages.

## Plan

### Todo Items
- [ ] 1. Add collapse state management in DashboardLayout (useState hook)
- [ ] 2. Add collapse toggle button to DashboardSidebar
- [ ] 3. Update DashboardSidebar width to be conditional (w-64 expanded, w-16 collapsed)
- [ ] 4. Update NavItem component to handle collapsed state (show only icons, hide labels)
- [ ] 5. Add tooltips to nav items when sidebar is collapsed
- [ ] 6. Update logo section for collapsed state (show only "FL" badge)
- [ ] 7. Update user profile section for collapsed state
- [ ] 8. Update logout button for collapsed state
- [ ] 9. Hide/show footer and usage indicator based on collapsed state
- [ ] 10. Add smooth transition animation for collapse/expand

## Implementation Notes
- Keep it simple: use useState in DashboardLayout, pass state to DashboardSidebar
- Use Tailwind CSS transitions for smooth animations
- Show tooltips on hover when collapsed for accessibility
- The `isCollapsed` prop already exists in DashboardSidebar interface

## Review
(To be filled after implementation)
