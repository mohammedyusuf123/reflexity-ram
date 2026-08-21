const test = require('node:test');
const assert = require('node:assert/strict');

const shippingConfigPath = require.resolve('../src/config/shipping');

test('store defaults Stripe products and shipping to CAD', () => {
  const previousCurrency = process.env.STRIPE_CURRENCY;

  try {
    delete process.env.STRIPE_CURRENCY;
    delete require.cache[shippingConfigPath];

    const { CURRENCY, toStripeShippingOptions } = require('../src/config/shipping');
    assert.equal(CURRENCY, 'cad');

    const options = toStripeShippingOptions();
    assert.ok(options.length > 0);
    for (const option of options) {
      assert.equal(option.shipping_rate_data.fixed_amount.currency, 'cad');
    }
  } finally {
    if (previousCurrency === undefined) delete process.env.STRIPE_CURRENCY;
    else process.env.STRIPE_CURRENCY = previousCurrency;
    delete require.cache[shippingConfigPath];
  }
});
