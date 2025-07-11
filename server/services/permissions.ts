import { db } from '../db';
import { sql, eq, and, or } from 'drizzle-orm';
import { restaurantLists, circles, circleMembers, circleSharedLists } from '../../shared/schema';

export class PermissionService {
  /**
   * Check if user can access a specific list
   */
  static async canAccessList(userId: number, listId: number): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT 1 FROM restaurant_lists rl
        LEFT JOIN circle_members cm ON rl.circle_id = cm.circle_id
        WHERE rl.id = ${listId} AND (
          -- User owns the list
          rl.created_by_id = ${userId} OR
          -- List is public
          rl.make_public = true OR
          -- List is shared with circle and user is member
          (rl.share_with_circle = true AND cm.user_id = ${userId})
        )
        LIMIT 1
      `);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking list access:', error);
      return false;
    }
  }

  /**
   * Check if user can access a specific circle
   */
  static async canAccessCircle(userId: number, circleId: number): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT 1 FROM circles c
        LEFT JOIN circle_members cm ON c.id = cm.circle_id
        WHERE c.id = ${circleId} AND (
          -- User is a member of the circle
          cm.user_id = ${userId} OR
          -- Circle allows public joining
          c.allow_public_join = true
        )
        LIMIT 1
      `);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking circle access:', error);
      return false;
    }
  }

  /**
   * Get all lists accessible to user
   */
  static async getUserAccessibleLists(userId: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        -- User's own lists
        SELECT DISTINCT 
          rl.id, rl.name, rl.description, rl.created_by_id as "createdById",
          rl.circle_id as "circleId", rl.is_public as "isPublic",
          rl.visibility, rl.share_with_circle as "shareWithCircle",
          rl.make_public as "makePublic", rl.created_at as "createdAt",
          rl.updated_at as "updatedAt", rl.tags, rl.primary_location as "primaryLocation",
          'owned' as access_type
        FROM restaurant_lists rl
        WHERE rl.created_by_id = ${userId}
        
        UNION
        
        -- Public lists (not owned by user)
        SELECT DISTINCT 
          rl.id, rl.name, rl.description, rl.created_by_id as "createdById",
          rl.circle_id as "circleId", rl.is_public as "isPublic",
          rl.visibility, rl.share_with_circle as "shareWithCircle",
          rl.make_public as "makePublic", rl.created_at as "createdAt",
          rl.updated_at as "updatedAt", rl.tags, rl.primary_location as "primaryLocation",
          'public' as access_type
        FROM restaurant_lists rl
        WHERE rl.make_public = true 
        AND rl.created_by_id != ${userId}
        
        UNION
        
        -- Circle-shared lists (user is member, not owner, not public)
        SELECT DISTINCT 
          rl.id, rl.name, rl.description, rl.created_by_id as "createdById",
          rl.circle_id as "circleId", rl.is_public as "isPublic",
          rl.visibility, rl.share_with_circle as "shareWithCircle",
          rl.make_public as "makePublic", rl.created_at as "createdAt",
          rl.updated_at as "updatedAt", rl.tags, rl.primary_location as "primaryLocation",
          'circle_shared' as access_type
        FROM restaurant_lists rl
        INNER JOIN circle_members cm ON rl.circle_id = cm.circle_id
        WHERE rl.share_with_circle = true
        AND cm.user_id = ${userId}
        AND rl.created_by_id != ${userId}
        AND rl.make_public = false
        
        ORDER BY "createdAt" DESC
      `);
      return result.rows || [];
    } catch (error) {
      console.error('Error fetching accessible lists:', error);
      return [];
    }
  }

  /**
   * Get all circles accessible to user
   */
  static async getUserAccessibleCircles(userId: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT DISTINCT 
          c.id, c.name, c.description, c.is_private as "isPrivate",
          c.created_at as "createdAt", c.creator_id as "creatorId",
          c.invite_code as "inviteCode", c.allow_public_join as "allowPublicJoin",
          c.tags, c.primary_cuisine as "primaryCuisine",
          c.price_range as "priceRange", c.location,
          c.member_count as "memberCount", c.featured, c.trending,
          cm.role, cm.joined_at as "joinedAt",
          CASE 
            WHEN cm.user_id = ${userId} THEN 'member'
            WHEN c.allow_public_join = true THEN 'public'
            ELSE 'none'
          END as access_type
        FROM circles c
        LEFT JOIN circle_members cm ON c.id = cm.circle_id AND cm.user_id = ${userId}
        WHERE (
          -- User is a member of the circle
          cm.user_id = ${userId} OR
          -- Circle allows public joining
          c.allow_public_join = true
        )
        ORDER BY c.created_at DESC
      `);
      return result.rows || [];
    } catch (error) {
      console.error('Error fetching accessible circles:', error);
      return [];
    }
  }

  /**
   * Filter search results based on user permissions
   */
  static async filterSearchResults(userId: number, searchResults: any): Promise<any> {
    try {
      // Filter lists to only include accessible ones
      const accessibleListIds = await db.execute(sql`
        SELECT DISTINCT rl.id
        FROM restaurant_lists rl
        LEFT JOIN circle_members cm ON rl.circle_id = cm.circle_id
        WHERE rl.id = ANY(${searchResults.lists?.map((l: any) => l.id) || []}) AND (
          rl.created_by_id = ${userId} OR
          rl.make_public = true OR
          (rl.share_with_circle = true AND cm.user_id = ${userId})
        )
      `);
      
      const accessibleListIdSet = new Set(accessibleListIds.rows.map(r => r.id));
      
      // Filter circles to only include accessible ones
      const accessibleCircleIds = await db.execute(sql`
        SELECT DISTINCT c.id
        FROM circles c
        LEFT JOIN circle_members cm ON c.id = cm.circle_id
        WHERE c.id = ANY(${searchResults.circles?.map((c: any) => c.id) || []}) AND (
          cm.user_id = ${userId} OR
          c.allow_public_join = true
        )
      `);
      
      const accessibleCircleIdSet = new Set(accessibleCircleIds.rows.map(r => r.id));
      
      return {
        ...searchResults,
        lists: searchResults.lists?.filter((list: any) => accessibleListIdSet.has(parseInt(list.id))) || [],
        circles: searchResults.circles?.filter((circle: any) => accessibleCircleIdSet.has(parseInt(circle.id))) || []
      };
    } catch (error) {
      console.error('Error filtering search results:', error);
      return searchResults;
    }
  }

  /**
   * Check if user can edit a list
   */
  static async canEditList(userId: number, listId: number): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT 1 FROM restaurant_lists rl
        WHERE rl.id = ${listId} AND rl.created_by_id = ${userId}
        LIMIT 1
      `);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking list edit permission:', error);
      return false;
    }
  }

  /**
   * Check if user can manage a circle (owner or admin)
   */
  static async canManageCircle(userId: number, circleId: number): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT 1 FROM circle_members cm
        WHERE cm.circle_id = ${circleId} 
        AND cm.user_id = ${userId}
        AND cm.role IN ('owner', 'admin')
        LIMIT 1
      `);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking circle management permission:', error);
      return false;
    }
  }
}