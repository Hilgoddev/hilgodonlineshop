const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { uploadLimiter } = require('../middleware/rateLimit');

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
// 4 MB — kept safely below the ~4.5 MB Vercel serverless request-body cap so a
// valid upload is never rejected by the platform before multer sees it.
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB
const BUCKET = 'product-images';

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

// Idempotent bucket bootstrap: create the bucket if it's missing, and *repair*
// it if it already exists but is not public. Uploads run with the service-role
// key, so they succeed even into a private bucket — and getPublicUrl() still
// returns a URL. If that bucket isn't actually public, anonymous browsers get a
// 400/404 and the saved image renders broken. Never throws: on Vercel multiple
// serverless instances can cold-start at once, so all paths here are guarded.
async function ensurePublicBucket() {
  try {
    const { data, error } = await supabase.storage.getBucket(BUCKET);

    // "Bucket missing" error — fall through to create below.
    if (error) {
      const message = `${error.message || ''} ${error.statusCode || ''}`.toLowerCase();
      if (!message.includes('not found') && !message.includes('404') && !message.includes('does not exist')) {
        console.warn('Storage bucket lookup warning:', error.message);
      }
    }

    // Already public — nothing to do.
    if (data && data.public === true) return;

    // Bucket missing → create it (idempotent; tolerate races with other instances).
    if (!data) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        allowedMimeTypes: ALLOWED_TYPES,
        fileSizeLimit: MAX_SIZE,
      });
      if (createError && !`${createError.message}`.toLowerCase().includes('already exists')) {
        console.warn('Storage bucket create warning:', createError.message);
      }
      return;
    }

    // Bucket exists but is private → make it public so stored images are readable.
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ALLOWED_TYPES,
      fileSizeLimit: MAX_SIZE,
    });
    if (updateError) {
      console.warn('Storage bucket public-flag repair warning:', updateError.message);
    }
  } catch (err) {
    console.warn('Storage bucket init warning:', err?.message);
  }
}
ensurePublicBucket();

// Verify a freshly-uploaded object is readable by anonymous browsers (i.e. the
// bucket is genuinely public). Returns true/false, or null when the check itself
// failed (transient network) — a null result must NOT fail a good upload.
async function isPubliclyReadable(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    return res.ok;
  } catch (err) {
    console.warn('Public-read check failed (ignoring):', err?.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/upload/product-image
router.post(
  '/product-image',
  verifyToken,
  uploadLimiter,
  upload.single('image'),
  // 4-arg error handler right after multer: catches the enforced size/type
  // limits (LIMIT_FILE_SIZE etc.) and returns a clean 4xx message. These errors
  // occur in this middleware, BEFORE the main handler runs, so they can't be
  // caught by its try/catch.
  (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      return res.status(tooBig ? 413 : 400).json({
        success: false,
        error: tooBig ? `Image must be ${MAX_SIZE / (1024 * 1024)} MB or less.` : 'File upload failed. Please try again.',
      });
    }
    if (err && err.status === 400 && err.message) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
      const safeExt = ALLOWED_TYPES.includes(`image/${ext}`) ? ext : 'jpg';
      const filePath = `${req.user.id}/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        return res.status(502).json({
          success: false,
          error: `Image could not be written to storage: ${uploadError.message}`,
        });
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      const url = data.publicUrl;

      // A silent privacy regression previously produced exactly this symptom:
      // upload "succeeds" (service-role) but the returned public URL 400s for
      // anonymous browsers. Detect it here instead of shipping broken images.
      const readable = await isPubliclyReadable(url);
      if (readable === false) {
        console.error('Uploaded image is not publicly reachable — bucket may be private:', url);
        return res.status(502).json({
          success: false,
          error: 'Image saved but is not publicly reachable — the storage bucket may be private.',
        });
      }

      res.status(200).json({ success: true, url });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
