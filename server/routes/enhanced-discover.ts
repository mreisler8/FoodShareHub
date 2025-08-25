import { Router } from 'express';
import { eq, and, desc, sql, gt, gte, inArray, or, like, ilike } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { 
  posts, 
  restaurantLists as lists, 
  ratings, 
  restaurants, 
  users, 
  userFollowers,
  circleMembers,
  circles
} from '../../shared/schema';

const router = Router();

interface FilterCriteria {
  cuisines: string[];
  occasions: string[];
  dietary: string[];
  features: string[];
  priceRange: [number, number];
  minRating: number;
  sortBy: string;
  location: { lat: number | null; lng: number | null; radius: number };
  city: string;
}

// Enhanced discover endpoint with Smart Discovery System filtering
router.get('/:tab', authenticate, async (req, res) => {
  try {
    const { tab } = req.params;
    const userId = req.user?.id;
    const { 
      limit = 20, 
      offset = 0, 
      lat, 
      lng, 
      radius = 10000,
      cuisines,
      occasions,
      dietary,
      features,
      priceMin,
      priceMax,
      minRating,
      sortBy = 'relevance',
      city
    } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Parse filter arrays
    const cuisineFilters = cuisines ? (cuisines as string).split(',').map(c => c.trim()) : [];
    const occasionFilters = occasions ? (occasions as string).split(',').map(o => o.trim()) : [];
    const dietaryFilters = dietary ? (dietary as string).split(',').map(d => d.trim()) : [];
    const featureFilters = features ? (features as string).split(',').map(f => f.trim()) : [];

    const filters: FilterCriteria = {
      cuisines: cuisineFilters,
      occasions: occasionFilters,
      dietary: dietaryFilters,
      features: featureFilters,
      priceRange: [Number(priceMin) || 1, Number(priceMax) || 4],
      minRating: Number(minRating) || 0,
      sortBy: sortBy as string,
      location: { lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null, radius: Number(radius) },
      city: city as string || ''
    };

    console.log('🔍 Smart Discovery Filters Applied:', filters);

    let items: any[] = [];

    switch (tab) {
      case 'for-you':
        items = await getPersonalizedDiscovery(userId, filters, Number(limit));
        break;
      case 'trending':
        items = await getTrendingWithFilters(userId, filters, Number(limit));
        break;
      case 'near-you':
        if (!filters.location.lat || !filters.location.lng) {
          return res.status(400).json({ error: 'Location required for near-you tab' });
        }
        items = await getNearbyWithFilters(userId, filters, Number(limit));
        break;
      default:
        return res.status(400).json({ error: 'Invalid tab' });
    }

    // Apply occasion-based filtering
    if (filters.occasions.length > 0) {
      items = applyOccasionFilters(items, filters.occasions);
    }

    // Apply sorting
    items = applySorting(items, filters.sortBy);

    const response = {
      items: items.slice(Number(offset), Number(offset) + Number(limit)),
      hasMore: items.length > Number(offset) + Number(limit),
      totalCount: items.length,
      appliedFilters: filters
    };

    console.log(`✅ Smart Discovery returned ${response.items.length} items for ${tab} tab`);
    res.json(response);

  } catch (error) {
    console.error('Smart Discovery error:', error);
    res.status(500).json({ error: 'Failed to fetch discover content' });
  }
});

// Get personalized discovery content with filtering
async function getPersonalizedDiscovery(userId: number, filters: FilterCriteria, limit: number) {
  console.log(`🎯 Getting personalized discovery for user ${userId}`);
  
  // Get user's network (followers + circle members)
  const followedUsers = await db
    .select({ followingId: userFollowers.followingId })
    .from(userFollowers)
    .where(eq(userFollowers.followerId, userId));

  const followedIds = followedUsers.map(f => f.followingId);

  // Get content from trusted network
  const networkContent = await getNetworkContent(followedIds, filters, limit);
  
  // Get highly rated public content
  const publicContent = await getPublicContent(filters, Math.floor(limit / 2));
  
  // Combine and score
  const allContent = [...networkContent, ...publicContent];
  return scoreAndRankContent(allContent, userId, followedIds);
}

