import { Request, Response } from 'express';
import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { users, userFollowers } from '../../shared/schema';
import { insertUserFollowerSchema } from '../../shared/schema';

// Follow a user
export async function followUser(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const followerId = req.user!.id;
    const followingId = parseInt(userId);

    // Can't follow yourself
    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user exists
    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.id, followingId))
      .limit(1);

    if (userExists.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = await db
      .select()
      .from(userFollowers)
      .where(
        and(
          eq(userFollowers.followerId, followerId),
          eq(userFollowers.followingId, followingId)
        )
      )
      .limit(1);

    if (existingFollow.length > 0) {
      return res.status(409).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    const validateData = insertUserFollowerSchema.parse({
      followerId,
      followingId
    });

    const [follow] = await db
      .insert(userFollowers)
      .values(validateData)
      .returning();

    res.status(201).json(follow);
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Unfollow a user
export async function unfollowUser(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const followerId = req.user!.id;
    const followingId = parseInt(userId);

    // Delete follow relationship
    const result = await db
      .delete(userFollowers)
      .where(
        and(
          eq(userFollowers.followerId, followerId),
          eq(userFollowers.followingId, followingId)
        )
      );

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get user's followers
export async function getUserFollowers(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const targetUserId = parseInt(userId);

    const followers = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        bio: users.bio,
        profilePicture: users.profilePicture,
        followedAt: userFollowers.createdAt
      })
      .from(userFollowers)
      .innerJoin(users, eq(userFollowers.followerId, users.id))
      .where(eq(userFollowers.followingId, targetUserId))
      .orderBy(userFollowers.createdAt);

    res.json(followers);
  } catch (error) {
    console.error('Error fetching user followers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get users that a user is following
export async function getUserFollowing(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const targetUserId = parseInt(userId);

    const following = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        bio: users.bio,
        profilePicture: users.profilePicture,
        followedAt: userFollowers.createdAt
      })
      .from(userFollowers)
      .innerJoin(users, eq(userFollowers.followingId, users.id))
      .where(eq(userFollowers.followerId, targetUserId))
      .orderBy(userFollowers.createdAt);

    res.json(following);
  } catch (error) {
    console.error('Error fetching user following:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get user profile stats (followers/following counts)
export async function getUserStats(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const targetUserId = parseInt(userId);

    // Get follower count
    const followerCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollowers)
      .where(eq(userFollowers.followingId, targetUserId));

    // Get following count
    const followingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, targetUserId));

    // Check if current user is following this user
    let isFollowing = false;
    if (req.user) {
      const followCheck = await db
        .select()
        .from(userFollowers)
        .where(
          and(
            eq(userFollowers.followerId, req.user.id),
            eq(userFollowers.followingId, targetUserId)
          )
        )
        .limit(1);
      
      isFollowing = followCheck.length > 0;
    }

    res.json({
      followers: followerCount[0].count,
      following: followingCount[0].count,
      isFollowing
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}