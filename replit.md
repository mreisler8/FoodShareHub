# Circles - Food Experience Sharing Platform

## Overview

Circles is a full-stack social platform for sharing restaurant recommendations and food experiences. It enables users to create and share posts about restaurant visits, join food-focused communities ("circles"), curate personalized restaurant lists, and follow friends for tailored dining suggestions. The project aims to become a leading platform for authentic, trust-based food discovery, leveraging social connections for personalized recommendations, with a business vision to capture a significant share of the online food discovery market by providing a more reliable and personalized alternative to traditional review sites.

## User Preferences

**Communication Style:** Technical, architect-level detail with specific implementation guidance.

**Problem-Solving Approach:** Academic audit methodology with systematic, comprehensive fixes. **User requires:**
1. **End-to-End Flow Analysis**: Trace complete data paths from database → API → frontend before any fixes
2. **Root Cause Analysis**: Audit ALL possible causes (database queries, API endpoints, frontend components, caching) and document findings 
3. **Comprehensive Validation**: Test all related API endpoints, verify frontend components use data correctly, test edge cases
4. **Impact Analysis**: Analyze what other features might be affected by changes and test them
5. **Multiple API Endpoint Awareness**: Always search for all API endpoints that might handle the same data type

**Anti-Patterns to Avoid:** Band-aid solutions, incomplete systematic analysis, fixing single endpoints without checking for others.

## System Architecture

### Backend
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy (scrypt for hashing), PostgreSQL-backed session store.
- **Database ORM**: Drizzle ORM for PostgreSQL.
- **API Design**: RESTful API with Zod validation.
- **Core Features**: Session-based authentication, user profiles, restaurant data (Google Places integration), user-generated posts (ratings, images, visibility), social groups (circles), curated lists, likes, comments, follows, saved content.
- **Data Flow**: Optimistic updates and background sync via TanStack Query, intelligent caching, image handling with validation.
- **Search**: Comprehensive search system across all entities (restaurants, lists, posts, users, people/follow) with Redis caching (60s TTL), Google Places API integration with circuit breaker, search timing middleware, parallel execution, and mutuals-first social ranking.
- **List Management**: Comprehensive list creation with drag-and-drop ranking, auto-save, smart templates, duplicate name validation, cascading access control, and robust restaurant item persistence with proper foreign key relationships.
- **Error Handling**: Comprehensive error boundary system with standardized components, retry mechanisms, parameter validation, and graceful fallback states.
- **Social Features**: Bidirectional follow system, circle invites, personalized social activity feed, advanced visibility controls (public/followers/specific circles), and mutuals-first ranking for people/follow search.
- **Rating System**: 10-point decimal rating (0.1-10.0), real-time updates, cache invalidation, and integration into Circle Score.
- **Circle Score**: Trust-based scoring system based on user's network and personal ratings, with confidence indicators.
- **Content Creation**: Unified post creation flow with media, location services, privacy controls, and structured input for food moments, dish reviews, and restaurant recommendations.
- **Forensics Audit Infrastructure**: Read-only debugging system for restaurant data integrity validation, including server-side forensics tracing, debug aggregation endpoint, client debug panel, and automated probe testing.

### Frontend
- **Framework**: React 18 with TypeScript, Vite build tool.
- **Routing**: Wouter.
- **State Management**: TanStack Query (React Query).
- **UI Components**: Custom component library built on Radix UI primitives and shadcn/ui.
- **Styling**: Tailwind CSS with custom design tokens.
- **Design System**: Modern blue color palette, Instagram-style PostCard redesign, consistent typography, spacing, and border radius.
- **Mobile Support**: Responsive design optimized for mobile devices, PWA, React Native WebView wrapper.
- **Navigation**: Universal bottom navigation, clickable logo for home navigation.
- **Performance**: Skeleton loading states, lazy loading, optimized component rendering.

## External Dependencies

- **Database**: Neon Database (PostgreSQL)
- **Authentication**: Passport.js
- **UI Primitives**: Radix UI
- **Form Handling**: React Hook Form, Zod
- **Date Utilities**: date-fns
- **Search/Location Data**: Google Places API
- **Analytics**: Plausible
- **Image/Video Storage**: Cloudinary
- **Drag-and-Drop**: @dnd-kit
- **Image Cropping**: react-easy-crop
- **Carousel**: Swiper.js
- **PostgreSQL Session Store**: connect-pg-simple