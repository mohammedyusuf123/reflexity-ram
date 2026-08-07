const express = require('express');
const {
  uploadProductImages,
  uploadProductImage,
  deleteImage,
  generateSignedUploadParams,
} = require('../config/cloudinary');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/upload/products ─────────────────────────────────────────────────
// Upload up to 5 product images (admin only)
router.post(
  '/products',
  authenticate,
  requireAdmin,
  (req, res, next) => {
    uploadProductImages.array('images', 5)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const uploaded = [];
    try {
      for (const file of req.files) {
        const result = await uploadProductImage(file);
        uploaded.push({
          url: result.secure_url,
          publicId: result.public_id,
          alt: file.originalname,
        });
      }
      res.json({ images: uploaded });
    } catch (err) {
      await Promise.allSettled(uploaded.map((image) => deleteImage(image.publicId)));
      console.error('Cloudinary upload error:', err);
      res.status(502).json({ error: 'Image upload failed' });
    }
  }
);

// ─── DELETE /api/upload/products/:publicId ─────────────────────────────────────
router.delete('/products/:publicId', authenticate, requireAdmin, async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    // Security: ensure it's in our folder
    if (!publicId.startsWith('reflexity-ram/')) {
      return res.status(400).json({ error: 'Invalid public ID' });
    }
    await deleteImage(publicId);
    res.json({ message: 'Image deleted' });
  } catch (err) {
    console.error('Image delete error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// ─── GET /api/upload/sign ──────────────────────────────────────────────────────
// Get signed params for direct client-side upload (optional flow)
router.get('/sign', authenticate, requireAdmin, (req, res) => {
  try {
    const params = generateSignedUploadParams();
    res.json(params);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

module.exports = router;
