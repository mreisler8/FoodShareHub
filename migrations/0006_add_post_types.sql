
ALTER TABLE posts ADD COLUMN post_type text NOT NULL DEFAULT 'moment';
ALTER TABLE posts ADD COLUMN metadata json;

-- Add index for post type filtering
CREATE INDEX idx_posts_post_type ON posts(post_type);
CREATE INDEX idx_posts_user_type ON posts(user_id, post_type);