// Get trending content with filters
async function getTrendingWithFilters(userId: number, filters: FilterCriteria, limit: number) {
  console.log(`📈 Getting trending discovery with filters`);
  
  // Get recently popular lists and posts
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

  let listsQuery = db
    .select({
      id: lists.id,
      name: lists.name,
      description: lists.description,
      tags: lists.tags,
      createdAt: lists.createdAt,
      createdById: lists.createdById,
      author: users.name
    })
    .from(lists)
    .innerJoin(users, eq(lists.createdById, users.id))
    .where(and(
      eq(lists.isPublic, true),
      gt(lists.createdAt, recentCutoff)
    ));

  // Apply cuisine filtering to lists
  if (filters.cuisines.length > 0) {
    const cuisineConditions = filters.cuisines.map(cuisine => 
      ilike(lists.tags, `%${cuisine}%`)
    );
    listsQuery = listsQuery.where(and(
      eq(lists.isPublic, true),
      gt(lists.createdAt, recentCutoff),
      or(...cuisineConditions)
    ));
  }

  const trendingLists = await listsQuery.limit(limit);

  return trendingLists.map(list => ({
    id: `list_${list.id}`,
    type: 'list',
    content: {
      id: list.id,
      name: list.name,
      description: list.description,
      tags: list.tags || []
    },
    score: 85, // High trending score
    metadata: {
      author: { id: list.createdById.toString(), name: list.author },
      createdAt: list.createdAt.toISOString(),
      socialProof: 'Trending'
    }
  }));
}

// Get nearby content with filters
async function getNearbyWithFilters(userId: number, filters: FilterCriteria, limit: number) {
  console.log(`📍 Getting nearby discovery at ${filters.location.lat}, ${filters.location.lng}`);
  
  // For now, return location-aware lists and posts
  // In a full implementation, this would use geospatial queries
  const nearbyContent = await db
    .select({
      id: lists.id,
      name: lists.name,
      description: lists.description,
      tags: lists.tags,
      createdAt: lists.createdAt,
      createdById: lists.createdById,
      author: users.name
    })
    .from(lists)
    .innerJoin(users, eq(lists.createdById, users.id))
    .where(eq(lists.isPublic, true))
    .limit(limit);

  return nearbyContent.map(item => ({
    id: `list_${item.id}`,
    type: 'list',
    content: {
      id: item.id,
      name: item.name,
      description: item.description,
      tags: item.tags || []
    },
    score: 75,
    metadata: {
      author: { id: item.createdById.toString(), name: item.author },
      createdAt: item.createdAt.toISOString(),
      socialProof: 'Near you'
    }
  }));
}

// Get content from user's trusted network
async function getNetworkContent(followedIds: number[], filters: FilterCriteria, limit: number) {
  if (followedIds.length === 0) return [];

  const networkLists = await db
    .select({
      id: lists.id,
      name: lists.name,
      description: lists.description,
      tags: lists.tags,
      createdAt: lists.createdAt,
      createdById: lists.createdById,
      author: users.name
    })
    .from(lists)
    .innerJoin(users, eq(lists.createdById, users.id))
    .where(and(
      inArray(lists.createdById, followedIds),
      eq(lists.isPublic, true)
    ))
    .limit(limit);

  return networkLists.map(list => ({
    id: `list_${list.id}`,
    type: 'list',
    content: {
      id: list.id,
      name: list.name,
      description: list.description,
      tags: list.tags || []
    },
    score: 90, // High score for network content
    metadata: {
      author: { id: list.createdById.toString(), name: list.author },
      createdAt: list.createdAt.toISOString(),
      socialProof: 'From your network'
    }
  }));
}

// Get high-quality public content
async function getPublicContent(filters: FilterCriteria, limit: number) {
  const publicLists = await db
    .select({
      id: lists.id,
      name: lists.name,
      description: lists.description,
      tags: lists.tags,
      createdAt: lists.createdAt,
      createdById: lists.createdById,
      author: users.name
    })
    .from(lists)
    .innerJoin(users, eq(lists.createdById, users.id))
    .where(eq(lists.isPublic, true))
    .orderBy(desc(lists.createdAt))
    .limit(limit);

  return publicLists.map(list => ({
    id: `list_${list.id}`,
    type: 'list',
    content: {
      id: list.id,
      name: list.name,
      description: list.description,
      tags: list.tags || []
    },
    score: 60,
    metadata: {
      author: { id: list.createdById.toString(), name: list.author },
      createdAt: list.createdAt.toISOString(),
      socialProof: 'Popular'
    }
  }));
}

