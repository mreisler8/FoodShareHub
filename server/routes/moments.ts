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

// Create a food moment - PHOTO-FIRST ENFORCEMENT
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { content, restaurantId, rating, tags, dishName } = req.body;

    // CRITICAL FIX: Photo is MANDATORY - no bypasses allowed
    if (!req.file) {
      return res.status(400).json({ 
        error: "Photo is required for food moments" 
      });
    }

    // CRITICAL FIX: Restaurant and dish name are MANDATORY
    if (!restaurantId || !dishName || !dishName.trim()) {
      return res.status(400).json({ 
        error: "Restaurant and dish name are required" 
      });
    }

    // Handle single image upload (photo-first enforcement)
    const imageUrl = `/uploads/${req.file.filename}`;

    // Parse tags if provided
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        console.warn('Invalid tags JSON:', tags);
        parsedTags = [];
      }
    }

    // Process restaurant ID (required)
    let finalRestaurantId = null;
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
      } else {
        return res.status(400).json({ 
          error: "Restaurant not found" 
        });
      }
    } else {
      finalRestaurantId = parseInt(restaurantId);
      
      // Verify restaurant exists
      const existingRestaurant = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, finalRestaurantId))
        .limit(1);
        
      if (existingRestaurant.length === 0) {
        return res.status(400).json({ 
          error: "Restaurant not found" 
        });
      }
    }

    // Create the moment post with strict validation
    const newMoment = await db
      .insert(posts)
      .values({
        userId,
        restaurantId: finalRestaurantId,
        content: content || `${dishName} - Food Moment`,
        images: [imageUrl],
        rating: rating ? parseFloat(rating) : 0,
        tags: parsedTags,
        postType: 'moment',
        dishName: dishName.trim(),
        isPublic: true,
        sharedWithCircle: true,
        visibility: { 
          public: true, 
          followers: true, 
          circleIds: [] 
        },
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Food moment created successfully",
      moment: newMoment[0]
    });

  } catch (error) {
    console.error('Error creating food moment:', error);
    res.status(500).json({ 
      error: "Failed to create food moment",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as momentsRouter };