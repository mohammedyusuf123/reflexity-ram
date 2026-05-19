const express = require('express');
const { body, param } = require('express-validator');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendShippingNotificationEmail } = require('../utils/email');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      totalRevenue,
      totalProducts,
      lowStockProducts,
      totalUsers,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['pending', 'processing'] } }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ stock: 'low', isActive: true }),
      User.countDocuments({ role: 'customer' }),
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    res.json({
      stats: {
        totalOrders,
        pendingOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalProducts,
        lowStockProducts,
        totalUsers,
      },
      recentOrders,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── PRODUCT MANAGEMENT ───────────────────────────────────────────────────────

// GET /api/admin/products
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, stock, generation } = req.query;
    const filter = {};
    if (search) filter.$text = { $search: search };
    if (stock) filter.stock = stock;
    if (generation) filter.generation = generation;

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({ products, pagination: { page: Number(page), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/admin/products
router.post(
  '/products',
  [
    body('slug').trim().notEmpty().withMessage('Slug required'),
    body('sku').trim().notEmpty().withMessage('SKU required'),
    body('name').trim().notEmpty().withMessage('Name required'),
    body('line').notEmpty().withMessage('Line required'),
    body('generation').isIn(['DDR4', 'DDR5']).withMessage('Invalid generation'),
    body('formFactor').isIn(['UDIMM', 'SO-DIMM', 'RDIMM', 'LRDIMM']).withMessage('Invalid form factor'),
    body('capacity').isNumeric().withMessage('Capacity must be a number'),
    body('capacityLabel').notEmpty(),
    body('speed').isNumeric().withMessage('Speed must be a number'),
    body('speedLabel').notEmpty(),
    body('condition').notEmpty().withMessage('Condition required'),
    body('warranty').notEmpty().withMessage('Warranty required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stockQuantity').isInt({ min: 0 }).withMessage('Stock quantity must be non-negative'),
  ],
  validate,
  async (req, res) => {
    try {
      const product = await Product.create(req.body);
      res.status(201).json({ product });
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({ error: `${field} already exists` });
      }
      console.error('Create product error:', err);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

// PATCH /api/admin/products/:id
router.patch('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate product' });
  }
});

// PATCH /api/admin/products/:id/stock
router.patch('/products/:id/stock', [
  body('stockQuantity').isInt({ min: 0 }),
], validate, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stockQuantity: req.body.stockQuantity },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// ─── ORDER MANAGEMENT ─────────────────────────────────────────────────────────

// GET /api/admin/orders
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { guestEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, pagination: { page: Number(page), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/admin/orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', [
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  body('trackingNumber').optional().trim(),
  body('note').optional().trim(),
], validate, async (req, res) => {
  try {
    const { status, trackingNumber, note } = req.body;
    const updates = {
      status,
      $push: { statusHistory: { status, note: note || `Status updated to ${status}` } },
    };

    if (trackingNumber) updates.trackingNumber = trackingNumber;
    if (status === 'shipped') updates.shippedAt = new Date();
    if (status === 'delivered') updates.deliveredAt = new Date();
    if (status === 'cancelled') updates.cancelledAt = new Date();

    const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('user', 'firstName lastName email');

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Send shipping notification
    if (status === 'shipped') {
      const email = order.user?.email || order.guestEmail;
      const firstName = order.user?.firstName || order.shippingAddress?.firstName;
      if (email) {
        try {
          await sendShippingNotificationEmail({ email, firstName, order });
        } catch (emailErr) {
          console.error('Shipping notification email failed:', emailErr.message);
        }
      }
    }

    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);

    res.json({ users, pagination: { page: Number(page), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', [
  body('role').optional().isIn(['customer', 'admin']),
  body('isActive').optional().isBoolean(),
], validate, async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const updates = {};
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/admin/users/:id/orders
router.get('/users/:id/orders', async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

module.exports = router;
