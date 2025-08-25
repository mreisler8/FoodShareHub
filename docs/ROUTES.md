# Route to Component Mapping

## Core Routes Examined

### /feed
- **Router Entry**: Line 44 in `client/src/components/Router.tsx`
- **Component**: `client/src/pages/feed.tsx` (FeedPage component)
- **Route Definition**: `<ProtectedRoute path="/feed" component={() => <FeedPage scope="feed" />} />`

### /discover
- **Router Entry**: Line 55 in `client/src/components/Router.tsx`
- **Component**: `client/src/pages/DiscoverFeed.tsx` (DiscoverFeed component)
- **Route Definition**: `<ProtectedRoute path="/discover" component={DiscoverFeed} />`

### /circles
- **Router Entry**: Line 49 in `client/src/components/Router.tsx`
- **Component**: `client/src/pages/circles.tsx` (Circles component)
- **Route Definition**: `<ProtectedRoute path="/circles" component={Circles} />`

### /profile
- **Router Entry**: Line 53 in `client/src/components/Router.tsx`
- **Component**: `client/src/pages/ProfilePage.tsx` (ProfilePage component)
- **Route Definition**: `<ProtectedRoute path="/profile/:id?" component={ProfilePage} />`
- **Note**: Optional ID parameter for viewing other users' profiles

## Additional Observations
- All four routes use `ProtectedRoute` wrapper, requiring authentication
- Router uses wouter library for routing
- Feed page has additional circle-scoped route at `/feed/circle/:circleId` (line 45)