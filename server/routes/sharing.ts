import { Router } from 'express';
import { authenticate } from '../auth';
import { db } from '../db';
import { sharedRecommendations, users, restaurantLists, restaurants, userFollowers, circleMembers, circles } from '../../shared/schema';
import { insertSharedRecommendationSchema } from '../../shared/schema';
import { eq, and, desc, count, or, inArray } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const router = Router();

// Rate limiting per NFR requirements
const shareRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 shares per hour per user
  message: { error: 'Too many share attempts. Maximum 10 shares per hour allowed.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const linkGenerationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 link generations per hour per user
  message: { error: 'Too many link generation attempts. Maximum 20 links per hour allowed.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to check if user can share to receiver (follows or shares circle)
async function canUserShareToReceiver(senderId: number, receiverId: number): Promise<boolean> {
  try {
    // Check if sender follows receiver or vice versa
    const followRelation = await db
      .select()
      .from(userFollowers)
      .where(
        or(
          and(eq(userFollowers.followerId, senderId), eq(userFollowers.followingId, receiverId)),
          and(eq(userFollowers.followerId, receiverId), eq(userFollowers.followingId, senderId))
        )
      )
      .limit(1);

    if (followRelation.length > 0) {
      return true;
    }

    // Check if they share a circle
    const senderCircles = await db
      .select({ circleId: circleMembers.circleId })
      .from(circleMembers)
      .where(eq(circleMembers.userId, senderId));

    const receiverCircles = await db
      .select({ circleId: circleMembers.circleId })
      .from(circleMembers)
      .where(eq(circleMembers.userId, receiverId));

    const senderCircleIds = senderCircles.map(c => c.circleId);
    const receiverCircleIds = receiverCircles.map(c => c.circleId);

    return senderCircleIds.some(id => receiverCircleIds.includes(id));
  } catch (error) {
    console.error('Error checking share permissions:', error);
    return false;
  }
}

// Helper function to generate secure share link
function generateShareToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

// POST /api/sharing/send-internal - Send recommendation to friend
router.post('/send-internal', authenticate, shareRateLimit, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { receiverId, entityType, entityId, message } = req.body;

    // Validate input
    const validation = insertSharedRecommendationSchema.safeParse({
      senderId: userId,
      receiverId,
      entityType,
      entityId: entityId.toString(),
      shareType: 'internal',
      message,
    });

    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    // Check if sender can share to receiver (NFR security requirement)
    const canShare = await canUserShareToReceiver(userId, receiverId);
    if (!canShare) {
      return res.status(403).json({ 
        error: 'You can only share to users you follow or share circles with'
      });
    }

    // Check if entity exists and is shareable
    if (entityType === 'list') {
      const list = await db
        .select()
        .from(restaurantLists)
        .where(eq(restaurantLists.id, parseInt(entityId)))
        .limit(1);

      if (list.length === 0) {
        return res.status(404).json({ error: 'List not found' });
      }

      // Only public lists or lists owned by sender can be shared
      if (!list[0].isPublic && list[0].createdById !== userId) {
        return res.status(403).json({ error: 'Cannot share private lists you don\'t own' });
      }
    }

    // Create share record (NFR: must complete within 500ms)
    const shareRecord = await db
      .insert(sharedRecommendations)
      .values({
        senderId: userId,
        receiverId,
        entityType,
        entityId: entityId.toString(),
        shareType: 'internal',
        message: message || null,
      })
      .returning();

    const responseTime = Date.now() - startTime;
    console.log(`✅ Internal share created in ${responseTime}ms`);

    // NFR: Response time must be < 2 seconds
    res.json({
      success: true,
      shareId: shareRecord[0].id,
      message: 'Successfully sent to friend',
      responseTime: responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Error creating internal share:', error);
    console.log(`❌ Internal share failed in ${responseTime}ms`);
    
    res.status(500).json({ 
      error: 'Failed to send recommendation',
      responseTime: responseTime
    });
  }
});

// GET /api/sharing/received - Get received recommendations (paginated)
router.get('/received', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 20); // NFR: max 20 items
    const offset = (page - 1) * limit;

    // Get received shares with sender info
    const shares = await db
      .select({
        id: sharedRecommendations.id,
        entityType: sharedRecommendations.entityType,
        entityId: sharedRecommendations.entityId,
        message: sharedRecommendations.message,
        read: sharedRecommendations.read,
        createdAt: sharedRecommendations.createdAt,
        senderName: users.name,
        senderUsername: users.username,
        senderAvatar: users.profilePicture,
      })
      .from(sharedRecommendations)
      .innerJoin(users, eq(sharedRecommendations.senderId, users.id))
      .where(eq(sharedRecommendations.receiverId, userId))
      .orderBy(desc(sharedRecommendations.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(sharedRecommendations)
      .where(eq(sharedRecommendations.receiverId, userId));

    const responseTime = Date.now() - startTime;
    console.log(`✅ Received shares fetched in ${responseTime}ms`);

    // NFR: Response time must be < 1 second
    res.json({
      items: shares,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        hasMore: offset + shares.length < totalResult.count
      },
      responseTime: responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Error fetching received shares:', error);
    
    res.status(500).json({ 
      error: 'Failed to fetch recommendations',
      responseTime: responseTime
    });
  }
});

// PATCH /api/sharing/:id/mark-read - Mark share as read
router.patch('/:id/mark-read', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const shareId = parseInt(req.params.id);

    // Verify user owns this received share
    const share = await db
      .select()
      .from(sharedRecommendations)
      .where(and(
        eq(sharedRecommendations.id, shareId),
        eq(sharedRecommendations.receiverId, userId)
      ))
      .limit(1);

    if (share.length === 0) {
      return res.status(404).json({ error: 'Share not found or not yours' });
    }

    // Mark as read
    await db
      .update(sharedRecommendations)
      .set({ read: true })
      .where(eq(sharedRecommendations.id, shareId));

    const responseTime = Date.now() - startTime;
    console.log(`✅ Share marked read in ${responseTime}ms`);

    // NFR: Response time must be < 500ms
    res.json({
      success: true,
      message: 'Marked as read',
      responseTime: responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Error marking share as read:', error);
    
    res.status(500).json({ 
      error: 'Failed to mark as read',
      responseTime: responseTime
    });
  }
});

// POST /api/sharing/generate-public-link - Generate shareable public link
router.post('/generate-public-link', authenticate, linkGenerationRateLimit, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { entityType, entityId } = req.body;

    // Validate input
    if (!entityType || !entityId || !['restaurant', 'list'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type or ID' });
    }

    // Check if entity exists and is public (NFR: privacy enforcement)
    if (entityType === 'list') {
      const list = await db
        .select()
        .from(restaurantLists)
        .where(eq(restaurantLists.id, parseInt(entityId)))
        .limit(1);

      if (list.length === 0) {
        return res.status(404).json({ error: 'List not found' });
      }

      if (!list[0].isPublic) {
        return res.status(403).json({ error: 'Only public lists can be shared externally' });
      }
    }

    // Generate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create external share record
    const shareRecord = await db
      .insert(sharedRecommendations)
      .values({
        senderId: userId,
        receiverId: null, // External shares don't have specific receivers
        entityType,
        entityId: entityId.toString(),
        shareType: 'external',
        expiresAt,
      })
      .returning();

    // Generate secure share link
    const shareToken = generateShareToken();
    const shareUrl = `${req.protocol}://${req.get('host')}/shared/${shareRecord[0].id}/${shareToken}`;

    const responseTime = Date.now() - startTime;
    console.log(`✅ Public link generated in ${responseTime}ms`);

    // NFR: Link generation must complete within 1 second
    res.json({
      success: true,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
      message: 'Share link generated successfully',
      responseTime: responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Error generating public link:', error);
    
    res.status(500).json({ 
      error: 'Failed to generate share link',
      responseTime: responseTime
    });
  }
});

// GET /api/sharing/search-users - Search for users to share with (cached for 5 minutes)
router.get('/search-users', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const query = (req.query.q as string)?.trim();

    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    // Get users that the current user follows or shares circles with
    const followedUsers = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        profilePicture: users.profilePicture,
      })
      .from(users)
      .innerJoin(userFollowers, eq(users.id, userFollowers.followingId))
      .where(eq(userFollowers.followerId, userId))
      .limit(50); // NFR: max 50 results for performance

    // Also get users from shared circles
    const circleUsers = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        profilePicture: users.profilePicture,
      })
      .from(users)
      .innerJoin(circleMembers, eq(users.id, circleMembers.userId))
      .where(
        inArray(
          circleMembers.circleId,
          // Subquery to get user's circle IDs
          db.select({ circleId: circleMembers.circleId })
            .from(circleMembers)
            .where(eq(circleMembers.userId, userId))
        )
      )
      .limit(50);

    // Combine and deduplicate results
    const allUsers = [...followedUsers, ...circleUsers];
    const uniqueUsers = allUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id) && user.id !== userId
    );

    // Filter by search query
    const filteredUsers = uniqueUsers.filter(user => 
      user.name?.toLowerCase().includes(query.toLowerCase()) ||
      user.username?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 20); // Limit to 20 for UI performance

    const responseTime = Date.now() - startTime;
    console.log(`✅ User search completed in ${responseTime}ms`);

    // NFR: Search must respond within 300ms
    res.json({
      users: filteredUsers,
      responseTime: responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Error searching users:', error);
    
    res.status(500).json({ 
      error: 'Failed to search users',
      responseTime: responseTime
    });
  }
});

export default router;