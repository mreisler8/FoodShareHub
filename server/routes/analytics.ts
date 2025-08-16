import { Router } from 'express';
import { authenticate } from '../auth';
import { getPerformanceAnalytics, getUserEngagementAnalytics } from '../middleware/performanceAnalytics';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Get performance analytics (admin/debug endpoint)
router.get('/performance', authenticate, async (req, res) => {
  try {
    const analytics = getPerformanceAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch performance analytics' });
  }
});

// Get user engagement analytics
router.get('/user-engagement', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const engagement = await getUserEngagementAnalytics(userId);
    res.json(engagement);
  } catch (error) {
    console.error('Error fetching user engagement analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user engagement analytics' });
  }
});

// Get list performance analytics
router.get('/lists/performance', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const listAnalytics = await db.execute(sql`
      WITH list_stats AS (
        SELECT 
          rl.id,
          rl.name,
          COUNT(DISTINCT rli.id) as restaurant_count,
          COUNT(DISTINCT sl.id) as save_count,
          COUNT(DISTINCT lr.id) as reaction_count,
          rl.view_count,
          rl.created_at,
          EXTRACT(DAYS FROM NOW() - rl.created_at) as days_old
        FROM restaurant_lists rl
        LEFT JOIN restaurant_list_items rli ON rl.id = rli.list_id
        LEFT JOIN saved_lists sl ON rl.id = sl.list_id
        LEFT JOIN list_reactions lr ON rl.id = lr.list_id
        WHERE rl.created_by_id = ${userId}
        GROUP BY rl.id, rl.name, rl.view_count, rl.created_at
      )
      SELECT 
        id,
        name,
        restaurant_count,
        save_count,
        reaction_count,
        view_count,
        days_old,
        CASE 
          WHEN days_old > 0 THEN ROUND((save_count + reaction_count + view_count)::numeric / days_old, 2)
          ELSE 0
        END as engagement_rate
      FROM list_stats
      ORDER BY engagement_rate DESC, created_at DESC
      LIMIT 20
    `);
    
    res.json(listAnalytics);
  } catch (error) {
    console.error('Error fetching list analytics:', error);
    res.status(500).json({ error: 'Failed to fetch list analytics' });
  }
});

// Get circle insights
router.get('/circles/insights', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const circleInsights = await db.execute(sql`
      WITH circle_activity AS (
        SELECT 
          c.id,
          c.name,
          c.member_count,
          COUNT(DISTINCT rl.id) as shared_lists,
          COUNT(DISTINCT p.id) as shared_posts,
          c.created_at,
          EXTRACT(DAYS FROM NOW() - c.created_at) as days_old
        FROM circles c
        LEFT JOIN restaurant_lists rl ON c.id = ANY(rl.visibility_circle_ids)
        LEFT JOIN posts p ON c.id = p.circle_id
        WHERE c.creator_id = ${userId} OR c.id IN (
          SELECT circle_id FROM circle_members WHERE user_id = ${userId}
        )
        GROUP BY c.id, c.name, c.member_count, c.created_at
      )
      SELECT 
        id,
        name,
        member_count,
        shared_lists,
        shared_posts,
        days_old,
        CASE 
          WHEN days_old > 0 THEN ROUND((shared_lists + shared_posts)::numeric / days_old, 2)
          ELSE 0
        END as activity_rate
      FROM circle_activity
      ORDER BY activity_rate DESC, member_count DESC
    `);
    
    res.json(circleInsights);
  } catch (error) {
    console.error('Error fetching circle insights:', error);
    res.status(500).json({ error: 'Failed to fetch circle insights' });
  }
});

// Get restaurant discovery analytics
router.get('/restaurants/discovery', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const discoveryAnalytics = await db.execute(sql`
      WITH restaurant_engagement AS (
        SELECT 
          r.id,
          r.name,
          r.category,
          r.price_range,
          COUNT(DISTINCT rt.id) as user_ratings,
          COUNT(DISTINCT rli.id) as list_appearances,
          ROUND(AVG(rt.rating_value::numeric), 1) as avg_rating,
          MAX(rt.created_at) as last_interaction
        FROM restaurants r
        LEFT JOIN ratings rt ON r.id = rt.restaurant_id
        LEFT JOIN restaurant_list_items rli ON r.id = rli.restaurant_id
        LEFT JOIN restaurant_lists rl ON rli.list_id = rl.id
        WHERE rt.user_id = ${userId} OR rl.created_by_id = ${userId}
        GROUP BY r.id, r.name, r.category, r.price_range
        HAVING COUNT(DISTINCT rt.id) > 0 OR COUNT(DISTINCT rli.id) > 0
      )
      SELECT 
        id,
        name,
        category,
        price_range,
        user_ratings,
        list_appearances,
        avg_rating,
        last_interaction,
        (user_ratings + list_appearances) as total_engagement
      FROM restaurant_engagement
      ORDER BY total_engagement DESC, last_interaction DESC
      LIMIT 20
    `);
    
    res.json(discoveryAnalytics);
  } catch (error) {
    console.error('Error fetching restaurant discovery analytics:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant discovery analytics' });
  }
});

export default router;