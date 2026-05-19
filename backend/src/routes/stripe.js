const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { optionalAuth } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/email');

const router = express.Router();

// ─── POST /api/stripe/create-payment-intent ────────────────────────────────────
router.post('/create-payment-intent', optionalAuth, async (req, res) => {
  try {
    const { shippingCost = 0, shippingMethod } = req.body;
    const sessionId = req.headers['x-session-id'] || req.cookies?.cartSessionId;
    const userId = req.user?._id;

    const filter = userId ? { user: userId } : { sessionId };
    const cart = await Cart.findOne(filter);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const total = subtotal + Number(shippingCost);
    const amountInCents = Math.round(total * 100);

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
// Raw body required — configured in server.js
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        // Update order payment status
        await Order.findOneAndUpdate(
          { stripePaymentIntentId: pi.id },
          {
            paymentStatus: 'paid',
            status: 'processing',
            $push: { statusHistory: { status: 'processing', note: 'Payment confirmed via Stripe' } },
          }
        );
        console.log(`✅ Payment succeeded: ${pi.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await Order.findOneAndUpdate(
          { stripePaymentIntentId: pi.id },
          {
            paymentStatus: 'failed',
            $push: { statusHistory: { status: 'pending', note: 'Payment failed' } },
          }
        );
        console.log(`❌ Payment failed: ${pi.id}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        await Order.findOneAndUpdate(
          { stripeChargeId: charge.id },
          {
            paymentStatus: 'refunded',
            status: 'refunded',
            $push: { statusHistory: { status: 'refunded', note: 'Refunded via Stripe' } },
          }
        );
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
});

module.exports = router;
