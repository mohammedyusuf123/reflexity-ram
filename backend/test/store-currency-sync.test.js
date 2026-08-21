const test = require('node:test');
const assert = require('node:assert/strict');

const { syncActiveProductPrices } = require('../src/migrations/syncStoreCurrency');

test('currency reconciliation syncs every active product and reports failures', async () => {
  const products = [
    { _id: '1', slug: 'first-listing' },
    { _id: '2', slug: 'second-listing' },
    { _id: '3', slug: 'third-listing' },
  ];
  const calls = [];
  const warnings = [];
  const ProductModel = {
    find(filter) {
      assert.deepEqual(filter, { isActive: true });
      return {
        async sort(order) {
          assert.deepEqual(order, { _id: 1 });
          return products;
        },
      };
    },
  };

  const result = await syncActiveProductPrices({
    ProductModel,
    ensurePrice: async (product) => {
      calls.push(product.slug);
      if (product.slug === 'second-listing') throw new Error('synthetic Stripe failure');
      return `price_${product._id}`;
    },
    logger: { warn: (...args) => warnings.push(args) },
  });

  assert.deepEqual(calls, ['first-listing', 'second-listing', 'third-listing']);
  assert.equal(result.currency, 'cad');
  assert.equal(result.matched, 3);
  assert.equal(result.synced, 2);
  assert.deepEqual(result.failed, [
    { slug: 'second-listing', message: 'synthetic Stripe failure' },
  ]);
  assert.equal(warnings.length, 1);
});
