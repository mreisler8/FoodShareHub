import { Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/user/privacy - Get user privacy settings
router.get('/privacy', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const [user] = await db
      .select({
        circleScoreOptOut: users.circleScoreOptOut
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      circleScoreOptOut: user.circleScoreOptOut ?? false
    });
  } catch (error) {
    console.error('Failed to fetch user privacy settings:', error);
    res.status(500).json({ error: 'Failed to fetch privacy settings' });
  }
});

// PUT /api/user/privacy - Update user privacy settings
router.put('/privacy', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { circleScoreOptOut } = req.body;

    if (typeof circleScoreOptOut !== 'boolean') {
      return res.status(400).json({ error: 'circleScoreOptOut must be a boolean' });
    }

    await db
      .update(users)
      .set({ 
        circleScoreOptOut,
      })
      .where(eq(users.id, req.user.id));

    res.json({
      success: true,
      circleScoreOptOut
    });
  } catch (error) {
    console.error('Failed to update user privacy settings:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

export default router;