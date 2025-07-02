
// server/routes/recommendations.ts
import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { authenticate } from '../auth.js';
import { recommendations } from '../../shared/schema';

const router = Router();

// GET all recommendations for a circle
router.get('/:circleId', authenticate, async (req, res) => {
  const { circleId } = req.params;
  const recs = await db
    .select()
    .from(recommendations)
    .where(eq(recommendations.circleId, Number(circleId)));
  res.json(recs);
});

// POST a new recommendation
router.post('/', authenticate, async (req, res) => {
  const { circleId, restaurantId } = req.body;
  const userId = req.user.id;
  const [rec] = await db
    .insert(recommendations)
    .values({ circleId, restaurantId, userId })
    .returning();
  res.json(rec);
});

// DELETE your own recommendation
router.delete('/:id', authenticate, async (req, res) => {
  const recId = Number(req.params.id);
  await db
    .delete(recommendations)
    .where(
      and(
        eq(recommendations.id, recId),
        eq(recommendations.userId, req.user!.id)
      )
    );
  res.sendStatus(204);
});

export default router;
