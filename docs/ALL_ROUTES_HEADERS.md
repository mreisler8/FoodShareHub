# Complete Routes and Headers Audit

## Summary
The application has a global `AppHeader` component rendered in `App.tsx` that shows on all routes except `/auth`. However, several pages still have duplicate headers or custom header implementations that need to be removed.

## Global Header Implementation
- **Location**: `client/src/App.tsx` (line 37)
- **Condition**: Shows on all routes except `/auth`
- **Components**: `AppHeader` with integrated `BackButton`

## Route-to-Component Mapping with Header Usage

| Route | Component File | Headers Imported | Headers Rendered | Issues | Notes |
|-------|---------------|------------------|------------------|--------|-------|
| `/` | `pages/home.tsx` | None | Custom header (lines 78-102) | ⚠️ DUPLICATE | Has custom header for non-authenticated users |
| `/feed` | `pages/feed.tsx` | None | None | ✅ OK | Inherits AppHeader correctly |
| `/feed/circle/:circleId` | `pages/feed.tsx` | None | None | ✅ OK | Inherits AppHeader correctly |
| `/top-picks` | `pages/top-picks.tsx` | None | None | ✅ OK | Inherits AppHeader correctly |
| `/create-post` | `pages/create-post.tsx` | None | None | ✅ OK | Modal-based, inherits AppHeader |
| `/create-moment` | `pages/create-moment.tsx` | None | Custom header (lines 35-39) | ⚠️ DUPLICATE | Has its own header div |
| `/circles` | `pages/circles.tsx` | None | None | ✅ OK | Inherits AppHeader correctly |
| `/create-circle` | `pages/create-circle.tsx` | None | None | ❓ NEEDS CHECK | Not examined |
| `/circles/:id` | `pages/circle-details.tsx` | None | None | ✅ OK | Uses ArrowLeft icon but no header |
| `/circles/:id/members` | `pages/circle-members.tsx` | None | None | ❓ NEEDS CHECK | Not examined |
| `/profile/:id?` | `pages/ProfilePage.tsx` | PageHeader imported | None in JSX | ✅ OK | PageHeader imported but not used |
| `/profile-old/:id?` | `pages/profile.tsx` | None | None | ❓ NEEDS CHECK | Not examined |
| `/discover` | `pages/DiscoverFeed.tsx` | None | None | ✅ OK | Inherits AppHeader correctly |
| `/discover-old` | `pages/discover.tsx` | GlobalHeader imported | Unknown | ❓ NEEDS CHECK | GlobalHeader imported |
| `/discover-by-location` | `pages/discover-by-location.tsx` | None | Custom h1 (line 71) | ⚠️ PARTIAL | Has h1 title but no full header |
| `/lists` | `pages/my-lists.tsx` | None | None | ✅ OK | Inherits AppHeader correctly |
| `/lists/create` | `pages/create-list.tsx` | None | None | ✅ OK | Comment says replaced with AppHeader |
| `/create-list` | `pages/create-list.tsx` | None | None | ✅ OK | Same component as above |
| `/lists/:id` | `pages/list-details.tsx` | AppHeader imported | Unknown | ❓ NEEDS CHECK | AppHeader imported (line 34) |
| `/my-lists` | `pages/my-lists.tsx` | None | None | ✅ OK | Inherits AppHeader correctly |
| `/posts/:id` | `pages/post-details.tsx` | None | None | ❓ NEEDS CHECK | Not examined |
| `/join` | `pages/join.tsx` | None | None | ❓ NEEDS CHECK | Not examined |
| `/join/:inviteCode` | `pages/join/[inviteCode].tsx` | None | None | ❓ NEEDS CHECK | Not examined |
| `/restaurants/:id` | `pages/RestaurantDetailPage.tsx` | AppHeader imported | Unknown | ❓ NEEDS CHECK | AppHeader imported (line 23) |
| `/restaurants` | `pages/RestaurantDetailPage.tsx` | AppHeader imported | Unknown | ❓ NEEDS CHECK | Same component |
| `/restaurants/google/:placeId` | `pages/RestaurantDetailPage.tsx` | AppHeader imported | Unknown | ❓ NEEDS CHECK | Same component |
| `/user-discovery` | `pages/user-discovery.tsx` | None | None | ❓ NEEDS CHECK | Not examined |
| `/social-dashboard` | `pages/social-dashboard.tsx` | None | None | ❓ NEEDS CHECK | Not examined |
| `/quick-ratings` | `pages/quick-ratings.tsx` | None | None | ❓ NEEDS CHECK | Not examined |
| `/settings` | `pages/settings.tsx` | None | None | ✅ OK | Uses ArrowLeft icon but no header |
| `/auth` | `pages/auth-page.tsx` | None | None | ✅ OK | Excluded from AppHeader by design |
| `404` | `pages/not-found.tsx` | None | None | ✅ OK | Simple error page |

## Pages with Header Issues

### 1. **home.tsx** (lines 78-102)
- **Issue**: Custom header for non-authenticated users
- **Action**: Remove custom header, rely on AppHeader

### 2. **create-moment.tsx** (lines 35-39)
- **Issue**: Has its own header div with title
- **Action**: Remove custom header div

### 3. **discover-by-location.tsx** (line 71)
- **Issue**: Has h1 title but no full header
- **Action**: Remove h1, let AppHeader handle navigation

### 4. **Pages importing header components**
- **ProfilePage.tsx**: Imports PageHeader but doesn't use it
- **list-details.tsx**: Imports AppHeader (investigate usage)
- **RestaurantDetailPage.tsx**: Imports AppHeader (investigate usage)
- **discover.tsx**: Imports GlobalHeader (investigate usage)

## Navigation Components (Not Headers)
These components are for navigation sidebars/bottom navigation, NOT top headers:
- `MobileNavigation`: Bottom navigation for mobile
- `DesktopSidebar`: Side navigation for desktop
- These should remain untouched

## Edge Cases
1. **Auth page (`/auth`)**: Correctly excluded from AppHeader
2. **Modal-based pages**: Some pages like `create-post.tsx` are modals and correctly inherit AppHeader
3. **404 page**: Simple error page without navigation needs

## Next Steps Required
1. Examine the remaining unchecked pages
2. Remove duplicate headers from identified pages
3. Ensure all pages (except `/auth`) inherit AppHeader from App.tsx