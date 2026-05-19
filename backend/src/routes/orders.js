const express = require('express');
const { body } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { validate } = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/email');

const router = express.Router();

// ─── GET /api/orders ───────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Orders list error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ─── GET /api/orders/:orderNumber ─────────────────────────────────────────────
router.get('/:orderNumber', optionalAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber }).lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Allow access if: authenticated user owns it, or guest with matching email
    if (req.user) {
      if (order.user && order.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else {
      // Guest access: require email query param matching
      const { email } = req.query;
      if (!email || order.guestEmail !== email.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ order });
  } catch (err) {
    console.error('Order detail error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ─── POST /api/orders/create ───────────────────────────────────────────────────
// Called after successful Stripe payment
router.post(
  '/create',
  optionalAuth,
  [
    body('shippingAddress').isObject().withMessage('Shipping address required'),
    body('shippingAddress.firstName').notEmpty(),
    body('shippingAddress.lastName').notEmpty(),
    body('shippingAddress.line1').notEmpty(),
    body('shippingAddress.city').notEmpty(),
    body('shippingAddress.state').notEmpty(),
    body('shippingAddress.zip').notEmpty(),
    body('shippingMethod').notEmpty().withMessage('Shipping method required'),
    body('stripePaymentIntentId').optional(),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        shippingAddress,
        billingAddress,
        shippingMethod,
        shippingCost = 0,
        stripePaymentIntentId,
        guestEmail,
        notes,
      } = req.body;

      const sessionId = req.headers['x-session-id'] || req.cookies?.cartSessionId;
      const userId = req.user?._id;

      // Get cart
      const filter = userId ? { user: userId } : { sessionId };
      const cart = await Cart.findOne(filter);

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      // Validate stock and build order items
      const orderItems = [];
      for (const item of cart.items) {
        const product = await Product.findOne({ slug: item.slug, isActive: true });
        if (!product) {
          return res.status(400).json({ error: `Product "${item.name}" is no longer available` });
        }
        if (product.stock === 'out') {
          return res.status(400).json({ error: `"${product.name}" is out of stock` });
        }
        if (product.stockQuantity > 0 && item.qty > product.stockQuantity) {
          return res.status(400).json({
            error: `Only ${product.stockQuantity} units of "${product.name}" available`,
          });
        }
        orderItems.push({
          product: product._id,
          slug: product.slug,
          sku: product.sku,
          name: product.name,
          price: product.price, // Use current price from DB
          image: product.images?.[0]?.url || '',
          qty: item.qty,
        });
      }

      const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
      const total = subtotal + Number(shippingCost);

      // Create order
      const order = await Order.create({
        user: userId || undefined,
        guestEmail: !userId ? guestEmail : undefined,
        items: orderItems,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        shippingMethod,
        shippingCost: Number(shippingCost),
        subtotal,
        total,
        stripePaymentIntentId,
        paymentStatus: stripePaymentIntentId ? 'paid' : 'pending',
        status: stripePaymentIntentId ? 'processing' : 'pending',
        statusHistory: [{ status: 'pending', note: 'Order placed' }],
        notes,
      });

      // Decrement stock
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: -item.qty },
        });
      }

      // Clear cart
      await Cart.findOneAndUpdate(filter, { items: [], discount: 0, couponCode: undefined });

      // Send confirmation email
      const emailAddress = userId ? req.user.email : guestEmail;
      const firstName = userId ? req.user.firstName : shippingAddress.firstName;
      if (emailAddress) {
        try {
          await sendOrderConfirmationEmail({
            email: emailAddress,
            firstName,
            order: {
              orderNumber: order.orderNumber,
              items: orderItems,
              subtotal,
              shippingCost: Number(shippingCost),
              total,
            },
          });
        } catch (emailErr) {
          console.error('Order confirmation email failed:', emailErr.message);
        }
      }

      res.status(201).json({
        message: 'Order created successfully',
        order: {
          orderNumber: order.orderNumber,
          _id: order._id,
          status: order.status,
          total: order.total,
          items: order.items,
        },
      });
    } catch (err) {
      console.error('Order create error:', err);
      res.status(500).json({ error: 'Failed to create order' });
    }
  }
);

module.exports = router;
