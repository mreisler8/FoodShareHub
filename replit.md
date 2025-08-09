# Circles - Food Experience Sharing Platform

## Overview

Circles is a full-stack social platform designed for sharing restaurant recommendations and food experiences. Its main purpose is to enable users to create and share posts about restaurant visits, join food-focused communities ("circles"), curate personalized restaurant lists, and follow friends for tailored dining suggestions. The project aims to become a leading platform for authentic, trust-based food discovery, leveraging social connections for personalized recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy (scrypt for hashing)
- **Session Management**: PostgreSQL-backed session store
- **Database ORM**: Drizzle ORM for PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Design**: RESTful API with Zod validation
- **Core Features**: Session-based authentication, protected routes, user profiles, restaurant data (Google Places integration), user-generated posts (ratings, images, visibility), social groups (circles), curated lists, likes, comments, follows, saved content.
- **Data Flow**: Optimistic updates and background sync via TanStack Query, intelligent caching, image handling with validation, Google Places API for search.
- **Search**: Unified search across restaurants, lists, posts, and users; location-based search with Google Places; relevance-based prioritization; real-time user search with follow status.
- **Social Features**: Bidirectional follow system, circle invites, personalized social activity feed, advanced visibility controls (public/followers/specific circles).
- **List Management**: Comprehensive list creation with drag-and-drop ranking, auto-save, smart templates, duplicate name validation, and cascading access control for editing/deletion.
- **Rating System**: 10-point decimal rating (0.1-10.0), real-time updates, cache invalidation, and integration into Circle Score.
- **Circle Score**: Trust-based scoring system based on user's network (circles + followers) and personal ratings, with confidence indicators.
- **Content Creation**: Unified post creation flow with media (photos/videos), location services, privacy controls, and structured input for food moments, dish reviews, and restaurant recommendations.

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Custom component library built on Radix UI primitives and shadcn/ui.
- **Styling**: Tailwind CSS with custom design tokens.
- **Design System**: Modern blue color palette, Instagram-style PostCard redesign, consistent typography, spacing, and border radius (4px enforced).
- **Mobile Support**: Responsive design optimized for mobile devices, PWA, React Native WebView wrapper for native experience, 44px minimum touch targets.
- **Navigation**: Universal bottom navigation for all screen sizes, clickable logo for home navigation.
- **Error Handling**: Comprehensive error boundaries, inline error messages, offline detection banner.
- **Performance**: Skeleton loading states, lazy loading, optimized component rendering, sub-300ms API response times.

## External Dependencies

- **Database**: Neon Database (PostgreSQL)
- **Authentication**: Passport.js
- **UI Primitives**: Radix UI
- **Form Handling**: React Hook Form, Zod
- **Date Utilities**: date-fns
- **Search/Location Data**: Google Places API
- **Analytics**: Plausible (optional)
- **Image/Video Storage**: Cloudinary
- **Drag-and-Drop**: @dnd-kit
- **Image Cropping**: react-easy-crop
- **Carousel**: Swiper.js
- **PostgreSQL Session Store**: connect-pg-simple