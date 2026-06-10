// ─── Stripe Product/Price sync ─────────────────────────────────────────────────
// Every store product maps to one Stripe Product and one ACTIVE Stripe Price,
// stored on the document as stripeProductId / stripePriceId. Checkout Sessions
// are built from these Price IDs (never ad-hoc price_data), per store policy.
//
// Stripe Prices are immutable: when the product's price changes, we create a
// new Price, point the product at it, and archive the old one.
//
// tax_behavior 'exclusive': listed prices are pre-tax; Stripe Tax adds the
// destination tax (e.g. Ontario HST 13%) on top at checkout.

const { CURRENCY } = require('../config/shipping');

const STRIPE_ENABLED =
  process.env.STRIPE_SECRET_KEY &&
  (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ||
    process.env.STRIPE_SECRET_KEY.startsWith('sk_live_'));

const stripe = STRIPE_ENABLED ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Ensure `product` (a Mongoose Product doc) has a Stripe Product and an
 * active Stripe Price matching its current price. Saves IDs back to the doc.
 * Returns the active stripePriceId, or null if Stripe isn't configured.
 */
const ensureStripePrice = async (product) => {
  if (!stripe) return null;

  const amount = Math.round(product.price * 100);

  // 1. Ensure the Stripe Product exists
  if (!product.stripeProductId) {
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description || undefined,
      images: product.images?.[0]?.url ? [product.images[0].url] : undefined,
      metadata: {
        slug: product.slug,
        sku: product.sku,
        productId: product._id.toString(),
      },
    });
    product.stripeProductId = stripeProduct.id;
  }

  // 2. Ensure the active Price matches the current amount
  const priceChanged = product.stripePriceAmount !== amount;
  if (!product.stripePriceId || priceChanged) {
    const oldPriceId = product.stripePriceId;

    const stripePrice = await stripe.prices.create({
      product: product.stripeProductId,
      unit_amount: amount,
      currency: CURRENCY,
      tax_behavior: 'exclusive',
      metadata: { slug: product.slug },
    });

    product.stripePriceId = stripePrice.id;
    product.stripePriceAmount = amount;

    // Archive the superseded price (non-fatal if it fails)
    if (oldPriceId) {
      try {
        await stripe.prices.update(oldPriceId, { active: false });
      } catch (err) {
        console.warn(`Could not archive old Stripe price ${oldPriceId}:`, err.message);
      }
    }
  }

  await product.save();
  return product.stripePriceId;
};

/**
 * Keep Stripe Product display fields (name/description/image) fresh after
 * an admin edit. Non-fatal — checkout works off the Price ID regardless.
 */
const syncStripeProductDetails = async (product) => {
  if (!stripe || !product.stripeProductId) return;
  try {
    await stripe.products.update(product.stripeProductId, {
      name: product.name,
      description: product.description || undefined,
      images: product.images?.[0]?.url ? [product.images[0].url] : undefined,
    });
  } catch (err) {
    console.warn(`Stripe product detail sync failed for ${product.slug}:`, err.message);
  }
};

module.exports = { ensureStripePrice, syncStripeProductDetails, STRIPE_ENABLED };
