-- Migration: Restaurant Identity Resolution Constraints
-- Phase 1: Add unique constraint for google_place_id to prevent duplicate mappings
-- Generated: 2025-08-12

-- Add unique constraint for google_place_id (if not exists)
ALTER TABLE restaurants 
ADD CONSTRAINT uq_restaurants_google_place_id 
UNIQUE (google_place_id);

-- Add index for faster identity resolution lookups (if not exists)  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_google_place_id_lookup 
ON restaurants (google_place_id) 
WHERE google_place_id IS NOT NULL;

-- Comment for documentation
COMMENT ON CONSTRAINT uq_restaurants_google_place_id ON restaurants 
IS 'Ensures one-to-one mapping between Google Place IDs and restaurant records for identity resolution';