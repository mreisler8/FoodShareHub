# Header Consistency Implementation Plan

## Current State Analysis

The application currently has:
1. A global AppHeader component already created at `client/src/components/layout/AppHeader.tsx`
2. The App.tsx (lines 37-44) already conditionally renders AppHeader for non-auth pages
3. Individual pages have inconsistent header implementations

## Minimal Plan for Consistent Global Header

### Files to Edit (5 files total)

#### 1. client/src/App.tsx (Already has AppHeader integrated)
- **Current** (lines 37-44):
```tsx
return (
  <ErrorBoundary>
    <div className="min-h-screen bg-white">
      {location !== "/auth" && <AppHeader />}
      <main className={`mx-auto max-w-screen-md px-3 py-3 ${showBottomNav ? "mobile-content" : ""}`}>
        <Router />
      </main>
    </div>
```
- **No changes needed** - AppHeader is already rendered globally

#### 2. client/src/pages/feed.tsx
- **Remove** (line 16): 
```tsx
import { GlobalHeader } from '@/components/ui/GlobalHeader';
```
- **Remove** (line 267):
```tsx
<GlobalHeader showBackButton={false} />
```

#### 3. client/src/pages/DiscoverFeed.tsx
- **No changes needed** - Already has no header (will inherit from App.tsx)

#### 4. client/src/pages/circles.tsx
- **Remove** (line 6):
```tsx
import { GlobalHeader } from "@/components/ui/GlobalHeader";
```
- **Remove** (line 183):
```tsx
<GlobalHeader />
```
- **Adjust** (line 184) the padding-top:
```tsx
// Before:
<div className="min-h-screen bg-gray-50 pt-16">
// After:
<div className="min-h-screen bg-gray-50">
```

#### 5. client/src/pages/ProfilePage.tsx
- **Remove** (line 43):
```tsx
import { AppHeader } from '@/components/ui/AppHeader';
```
- **No render changes needed** - Already doesn't render the AppHeader

## Navigation Sidebar Consistency

### Current State:
- Feed, Circles, and Profile import MobileNavigation/DesktopSidebar
- Discover doesn't have any navigation components
- This is a separate concern from the header and can be addressed in a future task

## Benefits of This Approach

1. **Single source of truth**: AppHeader renders once in App.tsx
2. **Consistent behavior**: Back button logic and logo navigation work the same everywhere
3. **Minimal changes**: Only removing duplicate headers from individual pages
4. **No breaking changes**: Pages that don't have headers will now get the global one

## Testing Steps After Implementation

1. Navigate to /feed - header should appear with no back button
2. Navigate to /discover - header should appear with back button
3. Navigate to /circles - header should appear with back button
4. Navigate to /profile - header should appear with back button
5. Click logo from any page - should navigate to /feed
6. Click back button - should use browser history or fallback to /feed

## Notes

- The DesktopSidebar and MobileNavigation components are handled separately by each page and are not part of this header consolidation
- The bottom navigation (BottomNavigation component) is already centrally managed in App.tsx
- No other pages need to be touched for this header consolidation