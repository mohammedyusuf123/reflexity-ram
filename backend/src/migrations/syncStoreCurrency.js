const Product = require('../models/Product');
const { CURRENCY } = require('../config/shipping');
const { ensureStripePrice } = require('../utils/stripeSync');

/**
 * Reconcile every active catalog listing with the configured Stripe currency.
 * Stripe Prices are immutable, so ensureStripePrice creates a replacement and
 * archives the superseded Price whenever stripePriceCurrency differs.
 */
async function syncActiveProductPrices({
  ProductModel = Product,
  ensurePrice = ensureStripePrice,
  logger = console,
} = {}) {
  const products = await ProductModel.find({ isActive: true }).sort({ _id: 1 });
  const result = {
    currency: CURRENCY,
    matched: products.length,
    synced: 0,
    failed: [],
  };

  for (const product of products) {
    try {
      const priceId = await ensurePrice(product);
      if (priceId) result.synced += 1;
    } catch (err) {
      const slug = product?.slug || product?._id?.toString() || 'unknown-product';
      result.failed.push({ slug, message: err.message });
      logger.warn(`Stripe currency sync failed for ${slug}:`, err.message);
    }
  }

  return result;
}

module.exports = { syncActiveProductPrices };
