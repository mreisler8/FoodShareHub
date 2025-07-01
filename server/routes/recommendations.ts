// server/routes/recommendations.ts
import { Router } from 'express';
import { db } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET all recommendations for a circle
router.get('/:circleId', authenticate, async (req, res) => {
  const { circleId } = req.params;
  const recs = await db
    .select()
    .from(db.recommendations)
    .where(db.recommendations.circleId.eq(Number(circleId)));
  res.json(recs);
});

// POST a new recommendation
router.post('/', authenticate, async (req, res) => {
  const { circleId, restaurantId } = req.body;
  const userId = req.user.id;
  const [rec] = await db
    .insert(db.recommendations)
    .values({ circleId, restaurantId, userId })
    .returning();
  res.json(rec);
});

// DELETE your own recommendation
router.delete('/:id', authenticate, async (req, res) => {
  const recId = Number(req.params.id);
  await db
    .delete(db.recommendations)
    .where(
      db.recommendations.id
        .eq(recId)
        .and(db.recommendations.userId.eq(req.user.id))
    );
  res.sendStatus(204);
});

export default router;
