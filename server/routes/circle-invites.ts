
import { Router } from 'express';
import { authenticate } from '../auth';
import { db } from '../db';
import { circleInvites, circles, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Get pending circle invites for the current user
router.get('/pending', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`[ENDPOINT] Fetching pending circle invites for user ${userId}`);

    const pendingInvites = await db
      .select({
        id: circleInvites.id,
        circleId: circleInvites.circleId,
        circleName: circles.name,
        circleDescription: circles.description,
        inviterName: users.name,
        createdAt: circleInvites.createdAt,
      })
      .from(circleInvites)
      .leftJoin(circles, eq(circleInvites.circleId, circles.id))
      .leftJoin(users, eq(circleInvites.inviterId, users.id))
      .where(
        and(
          eq(circleInvites.inviteeId, userId),
          eq(circleInvites.status, 'pending')
        )
      );

    res.json(pendingInvites);
  } catch (error) {
    console.error('Error fetching pending circle invites:', error);
    res.status(500).json({ error: 'Failed to fetch pending invites' });
  }
});

export default router;
