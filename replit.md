# Circles - Food Experience Sharing Platform

## Overview

Circles is a full-stack social platform for sharing restaurant recommendations and food experiences. The application allows users to create posts about restaurants, join food-focused circles, create curated restaurant lists, and follow friends for personalized recommendations.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy using scrypt for password hashing
- **Session Management**: PostgreSQL-backed session store with express-session
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Design**: RESTful API with consistent error handling and validation using Zod

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration for development and production
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Custom component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens via shadcn/ui

### Mobile Support
- **Hybrid Approach**: React Native WebView wrapper for native mobile experience
- **Progressive Web App**: Mobile-optimized responsive design with iOS-specific fixes
- **Native Features**: Deep linking, push notifications, and native sharing integration

## Key Components

### Authentication System
- Session-based authentication using PostgreSQL session store
- Secure password hashing with scrypt and salt
- Protected routes with authentication middleware
- User registration and login with form validation

### Database Schema
The application uses a comprehensive PostgreSQL schema including:
- **Users**: Profile management with bio and profile pictures
- **Restaurants**: Comprehensive restaurant data with Google Places integration
- **Posts**: User-generated content with ratings, images, and visibility controls
- **Circles**: Social groups for organizing food communities
- **Lists**: Curated restaurant collections with sharing capabilities
- **Social Features**: Likes, comments, follows, and saved content

### API Structure
- RESTful endpoints organized by feature (users, posts, restaurants, circles)
- Consistent error handling with Zod validation
- Pagination support for feed and list endpoints
- Search functionality for restaurants and users
- Analytics tracking for user actions

### UI Components
- **Design System**: Professional theme with consistent spacing and typography
- **Mobile-First**: Responsive design optimized for mobile devices
- **Accessibility**: Built on Radix UI for keyboard navigation and screen reader support
- **Performance**: Lazy loading and skeleton states for improved UX

## Data Flow

### User Experience Flow
1. **Authentication**: Users register/login through secure forms
2. **Content Creation**: Users create posts about restaurant experiences with ratings and photos
3. **Social Interaction**: Users can like, comment, and save posts from their network
4. **Discovery**: Browse restaurants, join circles, and discover new food experiences
5. **Organization**: Create and share curated restaurant lists

### Data Management
- **Real-time Updates**: TanStack Query provides optimistic updates and background sync
- **Caching Strategy**: Intelligent query caching with automatic invalidation
- **Image Handling**: Support for restaurant and post images with validation
- **Search Integration**: Google Places API for restaurant data enrichment

## External Dependencies

### Core Dependencies
- **Database**: Neon Database (PostgreSQL)
- **Authentication**: Passport.js ecosystem
- **UI Framework**: Radix UI component primitives
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns for formatting and calculations

### Optional Integrations
- **Google Places API**: Restaurant data enrichment and search
- **Analytics**: Plausible for privacy-focused analytics tracking
- **Social Sharing**: Native Web Share API with social platform fallbacks

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Fast production builds for backend
- **Vite**: Frontend development server with HMR
- **Drizzle Kit**: Database schema management and migrations

## Deployment Strategy

### Development Environment
- **Backend**: Node.js server running on port 5000
- **Frontend**: Vite dev server with proxy to backend API
- **Database**: Neon Database with connection pooling
- **Session Storage**: PostgreSQL session store for persistence

### Production Considerations
- **Build Process**: Vite production build with esbuild backend compilation
- **Environment Variables**: Database URL and session secrets from environment
- **Static Assets**: Frontend build served from Express static middleware
- **Error Handling**: Comprehensive error boundaries and API error responses

### Mobile Deployment
- **Web App**: Progressive Web App with mobile optimizations
- **Native Wrapper**: React Native WebView for app store distribution
- **Deep Linking**: Support for sharing and referral links

## Recent Changes
- July 01, 2025: Fixed database connection and startup issues with improved WebSocket configuration
- July 01, 2025: Implemented P1 MVP features for user authentication and core data models
- July 01, 2025: Added Circle creation, joining, and management functionality
- July 01, 2025: Created comprehensive onboarding flow with welcome splash for first-time users
- July 01, 2025: Enhanced navigation with Circle access in mobile and desktop interfaces
- July 01, 2025: Fixed geolocation errors in restaurant search functionality
- July 01, 2025: Added missing API endpoints for featured circles and circle membership
- July 01, 2025: **Completed Circle List Sharing Functionality**:
  - Implemented full restaurant list sharing with circles (POST/DELETE endpoints)
  - Added shared lists database table and storage operations
  - Fixed circle detail pages to focus on restaurant lists instead of posts
  - Updated UI components to properly fetch and display shared lists
  - Added permission management for editing and resharing capabilities
  - Fixed authentication for all list creation and sharing endpoints
