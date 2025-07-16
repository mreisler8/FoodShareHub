import { Router } from 'express';
import { authenticate } from '../auth';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();

const analyticsEventSchema = z.object({
  event: z.string(),
  data: z.record(z.any()).optional(),
});

// Track analytics event
router.post('/track', authenticate, async (req, res) => {
  try {
    const { event, data } = analyticsEventSchema.parse(req.body);
    const userId = req.user!.id;
    
    // Store analytics event in database
    await storage.createSearchAnalytics({
      userId,
      query: event,
      source: 'post_type_analytics',
      metadata: JSON.stringify({ event, data }),
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    res.status(500).json({ error: 'Failed to track analytics' });
  }
});

export default router;