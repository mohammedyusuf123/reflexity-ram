const Product = require('../models/Product');
const Order = require('../models/Order');

// Keep the human-readable stock fields in sync with stockQuantity.
const deriveStockState = (stockQuantity) => {
  const quantity = Number(stockQuantity);
  if (quantity <= 0) return { stock: 'out', stockLabel: 'Out of stock' };
  if (quantity <= 5) return { stock: 'low', stockLabel: 'Low stock' };
  return { stock: 'in', stockLabel: 'In stock' };
};

// Re-derive stock/stockLabel for a product after any quantity change.
const syncStockLabels = async (productId) => {
  const product = await Product.findById(productId).select('stockQuantity');
  if (!product) return;
  await Product.findByIdAndUpdate(productId, {
    $set: deriveStockState(product.stockQuantity),
  });
};

/**
 * Decrement stock for an order's items exactly once.
 * Idempotent: uses the order's `stockDecremented` flag as a guard, flipped
 * atomically so a webhook + order-create race can't double-decrement.
 */
const decrementStockForOrder = async (order) => {
  // Atomically claim the decrement. If another path already did it, skip.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, stockDecremented: { $ne: true } },
    { $set: { stockDecremented: true } },
    { new: true }
  );
  if (!claimed) return false; // already decremented elsewhere

  for (const item of order.items) {
    if (!item.product) continue;
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stockQuantity: -item.qty },
    });
    await syncStockLabels(item.product);
  }
  return true;
};

/**
 * Restore stock for an order's items (e.g. payment failed after decrement).
 * Only restores if the order actually decremented stock.
 */
const restoreStockForOrder = async (order) => {
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, stockDecremented: true },
    { $set: { stockDecremented: false } },
    { new: true }
  );
  if (!claimed) return false; // never decremented — nothing to restore

  for (const item of order.items) {
    if (!item.product) continue;
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stockQuantity: item.qty },
    });
    await syncStockLabels(item.product);
  }
  return true;
};

module.exports = { deriveStockState, syncStockLabels, decrementStockForOrder, restoreStockForOrder };