// Apply occasion-based filtering
function applyOccasionFilters(items: any[], occasions: string[]): any[] {
  if (occasions.length === 0) return items;

  return items.filter(item => {
    const tags = item.content.tags || [];
    const name = item.content.name?.toLowerCase() || '';
    const description = item.content.description?.toLowerCase() || '';
    
    return occasions.some(occasion => {
      // Map occasions to searchable terms
      const occasionTerms = getOccasionTerms(occasion);
      return occasionTerms.some(term => 
        tags.some((tag: string) => tag.toLowerCase().includes(term)) ||
        name.includes(term) ||
        description.includes(term)
      );
    });
  });
}

// Get searchable terms for occasions
function getOccasionTerms(occasion: string): string[] {
  const occasionMap: Record<string, string[]> = {
    'date-night': ['date', 'romantic', 'intimate', 'couples'],
    'family-friendly': ['family', 'kids', 'children', 'family-friendly'],
    'celebration': ['celebration', 'special', 'birthday', 'anniversary'],
    'quick-bite': ['quick', 'fast', 'casual', 'grab'],
    'business-lunch': ['business', 'professional', 'meeting', 'work'],
    'brunch': ['brunch', 'breakfast', 'morning'],
    'group-dining': ['group', 'large', 'party', 'gathering'],
    'late-night': ['late', 'night', 'after-hours']
  };

  return occasionMap[occasion] || [occasion];
}

// Score and rank content based on user preferences
function scoreAndRankContent(items: any[], userId: number, followedIds: number[]): any[] {
  return items
    .map(item => {
      let score = item.score;
      
      // Boost score for network content
      if (followedIds.includes(parseInt(item.metadata.author.id))) {
        score += 20;
      }
      
      // Boost recent content
      const daysSinceCreated = (Date.now() - new Date(item.metadata.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated <= 3) score += 15;
      else if (daysSinceCreated <= 7) score += 10;
      
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);
}

// Apply sorting based on user preference
function applySorting(items: any[], sortBy: string): any[] {
  switch (sortBy) {
    case 'rating':
      return items.sort((a, b) => (b.content.avgRating || 0) - (a.content.avgRating || 0));
    case 'distance':
      // Would need location data to implement
      return items;
    case 'popularity':
      return items.sort((a, b) => (b.content.saveCount || 0) - (a.content.saveCount || 0));
    case 'recent':
      return items.sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());
    case 'relevance':
    default:
      return items.sort((a, b) => b.score - a.score);
  }
}

// Add trending occasions endpoint
router.get('/trending-occasions', authenticate, async (req, res) => {
  try {
    const trendingOccasions = [
      { id: 'date-night', label: 'Date Night', count: 45, trending: true },
      { id: 'family-dinner', label: 'Family Dinner', count: 38, trending: false },
      { id: 'celebration', label: 'Celebration', count: 52, trending: true },
      { id: 'business-lunch', label: 'Business Lunch', count: 29, trending: false },
      { id: 'weekend-brunch', label: 'Weekend Brunch', count: 41, trending: true }
    ];

    res.json(trendingOccasions);
  } catch (error) {
    console.error('Error fetching trending occasions:', error);
    res.status(500).json({ error: 'Failed to fetch trending occasions' });
  }
});

// Add audience preview endpoint for VisibilitySelector
router.post('/audience-preview', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { visibility, selectedCircles } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's network stats
    const followers = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollowers)
      .where(eq(userFollowers.followingId, userId));

    const circleMembers = selectedCircles?.length > 0 ? await db
      .select({ count: sql<number>`count(*)` })
      .from(circleMembers)
      .where(inArray(circleMembers.circleId, selectedCircles)) : [{ count: 0 }];

    const estimatedReach = visibility === 'public' ? 500 : 
                          visibility === 'followers' ? followers[0]?.count || 0 :
                          circleMembers[0]?.count || 0;

    const audiencePreview = {
      estimatedReach,
      audienceBreakdown: {
        circles: visibility === 'circle-only' ? circleMembers[0]?.count || 0 : 0,
        followers: visibility === 'followers' ? followers[0]?.count || 0 : 0,
        public: visibility === 'public' ? estimatedReach : 0
      },
      privacyLevel: visibility === 'circle-only' ? 'high' : 
                   visibility === 'followers' ? 'medium' : 'low'
    };

    res.json(audiencePreview);
  } catch (error) {
    console.error('Error generating audience preview:', error);
    res.status(500).json({ error: 'Failed to generate audience preview' });
  }
});

export default router;