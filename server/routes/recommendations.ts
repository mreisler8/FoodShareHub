import { Router } from 'express';
import { authenticate } from '../auth';
import { db } from '../db';
import { eq, desc, and, or, sql, inArray } from 'drizzle-orm';
import { 
  posts, 
  users, 
  restaurants, 
  userFollowers, 
  restaurantLists, 
  restaurantListItems,
  circleMembers,
  circles
} from '../../shared/schema';

const router = Router();

// GET /api/recommendations/recent - Get recent recommendations from followed users
router.get('/recent', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { theme, location, cuisine, priceRange, limit = 20 } = req.query;
    
    // Get users that the current user follows
    const followedUsers = await db
      .select({ followingId: userFollowers.followingId })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));
    
    const followedUserIds = followedUsers.map(f => f.followingId);
    
    if (followedUserIds.length === 0) {
      return res.json({
        recommendations: [],
        summary: {
          totalRecommendations: 0,
          byTheme: {},
          byLocation: {},
          byCuisine: {},
          byPriceRange: {}
        }
      });
    }
    
    // Build filter conditions
    let filterConditions = [
      inArray(posts.userId, followedUserIds),
      eq(posts.visibility, 'public') // Only public posts
    ];
    
    if (cuisine) {
      filterConditions.push(eq(restaurants.cuisine, cuisine as string));
    }
    
    if (location) {
      filterConditions.push(sql`${restaurants.location} ILIKE ${'%' + location + '%'}`);
    }
    
    if (priceRange) {
      filterConditions.push(eq(restaurants.priceRange, priceRange as string));
    }
    
    // Get recent recommendations (posts with high ratings)
    const recommendations = await db
      .select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        dishesTried: posts.dishesTried,
        images: posts.images,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
        },
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          cuisine: restaurants.cuisine,
          priceRange: restaurants.priceRange,
          address: restaurants.address,
          imageUrl: restaurants.imageUrl,
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .innerJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .where(and(...filterConditions))
      .orderBy(desc(posts.createdAt))
      .limit(parseInt(limit as string));
    
    // Get summary statistics
    const summaryQuery = await db
      .select({
        totalCount: sql<number>`count(*)::int`,
        cuisine: restaurants.cuisine,
        location: restaurants.location,
        priceRange: restaurants.priceRange,
        avgRating: sql<number>`avg(${posts.rating})::numeric(3,2)`,
      })
      .from(posts)
      .innerJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .where(and(
        inArray(posts.userId, followedUserIds),
        eq(posts.visibility, 'public')
      ))
      .groupBy(restaurants.cuisine, restaurants.location, restaurants.priceRange);
    
    // Process summary data
    const summary = {
      totalRecommendations: recommendations.length,
      byTheme: {} as Record<string, number>,
      byLocation: {} as Record<string, number>,
      byCuisine: {} as Record<string, number>,
      byPriceRange: {} as Record<string, number>
    };
    
    summaryQuery.forEach(item => {
      if (item.cuisine) {
        summary.byCuisine[item.cuisine] = (summary.byCuisine[item.cuisine] || 0) + 1;
      }
      if (item.location) {
        summary.byLocation[item.location] = (summary.byLocation[item.location] || 0) + 1;
      }
      if (item.priceRange) {
        summary.byPriceRange[item.priceRange] = (summary.byPriceRange[item.priceRange] || 0) + 1;
      }
    });
    
    res.json({
      recommendations,
      summary,
      filters: {
        theme,
        location,
        cuisine,
        priceRange
      }
    });
    
  } catch (error) {
    console.error('Error fetching recent recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// GET /api/recommendations/trending - Get trending recommendations in user's network
router.get('/trending', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { days = 7, limit = 10 } = req.query;
    
    // Get users that the current user follows
    const followedUsers = await db
      .select({ followingId: userFollowers.followingId })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));
    
    const followedUserIds = followedUsers.map(f => f.followingId);
    
    if (followedUserIds.length === 0) {
      return res.json([]);
    }
    
    // Get trending restaurants based on recent high-rated posts from followed users
    const trendingRecommendations = await db.execute(sql`
      SELECT 
        r.id,
        r.name,
        r.location,
        r.cuisine,
        r.price_range as "priceRange",
        r.address,
        r.image_url as "imageUrl",
        COUNT(p.id) as "mentionCount",
        AVG(p.rating) as "avgRating",
        ARRAY_AGG(DISTINCT p.dishes_tried) as "popularDishes",
        ARRAY_AGG(DISTINCT u.name) as "recommendedBy"
      FROM restaurants r
      INNER JOIN posts p ON r.id = p.restaurant_id
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ANY(${followedUserIds})
        AND p.created_at >= NOW() - INTERVAL '${days} days'
        AND p.visibility = 'public'
        AND p.rating >= 4
      GROUP BY r.id, r.name, r.location, r.cuisine, r.price_range, r.address, r.image_url
      ORDER BY COUNT(p.id) DESC, AVG(p.rating) DESC
      LIMIT ${parseInt(limit as string)}
    `);
    
    res.json(trendingRecommendations.rows);
    
  } catch (error) {
    console.error('Error fetching trending recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch trending recommendations' });
  }
});

