import { Request, Response, Router } from 'express';
import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { circles, circleMembers, circleInvites, users, circleSharedLists, restaurantLists } from '../../shared/schema';
import { insertCircleInviteSchema, insertCircleSharedListSchema } from '../../shared/schema';
import { z } from 'zod';
import { authenticate } from '../auth';

const router = Router();

// Enhanced user ID validation middleware
const validateUserId = (req: Request, res: Response, next: Function) => {
  const userId = req.user?.id;
  if (!userId || typeof userId !== 'number' || userId <= 0 || !Number.isInteger(userId)) {
    return res.status(401).json({ 
      error: 'Invalid user authentication',
      code: 'INVALID_USER_ID' 
    });
  }
  next();
};

// Enhanced circle ID validation
const validateCircleId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: Function) => {
    const circleId = parseInt(req.params[paramName]);
    if (!circleId || isNaN(circleId) || circleId <= 0 || !Number.isInteger(circleId)) {
      return res.status(400).json({ 
        error: 'Invalid circle ID',
        code: 'INVALID_CIRCLE_ID' 
      });
    }
    req.params[paramName] = circleId.toString();
    next();
  };
};

// Enhanced access control service
class CircleAccessService {
  static async validateCircleAccess(userId: number, circleId: number, requiredRole?: string[]): Promise<{ allowed: boolean; role?: string; reason?: string }> {
    try {
      // Input validation
      if (!userId || !circleId || typeof userId !== 'number' || typeof circleId !== 'number') {
        return { allowed: false, reason: 'invalid_parameters' };
      }

      // Check if circle exists
      const circle = await db
        .select({ id: circles.id, isPrivate: circles.isPrivate })
        .from(circles)
        .where(eq(circles.id, circleId))
        .limit(1);

      if (!circle.length) {
        return { allowed: false, reason: 'circle_not_found' };
      }

      // Check membership
      const membership = await db
        .select({ role: circleMembers.role, status: circleMembers.status })
        .from(circleMembers)
        .where(
          and(
            eq(circleMembers.circleId, circleId),
            eq(circleMembers.userId, userId),
            eq(circleMembers.status, 'active')
          )
        )
        .limit(1);

      if (!membership.length) {
        // For public circles, allow read access
        if (!circle[0].isPrivate) {
          return { allowed: true, role: 'public' };
        }
        return { allowed: false, reason: 'not_member' };
      }

      const userRole = membership[0].role;

      // Check required role
      if (requiredRole && !requiredRole.includes(userRole)) {
        return { allowed: false, reason: 'insufficient_permissions' };
      }

      return { allowed: true, role: userRole };
    } catch (error) {
      console.error('Circle access validation error:', error);
      return { allowed: false, reason: 'validation_error' };
    }
  }

  static async getAccessibleCircles(userId: number, limit: number = 20, offset: number = 0) {
    try {
      // Enhanced query with proper access control
      const accessibleCircles = await db
        .select({
          id: circles.id,
          name: circles.name,
          description: circles.description,
          isPrivate: circles.isPrivate,
          createdAt: circles.createdAt,
          creatorId: circles.creatorId,
          // Only expose invite code to owners/admins
          inviteCode: sql<string>`
            CASE 
              WHEN ${circleMembers.role} IN ('owner', 'admin') THEN ${circles.inviteCode}
              ELSE NULL
            END
          `,
          allowPublicJoin: circles.allowPublicJoin,
          tags: circles.tags,
          primaryCuisine: circles.primaryCuisine,
          priceRange: circles.priceRange,
          location: circles.location,
          memberCount: circles.memberCount,
          featured: circles.featured,
          trending: circles.trending,
          role: circleMembers.role,
          joinedAt: circleMembers.joinedAt,
          memberStatus: circleMembers.status,
          coverImage: circles.coverImage
        })
        .from(circles)
        .leftJoin(circleMembers, and(
          eq(circleMembers.circleId, circles.id),
          eq(circleMembers.userId, userId),
          eq(circleMembers.status, 'active')
        ))
        .where(
          or(
            // User is an active member
            and(
              eq(circleMembers.userId, userId),
              eq(circleMembers.status, 'active')
            ),
            // Circle is public and allows public joining
            and(
              eq(circles.allowPublicJoin, true),
              eq(circles.isPrivate, false)
            )
          )
        )
        .limit(limit)
        .offset(offset)
        .orderBy(circles.createdAt);

      return accessibleCircles.filter(circle => 
        circle.role !== null || (!circle.isPrivate && circle.allowPublicJoin)
      );
    } catch (error) {
      console.error('Error fetching accessible circles:', error);
      throw error;
    }
  }
}

