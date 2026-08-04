const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxlength: 120 },
  body: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  verifiedPurchase: { type: Boolean, default: true },
  status: { type: String, enum: ['approved', 'rejected'], default: 'approved' },
}, { timestamps: true });

reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ product: 1, order: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