// GET /api/recommendations/by-circle - Get recommendations from circle members
router.get('/by-circle', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { circleId, limit = 20 } = req.query;
    
    // Get user's circles if no specific circle specified
    let targetCircleIds: number[] = [];
    
    if (circleId) {
      // Verify user is member of the specified circle
      const membership = await db
        .select()
        .from(circleMembers)
        .where(and(
          eq(circleMembers.circleId, parseInt(circleId as string)),
          eq(circleMembers.userId, userId)
        ))
        .limit(1);
      
      if (membership.length === 0) {
        return res.status(403).json({ error: 'Not a member of this circle' });
      }
      
      targetCircleIds = [parseInt(circleId as string)];
    } else {
      // Get all circles user is member of
      const userCircles = await db
        .select({ circleId: circleMembers.circleId })
        .from(circleMembers)
        .where(eq(circleMembers.userId, userId));
      
      targetCircleIds = userCircles.map(c => c.circleId);
    }
    
    if (targetCircleIds.length === 0) {
      return res.json([]);
    }
    
    // Get recommendations from circle members
    const circleRecommendations = await db
      .select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        dishesTried: posts.dishesTried,
        images: posts.images,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
        },
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          cuisine: restaurants.cuisine,
          priceRange: restaurants.priceRange,
          address: restaurants.address,
          imageUrl: restaurants.imageUrl,
        },
        circle: {
          id: circles.id,
          name: circles.name,
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .innerJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .innerJoin(circleMembers, eq(circleMembers.userId, posts.userId))
      .innerJoin(circles, eq(circles.id, circleMembers.circleId))
      .where(and(
        inArray(circleMembers.circleId, targetCircleIds),
        or(
          eq(posts.visibility, 'public'),
          eq(posts.visibility, 'circles')
        )
      ))
      .orderBy(desc(posts.createdAt))
      .limit(parseInt(limit as string));
    
    res.json(circleRecommendations);
    
  } catch (error) {
    console.error('Error fetching circle recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch circle recommendations' });
  }
});

// GET /api/recommendations/filters - Get available filter options
router.get('/filters', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get users that the current user follows
    const followedUsers = await db
      .select({ followingId: userFollowers.followingId })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));
    
    const followedUserIds = followedUsers.map(f => f.followingId);
    
    if (followedUserIds.length === 0) {
      return res.json({
        cuisines: [],
        locations: [],
        priceRanges: []
      });
    }
    
    // Get distinct filter options from followed users' posts
    const filterOptions = await db
      .select({
        cuisine: restaurants.cuisine,
        location: restaurants.location,
        priceRange: restaurants.priceRange,
      })
      .from(posts)
      .innerJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .where(and(
        inArray(posts.userId, followedUserIds),
        eq(posts.visibility, 'public')
      ))
      .groupBy(restaurants.cuisine, restaurants.location, restaurants.priceRange);
    
    const cuisines = [...new Set(filterOptions.map(f => f.cuisine).filter(Boolean))];
    const locations = [...new Set(filterOptions.map(f => f.location).filter(Boolean))];
    const priceRanges = [...new Set(filterOptions.map(f => f.priceRange).filter(Boolean))];
    
    res.json({
      cuisines: cuisines.sort(),
      locations: locations.sort(),
      priceRanges: priceRanges.sort()
    });
    
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

export default router;