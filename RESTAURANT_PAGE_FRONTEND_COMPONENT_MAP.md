# Restaurant Page Frontend Component Map

## Component Hierarchy

### Main Container
```
RestaurantDetailPage.tsx (Main orchestrator)
├── RestaurantDebugPanel.tsx (Debug interface)
├── Hero Section (Image display)
├── HeaderCard.tsx (Restaurant basic info)
├── YourRatingCard.tsx (User's personal rating)
├── CircleScoreCard.tsx (Trust-based scoring)
├── ReservationCard.tsx (OpenTable/Resy integration)
├── OrderOptionsCard.tsx (Menu/ordering links)
├── MoreRestaurantActions.tsx (Reviews, photos)
├── PostMentionsCard.tsx (Social posts)
└── ListMentionsCard.tsx (List appearances)
```

## Core Components Analysis

### RestaurantDetailPage.tsx
**Location**: `client/src/pages/RestaurantDetailPage.tsx`
**Purpose**: Main orchestrator for restaurant detail view
**Key Features**:
- Hero image management with fallback strategies
- Mock data integration for lists and posts
- Debug panel integration (`?debug=true`)
- Mobile-first responsive design
- Error boundary implementation

**Props Interface**:
```typescript
interface Restaurant {
  id?: number;
  googlePlaceId?: string;
  name: string;
  location: string;
  address?: string;
  imageUrl?: string;
  // ... additional fields
}
```

**Dependencies**:
- `useStandardizedRestaurantQueries` hook
- `RestaurantDebugPanel` for debugging
- Multiple card components for feature sections

### HeaderCard.tsx
**Location**: `client/src/components/restaurant/HeaderCard.tsx`
**Purpose**: Display primary restaurant information
**Key Features**:
- Restaurant name with typography hierarchy
- Cuisine type with icon
- Location with map pin icon
- Address fallback display

**Props Interface**:
```typescript
interface HeaderCardProps {
  name: string;
  cuisine: string;
  location: string;
  address?: string;
}
```

### YourRatingCard.tsx
**Location**: `client/src/components/restaurant/YourRatingCard.tsx`
**Purpose**: Personal rating management interface
**Key Features**:
- 10-point decimal rating system (0.1-10.0)
- Inline editing with save/cancel
- Note and tags management
- Empty state for unrated restaurants

**Props Interface**:
```typescript
interface YourRatingCardProps {
  userRating?: {
    rating: number;
    note?: string;
    tags?: string[];
  };
  onRate?: (rating: number, note?: string, tags?: string[]) => void;
}
```

**State Management**:
- Local state for editing mode
- Optimistic updates via parent callback
- Form validation and error handling

### CircleScoreCard.tsx
**Location**: `client/src/components/circle-score/CircleScoreCard.tsx`
**Purpose**: Trust-based restaurant scoring display
**Key Features**:
- Score visualization (0-100 scale)
- Confidence indicators (high/moderate/low)
- Contributor breakdown
- Loading and empty states

**Props Interface**:
```typescript
interface CircleScoreCardProps {
  data: CircleScoreData | null;
  variant?: 'compact' | 'detailed';
  showTrend?: boolean;
  isLoading?: boolean;
}

interface CircleScoreData {
  score: number;
  confidence: "low" | "moderate" | "high";
  contributors: Array<{
    userId: number;
    username: string;
    actionType: 'rating' | 'list_placement';
    value: number;
  }>;
}
```

### ReservationCard.tsx
**Location**: `client/src/components/restaurant/ReservationCard.tsx`
**Purpose**: External reservation platform integration
**Key Features**:
- OpenTable search integration
- Resy platform linking
- Toast notifications for user feedback
- Dynamic URL generation with restaurant context

