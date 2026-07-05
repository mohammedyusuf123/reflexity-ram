const express = require('express');
const { query: queryValidator, param } = require('express-validator');
const Order = require('../models/Order');
const { validate } = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/orders ───────────────────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  [
    queryValidator('page').optional().isInt({ min: 1 }).toInt(),
    queryValidator('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find({ user: req.user._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments({ user: req.user._id }),
      ]);

      res.json({
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error('Orders list error:', err);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }
);

// ─── GET /api/orders/:orderNumber ─────────────────────────────────────────────
router.get(
  '/:orderNumber',
  optionalAuth,
  [param('orderNumber').trim().notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const order = await Order.findOne({ orderNumber }).lean();

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Access control:
      //  - admins can view any order
      //  - account orders are visible only to the owning account
      //  - guest orders require the matching email — even for logged-in
      //    users (previously any authenticated account could read any guest
      //    order's address and items by order number)
      const isAdmin = req.user?.role === 'admin';
      if (!isAdmin) {
        if (order.user) {
          if (!req.user || order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
          }
        } else {
          const { email } = req.query;
          if (!email || !order.guestEmail || order.guestEmail !== email.toLowerCase().trim()) {
            return res.status(403).json({ error: 'Access denied' });
          }
        }
      }

      res.json({ order });
    } catch (err) {
      console.error('Order detail error:', err);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  }
);

module.exports = router;
