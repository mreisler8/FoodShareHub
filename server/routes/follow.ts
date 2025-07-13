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

// GET /api/follow/following/:userId - Get users that the user is following
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

// POST /api/follow/:userId - Follow a user
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const followingId = parseInt(req.params.userId);
    const followerId = req.user!.id;
    
    // Check if already following
    const existingFollow = await db
      .select()
      .from(userFollowers)
      .where(and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      ));
    
    if (existingFollow.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }
    
    // Create follow relationship
    await db.insert(userFollowers).values({
      followerId,
      followingId,
    });
    
    res.json({ message: 'Successfully followed user' });
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
    
    await db
      .delete(userFollowers)
      .where(and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      ));
    
    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /api/follow/status/:userId - Check if current user is following another user
router.get('/status/:userId', authenticate, async (req, res) => {
  try {
    const followingId = parseInt(req.params.userId);
    const followerId = req.user!.id;
    
    const follow = await db
      .select()
      .from(userFollowers)
      .where(and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      ));
    
    res.json({ isFollowing: follow.length > 0 });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

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

export default router;