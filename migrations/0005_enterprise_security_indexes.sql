
-- Enterprise-grade security and performance indexes
-- These indexes optimize the critical security queries and improve overall performance

-- User authentication and security indexes
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_id_active ON users (id) WHERE id > 0;

-- Circle access control indexes
CREATE INDEX IF NOT EXISTS idx_circle_members_security ON circle_members (circle_id, user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_circle_members_user_active ON circle_members (user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_circles_privacy ON circles (id, is_private, allow_public_join);

-- Search performance indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_search ON restaurants USING gin (to_tsvector('english', name || ' ' || COALESCE(location, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(cuisine, '')));
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin (to_tsvector('english', name || ' ' || username || ' ' || COALESCE(bio, '')));

-- List privacy and access indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_privacy ON restaurant_lists (created_by_id, make_public, is_public, share_with_circle);
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_circle_shared ON restaurant_lists (circle_id, share_with_circle) WHERE share_with_circle = true;

-- Social relationship indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_followers_relationship ON user_followers (follower_id, following_id, status);
CREATE INDEX IF NOT EXISTS idx_user_followers_following ON user_followers (following_id, status);

-- Post visibility and access indexes
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts USING gin (visibility);
CREATE INDEX IF NOT EXISTS idx_posts_user_time ON posts (user_id, created_at DESC);

-- Session and security indexes
CREATE INDEX IF NOT EXISTS idx_circle_invites_security ON circle_invites (circle_id, email_or_username, status);
CREATE INDEX IF NOT EXISTS idx_circle_invites_user ON circle_invites (email_or_username, status) WHERE status = 'pending';

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_location_search ON restaurants (location, category, cuisine) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_restaurant_time ON posts (restaurant_id, created_at DESC);

-- Add partial indexes for frequently queried conditions
CREATE INDEX IF NOT EXISTS idx_circles_public_joinable ON circles (id, name, member_count) WHERE is_private = false AND allow_public_join = true;
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_public ON restaurant_lists (id, name, created_at) WHERE make_public = true AND is_public = true;

-- Add covering indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_circle_members_with_role ON circle_members (circle_id, user_id, role, status, joined_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_followers_with_status ON user_followers (follower_id, following_id, status, created_at);

-- Add indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_restaurants_location_coords ON restaurants (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add indexes for analytics and monitoring
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_stats ON restaurant_lists (view_count, save_count, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_engagement ON posts (created_at, rating) WHERE rating >= 4;

-- Add constraints for data integrity
ALTER TABLE circle_members ADD CONSTRAINT chk_circle_members_valid_user_id CHECK (user_id > 0);
ALTER TABLE circle_members ADD CONSTRAINT chk_circle_members_valid_circle_id CHECK (circle_id > 0);
ALTER TABLE user_followers ADD CONSTRAINT chk_user_followers_valid_follower_id CHECK (follower_id > 0);
ALTER TABLE user_followers ADD CONSTRAINT chk_user_followers_valid_following_id CHECK (following_id > 0);
ALTER TABLE user_followers ADD CONSTRAINT chk_user_followers_no_self_follow CHECK (follower_id != following_id);

-- Add unique constraints for security
ALTER TABLE circle_members ADD CONSTRAINT uq_circle_members_user_circle UNIQUE (circle_id, user_id);
ALTER TABLE user_followers ADD CONSTRAINT uq_user_followers_relationship UNIQUE (follower_id, following_id);
