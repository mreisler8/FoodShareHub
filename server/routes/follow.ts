
import { Router } from 'express';
import { z } from 'zod';
import { eq, and, or } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { userFollowers, users } from '../../shared/schema';

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
      })
      .from(users)
      .where(and(
        // Exclude self
        eq(users.id, currentUserId) === false,
        // Add more sophisticated logic here for suggestions
      ))
      .limit(10);

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching follow suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

export default router;
