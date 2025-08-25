# Header Fix Plan - Minimal Edits for Consistency

## Goal
Ensure ALL pages inherit the same `AppHeader` from `App.tsx`, eliminating duplicate headers while maintaining consistent navigation.

## Current State
- ✅ `AppHeader` is correctly rendered in `App.tsx` (line 37) for all routes except `/auth`
- ✅ `AppHeader` includes `BackButton` that shows on all non-feed pages
- ⚠️ Several pages have duplicate or custom headers that need removal

## Required File Edits

### Priority 1: Remove Duplicate Headers

#### 1. **client/src/pages/home.tsx**
- **Lines to remove**: 77-102 (entire custom header block)
- **Reason**: Custom header for non-authenticated users conflicts with AppHeader
- **Action**: Delete the entire `<header>` element and its contents

#### 2. **client/src/pages/create-moment.tsx**
- **Lines to remove**: 34-39 (header div)
- **Reason**: Has its own header div with title
- **Action**: Delete the header div, keep only the main content div

#### 3. **client/src/pages/discover-by-location.tsx**
- **Line to modify**: 71
- **Current**: `<h1 className="text-3xl font-bold mb-6">Discover by Location</h1>`
- **Action**: Remove this h1 element, the page title will be in AppHeader

### Priority 2: Check and Clean Imports

#### 4. **client/src/pages/ProfilePage.tsx**
- **Line to check**: 42 (imports PageHeader)
- **Action**: Remove unused PageHeader import if not used in JSX

#### 5. **client/src/pages/discover.tsx**
- **Line to check**: 22 (imports GlobalHeader)
- **Action**: Remove GlobalHeader import and any usage

### Priority 3: Investigate Component Usage

#### 6. **client/src/pages/list-details.tsx**
- **Line 34**: Imports AppHeader
- **Action**: Check if AppHeader is rendered in JSX. If yes, remove it (should inherit from App.tsx)

#### 7. **client/src/pages/RestaurantDetailPage.tsx**
- **Line 23**: Imports AppHeader
- **Action**: Check if AppHeader is rendered in JSX. If yes, remove it (should inherit from App.tsx)

## Implementation Order

1. **Phase 1**: Remove obvious duplicate headers (home.tsx, create-moment.tsx, discover-by-location.tsx)
2. **Phase 2**: Clean unused imports (ProfilePage.tsx, discover.tsx)
3. **Phase 3**: Investigate and fix component usage (list-details.tsx, RestaurantDetailPage.tsx)

## Validation Checklist

After changes:
- [ ] Navigate to `/` - should see AppHeader, no duplicate
- [ ] Navigate to `/feed` - should see AppHeader without back button
- [ ] Navigate to `/discover` - should see AppHeader with back button
- [ ] Navigate to `/create-moment` - should see AppHeader, no custom header
- [ ] Navigate to `/discover-by-location` - should see AppHeader, no h1 title
- [ ] Navigate to `/profile` - should see AppHeader with back button
- [ ] Navigate to `/lists/:id` - should see AppHeader with back button
- [ ] Navigate to `/restaurants/:id` - should see AppHeader with back button
- [ ] Navigate to `/auth` - should NOT see AppHeader (by design)

## Edge Cases Handled

1. **Authentication Page**: `/auth` correctly excluded from AppHeader
2. **Modal Pages**: Pages like `/create-post` that use modals correctly inherit AppHeader
3. **404 Page**: Simple error page works without navigation
4. **Mobile/Desktop Navigation**: MobileNavigation and DesktopSidebar remain untouched (they're not headers)

## Success Criteria

- ✅ Single source of truth: AppHeader in App.tsx
- ✅ Consistent back button behavior across all pages
- ✅ No duplicate headers or navigation elements
- ✅ No console errors or warnings
- ✅ Proper TypeScript compliance
- ✅ Keyboard navigation works

## Questions/Ambiguities

None identified. The plan is clear and executable based on the audit findings.