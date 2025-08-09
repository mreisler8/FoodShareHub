# Header Components by Page

## /feed (client/src/pages/feed.tsx)

### Header Components Imported:
- Line 16: `import { GlobalHeader } from '@/components/ui/GlobalHeader';`
- Line 6: `import { MobileNavigation } from '@/components/navigation/MobileNavigation';`
- Line 7: `import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';`

### Header Components Rendered:
- Line 267: `<GlobalHeader showBackButton={false} />`
- Line 263: `<DesktopSidebar />` (desktop navigation sidebar)
- MobileNavigation not directly rendered in this component

## /discover (client/src/pages/DiscoverFeed.tsx)

### Header Components Imported:
- None - No header components imported

### Header Components Rendered:
- None - No header components rendered
- Page renders directly with content starting at line 234 with a simple div wrapper

## /circles (client/src/pages/circles.tsx)

### Header Components Imported:
- Line 6: `import { GlobalHeader } from "@/components/ui/GlobalHeader";`
- Line 4: `import { MobileNavigation } from "@/components/navigation/MobileNavigation";`
- Line 5: `import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";`

### Header Components Rendered:
- Line 183: `<GlobalHeader />`
- Line 185: Conditional rendering of `<MobileNavigation />` or `<DesktopSidebar />` based on `isMobile`

## /profile (client/src/pages/ProfilePage.tsx)

### Header Components Imported:
- Line 4: `import { MobileNavigation } from "@/components/navigation/MobileNavigation";`
- Line 5: `import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";`
- Line 43: `import { AppHeader } from '@/components/ui/AppHeader';`

### Header Components Rendered:
- None directly in the main return statement
- The component defines a `ProfileHeader` internal component (lines 147-265) but this is for profile-specific header, not the global app header
- No MobileNavigation, DesktopSidebar, or AppHeader rendered

## Summary of Inconsistencies

1. **Feed page**: Uses GlobalHeader + DesktopSidebar
2. **Discover page**: No header components at all
3. **Circles page**: Uses GlobalHeader + conditional MobileNavigation/DesktopSidebar
4. **Profile page**: Imports headers but doesn't render them

This shows inconsistent header implementation across the 4 pages, with each handling navigation differently.