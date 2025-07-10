
-- Performance optimization indexes
-- Add composite indexes for common query patterns

-- Optimize circle member lookups
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_user ON circle_members(circle_id, user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_role ON circle_members(user_id, role);

-- Optimize restaurant list queries
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_creator_public ON restaurant_lists(created_by_id, is_public);
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_location ON restaurant_lists(primary_location) WHERE primary_location IS NOT NULL;

-- Optimize list items queries
CREATE INDEX IF NOT EXISTS idx_list_items_list_position ON restaurant_list_items(list_id, position);
CREATE INDEX IF NOT EXISTS idx_list_items_restaurant ON restaurant_list_items(restaurant_id);

-- Optimize posts queries
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_restaurant_rating ON posts(restaurant_id, rating DESC);

-- Optimize search queries
CREATE INDEX IF NOT EXISTS idx_restaurants_location_name ON restaurants(location, name);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_location ON restaurants(cuisine, location) WHERE cuisine IS NOT NULL;

-- Optimize recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_circle_created ON recommendations(circle_id, created_at DESC);
