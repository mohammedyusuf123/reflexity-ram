const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  slug: { type: String, required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  qty: { type: Number, required: true, min: 1 },
}, { _id: false });

const addressSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  country: { type: String, required: true, default: 'US' },
  phone: { type: String },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
  },
  guestEmail: { type: String, lowercase: true, trim: true },
  items: [orderItemSchema],
  shippingAddress: { type: addressSchema, required: true },
  billingAddress: addressSchema,
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: { type: String, default: 'stripe' },
  stripePaymentIntentId: { type: String },
  stripeChargeId: { type: String },
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  shippingMethod: { type: String },
  trackingNumber: { type: String },
  trackingUrl: { type: String },
  notes: { type: String },
  adminNotes: { type: String },
  estimatedDelivery: { type: Date },
  shippedAt: { type: Date },
  deliveredAt: { type: Date },
  cancelledAt: { type: Date },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
  }],
}, {
  timestamps: true,
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ stripePaymentIntentId: 1 });

// Generate order number before saving
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.orderNumber = `RFX-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
