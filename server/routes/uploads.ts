import { Router } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const router = Router();

// Optimized storage configuration
const storage = new CloudinaryStorage({ 
  cloudinary, 
  params: {
    folder: 'media',
    resource_type: 'auto',
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ]
  }
});

// Enhanced multer configuration with limits
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 12 // Max 12 files total
  },
  fileFilter: (req, file, cb) => {
    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

router.post('/', (req, res) => {
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 2 }
  ])(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Too many files. Maximum is 12 files.' });
        }
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }

    try {
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const files: any[] = [];
      
      ['images', 'videos'].forEach(field => {
        const fieldFiles = req.files?.[field] as Express.Multer.File[] || [];
        fieldFiles.forEach((f: any) => {
          // Validate file exists and has required properties
          if (f && f.path) {
            files.push({
              url: f.path,
              thumbnailUrl: f.eager?.[0]?.secure_url || f.path, // Use optimized thumbnail if available
              type: f.resource_type === 'video' ? 'video' : 'image',
              size: f.bytes || f.size,
              originalName: f.original_filename || f.originalname,
              format: f.format,
              publicId: f.public_id
            });
          }
        });
      });

      if (files.length === 0) {
        return res.status(400).json({ error: 'No valid files processed' });
      }

      res.json({ 
        files, 
        count: files.length,
        message: `Successfully uploaded ${files.length} file(s)`
      });
    } catch (error) {
      console.error('Upload processing error:', error);
      res.status(500).json({ error: 'Upload processing failed' });
    }
  });
});

export default router;