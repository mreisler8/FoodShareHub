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
router.post('/track', async (req, res) => {
  try {
    const origin = req.headers.origin;
    const host = req.headers.host;
    const allowedOrigins = [
      'http://localhost:5000',
      'https://localhost:5000',
      'http://127.0.0.1:5000',
      'https://127.0.0.1:5000'
    ];

    console.log('POST Request: /api/analytics/track');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Session exists:', !!req.session);
    console.log('SessionID:', req.sessionID);

    // Allow requests from the same host (Replit domain)
    if (origin && !allowedOrigins.includes(origin) && !origin.includes(host)) {
      console.log('Rejected request from unauthorized origin:', origin);
      return res.status(403).json({ error: 'Unauthorized origin' });
    }

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