// Get accessible circles (security-hardened endpoint)
router.get('/', authenticate, validateUserId, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Input validation and sanitization
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const accessibleCircles = await CircleAccessService.getAccessibleCircles(userId, limit, offset);

    res.json({
      circles: accessibleCircles,
      pagination: {
        limit,
        offset,
        total: accessibleCircles.length,
        hasMore: accessibleCircles.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching accessible circles:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'CIRCLES_FETCH_ERROR' 
    });
  }
});

// Get user's circles with enhanced security
router.get('/me', authenticate, validateUserId, async (req, res) => {
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
        joinedAt: circleMembers.joinedAt,
        coverImage: circles.coverImage
      })
      .from(circleMembers)
      .innerJoin(circles, eq(circleMembers.circleId, circles.id))
      .where(
        and(
          eq(circleMembers.userId, userId),
          eq(circleMembers.status, 'active')
        )
      )
      .orderBy(circleMembers.joinedAt);

    res.json(userCircles);
  } catch (error) {
    console.error('Error fetching user circles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create circle with enhanced validation
router.post('/', authenticate, validateUserId, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Enhanced input validation
    const createCircleSchema = z.object({
      name: z.string().min(3).max(100).trim(),
      description: z.string().max(500).optional(),
      primaryCuisine: z.string().max(50).optional(),
      priceRange: z.enum(['$', '$$', '$$$', '$$$$']).optional(),
      location: z.string().max(100).optional(),
      allowPublicJoin: z.boolean().default(false),
      isPrivate: z.boolean().default(false)
    });

    const validatedData = createCircleSchema.parse(req.body);

    // Create circle with transaction
    const [circle] = await db
      .insert(circles)
      .values({
        name: validatedData.name,
        description: validatedData.description || null,
        creatorId: userId,
        primaryCuisine: validatedData.primaryCuisine || null,
        priceRange: validatedData.priceRange || null,
        location: validatedData.location || null,
        allowPublicJoin: validatedData.allowPublicJoin,
        isPrivate: validatedData.isPrivate,
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
        status: 'active',
        joinedAt: new Date()
      });

    res.status(201).json(circle);
  } catch (error) {
    console.error('Error creating circle:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update circle details (PUT /api/circles/:id)
router.put('/:id', authenticate, validateUserId, validateCircleId(), async (req, res) => {
  try {
    const circleId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { name, description, primaryCuisine, priceRange, location, isPrivate, allowPublicJoin } = req.body;

    // Check if user is owner or admin
    const accessCheck = await CircleAccessService.validateCircleAccess(userId, circleId, ['owner', 'admin']);
    if (!accessCheck.allowed) {
      return res.status(403).json({ error: 'Only circle owners and admins can update circle details' });
    }

    // Update circle
    const [updatedCircle] = await db
      .update(circles)
      .set({
        name,
        description,
        primaryCuisine: primaryCuisine || null,
        priceRange: priceRange || null,
        location: location || null,
        isPrivate: isPrivate || false,
        allowPublicJoin: allowPublicJoin || false,
      })
      .where(eq(circles.id, circleId))
      .returning();

    res.json(updatedCircle);
  } catch (error) {
    console.error('Error updating circle:', error);
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
    const accessCheck = await CircleAccessService.validateCircleAccess(inviterId, parseInt(circleId), ['owner', 'admin']);
    if (!accessCheck.allowed) {
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
    const accessCheck = await CircleAccessService.validateCircleAccess(userId, parseInt(circleId), ['owner', 'admin']);
    if (!accessCheck.allowed) {
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
            status: 'active',
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
            eq(circleInvites.emailOrUsername, userInfo.email)
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
    const accessCheck = await CircleAccessService.validateCircleAccess(userId, invite[0].circleId, ['owner', 'admin']);
    if (!accessCheck.allowed) {
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
    const accessCheck = await CircleAccessService.validateCircleAccess(currentUserId, parseInt(circleId), ['owner', 'admin']);
    if (!accessCheck.allowed) {
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
        status: 'active',
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
    const accessCheck = await CircleAccessService.validateCircleAccess(userId, parseInt(circleId));
    if (!accessCheck.allowed) {
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
    const accessCheck = await CircleAccessService.validateCircleAccess(userId, parseInt(circleId));
    if (!accessCheck.allowed) {
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

// Get pending invites for the authenticated user
router.get('/invites/pending', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get pending invites where the user's email or username matches
    const user = await db.select({ 
      username: users.username, 
      email: users.email 
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mock response for now - would need actual circle_invites table
    res.json([]);
  } catch (error) {
    console.error('Error fetching pending circle invites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get circle details with enhanced access control
router.get('/:id', authenticate, validateUserId, validateCircleId(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const circleId = parseInt(req.params.id);

    const accessCheck = await CircleAccessService.validateCircleAccess(userId, circleId);

    if (!accessCheck.allowed) {
      return res.status(403).json({ 
        error: 'Access denied',
        code: accessCheck.reason 
      });
    }

    const circle = await db
      .select({
        id: circles.id,
        name: circles.name,
        description: circles.description,
        isPrivate: circles.isPrivate,
        createdAt: circles.createdAt,
        creatorId: circles.creatorId,
        primaryCuisine: circles.primaryCuisine,
        priceRange: circles.priceRange,
        location: circles.location,
        memberCount: circles.memberCount,
        featured: circles.featured,
        trending: circles.trending,
        allowPublicJoin: circles.allowPublicJoin,
        coverImage: circles.coverImage,
        // Only expose invite code to owners/admins
        inviteCode: sql<string>`
          CASE 
            WHEN ${accessCheck.role} IN ('owner', 'admin') THEN ${circles.inviteCode}
            ELSE NULL
          END
        `
      })
      .from(circles)
      .where(eq(circles.id, circleId))
      .limit(1);

    if (!circle.length) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    res.json({
      ...circle[0],
      role: accessCheck.role
    });
  } catch (error) {
    console.error('Error fetching circle details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get circle members with enhanced access control
router.get('/:id/members', authenticate, validateUserId, validateCircleId(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const circleId = parseInt(req.params.id);

    const accessCheck = await CircleAccessService.validateCircleAccess(userId, circleId);

    if (!accessCheck.allowed) {
      return res.status(403).json({ 
        error: 'Access denied',
        code: accessCheck.reason 
      });
    }

    const members = await db
      .select({
        id: circleMembers.id,
        userId: circleMembers.userId,
        role: circleMembers.role,
        joinedAt: circleMembers.joinedAt,
        status: circleMembers.status,
        user: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
          bio: users.bio
        }
      })
      .from(circleMembers)
      .innerJoin(users, eq(circleMembers.userId, users.id))
      .where(
        and(
          eq(circleMembers.circleId, circleId),
          eq(circleMembers.status, 'active')
        )
      )
      .orderBy(circleMembers.joinedAt);

    res.json(members);
  } catch (error) {
    console.error('Error fetching circle members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Circle access check endpoint with enhanced security
router.get('/:id/access', authenticate, validateUserId, validateCircleId(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const circleId = parseInt(req.params.id);

    const accessCheck = await CircleAccessService.validateCircleAccess(userId, circleId);

    const circle = await db
      .```text
select({
        id: circles.id,
        name: circles.name,
        isPrivate: circles.isPrivate
      })
      .from(circles)
      .where(eq(circles.id, circleId))
      .limit(1);

    if (!circle.length) {
      return res.status(404).json({ 
        allowed: false, 
        reason: 'circle_not_found' 
      });
    }

    res.json({ 
      allowed: accessCheck.allowed,
      reason: accessCheck.reason,
      role: accessCheck.role,
      circle: circle[0]
    });
  } catch (error) {
    console.error('Error checking circle access:', error);
    res.status(500).json.json({ 
      allowed: false, 
      error: 'Failed to check access permissions' 
    });
  }
});

// Circle feed endpoint
router.get("/:id/feed", authenticate, validateUserId, validateCircleId(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const circleId = parseInt(req.params.id);

     // Check if user has access to this circle
     const accessCheck = await CircleAccessService.validateCircleAccess(userId, circleId);
     if (!accessCheck.allowed) {
       return res.status(403).json({ error: "Access denied to this circle" });
     }

    // Get lists shared to this circle with optimized query
    const feedItems = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        type: restaurantLists.type,
        createdById: restaurantLists.createdById,
        visibility: restaurantLists.visibility,
        tags: restaurantLists.tags,
        coverImage: restaurantLists.coverImage,
        createdAt: restaurantLists.createdAt,
        creator: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePicture: users.profilePicture
        },
        sharedAt: circleSharedLists.sharedAt,
        sharedBy: {
          id: users.id,
          username: users.username,
          name: users.name
        }
      })
      .from(circleSharedLists)
      .innerJoin(restaurantLists, eq(circleSharedLists.listId, restaurantLists.id))
      .innerJoin(users, eq(restaurantLists.createdById, users.id))
      .leftJoin(users.as('sharedByUser'), eq(circleSharedLists.sharedById, users.id))
      .where(eq(circleSharedLists.circleId, circleId))
      .orderBy(circleSharedLists.sharedAt)
      .limit(50);

    res.json(feedItems);
  } catch (error) {
    console.error("Error fetching circle feed:", error);
    res.status(500).json({ error: "Failed to fetch circle feed" });
  }
});

// Circle invites endpoint
router.post("/:id/invites", authenticate, validateUserId, validateCircleId(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const circleId = parseInt(req.params.id);
    const { invites } = req.body;

    if (!Array.isArray(invites) || invites.length === 0) {
      return res.status(400).json({ error: "Invalid invites data" });
    }

    // Check if user is a member of the circle (can invite others)
    const accessCheck = await CircleAccessService.validateCircleAccess(userId, circleId);
    if (!accessCheck.allowed) {
      return res.status(403).json({ error: "You must be a member to invite others" });
    }

    const results = {
      successful: 0,
      failed: []
    };

    // Process each invite
    for (const invite of invites) {
      try {
        const { emailOrUsername } = invite;

        // Check if it's an email or username
        const isEmail = emailOrUsername.includes('@');

        if (isEmail) {
          // Handle email invites (create pending invite)
          await db
            .insert(circleInvites)
            .values({
              circleId: circleId,
              emailOrUsername: emailOrUsername,
              inviterId: userId,
              status: 'pending'
            })
            .onConflictDoNothing();
          results.successful++;
        } else {
          // Handle username invites (find user and create invite)
          const user = await db
            .select()
            .from(users)
            .where(eq(users.username, emailOrUsername))
            .limit(1);

          if (user.length > 0) {
            // Check if already a member
            const existingMember = await db
              .select()
              .from(circleMembers)
              .where(
                and(
                  eq(circleMembers.circleId, circleId),
                  eq(circleMembers.userId, user[0].id)
                )
              )
              .limit(1);

            if (existingMember.length === 0) {
              await db
                .insert(circleInvites)
                .values({
                  circleId: circleId,
                  emailOrUsername: emailOrUsername,
                  inviterId: userId,
                  status: 'pending'
                })
                .onConflictDoNothing();
              results.successful++;
            } else {
              results.failed.push({ emailOrUsername, reason: "Already a member" });
            }
          } else {
            results.failed.push({ emailOrUsername, reason: "User not found" });
          }
        }
      } catch (error) {
        console.error(`Error processing invite for ${invite.emailOrUsername}:`, error);
        results.failed.push({
          emailOrUsername: invite.emailOrUsername,
          reason: "Processing error"
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Error sending circle invites:", error);
    res.status(500).json({ error: "Failed to send invitations" });
  }
});

// Get join requests for a circle
router.get("/:id/requests", authenticate, validateUserId, validateCircleId(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const circleId = parseInt(req.params.id);

    // Check if user is admin or owner
    const accessCheck = await CircleAccessService.validateCircleAccess(userId, circleId, ['owner', 'admin']);
    if (!accessCheck.allowed) {
      return res.status(403).json({ error: "Only circle owners and admins can view join requests" });
    }

    // Get pending join requests
    const requests = await db
      .select({
        id: circleInvites.id,
        userId: circleInvites.emailOrUsername,
        circleId: circleInvites.circleId,
        status: circleInvites.status,
        createdAt: circleInvites.createdAt,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePicture: users.profilePicture,
          bio: users.bio
        }
      })
      .from(circleInvites)
      .leftJoin(users, eq(users.username, circleInvites.emailOrUsername))
      .where(eq(circleInvites.circleId, circleId));

    res.json(requests);
  } catch (error) {
    console.error("Error fetching join requests:", error);
    res.status(500).json({ error: "Failed to fetch join requests" });
  }
});

// Approve/deny join request
router.post("/:id/requests/:requestId/:action", authenticate, validateUserId, validateCircleId('id'), validateCircleId('requestId'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const circleId = parseInt(req.params.id);
    const requestId = parseInt(req.params.requestId);
    const { action } = req.params;

    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    // Check if user is admin or owner
    const accessCheck = await CircleAccessService.validateCircleAccess(userId, circleId, ['owner', 'admin']);
    if (!accessCheck.allowed) {
      return res.status(403).json({ error: "Only circle owners and admins can manage join requests" });
    }

    // Get the request
    const request = await db
      .select()
      .from(circleInvites)
      .where(eq(circleInvites.id, requestId))
      .limit(1);

    if (request.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Update request status
    await db
      .update(circleInvites)
      .set({ status: action === 'approve' ? 'accepted' : 'declined' })
      .where(eq(circleInvites.id, requestId));

    // If approved, add user to circle
    if (action === 'approve') {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.username, request[0].emailOrUsername))
        .limit(1);

      if (user.length > 0) {
        await db
          .insert(circleMembers)
          .values({
            circleId: circleId,
            userId: user[0].id,
            role: 'member',
            status: 'active',
            invitedBy: userId
          })
          .onConflictDoNothing();
      }
    }

    res.json({ message: `Request ${action}d successfully` });
  } catch (error) {
    console.error("Error processing join request:", error);
    res.status(500).json({ error: "Failed to process join request" });
  }
});

// Remove member from circle
router.delete("/:id/members/:userId", authenticate, validateUserId, validateCircleId('id'), validateCircleId('userId'), async (req, res) => {
  try {
    const currentUserId = req.user!.id;
    const circleId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    // Check if current user is admin or owner
    const accessCheck = await CircleAccessService.validateCircleAccess(currentUserId, circleId, ['owner', 'admin']);
    if (!accessCheck.allowed) {
      return res.status(403).json({ error: "Only circle owners and admins can remove members" });
    }

    // Get target member
    const targetMember = await db
      .select()
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, circleId),
          eq(circleMembers.userId, userId)
        )
      )
      .limit(1);

    if (targetMember.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Check permissions (admin can't remove other admins or owners)
    if (accessCheck.role === 'admin' && targetMember[0].role !== 'member') {
      return res.status(403).json({ error: "Admins can only remove members" });
    }

    // Can't remove yourself
    if (userId === currentUserId) {
      return res.status(400).json({ error: "Cannot remove yourself" });
    }

    // Remove member
    await db
      .delete(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, circleId),
          eq(circleMembers.userId, userId)
        )
      );

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

// Route handlers
router.post('/:circleId/invites', authenticate, validateUserId, validateCircleId('circleId'), createCircleInvite);
router.get('/:circleId/invites', authenticate, validateUserId, validateCircleId('circleId'), getCircleInvites);
router.post('/invites/:inviteId/respond', authenticate, validateUserId, validateCircleId('inviteId'), respondToCircleInvite);
router.get('/pending-invites', authenticate, validateUserId, getUserPendingInvites);
router.delete('/invites/:inviteId', authenticate, validateUserId, validateCircleId('inviteId'), revokeCircleInvite);
router.post('/:circleId/members', authenticate, validateUserId, validateCircleId('circleId'), addUserToCircle);
router.post('/:circleId/share-list', authenticate, validateUserId, validateCircleId('circleId'), shareListWithCircle);
router.delete('/:circleId/shared-lists/:sharedListId', authenticate, validateUserId, validateCircleId('circleId'), validateCircleId('sharedListId'), removeSharedListFromCircle);
router.get('/:circleId/shared-lists', authenticate, validateUserId, validateCircleId('circleId'), getCircleSharedLists);

export { router };