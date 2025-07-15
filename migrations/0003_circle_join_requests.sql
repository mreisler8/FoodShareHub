
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

-- Add unique constraint to prevent duplicate requests
ALTER TABLE circle_join_requests 
ADD CONSTRAINT unique_circle_user_request 
UNIQUE (circle_id, user_id);
