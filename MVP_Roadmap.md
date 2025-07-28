
# MVP Roadmap & PhD-Level UX/UI Audit

**Last updated:** 2025-07-28

A single source-of-truth for your Circles MVP:  
– Captures PhD-level product & UX requirements  
– Prioritizes tasks to ship a polished, consistent, 1.0 release  
– Serves as the spec for your Replit Dev Agent  

---

## 🎯 1. Product-Level MVP Requirements

### Core Functionalities
1. **User Authentication**  
   - Email/password + social logins  
   - Session management  

2. **User Profiles**  
   - Username, bio, avatar  
   - Preferences & favorite cuisines  

3. **Food Moment Sharing**  
   - Text + photo + tags  
   - "Share a Food Moment" flow  

4. **Circle Creation & Management**  
   - Create/join/leave circles  
   - Share content within circles  

5. **Feed & Discovery**  
   - Personal feed from followed users/circles  
   - Basic personalization algorithms  

6. **Rating & Reviews**  
   - Quick 1–5 ratings + optional note/tags  
   - Circle Score vs. Google Score  

7. **Search**  
   - Restaurants by cuisine, location, tags  
   - Filters: dietary, popularity  

### UX/UI Considerations
- **Intuitive Navigation**: clear nav bar, back buttons, page titles  
- **Mobile First**: responsive layouts, thumb-zone CTAs  
- **Visual Feedback**: spinners, skeletons, toasts  
- **Accessibility**: tap targets ≥44px, ARIA labels, focus states  

### Technical Requirements
- **API**: REST endpoints for users, posts, lists, ratings  
- **Database**: PostgreSQL for core entities  
- **Caching**: react-query, server-side caching for feeds/search  
- **Real-Time**: WebSocket for live updates (Phase 2+)  
- **Error Handling & Analytics**: inline retry, basic usage metrics  

---

## 🔍 2. UX/UI Audit Summary

### Top 5 Strengths to Preserve
1. **Design Tokens & Spacing**: unified colors, 4px radius, shadow scale  
2. **Mobile-First Nav**: bottom tab bar + safe-area handling  
3. **Component Architecture**: reusable cards, avatars, search modal  
4. **Trust Signals**: Circle vs Google score, social-proof avatars  
5. **Progressive Disclosure**: smart filters, empty-state patterns  

### Top 5 Pain Points
1. **Fragmented Buttons** (multiple APIs/styles)  
2. **Modal Inconsistency** (padding, close behavior)  
3. **Typography Gaps** (inconsistent sizes)  
4. **Search Duplication** (multiple UX patterns)  
5. **Color Usage** (mix of tokens & ad-hoc grays)  

---

## 🛠 3. Prioritized Roadmap

### 📅 Phase 1 – Bolt-On Polishes (1-day sprint)
- **AppHeader** (`/components/ui/AppHeader.tsx`)  
  - Logo/text, page title, back button  
- **Skeleton & Empty States**  
  - `FeedCard`, `ListCard` skeleton loaders  
  - Friendly "no data" CTAs  
- **Error & Offline Banners**  
  - Inline retry UI; offline status bar  
- **Safe-Area & Tab Highlight**  
  - `pb-safe` on bottom nav/FAB; active tab styling  
- **Accessibility Quick Wins**  
  - Tap targets ≥44px; `aria-label`s; focus rings  

### 🔨 Phase 2 – Core Refactors (Next 1–2 sprints)
1. **Unify Button System**  
   - Single `Button.tsx`: variants `primary|secondary|outline|ghost`; `loading`/`disabled`  
2. **Standardize Modals**  
   - `ModalWrapper.tsx`: header/body/footer, focus-trap, responsive  
3. **Semantic Typography**  
   - Define scale: `display`, `headline`, `title`, `body`, `caption`  
4. **Search Consistency**  
   - Consolidate `SearchInput` + `SearchResults` + debouncing/loading/empty states  

### 🚀 Phase 3 – Create Canvas & Metrics
- **Unified Create Canvas**  
  - `CreateCanvas.tsx` with two modes: List Starter & Food Moment  
  - Sticky "Publish"/"Post" CTA, live preview, share picker  
- **Instrumentation & A/B**  
  - Track "time-to-first-post", completion rates  
  - A/B test microcopy & CTA colors  

---

## ✅ 4. Success Criteria
- **List Completion ≥30%** of CreateCanvas opens  
- **+20% Food Moment Posts** month-over-month  
- **Time-to-First-Post ≤15s** for new users  
- **No regressions** in existing flows (lists, ratings, search)  
- **Visual & interaction consistency** across buttons, modals, typography  

---

## 📋 5. Dev Agent Instructions

1. **Read this `MVP_Roadmap.md` first.**  
2. **Sprint Kickoff Prompt:**

   > "Today's 1-day MVP sprint focuses on Phase 1 bolt-on polishes. Implement AppHeader, skeleton states, error banners, safe-area fixes, and accessibility improvements. Preserve existing functionality while enhancing visual consistency and mobile UX."

3. **Task Priority Order:**
   - AppHeader component with consistent navigation
   - Skeleton loaders for feed and list cards
   - Error handling and retry mechanisms
   - Mobile safe-area and accessibility improvements
   - Visual consistency across existing components

4. **Quality Gates:**
   - All touch targets minimum 44px
   - Consistent loading states across components
   - Proper ARIA labels and focus management
   - No console errors or warnings
   - Mobile-first responsive behavior

---

## 🚧 Current Status & Next Actions

### Today's Sprint Focus (July 28)
- [ ] Create unified AppHeader component
- [ ] Implement skeleton loading states
- [ ] Add error boundaries and retry UI
- [ ] Fix mobile safe-area issues
- [ ] Accessibility audit and fixes

### Post-MVP Priorities
- Button system unification
- Modal standardization
- Typography scale implementation
- Search experience consolidation

This roadmap will guide our development decisions and ensure we ship a cohesive, polished MVP that users will love.
