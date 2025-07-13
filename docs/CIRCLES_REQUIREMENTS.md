# Circles Feature - Business Requirements & User Flows

## Core Purpose
Circles are private or public groups where users share restaurant recommendations and lists with trusted friends or communities with similar food interests.

## Business Requirements

### 1. Circle Management
- Users can create circles with a name, description, and privacy settings
- Circle creators become "owners" with full administrative privileges
- Circles can be public (anyone can join via link) or private (invite-only)
- Each circle has a unique invite code for easy sharing

### 2. Member Management
- Owners can invite members via email or username search
- Members can leave circles at any time
- Owners can remove members
- Member roles: Owner, Admin (future), Member

### 3. Content Sharing
- Members can share restaurant lists with their circles
- Shared lists are visible to all circle members
- Members can discuss and comment on shared content
- Activity feed shows recent shares and updates

### 4. Discovery
- Users can browse their circles from a central dashboard
- Quick stats: member count, recent activity, shared lists
- Easy navigation to individual circle pages

## User Flows

### Flow 1: Creating a Circle
1. User clicks "Create Circle" button
2. Enters basic info: name, description, tags
3. Chooses privacy: public or private
4. Circle is created with unique invite code
5. Optional: Immediately invite first members

### Flow 2: Joining a Circle
1. User receives invite link or code
2. Clicks link or enters code
3. Views circle preview (name, description, member count)
4. Clicks "Join Circle"
5. Redirected to circle page as new member

### Flow 3: Sharing Content
1. User navigates to their circle
2. Clicks "Share List" button
3. Selects from their existing lists
4. Adds optional note about the share
5. List appears in circle's shared content

### Flow 4: Circle Dashboard
1. User navigates to Circles section
2. Sees grid of their circles with key info
3. Can filter by: My Circles, Public Circles, Pending Invites
4. Quick actions: Create, Join, Browse

## Design Principles
- **Simplicity First**: Core features work flawlessly before adding complexity
- **Trust & Privacy**: Clear indicators of who can see what
- **Mobile Optimized**: All flows work seamlessly on mobile
- **Social but Not Overwhelming**: Focus on quality connections over quantity

## MVP Features
1. Create circles (name, description, public/private)
2. Join circles via invite code
3. View list of my circles
4. Navigate to individual circle pages
5. See circle members and shared content

## Future Enhancements
- Advanced member roles and permissions
- Circle categories and discovery
- Activity notifications
- Circle-specific discussions
- Collaborative lists