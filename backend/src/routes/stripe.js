const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { optionalAuth } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/email');
const { getShippingOption, toStripeShippingOptions, ALLOWED_SHIPPING_COUNTRIES } = require('../config/shipping');
const { decrementStockForOrder, restoreStockForOrder } = require('../utils/stock');
const { ensureStripePrice } = require('../utils/stripeSync');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKOUT SESSIONS (primary checkout flow)
// Cart → line_items (Stripe Price IDs from the DB) → hosted Stripe Checkout.
// Stripe collects the shipping address (CA/US only — it renders the right
// form per country: Province/Postal for Canada, State/ZIP for the US), phone,
// and email, applies Stripe Tax, and the webhook fulfills the order.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/stripe/create-checkout-session ──────────────────────────────────
router.post('/create-checkout-session', optionalAuth, async (req, res) => {
  try {
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

    // ── Build line_items from DB-stored Stripe Price IDs ──────────────────────
    const lineItems = [];
    for (const item of cart.items) {
      const product = await Product.findOne({ slug: item.slug, isActive: true });
      if (!product) {
        return res.status(400).json({ error: `Product "${item.name}" is no longer available` });
      }
      if (product.stockQuantity <= 0 || product.stock === 'out') {
        return res.status(400).json({ error: `"${product.name}" is out of stock` });
      }
      if (item.qty > product.stockQuantity) {
        return res.status(400).json({
          error: `Only ${product.stockQuantity} units of "${product.name}" available`,
        });
      }

      // Lazy sync: guarantees a current Price ID even if admin-time sync failed
      // or the price changed without a re-sync.
      const priceId = await ensureStripePrice(product);
      if (!priceId) {
        return res.status(503).json({ error: 'Payment processing is not configured.' });
      }

      lineItems.push({ price: priceId, quantity: item.qty });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://reflexityram.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,

      // ── Shipping: Canada + US only. Stripe renders the country-appropriate
      // address form (Province/Postal code vs State/ZIP) automatically. ──────
      shipping_address_collection: { allowed_countries: ALLOWED_SHIPPING_COUNTRIES },
      shipping_options: toStripeShippingOptions(),
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',

      // ── Stripe Tax ─────────────────────────────────────────────────────────
      // Canadian tax (HST/GST/PST by province) is calculated from the shipping
      // address — requires a Canada tax registration in the Stripe dashboard.
      // US customers: with no US registrations added, Stripe Tax charges $0.
      // To collect US tax later (if nexus is established), add the state
      // registrations in Stripe — no code change needed.
      automatic_tax: { enabled: process.env.STRIPE_TAX_ENABLED === 'true' },

      customer_email: req.user?.email || undefined,
      client_reference_id: userId ? userId.toString() : sessionId,
      metadata: {
        userId: userId ? userId.toString() : 'guest',
        cartSessionId: sessionId || '',
      },

      success_url: `${frontendUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cart`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Checkout session error:', err);
    res.status(500).json({ error: 'Failed to start checkout' });
  }
});

// ─── Fulfillment: convert a paid Checkout Session into an Order, exactly once ──
// Called from BOTH the webhook (checkout.session.completed) and the success
// page fallback (GET /session-status). The unique index on
// stripeCheckoutSessionId makes this safe to call any number of times.
const fulfillCheckoutSession = async (checkoutSessionId) => {
  // Fast path: already fulfilled
  const existing = await Order.findOne({ stripeCheckoutSessionId: checkoutSessionId });
  if (existing) return existing;

  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ['line_items.data.price.product', 'payment_intent'],
  });

  // Only fulfill paid sessions (async payment methods stay 'unpaid' until later)
  if (session.payment_status !== 'paid') return null;

  // ── Map Stripe line items back to our products via stored Price IDs ────────
  const orderItems = [];
  for (const li of session.line_items.data) {
    const product = await Product.findOne({ stripePriceId: li.price.id });
    if (!product) {
      // Fallback: match by metadata slug set during sync
      const slug = li.price.product?.metadata?.slug;
      const bySlug = slug ? await Product.findOne({ slug }) : null;
      if (!bySlug) {
        console.error(`Fulfillment: no product for Stripe price ${li.price.id}`);
        continue;
      }
      orderItems.push({
        product: bySlug._id, slug: bySlug.slug, sku: bySlug.sku, name: bySlug.name,
        price: li.price.unit_amount / 100, image: bySlug.images?.[0]?.url || '', qty: li.quantity,
      });
      continue;
    }
    orderItems.push({
      product: product._id, slug: product.slug, sku: product.sku, name: product.name,
      price: li.price.unit_amount / 100, image: product.images?.[0]?.url || '', qty: li.quantity,
    });
  }

  if (orderItems.length === 0) {
    console.error(`Fulfillment: session ${checkoutSessionId} produced no order items`);
    return null;
  }

  // ── Address + contact, exactly as Stripe collected them ────────────────────
  const shipping = session.collected_information?.shipping_details || session.shipping_details;
  const customer = session.customer_details || {};
  const fullName = (shipping?.name || customer.name || '').trim();
  const nameParts = fullName.split(/\s+/);
  const addr = shipping?.address || customer.address || {};

  const shippingAddress = {
    firstName: nameParts[0] || 'Customer',
    lastName: nameParts.slice(1).join(' ') || '—',
    line1: addr.line1 || '',
    line2: addr.line2 || undefined,
    city: addr.city || '',
    state: addr.state || '',       // province code for CA, state for US
    zip: addr.postal_code || '',   // postal code for CA, ZIP for US
    country: addr.country || 'CA',
    phone: customer.phone || undefined,
  };

  // ── Amounts straight from Stripe (authoritative) ────────────────────────────
  const subtotal = (session.amount_subtotal || 0) / 100;
  const tax = (session.total_details?.amount_tax || 0) / 100;
  const shippingCost = (session.total_details?.amount_shipping || 0) / 100;
  const total = (session.amount_total || 0) / 100;
  const shippingMethodLabel =
    session.shipping_cost?.shipping_rate?.display_name || 'Standard Shipping';

  const pi = session.payment_intent;
  const userId = session.metadata?.userId !== 'guest' ? session.metadata?.userId : undefined;

  let order;
  try {
    order = await Order.create({
      user: userId || undefined,
      guestEmail: !userId ? (customer.email || '').toLowerCase() : undefined,
      items: orderItems,
      shippingAddress,
      billingAddress: shippingAddress,
      shippingMethod: shippingMethodLabel,
      shippingCost,
      subtotal,
      tax,
      total,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: typeof pi === 'string' ? pi : pi?.id,
      stripeChargeId: typeof pi === 'object' ? pi?.latest_charge || undefined : undefined,
      paymentStatus: 'paid',
      status: 'processing',
      statusHistory: [{ status: 'processing', note: 'Payment confirmed via Stripe Checkout' }],
    });
  } catch (createErr) {
    if (createErr.code === 11000) {
      // Lost the race against the other fulfillment path — reuse its order
      return Order.findOne({ stripeCheckoutSessionId: session.id });
    }
    throw createErr;
  }

  // Exactly-once side effects (stock helper is itself idempotent via order flag)
  await decrementStockForOrder(order);

  // Clear the cart that produced this session
  const cartFilter = userId
    ? { user: userId }
    : { sessionId: session.metadata?.cartSessionId };
  if (userId || session.metadata?.cartSessionId) {
    await Cart.findOneAndUpdate(cartFilter, { items: [], discount: 0, couponCode: undefined });
  }

  // Confirmation email (non-blocking)
  const emailAddress = customer.email;
  if (emailAddress) {
    try {
      await sendOrderConfirmationEmail({
        email: emailAddress,
        firstName: shippingAddress.firstName,
        order: {
          orderNumber: order.orderNumber,
          items: order.items,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          total: order.total,
        },
      });
    } catch (emailErr) {
      console.error('Confirmation email failed:', emailErr.message);
    }
  }

  console.log(`✅ Fulfilled checkout session ${session.id} → order ${order.orderNumber}`);
  return order;
};

