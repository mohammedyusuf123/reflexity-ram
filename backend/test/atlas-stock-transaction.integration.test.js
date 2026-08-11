const crypto = require('crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const { cancelOrderAndRestoreStock } = require('../src/utils/stock');

const ATLAS_OPT_IN = process.env.RUN_ATLAS_TRANSACTION_TESTS === '1';
const ATLAS_URI = process.env.ATLAS_TEST_URI;
const ATLAS_DATABASE = process.env.ATLAS_TEST_DATABASE;
const DISPOSABLE_DATABASE_PREFIX = 'rfx_atlas_txn_test_';
const MAX_ATLAS_DATABASE_NAME_BYTES = 38;

const requireSafeAtlasUri = (uri) => {
  if (typeof uri !== 'string' || !uri) {
    throw new Error('ATLAS_TEST_URI is required when RUN_ATLAS_TRANSACTION_TESTS=1');
  }
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('ATLAS_TEST_URI must be a valid Atlas connection URI');
  }

  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'mongodb+srv:' || !host.endsWith('.mongodb.net')) {
    throw new Error('Refusing transaction test: ATLAS_TEST_URI must use mongodb+srv on an Atlas mongodb.net host');
  }
};

const requireDisposableDatabaseName = (databaseName) => {
  if (typeof databaseName !== 'string' || !databaseName) {
    throw new Error('ATLAS_TEST_DATABASE is required');
  }
  if (!new RegExp(`^${DISPOSABLE_DATABASE_PREFIX}[a-z0-9_]+$`).test(databaseName)) {
    throw new Error(`Refusing transaction test: ATLAS_TEST_DATABASE must start with ${DISPOSABLE_DATABASE_PREFIX}`);
  }
  if (Buffer.byteLength(databaseName, 'utf8') > MAX_ATLAS_DATABASE_NAME_BYTES) {
    throw new Error(`Refusing transaction test: ATLAS_TEST_DATABASE must be at most ${MAX_ATLAS_DATABASE_NAME_BYTES} bytes for Atlas`);
  }
};

const productData = (runMarker, suffix, stockQuantity) => ({
  slug: `atlas-test-${runMarker}-${suffix}`,
  sku: `ATLAS-TEST-${runMarker}-${suffix}`,
  name: `Atlas transaction test ${runMarker} ${suffix}`,
  line: 'Desktop',
  generation: 'DDR4',
  formFactor: 'UDIMM',
  capacity: 16,
  capacityLabel: '16GB',
  speed: 3200,
  speedLabel: '3200 MT/s',
  condition: 'New',
  warranty: 'Test only',
  price: 10,
  stockQuantity,
  isActive: true,
  tags: [runMarker],
});

const shippingAddress = {
  firstName: 'Atlas',
  lastName: 'Test',
  line1: '1 Transaction Way',
  city: 'Toronto',
  state: 'ON',
  zip: 'M5V 1E3',
  country: 'CA',
};

const createDecrementedOrder = async (runMarker, suffix, products) => Order.create({
  orderNumber: `ATLAS-${runMarker}-${suffix}`,
  items: products.map((product) => ({
    product: product._id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    price: product.price,
    qty: 2,
    decrementedQty: 2,
  })),
  shippingAddress,
  status: 'processing',
  paymentStatus: 'paid',
  subtotal: 20,
  total: 20,
  stockDecremented: true,
  notes: runMarker,
  statusHistory: [{ status: 'processing', note: 'pre-existing history' }],
});

const cancelUpdates = () => ({
  $set: { status: 'cancelled', cancelledAt: new Date() },
  $push: { statusHistory: { status: 'cancelled', note: 'Atlas test cancellation' } },
});

const snapshot = async (orderId, productIds) => ({
  order: await Order.findById(orderId).lean(),
  products: await Product.find({ _id: { $in: productIds } }).sort({ sku: 1 }).lean(),
});

