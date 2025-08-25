import { Router } from 'express';
import { authenticate } from '../auth';

const router = Router();

interface DiscoverItem {
  id: string;
  type: 'list' | 'rating' | 'post' | 'restaurant';
  content: any;
  score: number;
  metadata: {
    author: {
      id: string;
      name: string;
      avatar?: string;
    };
    createdAt: string;
    socialProof?: string;
  };
}

// For You feed - personalized content
router.get('/for-you', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`🎯 Discover For You feed requested by user ${userId}, limit: ${limit}, offset: ${offset}`);

    // Return test data for now to verify API works
    const testItems: DiscoverItem[] = [
      {
        id: 'test_list_1',
        type: 'list',
        content: {
          id: 1,
          name: 'Best Pizza in SF',
          description: 'My favorite pizza spots around the city',
          itemCount: 8,
          savedCount: 12,
          isPublic: true
        },
        score: 95,
        metadata: {
          author: {
            id: '3',
            name: 'Casey P',
            avatar: undefined
          },
          createdAt: new Date().toISOString(),
          socialProof: 'From someone you follow'
        }
      },
      {
        id: 'test_rating_1',
        type: 'rating',
        content: {
          id: 1,
          rating: 5,
          notes: 'Incredible pasta! The truffle oil really makes it special.',
          tags: ['Italian', 'Date Night'],
          restaurantName: 'Tony\'s Little Star Pizza'
        },
        score: 90,
        metadata: {
          author: {
            id: '4',
            name: 'Jason Bloom',
            avatar: undefined
          },
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          socialProof: 'From someone you follow'
        }
      }
    ];

    const response = {
      items: testItems.slice(offset, offset + limit),
      hasMore: false,
      total: testItems.length
    };

    console.log(`✅ Returning ${response.items.length} items for For You feed`);
    res.json(response);

  } catch (error) {
    console.error('Error fetching For You feed:', error);
    res.status(500).json({ error: 'Failed to fetch For You feed' });
  }
});

// Trending feed - popular content
router.get('/trending', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const testItems: DiscoverItem[] = [
      {
        id: 'trending_list_1',
        type: 'list',
        content: {
          id: 2,
          name: 'Hidden Gems 2025',
          description: 'Amazing spots you probably haven\'t heard of',
          itemCount: 15,
          savedCount: 45,
          isPublic: true
        },
        score: 100,
        metadata: {
          author: {
            id: '5',
            name: 'Rachael Reisler'
          },
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      }
    ];

    const response = {
      items: testItems.slice(offset, offset + limit),
      hasMore: false,
      total: testItems.length
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching Trending feed:', error);
    res.status(500).json({ error: 'Failed to fetch Trending feed' });
  }
});

// Near You feed - location-based content
router.get('/near-you', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const testItems: DiscoverItem[] = [
      {
        id: 'nearby_restaurant_1',
        type: 'restaurant',
        content: {
          id: 1,
          name: 'Local Bistro',
          description: 'Cozy neighborhood spot with great wine',
          cuisine: 'French',
          rating: 4.8,
          distance: '0.3 miles'
        },
        score: 85,
        metadata: {
          author: {
            id: 'system',
            name: 'Circles'
          },
          createdAt: new Date().toISOString()
        }
      }
    ];

    const response = {
      items: testItems.slice(offset, offset + limit),
      hasMore: false,
      total: testItems.length
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching Near You feed:', error);
    res.status(500).json({ error: 'Failed to fetch Near You feed' });
  }
});

export default router;