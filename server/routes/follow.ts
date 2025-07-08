
import { Router } from 'express';
import { z } from 'zod';
import { eq, and, or } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { userFollowers, users, circleMembers, posts, restaurants } from '../../shared/schema';
import { sql, alias, desc } from 'drizzle-orm';

const router = Router();

// GET /api/follow/followers/:userId - Get user's followers
router.get('/followers/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const followers = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        profilePicture: users.profilePicture,
        bio: users.bio,
        followedAt: userFollowers.createdAt,
      })
      .from(userFollowers)
      .innerJoin(users, eq(userFollowers.followerId, users.id))
      .where(eq(userFollowers.followingId, userId));

    res.json(followers);
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /api/follow/following/:userId - Get users that this user follows
router.get('/following/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const following = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        profilePicture: users.profilePicture,
        bio: users.bio,
        followedAt: userFollowers.createdAt,
      })
      .from(userFollowers)
      .innerJoin(users, eq(userFollowers.followingId, users.id))
      .where(eq(userFollowers.followerId, userId));

    res.json(following);
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// GET /api/follow/status/:userId - Check if current user follows target user
router.get('/status/:userId', authenticate, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = req.user!.id;

    const [followRelation] = await db
      .select()
      .from(userFollowers)
      .where(and(
        eq(userFollowers.followerId, currentUserId),
        eq(userFollowers.followingId, targetUserId)
      ));

    res.json({ isFollowing: !!followRelation });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

// POST /api/follow/:userId - Follow a user
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const followingId = parseInt(req.params.userId);
    const followerId = req.user!.id;

    // Prevent self-following
    if (followerId === followingId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if already following
    const [existingFollow] = await db
      .select()
      .from(userFollowers)
      .where(and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      ));

    if (existingFollow) {
      return res.status(409).json({ error: 'Already following this user' });
    }

    // Check if target user exists
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, followingId));

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [follow] = await db
      .insert(userFollowers)
      .values({ followerId, followingId })
      .returning();

    res.json({
      success: true,
      follow,
      message: `You are now following ${targetUser.name}`
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /api/follow/:userId - Unfollow a user
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    const followingId = parseInt(req.params.userId);
    const followerId = req.user!.id;

    const result = await db
      .delete(userFollowers)
      .where(and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      ));

    res.json({ success: true, message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /api/follow/suggestions - Get follow suggestions based on circles and mutual connections
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user!.id;

    // Get users from same circles that current user isn't following yet
    const suggestions = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        profilePicture: users.profilePicture,
        bio: users.bio,
        mutualCircles: sql<number>`COUNT(DISTINCT cm2.circle_id)`.as('mutualCircles'),
        mutualConnections: sql<number>`COUNT(DISTINCT uf2.following_id)`.as('mutualConnections'),
      })
      .from(users)
      .leftJoin(circleMembers, eq(circleMembers.userId, users.id))
      .leftJoin(
        alias(circleMembers, 'cm_current'), 
        and(
          eq(sql`cm_current.user_id`, currentUserId),
          eq(sql`cm_current.circle_id`, circleMembers.circleId)
        )
      )
      .leftJoin(
        alias(circleMembers, 'cm2'),
        and(
          eq(sql`cm2.user_id`, users.id),
          sql`cm2.circle_id IN (SELECT circle_id FROM circle_members WHERE user_id = ${currentUserId})`
        )
      )
      .leftJoin(
        alias(userFollowers, 'uf2'),
        and(
          sql`uf2.follower_id IN (SELECT following_id FROM user_followers WHERE follower_id = ${currentUserId})`,
          eq(sql`uf2.following_id`, users.id)
        )
      )
      .where(and(
        // Exclude self
        sql`${users.id} != ${currentUserId}`,
        // Exclude already followed users
        sql`${users.id} NOT IN (SELECT following_id FROM user_followers WHERE follower_id = ${currentUserId})`,
        // Include users with mutual circles or connections
        or(
          sql`cm2.circle_id IS NOT NULL`,


// GET /api/follow/feed - Get posts from followed users for personalized feed
router.get('/feed', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get posts from followed users
    const followedUsersPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        visibility: posts.visibility,
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
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .innerJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .innerJoin(userFollowers, eq(userFollowers.followingId, posts.userId))
      .where(and(
        eq(userFollowers.followerId, currentUserId),
        eq(posts.visibility, 'public')
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .innerJoin(userFollowers, eq(userFollowers.followingId, posts.userId))
      .where(and(
        eq(userFollowers.followerId, currentUserId),
        eq(posts.visibility, 'public')
      ));

    res.json({
      posts: followedUsersPosts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasMore: page < Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching followed users feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

          sql`uf2.following_id IS NOT NULL`
        )
      ))
      .groupBy(users.id, users.name, users.username, users.profilePicture, users.bio)
      .orderBy(sql`mutualCircles DESC, mutualConnections DESC`)
      .limit(10);

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching follow suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

export default router;
