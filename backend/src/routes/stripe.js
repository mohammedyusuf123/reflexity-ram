const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { optionalAuth } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/email');

const router = express.Router();

// ─── POST /api/stripe/create-payment-intent ────────────────────────────────────
router.post('/create-payment-intent', optionalAuth, async (req, res) => {
  try {
    const { shippingCost = 0, shippingMethod } = req.body;
    const sessionId = req.headers['x-session-id'] || req.cookies?.cartSessionId;
    const userId = req.user?._id;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'Session ID required for guest checkout' });
    }

    const filter = userId ? { user: userId } : { sessionId };
    const cart = await Cart.findOne(filter);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const shippingCostNum = Number(shippingCost);
    const total = subtotal + shippingCostNum;
    const amountInCents = Math.round(total * 100);

    if (amountInCents < 50) {
      return res.status(400).json({ error: 'Order total is too low' });
    }

    const paymentIntentData = {
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: userId ? userId.toString() : 'guest',
        sessionId: sessionId || '',
        shippingMethod: shippingMethod || '',
        itemCount: cart.items.reduce((s, i) => s + i.qty, 0).toString(),
      },
    };

    // Attach customer if user has stripeCustomerId
    if (req.user?.stripeCustomerId) {
      paymentIntentData.customer = req.user.stripeCustomerId;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInCents,
    });
  } catch (err) {
    console.error('Stripe payment intent error:', err);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// ─── POST /api/stripe/webhook ──────────────────────────────────────────────────
// Raw body required — configured in server.js before express.json()
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature error: ${err.message}` });
  }

  // Respond to Stripe immediately to prevent timeout retries
  res.json({ received: true });

  // Process event asynchronously
  try {
    switch (event.type) {

      // ── Payment succeeded: mark order paid, send confirmation email ──────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object;

        const order = await Order.findOneAndUpdate(
          { stripePaymentIntentId: pi.id },
          {
            paymentStatus: 'paid',
            status: 'processing',
            // Store charge ID for refund matching
            stripeChargeId: pi.latest_charge || undefined,
            $push: {
              statusHistory: {
                status: 'processing',
                note: 'Payment confirmed by Stripe',
                timestamp: new Date(),
              },
            },
          },
          { new: true }
        ).populate('user', 'email firstName');

        if (order) {
          console.log(`✅ Payment succeeded for order ${order.orderNumber} (PI: ${pi.id})`);

          // Send order confirmation email now that payment is confirmed
          const emailAddress = order.user?.email || order.guestEmail;
          const firstName = order.user?.firstName || order.shippingAddress?.firstName;
          if (emailAddress) {
            try {
              await sendOrderConfirmationEmail({
                email: emailAddress,
                firstName,
                order: {
                  orderNumber: order.orderNumber,
                  items: order.items,
                  subtotal: order.subtotal,
                  shippingCost: order.shippingCost,
                  total: order.total,
                },
              });
            } catch (emailErr) {
              console.error('Order confirmation email failed after webhook:', emailErr.message);
            }
          }
        } else {
          console.warn(`⚠️  No order found for PI: ${pi.id} — may arrive before order creation`);
        }
        break;
      }

      // ── Payment failed: mark order failed, restore stock ─────────────────────
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;

        const order = await Order.findOneAndUpdate(
          { stripePaymentIntentId: pi.id },
          {
            paymentStatus: 'failed',
            status: 'cancelled',
            cancelledAt: new Date(),
            $push: {
              statusHistory: {
                status: 'cancelled',
                note: `Payment failed: ${pi.last_payment_error?.message || 'unknown reason'}`,
                timestamp: new Date(),
              },
            },
          },
          { new: true }
        );

        if (order) {
          console.log(`❌ Payment failed for order ${order.orderNumber} (PI: ${pi.id}) — restoring stock`);
          // Restore stock for each item
          for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stockQuantity: item.qty },
            });
          }
        } else {
          console.warn(`⚠️  No order found for failed PI: ${pi.id}`);
        }
        break;
      }

      // ── Charge refunded ───────────────────────────────────────────────────────
      case 'charge.refunded': {
        const charge = event.data.object;
        const order = await Order.findOneAndUpdate(
          { stripeChargeId: charge.id },
          {
            paymentStatus: 'refunded',
            status: 'refunded',
            $push: {
              statusHistory: {
                status: 'refunded',
                note: 'Refunded via Stripe',
                timestamp: new Date(),
              },
            },
          },
          { new: true }
        );

        if (order) {
          console.log(`💸 Refund processed for order ${order.orderNumber}`);
        } else {
          // Fallback: try to find by PI if charge ID wasn't stored yet
          console.warn(`⚠️  No order found for charge ${charge.id} — charge ID may not be stored`);
        }
        break;
      }

      default:
        // Log unhandled events for debugging but don't error
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (err) {
    // Don't re-send response (already sent above), just log
    console.error(`Webhook handler error for event ${event.type}:`, err);
  }
});

module.exports = router;
