const express = require('express');
const { body } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { validate } = require('../middleware/validate');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Helper: get or create cart for user or session
const getOrCreateCart = async (userId, sessionId) => {
  const filter = userId ? { user: userId } : { sessionId };
  let cart = await Cart.findOne(filter);
  if (!cart) {
    cart = new Cart(userId ? { user: userId } : { sessionId });
  }
  // Refresh expiry on access
  cart.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return cart;
};

// ─── GET /api/cart ─────────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.cartSessionId;
    const userId = req.user?._id;

    if (!userId && !sessionId) {
      return res.json({ cart: { items: [], subtotal: 0, itemCount: 0 } });
    }

    const filter = userId ? { user: userId } : { sessionId };
    const cart = await Cart.findOne(filter).populate('items.product', 'stock stockQuantity price name');

    if (!cart) {
      return res.json({ cart: { items: [], subtotal: 0, itemCount: 0 } });
    }

    // Validate items against current product data
    let needsSave = false;
    for (const item of cart.items) {
      if (item.product) {
        // Update price if changed
        if (item.price !== item.product.price) {
          item.price = item.product.price;
          needsSave = true;
        }
      }
    }
    if (needsSave) await cart.save();

    const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const itemCount = cart.items.reduce((sum, i) => sum + i.qty, 0);

    res.json({
      cart: {
        _id: cart._id,
        items: cart.items,
        subtotal,
        itemCount,
        discount: cart.discount,
        couponCode: cart.couponCode,
      },
    });
  } catch (err) {
    console.error('Cart get error:', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// ─── POST /api/cart/add ────────────────────────────────────────────────────────
router.post(
  '/add',
  optionalAuth,
  [
    body('slug').notEmpty().withMessage('Product slug required'),
    body('qty').isInt({ min: 1, max: 99 }).withMessage('Quantity must be 1–99'),
  ],
  validate,
  async (req, res) => {
    try {
      const { slug, qty = 1 } = req.body;
      const sessionId = req.headers['x-session-id'] || req.cookies?.cartSessionId;
      const userId = req.user?._id;

      if (!userId && !sessionId) {
        return res.status(400).json({ error: 'Session ID required for guest cart' });
      }

      // Validate product exists and is in stock
      const product = await Product.findOne({ slug, isActive: true });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      if (product.stock === 'out') {
        return res.status(400).json({ error: 'Product is out of stock' });
      }

      const cart = await getOrCreateCart(userId, sessionId);

      const existingItem = cart.items.find(i => i.slug === slug);
      if (existingItem) {
        const newQty = existingItem.qty + qty;
        if (product.stockQuantity > 0 && newQty > product.stockQuantity) {
          return res.status(400).json({
            error: `Only ${product.stockQuantity} units available`,
          });
        }
        existingItem.qty = newQty;
        existingItem.price = product.price; // Always use current price
      } else {
        cart.items.push({
          product: product._id,
          slug: product.slug,
          sku: product.sku,
          name: product.name,
          price: product.price,
          image: product.images?.[0]?.url || '',
          qty,
        });
      }

      await cart.save();

      const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const itemCount = cart.items.reduce((sum, i) => sum + i.qty, 0);

      res.json({
        message: 'Added to cart',
        cart: { items: cart.items, subtotal, itemCount },
      });
    } catch (err) {
      console.error('Cart add error:', err);
      res.status(500).json({ error: 'Failed to add to cart' });
    }
  }
);

// ─── PATCH /api/cart/update ────────────────────────────────────────────────────
router.patch(
  '/update',
  optionalAuth,
  [
    body('slug').notEmpty().withMessage('Product slug required'),
    body('qty').isInt({ min: 0, max: 99 }).withMessage('Quantity must be 0–99'),
  ],
  validate,
  async (req, res) => {
    try {
      const { slug, qty } = req.body;
      const sessionId = req.headers['x-session-id'] || req.cookies?.cartSessionId;
      const userId = req.user?._id;

      const filter = userId ? { user: userId } : { sessionId };
      const cart = await Cart.findOne(filter);

      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      if (qty === 0) {
        cart.items = cart.items.filter(i => i.slug !== slug);
      } else {
        const item = cart.items.find(i => i.slug === slug);
        if (!item) {
          return res.status(404).json({ error: 'Item not in cart' });
        }
        item.qty = qty;
      }

      await cart.save();

      const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const itemCount = cart.items.reduce((sum, i) => sum + i.qty, 0);

      res.json({
        message: 'Cart updated',
        cart: { items: cart.items, subtotal, itemCount },
      });
    } catch (err) {
      console.error('Cart update error:', err);
      res.status(500).json({ error: 'Failed to update cart' });
    }
  }
);

// ─── DELETE /api/cart/remove/:slug ────────────────────────────────────────────
router.delete('/remove/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const sessionId = req.headers['x-session-id'] || req.cookies?.cartSessionId;
    const userId = req.user?._id;

    const filter = userId ? { user: userId } : { sessionId };
    const cart = await Cart.findOne(filter);

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = cart.items.filter(i => i.slug !== slug);
    await cart.save();

    const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const itemCount = cart.items.reduce((sum, i) => sum + i.qty, 0);

    res.json({
      message: 'Item removed',
      cart: { items: cart.items, subtotal, itemCount },
    });
  } catch (err) {
    console.error('Cart remove error:', err);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// ─── DELETE /api/cart/clear ────────────────────────────────────────────────────
router.delete('/clear', optionalAuth, async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.cartSessionId;
    const userId = req.user?._id;

    const filter = userId ? { user: userId } : { sessionId };
    await Cart.findOneAndUpdate(filter, { items: [], discount: 0, couponCode: undefined });

    res.json({ message: 'Cart cleared' });
  } catch (err) {
    console.error('Cart clear error:', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
