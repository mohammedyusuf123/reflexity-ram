const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeProductPagination,
  buildProductSort,
} = require('../src/utils/pagination');
const { orderBelongsToUser } = require('../src/utils/orderAccess');
const { mergeCartItems } = require('../src/utils/guestCartMerge');
const { isFullyRefundedCharge } = require('../src/utils/refunds');
const {
  shouldDecrementStockForFulfillment,
  stockDecrementClaimFilter,
} = require('../src/utils/stock');

const product = (overrides = {}) => ({
  _id: 'product-id',
  slug: 'ddr5-32',
  sku: 'DDR5-32',
  name: 'Current DDR5 32GB',
  price: 129.99,
  images: [{ url: 'https://cdn.example/current.jpg' }],
  isActive: true,
  stock: 'in',
  stockQuantity: 50,
  ...overrides,
});

test('product pagination caps before calculating skip', () => {
  assert.deepEqual(normalizeProductPagination('2', '500'), {
    page: 2,
    limit: 100,
    skip: 100,
  });
  assert.deepEqual(normalizeProductPagination('not-a-page', '0'), {
    page: 1,
    limit: 24,
    skip: 0,
  });
});

test('product sorting has a deterministic _id tie-breaker', () => {
  assert.deepEqual(buildProductSort('createdAt', 'desc'), { createdAt: -1, _id: 1 });
  assert.deepEqual(buildProductSort('price', 'asc'), { price: 1, _id: 1 });
});

test('order ownership accepts both raw and populated ObjectIds', () => {
  const id = { toString: () => 'user-1' };
  assert.equal(orderBelongsToUser(id, 'user-1'), true);
  assert.equal(orderBelongsToUser({ _id: id, email: 'owner@example.com' }, 'user-1'), true);
  assert.equal(orderBelongsToUser({ _id: id }, 'user-2'), false);
});

test('order ownership handles the self-referencing _id getter on Mongoose ObjectIds', () => {
  const id = { toString: () => 'user-1' };
  id._id = id;
  assert.equal(orderBelongsToUser(id, 'user-1'), true);
  assert.equal(orderBelongsToUser({ _id: id }, 'user-1'), true);
});

test('guest cart merge refreshes details and caps the merged quantity to stock', () => {
  const items = mergeCartItems(
    [{ slug: 'ddr5-32', qty: 40, price: 1, sku: 'OLD', name: 'Old', image: 'old' }],
    [{ slug: 'ddr5-32', qty: 30, price: 2, sku: 'OLD-GUEST', name: 'Old guest', image: 'old' }],
    [product({ stockQuantity: 50 })],
  );

  assert.deepEqual(items, [{
    product: 'product-id',
    slug: 'ddr5-32',
    sku: 'DDR5-32',
    name: 'Current DDR5 32GB',
    price: 129.99,
    image: 'https://cdn.example/current.jpg',
    qty: 50,
  }]);
});

test('guest cart merge never adds inactive or out-of-stock guest items', () => {
  const items = mergeCartItems(
    [],
    [{ slug: 'out', qty: 1 }, { slug: 'inactive', qty: 1 }],
    [
      product({ slug: 'out', stock: 'out', stockQuantity: 4 }),
      product({ slug: 'inactive', isActive: false }),
    ],
  );

  assert.deepEqual(items, []);
});

test('guest cart merge preserves unavailable Mongoose subdocuments as plain items', () => {
  const unavailableItem = {
    slug: 'retired',
    toObject: () => ({
      product: 'retired-id',
      slug: 'retired',
      sku: 'RETIRED',
      name: 'Retired module',
      price: 10,
      image: '',
      qty: 1,
    }),
  };

  assert.deepEqual(mergeCartItems([unavailableItem], [], []), [{
    product: 'retired-id',
    slug: 'retired',
    sku: 'RETIRED',
    name: 'Retired module',
    price: 10,
    image: '',
    qty: 1,
  }]);
});

test('guest-only transfer obeys the cart maximum of 99', () => {
  const items = mergeCartItems([], [{ slug: 'ddr5-32', qty: 140 }], [product({ stockQuantity: 200 })]);
  assert.equal(items[0].qty, 99);
});

test('only a fully refunded Stripe charge is treated as a full refund', () => {
  assert.equal(isFullyRefundedCharge({ refunded: true, amount_refunded: 1000 }), true);
  assert.equal(isFullyRefundedCharge({ refunded: false, amount_refunded: 500 }), false);
  assert.equal(isFullyRefundedCharge(null), false);
});

test('Stripe recovery never re-decrements stock released by a terminal order', () => {
  assert.equal(shouldDecrementStockForFulfillment({ status: 'processing', stockDecremented: false }), true);
  assert.equal(shouldDecrementStockForFulfillment({ status: 'processing', stockDecremented: true }), false);
  assert.equal(shouldDecrementStockForFulfillment({ status: 'cancelled', stockDecremented: false }), false);
  assert.equal(shouldDecrementStockForFulfillment({ status: 'refunded', stockDecremented: false }), false);
  assert.deepEqual(stockDecrementClaimFilter('order-1'), {
    _id: 'order-1',
    stockDecremented: { $ne: true },
    status: { $nin: ['cancelled', 'refunded'] },
  });
});