test('Atlas transaction commits cancellation and rolls back a mid-restore failure', {
  skip: ATLAS_OPT_IN
    ? false
    : 'Set RUN_ATLAS_TRANSACTION_TESTS=1 with ATLAS_TEST_URI and a disposable ATLAS_TEST_DATABASE to run this test',
  timeout: 60000,
}, async () => {
  requireSafeAtlasUri(ATLAS_URI);
  requireDisposableDatabaseName(ATLAS_DATABASE);
  const databaseName = ATLAS_DATABASE;
  const runMarker = `rfx_atlas_txn_${Date.now()}_${crypto.randomUUID().replaceAll('-', '')}`;
  let connected = false;

  try {
    await mongoose.connect(ATLAS_URI, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 15000,
    });
    connected = true;

    assert.equal(mongoose.connection.name, databaseName, 'must only use the explicitly provided disposable database');
    assert.match(databaseName, new RegExp(`^${DISPOSABLE_DATABASE_PREFIX}[a-z0-9_]+$`));

    const successProducts = await Product.create([
      productData(runMarker, 'commit-a', 1),
      productData(runMarker, 'commit-b', 4),
    ]);
    const successOrder = await createDecrementedOrder(runMarker, 'commit', successProducts);

    const committed = await cancelOrderAndRestoreStock(successOrder._id, cancelUpdates());
    assert.equal(String(committed), String(successOrder._id));

    const committedState = await snapshot(successOrder._id, successProducts.map(product => product._id));
    assert.equal(committedState.order.status, 'cancelled');
    assert.equal(committedState.order.stockDecremented, false);
    assert.equal(committedState.order.statusHistory.length, 2);
    assert.equal(committedState.order.statusHistory.at(-1).note, 'Atlas test cancellation');
    assert.deepEqual(committedState.order.items.map(item => item.decrementedQty), [2, 2]);
    assert.deepEqual(
      committedState.products.map(product => [product.stockQuantity, product.stock, product.stockLabel]),
      [[3, 'low', 'Low stock'], [6, 'in', 'In stock']],
    );

    const rollbackProducts = await Product.create([
      productData(runMarker, 'rollback-a', 5),
      productData(runMarker, 'rollback-b', 4),
    ]);
    const rollbackOrder = await createDecrementedOrder(runMarker, 'rollback', rollbackProducts);
    const beforeFailure = await snapshot(rollbackOrder._id, rollbackProducts.map(product => product._id));
    const fixtureCountsBeforeFailure = {
      orders: await Order.countDocuments(),
      products: await Product.countDocuments(),
    };

    const originalFindByIdAndUpdate = Product.findByIdAndUpdate;
    let injected = false;
    let observedInsideTransaction;
    Product.findByIdAndUpdate = async function patchedFindByIdAndUpdate(id, update, options) {
      if (
        !injected
        && String(id) === String(rollbackProducts[1]._id)
        && update?.$inc?.stockQuantity === 2
        && options?.session
      ) {
        injected = true;
        const [firstProductInTransaction, orderInTransaction] = await Promise.all([
          Product.findById(rollbackProducts[0]._id).session(options.session).lean(),
          Order.findById(rollbackOrder._id).session(options.session).lean(),
        ]);
        observedInsideTransaction = {
          firstProduct: {
            stockQuantity: firstProductInTransaction.stockQuantity,
            stock: firstProductInTransaction.stock,
            stockLabel: firstProductInTransaction.stockLabel,
          },
          order: {
            status: orderInTransaction.status,
            stockDecremented: orderInTransaction.stockDecremented,
            historyLength: orderInTransaction.statusHistory.length,
            latestHistoryNote: orderInTransaction.statusHistory.at(-1).note,
          },
        };
        assert.deepEqual(observedInsideTransaction, {
          firstProduct: { stockQuantity: 7, stock: 'in', stockLabel: 'In stock' },
          order: {
            status: 'cancelled',
            stockDecremented: false,
            historyLength: 2,
            latestHistoryNote: 'Atlas test cancellation',
          },
        });
        throw new Error('Injected Atlas transaction failure');
      }
      return originalFindByIdAndUpdate.call(this, id, update, options);
    };

    try {
      await assert.rejects(
        () => cancelOrderAndRestoreStock(rollbackOrder._id, cancelUpdates()),
        /Injected Atlas transaction failure/,
      );
    } finally {
      Product.findByIdAndUpdate = originalFindByIdAndUpdate;
    }

    assert.equal(injected, true, 'failure must occur after the first restore write');
    assert.deepEqual(observedInsideTransaction, {
      firstProduct: { stockQuantity: 7, stock: 'in', stockLabel: 'In stock' },
      order: {
        status: 'cancelled',
        stockDecremented: false,
        historyLength: 2,
        latestHistoryNote: 'Atlas test cancellation',
      },
    });
    const rolledBackState = await snapshot(rollbackOrder._id, rollbackProducts.map(product => product._id));
    assert.deepEqual(rolledBackState.order, beforeFailure.order);
    assert.deepEqual(rolledBackState.products, beforeFailure.products);
    assert.deepEqual({
      orders: await Order.countDocuments(),
      products: await Product.countDocuments(),
    }, fixtureCountsBeforeFailure);

    const retried = await cancelOrderAndRestoreStock(rollbackOrder._id, cancelUpdates());
    assert.equal(String(retried), String(rollbackOrder._id));
    const retriedState = await snapshot(rollbackOrder._id, rollbackProducts.map(product => product._id));
    assert.equal(retriedState.order.status, 'cancelled');
    assert.equal(retriedState.order.stockDecremented, false);
    assert.equal(retriedState.order.statusHistory.length, 2);
    assert.deepEqual(
      retriedState.products.map(product => [product.stockQuantity, product.stock, product.stockLabel]),
      [[7, 'in', 'In stock'], [6, 'in', 'In stock']],
    );
  } finally {
    if (connected) {
      // Guard the marker-scoped cleanup: this must still be the explicitly
      // provided disposable database, never the supplied URI's path database
      // or another environment.
      try {
        assert.equal(mongoose.connection.name, databaseName);
        assert.match(databaseName, new RegExp(`^${DISPOSABLE_DATABASE_PREFIX}[a-z0-9_]+$`));
        await Order.deleteMany({ notes: runMarker });
        await Product.deleteMany({ tags: runMarker });
        assert.equal(await Order.countDocuments({ notes: runMarker }), 0);
        assert.equal(await Product.countDocuments({ tags: runMarker }), 0);
      } finally {
        await mongoose.disconnect();
      }
    }
  }
});
