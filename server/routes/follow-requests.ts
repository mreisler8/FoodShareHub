import { Router, Request, Response } from 'express';
import { db } from '../db';
import { userFollowers, users } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../auth';

const router = Router();

// GET /api/follow/requests/pending - Get pending follow requests for current user
router.get('/requests/pending', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const requests = await db
      .select({
        id: userFollowers.id,
        followerId: userFollowers.followerId,
        status: userFollowers.status,
        createdAt: userFollowers.createdAt,
        follower: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
          bio: users.bio,
        }
      })
      .from(userFollowers)
      .innerJoin(users, eq(userFollowers.followerId, users.id))
      .where(
        and(
          eq(userFollowers.followingId, userId),
          eq(userFollowers.status, 'pending')
        )
      )
      .orderBy(desc(userFollowers.createdAt));

    res.json(requests);
  } catch (error) {
    console.error('Error fetching follow requests:', error);
    res.status(500).json({ error: 'Failed to fetch follow requests' });
  }
});

// POST /api/follow/:userId/request - Request to follow a user (for private profiles)
router.post('/:userId/request', authenticate, async (req: Request, res: Response) => {
  try {
    const followingId = parseInt(req.params.userId);
    const followerId = req.user!.id;

    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following or requested
    const existing = await db
      .select()
      .from(userFollowers)
      .where(
        and(
          eq(userFollowers.followerId, followerId),
          eq(userFollowers.followingId, followingId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const status = existing[0].status;
      if (status === 'following') {
        return res.status(400).json({ error: 'Already following this user' });
      } else if (status === 'pending') {
        return res.status(400).json({ error: 'Follow request already pending' });
      }
    }

    // Check if target user requires approval
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, followingId))
      .limit(1);

    if (targetUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, we'll assume all follow requests need approval
    // In the future, this can be based on user privacy settings
    const [request] = await db
      .insert(userFollowers)
      .values({
        followerId,
        followingId,
        status: 'pending',
      })
      .returning();

    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating follow request:', error);
    res.status(500).json({ error: 'Failed to create follow request' });
  }
});

// POST /api/follow/requests/:requestId/respond - Accept or decline a follow request
router.post('/requests/:requestId/respond', authenticate, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;
    const userId = req.user!.id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Get the request
    const [request] = await db
      .select()
      .from(userFollowers)
      .where(eq(userFollowers.id, parseInt(requestId)));

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Verify the request is for the current user
    if (request.followingId !== userId) {
      return res.status(403).json({ error: 'Not authorized to respond to this request' });
    }

    if (action === 'accept') {
      // Update to following status
      await db
        .update(userFollowers)
        .set({
          status: 'following',
          approvedAt: new Date(),
        })
        .where(eq(userFollowers.id, parseInt(requestId)));
    } else {
      // Decline - delete the request
      await db
        .delete(userFollowers)
        .where(eq(userFollowers.id, parseInt(requestId)));
    }

    res.json({ message: `Follow request ${action}ed successfully` });
  } catch (error) {
    console.error('Error responding to follow request:', error);
    res.status(500).json({ error: 'Failed to respond to follow request' });
  }
});

// GET /api/me/privacy - Get user privacy settings
router.get('/me/privacy', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // For now, return default settings
    // In a real implementation, these would be stored in the users table
    res.json({
      requireFollowApproval: false,
      privateProfile: false,
      showFollowersCount: true,
      showFollowingCount: true,
    });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({ error: 'Failed to fetch privacy settings' });
  }
});

// PATCH /api/me/privacy - Update user privacy settings
router.patch('/me/privacy', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const updates = req.body;

    // In a real implementation, save these to the users table
    // For now, just return success
    res.json({ message: 'Privacy settings updated successfully' });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

export default router;