**Integration Pattern**:
```typescript
const handleOpenTable = () => {
  const searchQuery = encodeURIComponent(`${restaurant.name} ${restaurant.location}`);
  const openTableUrl = `https://www.opentable.com/s/?text=${searchQuery}`;
  window.open(openTableUrl, '_blank');
};
```

### OrderOptionsCard.tsx
**Location**: `client/src/components/restaurant/OrderOptionsCard.tsx`
**Purpose**: Menu and ordering platform access
**Key Features**:
- Menu link with website fallback
- Online ordering via Uber Eats fallback
- Google search fallback for missing links
- Toast feedback system

**Fallback Strategy**:
```typescript
// Priority: Direct menuUrl → website → Google search
const handleViewMenu = () => {
  const targetUrl = menuUrl || restaurant.website;
  if (targetUrl) {
    window.open(targetUrl, '_blank');
  } else {
    // Fallback to Google search
    const searchQuery = encodeURIComponent(`${restaurant.name} ${restaurant.location} menu`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
  }
};
```

### PostMentionsCard.tsx
**Location**: `client/src/components/restaurant/PostMentionsCard.tsx`
**Purpose**: Social activity display
**Key Features**:
- Recent posts from user's network
- Post preview with author information
- Modal expansion for full post view
- Empty state with call-to-action

**Props Interface**:
```typescript
interface PostMention {
  id: number;
  content: string;
  rating?: number;
  author: {
    id: number;
    name: string;
    username: string;
    profileImage?: string;
  };
  createdAt: string;
  likes?: number;
  comments?: number;
}
```

### MoreRestaurantActions.tsx
**Location**: `client/src/components/restaurant/MoreRestaurantActions.tsx`
**Purpose**: Additional user actions
**Key Features**:
- Write review placeholder (coming soon)
- Add photos placeholder (coming soon)
- Extensible action framework
- Toast notifications for feature status

## Supporting Components

### UI Components
**Location**: `client/src/components/ui/`
- `rating.tsx`: Reusable star rating component (0-5 scale)
- `button.tsx`: Standardized button variants
- `card.tsx`: Card container components
- `dialog.tsx`: Modal dialog system

### Debug Components
**Location**: `client/src/components/debug/`
- `RestaurantDebugPanel.tsx`: Development debugging interface

### Shared Components
**Location**: `client/src/components/shared/`
- `TrustIndicators.tsx`: Trust badges and social proof
- `SocialProofAvatars.tsx`: Friend activity indicators

## Data Flow Patterns

### Query Hook Integration
All components receive data through the `useStandardizedRestaurantQueries` hook:

```typescript
const {
  userRating,
  circleScore,
  isLoading,
  hasError,
  submitRating,
  invalidateAll
} = useStandardizedRestaurantQueries(restaurant);
```

### Error Boundary Strategy
Each card component implements graceful error handling:
- Loading states with skeleton placeholders
- Error states with retry mechanisms
- Empty states with helpful messaging
- Fallback content for missing data

### Responsive Design Patterns
- Mobile-first approach with progressive enhancement
- Flexible grid layouts using CSS Grid and Flexbox
- Touch-friendly interaction zones (44px minimum)
- Conditional rendering for screen size optimizations

## Component Communication

### Parent-Child Data Flow
```
RestaurantDetailPage (data orchestrator)
    ↓ Props passing
Card Components (presentation)
    ↓ Event callbacks
Parent state updates
    ↓ React Query invalidation
Fresh data fetch
```

### Event Handling Pattern
```typescript
// Parent provides callbacks for actions
<YourRatingCard 
  userRating={userRating.data}
  onRate={(rating, note, tags) => {
    submitRating.mutate({ ratingValue: rating, note, tags });
  }}
/>
```

## Performance Considerations

### Component Optimization
- React.memo for expensive components
- Lazy loading for below-the-fold content
- Efficient re-render patterns
- Minimal prop drilling

### Loading Strategies
- Skeleton components during data fetch
- Progressive enhancement for non-critical features
- Optimistic updates for user actions
- Background refresh with stale-while-revalidate

## Accessibility Implementation

### ARIA Compliance
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for interactive elements
- Role attributes for custom components
- Focus management for modal dialogs

### Keyboard Navigation
- Tab order optimization
- Enter/Space key handling for custom buttons
- Escape key for modal dismissal
- Focus indicators for all interactive elements

## Testing Strategy

### Component Testing
- Unit tests for individual components
- Integration tests for data flow
- Visual regression testing
- Accessibility testing with axe-core

### Mock Data Handling
Components gracefully handle missing or mock data:
- Empty state rendering
- Fallback image handling
- Safe property access with optional chaining
- Default values for required props

## Development Guidelines

### Component Creation Patterns
1. Start with TypeScript interface definitions
2. Implement loading and error states first
3. Add accessibility attributes
4. Include responsive design considerations
5. Implement proper error boundaries

### State Management Rules
- Local state for UI-only concerns (editing mode, modal open)
- React Query for server state
- Context for cross-component shared state
- Avoid prop drilling beyond 2 levels

This component map serves as a comprehensive guide for understanding, maintaining, and extending the restaurant page frontend architecture.