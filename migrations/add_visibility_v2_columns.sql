-- Migration: Add V2 visibility system with zero downtime
-- Date: 2025-08-16
-- Purpose: Unblock Lists MVP by adding missing visibility_v2 columns

-- 1) Create enum type for visibility options
DO $$ BEGIN
  CREATE TYPE visibility_v2_enum AS ENUM ('private','public','followers','circle');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Add new V2 visibility columns (non-breaking, additive)
ALTER TABLE restaurant_lists
  ADD COLUMN IF NOT EXISTS visibility_v2 visibility_v2_enum,
  ADD COLUMN IF NOT EXISTS visibility_circle_ids INTEGER[];

-- 3) Backfill from legacy fields (safe, data-preserving)
UPDATE restaurant_lists
SET visibility_v2 =
  CASE
    WHEN make_public = TRUE THEN 'public'::visibility_v2_enum
    WHEN share_with_circle = TRUE AND circle_id IS NOT NULL THEN 'circle'::visibility_v2_enum
    WHEN (visibility::jsonb ->> 'audience') = 'followers' THEN 'followers'::visibility_v2_enum
    ELSE 'private'::visibility_v2_enum
  END,
  visibility_circle_ids = CASE
    WHEN share_with_circle = TRUE AND circle_id IS NOT NULL
      THEN ARRAY[circle_id]::INTEGER[]
    ELSE NULL
  END
WHERE visibility_v2 IS NULL;

-- 4) Set default for new rows
ALTER TABLE restaurant_lists
  ALTER COLUMN visibility_v2 SET DEFAULT 'private';

-- 5) Performance indexes
CREATE INDEX IF NOT EXISTS idx_lists_visibility_v2 ON restaurant_lists(visibility_v2);
CREATE INDEX IF NOT EXISTS idx_lists_visibility_circle_ids ON restaurant_lists USING GIN (visibility_circle_ids);

-- Verification query (optional)
-- SELECT 
--   id, name, make_public, share_with_circle, circle_id, 
--   visibility_v2, visibility_circle_ids
-- FROM restaurant_lists 
-- LIMIT 5;