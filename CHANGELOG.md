# Changelog

All notable changes to the Circles MVP will be documented in this file.

## [Unreleased]

### MVP Polishes (July 28, 2025)

#### Added
- **AppHeader component** (`/components/ui/AppHeader.tsx`) - Unified header with logo, page title, and back button
- **Skeleton loading states** (`/components/ui/SkeletonFeedCard.tsx`) - Loading placeholders for feed and list cards
- **Error handling UI** (`/components/ui/InlineError.tsx`) - Inline error messages with retry functionality
- **Offline detection** (`/components/ui/OfflineBanner.tsx`) - Banner notification for offline status
- **Accessibility improvements** - All interactive elements now have minimum 44px tap targets and proper ARIA labels
- **Safe-area support** - Bottom navigation and floating buttons now respect device safe areas

#### Enhanced
- **EmptyState component** - Updated to match MVP specifications with consistent styling
- **BottomNav component** - Improved accessibility and touch targets
- **FloatingCreateButton** - Enhanced with proper safe-area positioning

#### Technical
- Focus management improvements across all interactive components
- Consistent button sizing and accessibility patterns
- Mobile-first responsive behavior enhancements

---

## Previous Changes

See `replit.md` for detailed project history and recent changes.