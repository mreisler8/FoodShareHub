
-- Add performance indexes to circles table
CREATE INDEX IF NOT EXISTS circles_invite_code_idx ON circles(invite_code);
CREATE INDEX IF NOT EXISTS circles_creator_id_idx ON circles(creator_id);
CREATE INDEX IF NOT EXISTS circles_updated_at_idx ON circles(updated_at);
CREATE INDEX IF NOT EXISTS circles_featured_idx ON circles(featured);

-- Add performance indexes to circle_members table
CREATE INDEX IF NOT EXISTS circle_members_user_id_idx ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS circle_members_circle_id_idx ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS circle_members_status_idx ON circle_members(status);
CREATE INDEX IF NOT EXISTS circle_members_user_circle_idx ON circle_members(user_id, circle_id);

-- Add updatedAt column to circles table
ALTER TABLE circles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

-- Add isFavorite column to restaurant_list_items table
ALTER TABLE restaurant_list_items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Add performance indexes to restaurant_list_items table
CREATE INDEX IF NOT EXISTS restaurant_list_items_list_id_idx ON restaurant_list_items(list_id);
CREATE INDEX IF NOT EXISTS restaurant_list_items_restaurant_id_idx ON restaurant_list_items(restaurant_id);
CREATE INDEX IF NOT EXISTS restaurant_list_items_added_by_idx ON restaurant_list_items(added_by_id);
CREATE INDEX IF NOT EXISTS restaurant_list_items_rank_idx ON restaurant_list_items(rank);
CREATE INDEX IF NOT EXISTS restaurant_list_items_is_favorite_idx ON restaurant_list_items(is_favorite);

-- Update existing circles to have updated_at timestamp
UPDATE circles SET updated_at = created_at WHERE updated_at IS NULL;
