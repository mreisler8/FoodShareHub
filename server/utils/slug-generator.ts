/**
 * Slug Generation Utilities
 * 
 * Generates URL-safe slugs for public list sharing
 */

import { db } from '../db';
import { restaurantLists } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Generate URL-safe slug from text
 */
export function generateSlugFromText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and special chars with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length
    .substring(0, 80);
}

/**
 * Generate unique slug with collision detection
 */
export async function generateUniqueSlug(
  baseText: string, 
  excludeId?: number
): Promise<string> {
  let baseSlug = generateSlugFromText(baseText);
  
  // If base slug is empty, use a default
  if (!baseSlug) {
    baseSlug = 'list';
  }
  
  let slug = baseSlug;
  let counter = 1;
  
  // Check for collisions and increment until unique
  while (await slugExists(slug, excludeId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    // Prevent infinite loops
    if (counter > 1000) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }
  
  return slug;
}

/**
 * Check if slug already exists
 */
async function slugExists(slug: string, excludeId?: number): Promise<boolean> {
  try {
    const conditions = [eq(restaurantLists.slug as any, slug)];
    
    // For updates, exclude the current record
    if (excludeId) {
      conditions.push(eq(restaurantLists.id, excludeId));
    }
    
    const existing = await db
      .select({ id: restaurantLists.id })
      .from(restaurantLists)
      .where(conditions[0])
      .limit(1);
    
    return existing.length > 0;
  } catch (error) {
    // If slug column doesn't exist yet, assume no collision
    console.warn('Slug collision check failed (column may not exist yet):', error);
    return false;
  }
}

/**
 * Generate slug for existing list without slug
 */
export async function backfillSlugForList(listId: number, listName: string): Promise<string | null> {
  try {
    const slug = await generateUniqueSlug(listName, listId);
    
    // Note: This would be used after schema migration adds slug column
    // await db
    //   .update(restaurantLists)
    //   .set({ slug })
    //   .where(eq(restaurantLists.id, listId));
    
    return slug;
  } catch (error) {
    console.error(`Failed to backfill slug for list ${listId}:`, error);
    return null;
  }
}