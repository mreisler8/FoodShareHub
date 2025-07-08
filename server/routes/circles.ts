import { Request, Response } from 'express';
import { eq, and, or } from 'drizzle-orm';
import { db } from '../db';
import { circles, circleMembers, circleInvites, users } from '../../shared/schema';
import { insertCircleInviteSchema } from '../../shared/schema';
import { z } from 'zod';

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