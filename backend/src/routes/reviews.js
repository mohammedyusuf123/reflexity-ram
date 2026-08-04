const express = require('express');
const { body, param } = require('express-validator');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public reviews contain only approved feedback from authenticated purchasers.
router.get('/product/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).select('_id').lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const reviews = await Review.find({ product: product._id, status: 'approved' })
      .select('displayName rating title body verifiedPurchase createdAt')
      .sort({ createdAt: -1 })
      .lean();
    const summary = reviews.reduce((result, review) => {
      result.count += 1;
      result.total += review.rating;
      result.breakdown[review.rating] += 1;
      return result;
    }, { count: 0, total: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    summary.average = summary.count ? Number((summary.total / summary.count).toFixed(1)) : 0;
    delete summary.total;
    res.json({ reviews, summary });
  } catch (err) {
    console.error('Reviews fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post(
  '/product/:slug',
  authenticate,
  [
    param('slug').trim().notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }).toInt(),
    body('title').optional().trim().isLength({ max: 120 }),
    body('body').trim().isLength({ min: 10, max: 2000 }),
  ],
  validate,
  async (req, res) => {
    try {
      const product = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const order = await Order.findOne({
        user: req.user._id,
        paymentStatus: 'paid',
        status: { $in: ['shipped', 'delivered'] },
        'items.product': product._id,
      }).sort({ createdAt: -1 }).lean();
      if (!order) {
        return res.status(403).json({ error: 'Reviews are available after your paid order ships.' });
      }

      const existing = await Review.findOne({ product: product._id, order: order._id, user: req.user._id });
      if (existing) return res.status(409).json({ error: 'You already reviewed this purchase.' });

      const review = await Review.create({
        product: product._id,
        order: order._id,
        user: req.user._id,
        displayName: req.user.firstName || 'Verified customer',
        rating: req.body.rating,
        title: req.body.title || undefined,
        body: req.body.body,
        verifiedPurchase: true,
        status: 'approved',
      });
      res.status(201).json({ review });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'You already reviewed this purchase.' });
      console.error('Review create error:', err);
      res.status(500).json({ error: 'Failed to submit review' });
    }
  }
);

module.exports = router;
