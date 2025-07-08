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
  const files: any[] = [];
  ['images','videos'].forEach(field =>
    (req.files[field] || []).forEach((f: any) =>
      files.push({
        url: f.path,
        thumbnailUrl: f.thumbnail_url || f.path,
        type: f.mimetype.startsWith('video') ? 'video' : 'image'
      })
    )
  );
  res.json({ files });
});

export default router;