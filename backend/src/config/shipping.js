// ─── Shipping options — single source of truth ─────────────────────────────────
// SECURITY: Shipping prices must NEVER be accepted from the client.
// The frontend sends only the option `id`; the server looks up the price here.
// Keep frontend/src/pages/Checkout.jsx SHIPPING_OPTIONS labels in sync for display.

const SHIPPING_OPTIONS = {
  standard: { id: 'standard', label: 'Standard Shipping', price: 0, minDays: 5, maxDays: 7 },
  express: { id: 'express', label: 'Express Shipping', price: 12.99, minDays: 2, maxDays: 3 },
  overnight: { id: 'overnight', label: 'Overnight Shipping', price: 29.99, minDays: 1, maxDays: 1 },
};

const getShippingOption = (id) => SHIPPING_OPTIONS[id] || null;

// Store currency for Stripe (lowercase ISO). Change via env when switching to CAD.
const CURRENCY = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

// Countries we ship to — enforced by Stripe's hosted checkout, which also
// renders the correct address form per country (Province/Postal code for CA,
// State/ZIP for US) automatically.
const ALLOWED_SHIPPING_COUNTRIES = ['CA', 'US'];

// Build Stripe Checkout `shipping_options` from the same table the rest of
// the app uses, so display prices and charged prices can never diverge.
// tax_behavior 'exclusive': Stripe Tax adds tax on top of shipping where the
// destination province taxes shipping (most Canadian provinces do).
const toStripeShippingOptions = () =>
  Object.values(SHIPPING_OPTIONS).map((opt) => ({
    shipping_rate_data: {
      type: 'fixed_amount',
      display_name: opt.label,
      fixed_amount: { amount: Math.round(opt.price * 100), currency: CURRENCY },
      tax_behavior: 'exclusive',
      delivery_estimate: {
        minimum: { unit: 'business_day', value: opt.minDays },
        maximum: { unit: 'business_day', value: opt.maxDays },
      },
      metadata: { optionId: opt.id },
    },
  }));

module.exports = {
  SHIPPING_OPTIONS,
  getShippingOption,
  CURRENCY,
  ALLOWED_SHIPPING_COUNTRIES,
  toStripeShippingOptions,
};
