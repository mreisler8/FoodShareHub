
-- Performance optimization indexes
-- Circle access patterns
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_user ON circle_members(circle_id, user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON circle_members(user_id);

-- List sharing patterns  
CREATE INDEX IF NOT EXISTS idx_circle_shared_lists_circle_id ON circle_shared_lists(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_shared_lists_list_id ON circle_shared_lists(list_id);
CREATE INDEX IF NOT EXISTS idx_circle_shared_lists_shared_at ON circle_shared_lists(shared_at DESC);

-- Restaurant list access patterns
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_created_by ON restaurant_lists(created_by_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_circle_id ON restaurant_lists(circle_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_public ON restaurant_lists(make_public) WHERE make_public = true;

-- Circle invites optimization
CREATE INDEX IF NOT EXISTS idx_circle_invites_circle_id ON circle_invites(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_invites_status ON circle_invites(status);
CREATE INDEX IF NOT EXISTS idx_circle_invites_email_status ON circle_invites(email_or_username, status);

-- User authentication optimization
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Feed performance optimization
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
