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
 *
 * Idempotent: uses the order's `stockDecremented` flag as a guard, flipped
 * atomically so a webhook + fallback-fulfillment race can't double-decrement.
 *
 * Race-safe against overselling: each item is decremented with a conditional
 * update (`stockQuantity >= qty`). If two paid orders race for the last
 * units, the loser's decrement is clamped at zero instead of driving stock
 * negative, the actual amount taken is recorded on the order item
 * (`decrementedQty`), and the order is flagged for admin review — the
 * customer has already paid, so this must be resolved manually
 * (restock, partial refund, or substitute).
 */
const decrementStockForOrder = async (order) => {
  // Atomically claim the decrement. If another path already did it, skip.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, stockDecremented: { $ne: true } },
    { $set: { stockDecremented: true } },
    { new: true }
  );
  if (!claimed) return false; // already decremented elsewhere

  const oversoldItems = [];

  for (const item of order.items) {
    if (!item.product) continue;

    // Fast path: enough stock — take the full quantity atomically.
    const full = await Product.findOneAndUpdate(
      { _id: item.product, stockQuantity: { $gte: item.qty } },
      { $inc: { stockQuantity: -item.qty } },
      { new: false }
    );

    if (full) {
      item.decrementedQty = item.qty;
    } else {
      // Oversold: clamp at zero (aggregation pipeline update is atomic) and
      // record how many units were actually available to take.
      const pre = await Product.findOneAndUpdate(
        { _id: item.product },
        [{ $set: { stockQuantity: { $max: [0, { $subtract: ['$stockQuantity', item.qty] }] } } }],
        { new: false }
      );
      const available = Math.max(0, pre?.stockQuantity ?? 0);
      item.decrementedQty = Math.min(available, item.qty);
      oversoldItems.push(`${item.sku} (wanted ${item.qty}, got ${item.decrementedQty})`);
    }

    await syncStockLabels(item.product);
  }

  // Persist per-item decrementedQty so restores are exact.
  await Order.updateOne({ _id: order._id }, { $set: { items: order.items } });

  if (oversoldItems.length > 0) {
    const note = `OVERSOLD — needs manual review: ${oversoldItems.join('; ')}`;
    console.error(`🚨 Order ${order.orderNumber}: ${note}`);
    await Order.updateOne(
      { _id: order._id },
      {
        $set: { adminNotes: note },
        $push: { statusHistory: { status: 'processing', note, timestamp: new Date() } },
      }
    );
  }

  return true;
};

/**
 * Restore stock for an order's items (e.g. admin-cancelled after decrement).
 * Only restores if the order actually decremented stock, and restores exactly
 * what was taken (decrementedQty), not the ordered qty — so a clamped
 * oversell decrement never inflates stock on restore.
 */
const restoreStockForOrder = async (order) => {
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, stockDecremented: true },
    { $set: { stockDecremented: false } },
    { new: true }
  );
  if (!claimed) return false; // never decremented — nothing to restore

  // Use the claimed (fresh) doc: it has the persisted decrementedQty values.
  for (const item of claimed.items) {
    if (!item.product) continue;
    const restoreQty = item.decrementedQty ?? item.qty; // legacy orders: full qty
    if (restoreQty <= 0) continue;
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stockQuantity: restoreQty },
    });
    await syncStockLabels(item.product);
  }
  return true;
};

module.exports = { deriveStockState, syncStockLabels, decrementStockForOrder, restoreStockForOrder };
