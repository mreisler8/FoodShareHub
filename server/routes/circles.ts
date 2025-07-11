import { Request, Response, Router } from 'express';
import { eq, and, or } from 'drizzle-orm';
import { db } from '../db';
import { circles, circleMembers, circleInvites, users, circleSharedLists, restaurantLists } from '../../shared/schema';
import { insertCircleInviteSchema, insertCircleSharedListSchema } from '../../shared/schema';
import { z } from 'zod';
import { authenticate } from '../auth';

const router = Router();

// Get all circles (basic endpoint)
router.get('/', authenticate, async (req, res) => {
  try {
    const allCircles = await db.select().from(circles);
    res.json(allCircles);
  } catch (error) {
    console.error('Error fetching circles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's circles
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userCircles = await db
      .select({
        id: circles.id,
        name: circles.name,
        description: circles.description,
        primaryCuisine: circles.primaryCuisine,
        priceRange: circles.priceRange,
        location: circles.location,
        memberCount: circles.memberCount,
        featured: circles.featured,
        trending: circles.trending,
        role: circleMembers.role,
        joinedAt: circleMembers.joinedAt
      })
      .from(circleMembers)
      .leftJoin(circles, eq(circleMembers.circleId, circles.id))
      .where(eq(circleMembers.userId, userId));
    
    res.json(userCircles);
  } catch (error) {
    console.error('Error fetching user circles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new circle
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name, description, primaryCuisine, priceRange, location, allowPublicJoin } = req.body;

    // Create circle
    const [circle] = await db
      .insert(circles)
      .values({
        name,
        description,
        primaryCuisine: primaryCuisine || null,
        priceRange: priceRange || null,
        location: location || null,
        allowPublicJoin: allowPublicJoin || false,
        memberCount: 1,
        featured: false,
        trending: false,
        inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase()
      })
      .returning();

    // Add creator as owner
    await db
      .insert(circleMembers)
      .values({
        circleId: circle.id,
        userId: userId,
        role: 'owner',
        joinedAt: new Date()
      });

    res.status(201).json(circle);
  } catch (error) {
    console.error('Error creating circle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create circle invite
export async function createCircleInvite(req: Request, res: Response) {
  try {
    const { circleId } = req.params;
    const { emailOrUsername } = req.body;
    const inviterId = req.user!.id;

    // Validate input
    const validateData = insertCircleInviteSchema.parse({
      circleId: parseInt(circleId),
      emailOrUsername,
      inviterId,
      status: 'pending'
    });

    // Check if user is circle owner/admin
    const membership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, parseInt(circleId)),
          eq(circleMembers.userId, inviterId),
          or(
            eq(circleMembers.role, 'owner'),
            eq(circleMembers.role, 'admin')
          )
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Only circle owners and admins can send invites' });
    }

    // Check if invite already exists
    const existingInvite = await db
      .select()
      .from(circleInvites)
      .where(
        and(
          eq(circleInvites.circleId, parseInt(circleId)),
          eq(circleInvites.emailOrUsername, emailOrUsername),
          eq(circleInvites.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvite.length > 0) {
      return res.status(409).json({ error: 'Invite already exists' });
    }

    // Create invite
    const [invite] = await db
      .insert(circleInvites)
      .values(validateData)
      .returning();

    res.status(201).json(invite);
  } catch (error) {
    console.error('Error creating circle invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get circle invites (for circle owners/admins)
export async function getCircleInvites(req: Request, res: Response) {
  try {
    const { circleId } = req.params;
    const userId = req.user!.id;

    // Check if user is circle owner/admin
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
      return res.status(403).json({ error: 'Only circle owners and admins can view invites' });
    }

    // Get all invites for this circle
    const invites = await db
      .select({
        id: circleInvites.id,
        emailOrUsername: circleInvites.emailOrUsername,
        status: circleInvites.status,
        createdAt: circleInvites.createdAt,
        inviter: {
          id: users.id,
          name: users.name,
          username: users.username
        }
      })
      .from(circleInvites)
      .leftJoin(users, eq(circleInvites.inviterId, users.id))
      .where(eq(circleInvites.circleId, parseInt(circleId)));

    res.json(invites);
  } catch (error) {
    console.error('Error fetching circle invites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Respond to circle invite (accept/decline)
export async function respondToCircleInvite(req: Request, res: Response) {
  try {
    const { inviteId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const userId = req.user!.id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use "accept" or "decline"' });
    }

    // Get the invite
    const invite = await db
      .select()
      .from(circleInvites)
      .where(eq(circleInvites.id, parseInt(inviteId)))
      .limit(1);

    if (invite.length === 0) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite[0].status !== 'pending') {
      return res.status(400).json({ error: 'Invite already responded to' });
    }

    // Check if the invite is for this user (by email or username)
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userInfo = user[0];
    const isForUser = invite[0].emailOrUsername === userInfo.email || 
                     invite[0].emailOrUsername === userInfo.username;

    if (!isForUser) {
      return res.status(403).json({ error: 'This invite is not for you' });
    }

    // Update invite status
    await db
      .update(circleInvites)
      .set({ status: action === 'accept' ? 'accepted' : 'declined' })
      .where(eq(circleInvites.id, parseInt(inviteId)));

    // If accepted, add user to circle
    if (action === 'accept') {
      // Check if user is already a member
      const existingMembership = await db
        .select()
        .from(circleMembers)
        .where(
          and(
            eq(circleMembers.circleId, invite[0].circleId),
            eq(circleMembers.userId, userId)
          )
        )
        .limit(1);

      if (existingMembership.length === 0) {
        await db
          .insert(circleMembers)
          .values({
            circleId: invite[0].circleId,
            userId: userId,
            role: 'member',
            invitedBy: invite[0].inviterId
          });
      }
    }

    res.json({ message: `Invite ${action}ed successfully` });
  } catch (error) {
    console.error('Error responding to circle invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get pending invites for current user
export async function getUserPendingInvites(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    // Get user info
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userInfo = user[0];

    // Get pending invites for this user (by email or username)
    const invites = await db
      .select({
        id: circleInvites.id,
        circleId: circleInvites.circleId,
        createdAt: circleInvites.createdAt,
        circle: {
          id: circles.id,
          name: circles.name,
          description: circles.description
        },
        inviter: {
          id: users.id,
          name: users.name,
          username: users.username
        }
      })
      .from(circleInvites)
      .leftJoin(circles, eq(circleInvites.circleId, circles.id))
      .leftJoin(users, eq(circleInvites.inviterId, users.id))
      .where(
        and(
          or(
            eq(circleInvites.emailOrUsername, userInfo.username),
            eq(circleInvites.emailOrUsername, userInfo.username) // Assuming email is stored in username field
          ),
          eq(circleInvites.status, 'pending')
        )
      );

    res.json(invites);
  } catch (error) {
    console.error('Error fetching user pending invites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Revoke circle invite
export async function revokeCircleInvite(req: Request, res: Response) {
  try {
    const { inviteId } = req.params;
    const userId = req.user!.id;

    // Get the invite
    const invite = await db
      .select()
      .from(circleInvites)
      .where(eq(circleInvites.id, parseInt(inviteId)))
      .limit(1);

    if (invite.length === 0) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Check if user is circle owner/admin
    const membership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, invite[0].circleId),
          eq(circleMembers.userId, userId),
          or(
            eq(circleMembers.role, 'owner'),
            eq(circleMembers.role, 'admin')
          )
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Only circle owners and admins can revoke invites' });
    }

    // Delete the invite
    await db
      .delete(circleInvites)
      .where(eq(circleInvites.id, parseInt(inviteId)));

    res.json({ message: 'Invite revoked successfully' });
  } catch (error) {
    console.error('Error revoking circle invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Add user to circle endpoint
export async function addUserToCircle(req: Request, res: Response) {
  try {
    const { circleId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user!.id;

    // Validate input
    if (!userId || typeof userId !== 'number') {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    // Check if current user is circle owner/admin
    const membership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, parseInt(circleId)),
          eq(circleMembers.userId, currentUserId),
          or(
            eq(circleMembers.role, 'owner'),
            eq(circleMembers.role, 'admin')
          )
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Only circle owners and admins can add users' });
    }

    // Check if user is already a member
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
      return res.status(409).json({ error: 'User is already a member of this circle' });
    }

    // Add user to circle
    const newMember = await db
      .insert(circleMembers)
      .values({
        circleId: parseInt(circleId),
        userId: userId,
        role: 'member',
        invitedBy: currentUserId
      })
      .returning();

    res.status(201).json(newMember[0]);
  } catch (error) {
    console.error('Error adding user to circle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Share a restaurant list with a circle
export async function shareListWithCircle(req: Request, res: Response) {
  try {
    const { circleId } = req.params;
    const { listId, canEdit = false, canReshare = false } = req.body;
    const userId = req.user!.id;

    // Validate input
    const validateData = insertCircleSharedListSchema.parse({
      circleId: parseInt(circleId),
      listId: parseInt(listId),
      sharedById: userId,
      canEdit,
      canReshare
    });

    // Check if user is a member of the circle
    const membership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, parseInt(circleId)),
          eq(circleMembers.userId, userId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Only circle members can share lists' });
    }

    // Check if user owns the list or has permission to share it
    const list = await db
      .select()
      .from(restaurantLists)
      .where(eq(restaurantLists.id, parseInt(listId)))
      .limit(1);

    if (list.length === 0) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list[0].createdById !== userId) {
      return res.status(403).json({ error: 'Only the list owner can share this list' });
    }

    // Check if list is already shared with this circle
    const existingShare = await db
      .select()
      .from(circleSharedLists)
      .where(
        and(
          eq(circleSharedLists.circleId, parseInt(circleId)),
          eq(circleSharedLists.listId, parseInt(listId))
        )
      )
      .limit(1);

    if (existingShare.length > 0) {
      return res.status(409).json({ error: 'List is already shared with this circle' });
    }

    // Create the shared list entry
    const [sharedList] = await db
      .insert(circleSharedLists)
      .values(validateData)
      .returning();

    res.status(201).json(sharedList);
  } catch (error) {
    console.error('Error sharing list with circle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Remove a shared list from a circle
export async function removeSharedListFromCircle(req: Request, res: Response) {
  try {
    const { circleId, listId } = req.params;
    const userId = req.user!.id;

    // Check if user is circle owner/admin or the one who shared the list
    const sharedList = await db
      .select()
      .from(circleSharedLists)
      .where(
        and(
          eq(circleSharedLists.circleId, parseInt(circleId)),
          eq(circleSharedLists.listId, parseInt(listId))
        )
      )
      .limit(1);

    if (sharedList.length === 0) {
      return res.status(404).json({ error: 'Shared list not found' });
    }

    // Check if user has permission to remove (owner, admin, or sharer)
    const membership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, parseInt(circleId)),
          eq(circleMembers.userId, userId)
        )
      )
      .limit(1);

    const isOwnerOrAdmin = membership.length > 0 && 
      (membership[0].role === 'owner' || membership[0].role === 'admin');
    const isSharer = sharedList[0].sharedById === userId;

    if (!isOwnerOrAdmin && !isSharer) {
      return res.status(403).json({ error: 'Only circle owners, admins, or the person who shared the list can remove it' });
    }

    // Remove the shared list
    await db
      .delete(circleSharedLists)
      .where(
        and(
          eq(circleSharedLists.circleId, parseInt(circleId)),
          eq(circleSharedLists.listId, parseInt(listId))
        )
      );

    res.json({ message: 'List removed from circle successfully' });
  } catch (error) {
    console.error('Error removing shared list from circle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get shared lists for a circle
export async function getCircleSharedLists(req: Request, res: Response) {
  try {
    const { circleId } = req.params;
    const userId = req.user!.id;

    // Check if user is a member of the circle
    const membership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, parseInt(circleId)),
          eq(circleMembers.userId, userId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Only circle members can view shared lists' });
    }

    // Get all shared lists for this circle
    const sharedLists = await db
      .select({
        id: circleSharedLists.id,
        listId: circleSharedLists.listId,
        sharedAt: circleSharedLists.sharedAt,
        canEdit: circleSharedLists.canEdit,
        canReshare: circleSharedLists.canReshare,
        list: {
          id: restaurantLists.id,
          name: restaurantLists.name,
          description: restaurantLists.description,
          createdById: restaurantLists.createdById,
          viewCount: restaurantLists.viewCount,
          createdAt: restaurantLists.createdAt
        },
        sharedBy: {
          id: users.id,
          name: users.name,
          username: users.username
        }
      })
      .from(circleSharedLists)
      .leftJoin(restaurantLists, eq(circleSharedLists.listId, restaurantLists.id))
      .leftJoin(users, eq(circleSharedLists.sharedById, users.id))
      .where(eq(circleSharedLists.circleId, parseInt(circleId)))
      .orderBy(circleSharedLists.sharedAt);

    res.json(sharedLists);
  } catch (error) {
    console.error('Error fetching circle shared lists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get circle members
router.get('/:circleId/members', authenticate, async (req, res) => {
  try {
    const { circleId } = req.params;
    const userId = req.user!.id;

    // Check if user is a member of the circle
    const membership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, parseInt(circleId)),
          eq(circleMembers.userId, userId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Only circle members can view members' });
    }

    // Get all members for this circle
    const members = await db
      .select({
        id: circleMembers.id,
        userId: circleMembers.userId,
        role: circleMembers.role,
        joinedAt: circleMembers.joinedAt,
        user: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
          bio: users.bio
        }
      })
      .from(circleMembers)
      .leftJoin(users, eq(circleMembers.userId, users.id))
      .where(eq(circleMembers.circleId, parseInt(circleId)))
      .orderBy(circleMembers.joinedAt);

    res.json(members);
  } catch (error) {
    console.error('Error fetching circle members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get circle details
router.get('/:circleId', authenticate, async (req, res) => {
  try {
    const { circleId } = req.params;
    const userId = req.user!.id;

    // Check if user is a member of the circle
    const membership = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, parseInt(circleId)),
          eq(circleMembers.userId, userId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Only circle members can view circle details' });
    }

    // Get circle details
    const circle = await db
      .select()
      .from(circles)
      .where(eq(circles.id, parseInt(circleId)))
      .limit(1);

    if (circle.length === 0) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    // Add user's role to the circle data
    const circleWithRole = {
      ...circle[0],
      role: membership[0].role
    };

    res.json(circleWithRole);
  } catch (error) {
    console.error('Error fetching circle details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route handlers
router.post('/invite', authenticate, createCircleInvite);
router.get('/invites', authenticate, getCircleInvites);
router.post('/invites/:inviteId/respond', authenticate, respondToCircleInvite);
router.get('/pending-invites', authenticate, getUserPendingInvites);
router.delete('/invites/:inviteId', authenticate, revokeCircleInvite);
router.post('/:circleId/members', authenticate, addUserToCircle);
router.post('/:circleId/share-list', authenticate, shareListWithCircle);
router.delete('/:circleId/shared-lists/:sharedListId', authenticate, removeSharedListFromCircle);
router.get('/:circleId/shared-lists', authenticate, getCircleSharedLists);

export { router };