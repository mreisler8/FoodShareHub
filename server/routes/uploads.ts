import { Router } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const router = Router();
const storage = new CloudinaryStorage({ 
  cloudinary, 
  params: { 
    folder: 'media', 
    resource_type: 'auto' 
  } 
});
const upload = multer({ storage });

router.post('/', upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 2 }
]), (req, res) => {
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
            thumbnailUrl: f.thumbnail_url || f.path,
            type: f.mimetype?.startsWith('video') ? 'video' : 'image',
            size: f.size,
            originalName: f.originalname
          });
        }
      });
    });

    if (files.length === 0) {
      return res.status(400).json({ error: 'No valid files processed' });
    }

    res.json({ files, count: files.length });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;