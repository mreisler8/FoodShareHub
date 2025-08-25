
-- Add circle join requests table
CREATE TABLE IF NOT EXISTS circle_join_requests (
  id SERIAL PRIMARY KEY,
  circle_id INTEGER REFERENCES circles(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_circle_join_requests_circle_id ON circle_join_requests(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_join_requests_user_id ON circle_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_join_requests_status ON circle_join_requests(status);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_circle_join_requests_circle_status ON circle_join_requests(circle_id, status);
CREATE INDEX IF NOT EXISTS idx_circle_join_requests_user_status ON circle_join_requests(user_id, status);

-- Add indexes for circle members queries
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_user ON circle_members(circle_id, user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_role ON circle_members(user_id, role);

-- Add indexes for restaurant lists queries
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_created_by ON restaurant_lists(created_by_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_circle_id ON restaurant_lists(circle_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_public ON restaurant_lists(make_public);
CREATE INDEX IF NOT EXISTS idx_restaurant_lists_circle_share ON restaurant_lists(share_with_circle);

-- Add indexes for circle shared lists
CREATE INDEX IF NOT EXISTS idx_circle_shared_lists_circle ON circle_shared_lists(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_shared_lists_list ON circle_shared_lists(list_id);
CREATE INDEX IF NOT EXISTS idx_circle_shared_lists_shared_by ON circle_shared_lists(shared_by_id);

-- Add unique constraint to prevent duplicate requests
ALTER TABLE circle_join_requests 
ADD CONSTRAINT unique_circle_user_request 
UNIQUE (circle_id, user_id);
