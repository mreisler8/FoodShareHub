import { Router } from 'express';
import { authenticate } from '../auth';
import { posts, restaurants } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `moment-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Create a food moment
router.post('/', authenticate, upload.array('images', 4), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { caption, privacy, location, restaurantId } = req.body;

    // Validate input - either caption or images required
    if (!caption && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ 
        error: "Either a caption or images are required for food moments" 
      });
    }

    // Handle image uploads
    let imageUrls: string[] = [];
    if (req.files && req.files.length > 0) {
      imageUrls = (req.files as Express.Multer.File[]).map(file => `/uploads/${file.filename}`);
    }

    // Parse location if provided
    let parsedLocation = null;
    if (location) {
      try {
        parsedLocation = JSON.parse(location);
      } catch (e) {
        console.warn('Invalid location JSON:', location);
      }
    }

    // Get or create restaurant if provided
    let finalRestaurantId = null;
    if (restaurantId && restaurantId !== 'null') {
      if (typeof restaurantId === 'string' && restaurantId.startsWith('google_')) {
        // Handle Google Places restaurant
        const googlePlaceId = restaurantId.replace('google_', '');
        
        // Check if restaurant exists
        const existingRestaurant = await db
          .select()
          .from(restaurants)
          .where(eq(restaurants.googlePlaceId, googlePlaceId))
          .limit(1);

        if (existingRestaurant.length > 0) {
          finalRestaurantId = existingRestaurant[0].id;
        } else if (parsedLocation) {
          // Create new restaurant record
          const newRestaurant = await db
            .insert(restaurants)
            .values({
              name: parsedLocation.name || 'Unknown Restaurant',
              location: parsedLocation.vicinity || 'Unknown Location',
              category: 'restaurant',
              priceRange: '$',
              googlePlaceId,
              address: parsedLocation.vicinity || '',
              city: parsedLocation.vicinity || '',
              cuisine: 'Various',
            })
            .returning();
          
          finalRestaurantId = newRestaurant[0].id;
        }
      } else {
        finalRestaurantId = parseInt(restaurantId);
      }
    }

    // Create the moment post
    const newMoment = await db
      .insert(posts)
      .values({
        userId,
        restaurantId: finalRestaurantId,
        content: caption || '',
        rating: 0, // Moments don't require ratings
        postType: 'moment',
        visibility: { 
          public: privacy === 'public', 
          followers: privacy === 'followers', 
          circleIds: [] 
        },
        images: imageUrls,
        tags: [],
        metadata: {
          caption,
          location: parsedLocation,
          privacy,
          imageCount: imageUrls.length
        }
      })
      .returning();

    // Get the complete moment with restaurant and user details
    const momentWithDetails = await db
      .select({
        id: posts.id,
        content: posts.content,
        images: posts.images,
        postType: posts.postType,
        metadata: posts.metadata,
        visibility: posts.visibility,
        createdAt: posts.createdAt,
        userId: posts.userId,
        restaurantId: posts.restaurantId,
        restaurantName: restaurants.name,
        restaurantLocation: restaurants.location,
      })
      .from(posts)
      .leftJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .where(eq(posts.id, newMoment[0].id))
      .limit(1);

    res.status(201).json({
      success: true,
      moment: momentWithDetails[0],
      message: 'Food moment created successfully!'
    });

  } catch (error) {
    console.error('Error creating food moment:', error);
    res.status(500).json({ 
      error: 'Failed to create food moment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get moments feed (recent moments from followed users)
router.get('/feed', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get moments from followed users and own moments
    const moments = await db
      .select({
        id: posts.id,
        content: posts.content,
        images: posts.images,
        postType: posts.postType,
        metadata: posts.metadata,
        visibility: posts.visibility,
        createdAt: posts.createdAt,
        userId: posts.userId,
        restaurantId: posts.restaurantId,
        restaurantName: restaurants.name,
        restaurantLocation: restaurants.location,
      })
      .from(posts)
      .leftJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .where(eq(posts.postType, 'moment'))
      .orderBy(posts.createdAt)
      .limit(limit)
      .offset(offset);

    res.json({
      moments,
      pagination: {
        page,
        limit,
        total: moments.length,
        hasMore: moments.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching moments feed:', error);
    res.status(500).json({ error: 'Failed to fetch moments feed' });
  }
});

export default router;