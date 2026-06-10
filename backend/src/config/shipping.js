// ─── Shipping options — single source of truth ─────────────────────────────────
// SECURITY: Shipping prices must NEVER be accepted from the client.
// The frontend sends only the option `id`; the server looks up the price here.
// Keep frontend/src/pages/Checkout.jsx SHIPPING_OPTIONS labels in sync for display.

const SHIPPING_OPTIONS = {
  standard: { id: 'standard', label: 'Standard Shipping', price: 0 },
  express: { id: 'express', label: 'Express Shipping', price: 12.99 },
  overnight: { id: 'overnight', label: 'Overnight Shipping', price: 29.99 },
};

const getShippingOption = (id) => SHIPPING_OPTIONS[id] || null;

module.exports = { SHIPPING_OPTIONS, getShippingOption };
