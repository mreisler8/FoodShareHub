
-- Performance indexes for frequently queried fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_name ON restaurants(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_location ON restaurants(location);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_cuisine ON restaurants(cuisine);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_city ON restaurants(city);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_restaurant_id ON posts(restaurant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_circle_members_circle_id ON circle_members(circle_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurant_lists_created_by_id ON restaurant_lists(created_by_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurant_lists_circle_id ON restaurant_lists(circle_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurant_lists_make_public ON restaurant_lists(make_public);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurant_list_items_list_id ON restaurant_list_items(list_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurant_list_items_restaurant_id ON restaurant_list_items(restaurant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_circle_id ON recommendations(circle_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_restaurant_id ON recommendations(restaurant_id);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_circle_members_user_circle ON circle_members(user_id, circle_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_circle_restaurant ON recommendations(circle_id, restaurant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurant_lists_visibility ON restaurant_lists(make_public, share_with_circle);