- July 01, 2025: **Complete Application Rebranding from TasteBuds to Circles**:
  - Updated all user-facing text and branding throughout the application
  - Changed main navigation header, welcome messages, and page titles
  - Updated invitation system and social sharing to use "Circles" branding
  - Modified server startup messages and HTML meta titles
  - Ensured consistent "Circles" naming across all UI components
- July 02, 2025: **Navigation Integration for Lists Feature**:
  - Added "My Lists" link to desktop sidebar navigation
  - Updated mobile navigation with Lists tab (replaced Post)
  - Fixed routing integration for /lists route
  - Fixed critical server startup issues with authentication exports
  - Resolved Jest configuration problems (moduleNameMapping → moduleNameMapper)
  - Added default export to server/index.ts for test compatibility
- July 02, 2025: **Complete Database Schema and API Integration**:
  - Fixed all database table references in lists router and recommendations router
  - Implemented proper drizzle ORM syntax with eq() and and() functions
  - Resolved server startup issues by cleaning up duplicate imports
  - Successfully enabled Lists API endpoints (/api/lists) with authentication
  - Fixed test file database references for proper schema imports
  - **Server Status**: Lists functionality fully operational with proper authentication protection
- July 02, 2025: **Optimistic Rendering Implementation (User Stories 2-3)**:
  - Implemented local state management for restaurant list items with OptimisticListItem interface
  - Added optimistic rendering with immediate UI updates when adding restaurants to lists
  - Created visual "Saving..." indicators for pending server requests
  - Enhanced RestaurantSearch component with optimistic callback pattern
  - Added proper error handling and rollback functionality for failed optimistic updates
  - Updated list rendering to use local state instead of server data for real-time updates
  - **Feature Status**: Optimistic rendering fully functional with visual feedback
- July 02, 2025: **Robust List Creation & Navigation (User Story 4)**:
  - Enhanced CreateListModal and create-list page with new sharing configuration options
  - Added independent "Share with Circle" and "Make Public" checkboxes (mutually exclusive or both)
  - Implemented proper navigation with try/catch error handling and user feedback
  - Updated list detail pages to display sharing badges ("Circle", "Public") based on settings
  - Added tags field with comma-separated input for list categorization
  - Enhanced form validation with disabled Create button until name is filled
  - Fixed navigation routing to ensure /lists/:id route exists and functions properly
  - Added comprehensive error handling with toast notifications for failed navigation
  - **Feature Status**: Complete robust list creation with proper sharing controls and navigation
- July 02, 2025: **List Visibility & Sharing Controls (User Story 5)**:
  - Added shareWithCircle and makePublic boolean database columns to restaurant_lists table
  - Updated API endpoints with proper access control and sharing field validation
  - Created EditListModal component with sharing controls checkboxes
  - Implemented sharing badges display (Circle/Public) on list detail headers
  - Added Share button functionality for public lists (copies URL to clipboard)
  - Added access control enforcement: lists visible if public, shared with user's circle, or user-owned
  - Enhanced list filtering API endpoint to support visibility-based access
  - **Feature Status**: Complete list visibility and sharing controls implementation
- July 02, 2025: **Cross-Platform Authentication Synchronization**:
  - Fixed web app authentication redirects after login/registration
  - Updated mobile app authentication to match web app requirements (added name field)
  - Synchronized authentication flows between web and mobile applications
  - Added native app bridge authentication handling with localStorage integration
  - Enhanced useAuth hook to handle both web session and native app token authentication
  - Implemented consistent user experience across web and mobile platforms
  - **Feature Status**: Unified authentication system across web and mobile platforms
- July 02, 2025: **UAT Feedback Implementation - Error Messages & UX Improvements**:
  - Enhanced authentication error messages with specific user-friendly feedback
  - Added email format validation and improved password requirements messaging
  - Implemented inline form validation with onBlur mode for better user experience
  - Improved mobile responsiveness with proper touch targets (44px minimum)
  - Added comprehensive accessibility features: ARIA labels, keyboard navigation, screen reader support
  - Enhanced form inputs with autocomplete attributes and proper placeholder text
  - Updated navigation components with semantic HTML and accessibility attributes
  - Added visual loading states and improved error handling throughout the application
  - **Feature Status**: Comprehensive UX improvements addressing all UAT feedback points
## Changelog
- July 01, 2025: Initial setup and MVP P1 backlog implementation

## User Preferences

Preferred communication style: Simple, everyday language.