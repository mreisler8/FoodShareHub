import { Router, Request, Response } from 'express';
import { db } from '../db';
import { circleMembers, circles, users, circleInvites } from '@shared/schema';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import { authenticate } from '../auth';

const router = Router();

// GET /api/circles/:circleId/requests - Get pending requests for a specific circle
router.get('/:circleId/requests', authenticate, async (req: Request, res: Response) => {
  try {
    const { circleId } = req.params;
    const userId = req.user!.id;

    // Check if user is owner/admin of the circle
    const membership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, parseInt(circleId)),
          eq(circleMembers.userId, userId),
          or(
            eq(circleMembers.role, 'owner'),
            eq(circleMembers.role, 'admin')
          )
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Not authorized to view requests' });
    }

    // Get pending member requests
    const requests = await db
      .select({
        id: circleMembers.id,
        circleId: circleMembers.circleId,
        userId: circleMembers.userId,
        status: circleMembers.status,
        requestedAt: circleMembers.joinedAt,
        user: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
          bio: users.bio,
        }
      })
      .from(circleMembers)
      .innerJoin(users, eq(circleMembers.userId, users.id))
      .where(
        and(
          eq(circleMembers.circleId, parseInt(circleId)),
          eq(circleMembers.status, 'pending')
        )
      )
      .orderBy(desc(circleMembers.joinedAt));

    res.json(requests);
  } catch (error) {
    console.error('Error fetching circle requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// POST /api/circles/:circleId/request - Request to join a circle
router.post('/:circleId/request', authenticate, async (req: Request, res: Response) => {
  try {
    const { circleId } = req.params;
    const userId = req.user!.id;

    // Check if already a member
    const existingMembership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, parseInt(circleId)),
          eq(circleMembers.userId, userId)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      const status = existingMembership[0].status;
      if (status === 'active') {
        return res.status(400).json({ error: 'Already a member of this circle' });
      } else if (status === 'pending') {
        return res.status(400).json({ error: 'Request already pending' });
      }
    }

    // Create pending membership request
    const [request] = await db
      .insert(circleMembers)
      .values({
        circleId: parseInt(circleId),
        userId,
        role: 'member',
        status: 'pending',
      })
      .returning();

    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating circle request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// GET /api/circles/requests/pending - Get all pending requests for circles user manages
router.get('/requests/pending', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get circles where user is owner/admin
    const managedCircles = await db
      .select({ circleId: circleMembers.circleId })
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.userId, userId),
          or(
            eq(circleMembers.role, 'owner'),
            eq(circleMembers.role, 'admin')
          ),
          eq(circleMembers.status, 'active')
        )
      );

    if (managedCircles.length === 0) {
      return res.json([]);
    }

    const circleIds = managedCircles.map(c => c.circleId);

    // Get pending requests for these circles
    const requests = await db
      .select({
        id: circleMembers.id,
        circleId: circleMembers.circleId,
        userId: circleMembers.userId,
        status: circleMembers.status,
        requestedAt: circleMembers.joinedAt,
        circle: {
          id: circles.id,
          name: circles.name,
          description: circles.description,
        },
        user: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
          bio: users.bio,
        }
      })
      .from(circleMembers)
      .innerJoin(users, eq(circleMembers.userId, users.id))
      .innerJoin(circles, eq(circleMembers.circleId, circles.id))
      .where(
        and(
          inArray(circleMembers.circleId, circleIds),
          eq(circleMembers.status, 'pending')
        )
      )
      .orderBy(desc(circleMembers.joinedAt));

    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// POST /api/circles/requests/:requestId/respond - Approve or reject a member request
router.post('/requests/:requestId/respond', authenticate, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;
    const userId = req.user!.id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Get the request
    const [request] = await db
      .select()
      .from(circleMembers)
      .where(eq(circleMembers.id, parseInt(requestId)));

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if user can manage this circle
    const membership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, request.circleId),
          eq(circleMembers.userId, userId),
          or(
            eq(circleMembers.role, 'owner'),
            eq(circleMembers.role, 'admin')
          ),
          eq(circleMembers.status, 'active')
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Not authorized to manage requests' });
    }

    // Update the request
    if (action === 'approve') {
      await db
        .update(circleMembers)
        .set({
          status: 'active',
          approvedAt: new Date(),
          approvedBy: userId,
        })
        .where(eq(circleMembers.id, parseInt(requestId)));

      // Update circle member count
      await db
        .update(circles)
        .set({
          memberCount: db.sql`member_count + 1`,
        })
        .where(eq(circles.id, request.circleId));
    } else {
      // Reject - delete the request
      await db
        .delete(circleMembers)
        .where(eq(circleMembers.id, parseInt(requestId)));
    }

    res.json({ message: `Request ${action}d successfully` });
  } catch (error) {
    console.error('Error responding to request:', error);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
});

export default router;