// ─── GET /api/stripe/session-status?session_id=cs_... ──────────────────────────
// Success-page endpoint. Doubles as a fulfillment fallback: if the webhook
// hasn't landed yet (or failed), the order is created here instead — the
// unique session index guarantees no duplicates either way.
router.get('/session-status', async (req, res) => {
  try {
    const { session_id: checkoutSessionId } = req.query;
    if (!checkoutSessionId || !/^cs_[a-zA-Z0-9_]+$/.test(checkoutSessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const order = await fulfillCheckoutSession(checkoutSessionId);
    if (!order) {
      return res.json({ status: 'pending' }); // not paid (yet) — client can retry
    }

    res.json({
      status: 'complete',
      orderNumber: order.orderNumber,
      email: order.guestEmail || undefined,
    });
  } catch (err) {
    console.error('Session status error:', err);
    res.status(500).json({ error: 'Failed to check session status' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY: Payment Intent flow (kept for backwards compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/stripe/create-payment-intent ────────────────────────────────────
router.post('/create-payment-intent', optionalAuth, async (req, res) => {
  try {
    const { shippingMethod } = req.body; // option ID — price comes from server table
    const sessionId = req.headers['x-session-id'] || req.cookies?.cartSessionId;
    const userId = req.user?._id;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'Session ID required for guest checkout' });
    }

    // SECURITY: never trust a client-supplied shipping cost.
    const shippingOption = getShippingOption(shippingMethod);
    if (!shippingOption) {
      return res.status(400).json({ error: 'Invalid shipping method' });
    }

    const filter = userId ? { user: userId } : { sessionId };
    const cart = await Cart.findOne(filter);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Recompute prices from the products collection so a stale cart price
    // can't undercharge (cart prices are refreshed on GET, but not guaranteed here).
    let subtotal = 0;
    for (const item of cart.items) {
      const product = await Product.findOne({ slug: item.slug, isActive: true });
      if (!product) {
        return res.status(400).json({ error: `Product "${item.name}" is no longer available` });
      }
      subtotal += product.price * item.qty;
    }

    const shippingCostNum = shippingOption.price;
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
        shippingMethod: shippingOption.id,
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

      // ── Checkout Session paid: fulfill the order (idempotent) ────────────────
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        // completed fires even for async methods still pending — only fulfill paid
        if (session.payment_status === 'paid') {
          await fulfillCheckoutSession(session.id);
        }
        break;
      }

      // ── Async payment (e.g. bank debit) ultimately failed ────────────────────
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        console.warn(`❌ Async payment failed for checkout session ${session.id}`);
        break;
      }

      // ── Session expired without payment: nothing to undo ─────────────────────
      // (stock is only decremented at fulfillment, so abandonment costs nothing)
      case 'checkout.session.expired': {
        console.log(`Checkout session expired: ${event.data.object.id}`);
        break;
      }

      // ── Payment succeeded: mark order paid, decrement stock, send email ──────
      case 'payment_intent.succeeded': {
        const pi = event.data.object;

        // Idempotent: only transition orders that aren't already paid
        // (the order-create route may have marked it paid synchronously).
        const order = await Order.findOneAndUpdate(
          { stripePaymentIntentId: pi.id, paymentStatus: { $ne: 'paid' } },
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

          // Stock is decremented exactly once per order (guarded flag),
          // whether this webhook or the order-create route gets there first.
          await decrementStockForOrder(order);

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
          console.log(`❌ Payment failed for order ${order.orderNumber} (PI: ${pi.id})`);
          // Restore stock only if this order actually decremented it
          // (stock is now only taken on confirmed payment, so usually a no-op).
          await restoreStockForOrder(order);
        } else {
          console.warn(`⚠️  No order found for failed PI: ${pi.id}`);
        }
        break;
      }

      // ── Charge refunded ───────────────────────────────────────────────────────
      case 'charge.refunded': {
        const charge = event.data.object;
        // Match by charge ID, falling back to the payment intent ID
        const order = await Order.findOneAndUpdate(
          {
            $or: [
              { stripeChargeId: charge.id },
              ...(charge.payment_intent ? [{ stripePaymentIntentId: charge.payment_intent }] : []),
            ],
          },
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
