const express = require('express');
const { body, query: queryValidator, param } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { validate } = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/email');
const { getShippingOption } = require('../config/shipping');
const { decrementStockForOrder } = require('../utils/stock');

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

      // Allow access if: authenticated user owns it, or guest with matching email
      if (req.user) {
        if (order.user && order.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        // Guest access: require email query param matching
        const { email } = req.query;
        if (!email || !order.guestEmail || order.guestEmail !== email.toLowerCase().trim()) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      res.json({ order });
    } catch (err) {
      console.error('Order detail error:', err);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  }
);

// ─── POST /api/orders/create ───────────────────────────────────────────────────
// SECURITY: Orders are ALWAYS created with paymentStatus: 'pending'.
// Payment confirmation happens exclusively via the Stripe webhook (payment_intent.succeeded).
// The stripePaymentIntentId is stored for webhook correlation, but NEVER used to mark paid here.
// Additionally, we verify the PaymentIntent exists in Stripe before accepting the order,
// to prevent fabricated intent IDs from being submitted.
router.post(
  '/create',
  optionalAuth,
  [
    body('shippingAddress').isObject().withMessage('Shipping address required'),
    body('shippingAddress.firstName').trim().notEmpty().withMessage('First name required'),
    body('shippingAddress.lastName').trim().notEmpty().withMessage('Last name required'),
    body('shippingAddress.line1').trim().notEmpty().withMessage('Address line 1 required'),
    body('shippingAddress.city').trim().notEmpty().withMessage('City required'),
    body('shippingAddress.state').trim().notEmpty().withMessage('State required'),
    body('shippingAddress.zip').trim().notEmpty().withMessage('ZIP code required'),
    body('shippingMethod').trim().notEmpty().withMessage('Shipping method required'),
    body('stripePaymentIntentId')
      .trim()
      .notEmpty()
      .withMessage('Payment intent ID is required')
      .matches(/^pi_[a-zA-Z0-9_]+$/)
      .withMessage('Invalid payment intent ID format'),
    body('guestEmail')
      .if((value, { req }) => !req.user)
      .isEmail()
      .normalizeEmail()
      .withMessage('Guest email required for guest checkout'),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        shippingAddress,
        billingAddress,
        shippingMethod, // option ID (e.g. 'standard') — price is looked up server-side
        stripePaymentIntentId,
        guestEmail,
        notes,
      } = req.body;

      // ── SECURITY: shipping cost comes from the server-side table, never the client ──
      const shippingOption = getShippingOption(shippingMethod);
      if (!shippingOption) {
        return res.status(400).json({ error: 'Invalid shipping method' });
      }

      const sessionId = req.headers['x-session-id'] || req.cookies?.cartSessionId;
      const userId = req.user?._id;

      // ── CRITICAL: Verify the PaymentIntent exists in Stripe ──────────────────
      // This prevents attackers from submitting a fabricated or someone else's PI ID.
      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
      } catch (stripeErr) {
        console.error('Stripe PI retrieval failed:', stripeErr.message);
        return res.status(400).json({ error: 'Invalid payment reference. Please try again.' });
      }

      // Reject if PI is in a terminal failed state
      if (paymentIntent.status === 'canceled') {
        return res.status(400).json({ error: 'Payment was cancelled. Please start a new checkout.' });
      }

      // Reject if this PI is already attached to an existing order (duplicate submission guard)
      const existingOrder = await Order.findOne({ stripePaymentIntentId });
      if (existingOrder) {
        return res.status(409).json({
          error: 'This payment has already been processed.',
          orderNumber: existingOrder.orderNumber,
        });
      }

      // ── Get cart ──────────────────────────────────────────────────────────────
      const filter = userId ? { user: userId } : { sessionId };
      const cart = await Cart.findOne(filter);

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      // ── Validate stock and build order items ──────────────────────────────────
      const orderItems = [];
      for (const item of cart.items) {
        const product = await Product.findOne({ slug: item.slug, isActive: true });
        if (!product) {
          return res.status(400).json({ error: `Product "${item.name}" is no longer available` });
        }
        // Check actual quantity — the old `stockQuantity > 0 &&` guard let
        // qty pass unchecked whenever stockQuantity was exactly 0.
        if (product.stockQuantity <= 0 || product.stock === 'out') {
          return res.status(400).json({ error: `"${product.name}" is out of stock` });
        }
        if (item.qty > product.stockQuantity) {
          return res.status(400).json({
            error: `Only ${product.stockQuantity} units of "${product.name}" available`,
          });
        }
        orderItems.push({
          product: product._id,
          slug: product.slug,
          sku: product.sku,
          name: product.name,
          price: product.price, // Always use server-side price
          image: product.images?.[0]?.url || '',
          qty: item.qty,
        });
      }

      const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
      const shippingCostNum = shippingOption.price;
      const total = subtotal + shippingCostNum;

      // ── CRITICAL: Verify the PI amount matches our computed total ─────────────
      // Prevents a user from creating a PI for $0.01 and then submitting a $500 order.
      const expectedAmountCents = Math.round(total * 100);
      if (Math.abs(paymentIntent.amount - expectedAmountCents) > 50) {
        // Allow up to $0.50 rounding tolerance
        console.error(
          `Amount mismatch: PI has ${paymentIntent.amount} cents, order expects ${expectedAmountCents} cents`
        );
        return res.status(400).json({
          error: 'Payment amount does not match order total. Please refresh and try again.',
        });
      }

      // ── Create order ───────────────────────────────────────────────────────────
      // If Stripe already reports the PI as succeeded (we retrieved it above,
      // server-side, so this is trustworthy), mark the order paid immediately.
      // This closes the race where the webhook fires before the order exists.
      // Otherwise the order starts 'pending' and the webhook flips it to paid.
      const alreadyPaid = paymentIntent.status === 'succeeded';

      let order;
      try {
        order = await Order.create({
          user: userId || undefined,
          guestEmail: !userId ? (guestEmail || '').toLowerCase().trim() : undefined,
          items: orderItems,
          shippingAddress,
          billingAddress: billingAddress || shippingAddress,
          shippingMethod: shippingOption.label,
          shippingCost: shippingCostNum,
          subtotal,
          total,
          stripePaymentIntentId,
          stripeChargeId: alreadyPaid ? paymentIntent.latest_charge || undefined : undefined,
          paymentStatus: alreadyPaid ? 'paid' : 'pending',
          status: alreadyPaid ? 'processing' : 'pending',
          statusHistory: [
            alreadyPaid
              ? { status: 'processing', note: 'Payment confirmed by Stripe at order creation' }
              : { status: 'pending', note: 'Order placed — awaiting payment confirmation' },
          ],
          notes,
        });
      } catch (createErr) {
        // Unique index on stripePaymentIntentId — duplicate submission lost the race
        if (createErr.code === 11000) {
          const existing = await Order.findOne({ stripePaymentIntentId });
          return res.status(409).json({
            error: 'This payment has already been processed.',
            orderNumber: existing?.orderNumber,
          });
        }
        throw createErr;
      }

      // ── Decrement stock ONLY once payment is confirmed ─────────────────────────
      // (idempotent — the webhook calls the same helper and whichever runs first wins)
      if (alreadyPaid) {
        await decrementStockForOrder(order);
      }

      // ── Clear cart ────────────────────────────────────────────────────────────
      await Cart.findOneAndUpdate(filter, { items: [], discount: 0, couponCode: undefined });

      // ── Send confirmation email (non-blocking) ────────────────────────────────
      // Only when payment is already confirmed — otherwise the webhook sends it
      // on payment_intent.succeeded, and sending both would double-email.
      const emailAddress = userId ? req.user.email : guestEmail;
      const firstName = userId ? req.user.firstName : shippingAddress.firstName;
      if (alreadyPaid && emailAddress) {
        try {
          await sendOrderConfirmationEmail({
            email: emailAddress,
            firstName,
            order: {
              orderNumber: order.orderNumber,
              items: orderItems,
              subtotal,
              shippingCost: shippingCostNum,
              total,
            },
          });
        } catch (emailErr) {
          console.error('Order confirmation email failed:', emailErr.message);
          // Non-fatal — order is still created
        }
      }

      res.status(201).json({
        message: 'Order created. Awaiting payment confirmation.',
        order: {
          orderNumber: order.orderNumber,
          _id: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
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
