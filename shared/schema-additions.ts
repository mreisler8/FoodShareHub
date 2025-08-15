/**
 * Schema additions for Lists MVP gaps
 * Adding slug field and other missing pieces
 */

import { pgTable, serial, text, integer, timestamp, boolean, json, index, uniqueIndex, varchar, unique, decimal } from "drizzle-orm/pg-core";

// Slug field addition to restaurant_lists table
// This would be added in the actual migration
export const restaurantListsSlugAddition = {
  slug: varchar('slug', { length: 100 }).unique(),
};

// For reference - the complete updated schema would include:
/*
export const restaurantLists = pgTable('restaurant_lists', {
  // ... existing fields
  slug: varchar('slug', { length: 100 }).unique(),
  // ... rest of fields
}, (table) => ({
  // ... existing indexes
  slugIndex: index("restaurant_lists_slug_idx").on(table.slug),
}));
*/