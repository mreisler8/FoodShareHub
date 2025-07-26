import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { userFollowers, users, posts } from '../../shared/schema';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for follow actions - max 50 follows per hour
const followRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 follows per hour
  message: { error: 'Too many follow actions. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
router.post('/:userId', followRateLimit, authenticate, async (req, res) => {
  try {
    console.log('POST Request: /api/follow/' + req.params.userId);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Session exists:', !!req.session);
    console.log('SessionID:', req.sessionID);
    console.log('User ID:', req.user?.id);
    console.log('Is authenticated:', req.isAuthenticated());
    
    const followingId = parseInt(req.params.userId);
    const followerId = req.user!.id;
    
    // Prevent following self
    if (followingId === followerId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existingFollow = await db
      .select()
      .from(userFollowers)
      .where(and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      ))
      .limit(1);

    if (existingFollow.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    await db.insert(userFollowers).values({
      followerId,
      followingId,
      createdAt: new Date()
    });

    res.json({ success: true, message: 'User followed successfully' });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /api/follow/:userId - Unfollow a user
router.delete('/:userId', followRateLimit, authenticate, async (req, res) => {
  try {
    const followingId = parseInt(req.params.userId);
    const followerId = req.user!.id;

    // Remove follow relationship
    await db
      .delete(userFollowers)
      .where(and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      ));

    res.json({ success: true, message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /api/follow/status/:userId - Check if following a user
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
      ))
      .limit(1);

    res.json({ isFollowing: follow.length > 0 });
  } catch (error) {
    console.error('Follow status error:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

// GET /api/follow/counts/:userId - Get follower and following counts
router.get('/counts/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const [followersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollowers)
      .where(eq(userFollowers.followingId, userId));
      
    const [followingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));

    res.json({
      followers: followersCount.count,
      following: followingCount.count
    });
  } catch (error) {
    console.error('Error fetching follow counts:', error);
    res.status(500).json({ error: 'Failed to fetch follow counts' });
  }
});

// GET /api/follow/feed - Get posts from followed users
router.get('/feed', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get posts from users that the current user follows
    const followedUsersPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        images: posts.images,
        rating: posts.rating,
        visibility: posts.visibility,
        createdAt: posts.createdAt,
        userId: posts.userId,
        restaurantId: posts.restaurantId,
        authorName: users.name,
        authorUsername: users.username,
        authorProfilePicture: users.profilePicture
      })
      .from(posts)
      .innerJoin(userFollowers, eq(userFollowers.followingId, posts.userId))
      .innerJoin(users, eq(users.id, posts.userId))
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