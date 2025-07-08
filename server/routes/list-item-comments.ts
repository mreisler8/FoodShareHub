import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { listItemComments, restaurantListItems, users } from '@shared/schema';
import { authenticate } from '../auth';

const router = Router();

// Get comments for a specific list item
router.get('/:itemId/comments', authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // First verify the item exists and user has access
    const item = await db.query.restaurantListItems.findFirst({
      where: eq(restaurantListItems.id, parseInt(itemId)),
      with: {
        list: {
          with: {
            circle: {
              with: {
                members: true
              }
            }
          }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'List item not found' });
    }

    // Check access permissions
    const userId = (req.user as any).id;
    const list = item.list;
    
    // User has access if: list is public, user owns the list, or user is in the circle
    const hasAccess = 
      list.makePublic || 
      list.createdById === userId || 
      (list.circle && list.circle.members.some(member => member.userId === userId));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get comments with user info
    const comments = await db.select({
      id: listItemComments.id,
      content: listItemComments.content,
      createdAt: listItemComments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        username: users.username
      }
    })
    .from(listItemComments)
    .leftJoin(users, eq(listItemComments.userId, users.id))
    .where(eq(listItemComments.itemId, parseInt(itemId)))
    .orderBy(desc(listItemComments.createdAt));

    res.json(comments);
  } catch (error) {
    console.error('Error fetching list item comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a comment to a list item
router.post('/:itemId/comments', authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { content } = req.body;
    const userId = (req.user as any).id;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // First verify the item exists and user has access
    const item = await db.query.restaurantListItems.findFirst({
      where: eq(restaurantListItems.id, parseInt(itemId)),
      with: {
        list: {
          with: {
            circle: {
              with: {
                members: true
              }
            }
          }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'List item not found' });
    }

    // Check access permissions
    const list = item.list;
    const hasAccess = 
      list.makePublic || 
      list.createdById === userId || 
      (list.circle && list.circle.members.some(member => member.userId === userId));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Insert the comment
    const [comment] = await db.insert(listItemComments).values({
      itemId: parseInt(itemId),
      userId,
      content: content.trim()
    }).returning();

    // Return the comment with user info
    const commentWithUser = await db.select({
      id: listItemComments.id,
      content: listItemComments.content,
      createdAt: listItemComments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        username: users.username
      }
    })
    .from(listItemComments)
    .leftJoin(users, eq(listItemComments.userId, users.id))
    .where(eq(listItemComments.id, comment.id))
    .limit(1);

    res.status(201).json(commentWithUser[0]);
  } catch (error) {
    console.error('Error adding list item comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;