const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { uploadLimiter } = require('../middleware/rateLimit');

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only JPEG, PNG, WebP and GIF images are allowed'), { status: 400 }));
    }
  },
});

// Ensure the product-images bucket exists (idempotent).
async function ensureBucket() {
  const { error } = await supabase.storage.createBucket('product-images', {
    public: true,
    allowedMimeTypes: ALLOWED_TYPES,
    fileSizeLimit: MAX_SIZE,
  });
  // Ignore "already exists" errors
  if (error && !error.message?.includes('already exists')) {
    console.warn('Storage bucket init warning:', error.message);
  }
}
ensureBucket();

// POST /api/upload/product-image
router.post('/product-image', verifyToken, uploadLimiter, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ALLOWED_TYPES.includes(`image/${ext}`) ? ext : 'jpg';
    const filePath = `${req.user.id}/${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);

    res.status(200).json({ success: true, url: data.publicUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
