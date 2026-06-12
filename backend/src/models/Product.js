const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String }, // Cloudinary public_id for deletion
  alt: { type: String },
}, { _id: false });

const productSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name too long'],
  },
  description: { type: String, trim: true },
  line: {
    type: String,
    enum: ['Desktop', 'Laptop', 'Laptop / Mini-PC', 'Server', 'Gaming / Enthusiast', 'Workstation', 'Mainstream'],
    required: true,
  },
  generation: {
    type: String,
    enum: ['DDR3', 'DDR4', 'DDR5'],
    required: true,
  },
  formFactor: {
    type: String,
    enum: ['UDIMM', 'SO-DIMM', 'RDIMM', 'LRDIMM'],
    required: true,
  },
  capacity: { type: Number, required: true }, // in GB
  capacityLabel: { type: String, required: true }, // e.g. "32GB"
  // ── Stripe sync ──────────────────────────────────────────────────────────────
  // Each product maps to a Stripe Product + active Price. Checkout Sessions are
  // built from these Price IDs. Synced automatically on admin create/update
  // (see utils/stripeSync.js); prices are immutable in Stripe, so a price change
  // creates a new Price and archives the old one.
  stripeProductId: { type: String },
  stripePriceId: { type: String },
  // Price the active Stripe Price was created at — lets us detect drift
  stripePriceAmount: { type: Number },
  kit: { type: String }, // e.g. "2 x 16GB"
  speed: { type: Number, required: true }, // in MT/s
  speedLabel: { type: String, required: true },
  cas: { type: String }, // e.g. "CL16"
  timings: { type: String },
  voltage: { type: String },
  ecc: { type: Boolean, default: false },
  rank: { type: String },
  profile: { type: String }, // XMP 3.0, JEDEC, etc.
  heatspreader: { type: String },
  rgb: { type: Boolean, default: false },
  // Free text — the store sells used/pulled modules, so a fixed enum was too
  // restrictive ("Used" was rejected, surfacing as a generic 500 in admin).
  condition: { type: String, required: true, trim: true },
  warranty: { type: String, required: true },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  compareAt: { type: Number, min: 0 },
  stock: {
    type: String,
    enum: ['in', 'low', 'out'],
    default: 'in',
  },
  stockLabel: { type: String },
  stockQuantity: { type: Number, default: 0, min: 0 },
  estimatedDispatch: { type: String },
  images: [imageSchema],
  tags: [{ type: String, trim: true }],
  compatibility: [{ type: String, trim: true }],
  included: [{ type: String, trim: true }],
  note: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  metaTitle: { type: String, trim: true },
  metaDescription: { type: String, trim: true },
}, {
  timestamps: true,
});

// Index for search and filtering
productSchema.index({ name: 'text', sku: 'text', tags: 'text' });
productSchema.index({ generation: 1, formFactor: 1, stock: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });

// Auto-update stockLabel based on stock field
productSchema.pre('save', function () {
  if (this.isModified('stock') || this.isModified('stockQuantity')) {
    if (this.stockQuantity === 0) {
      this.stock = 'out';
      this.stockLabel = 'Out of stock';
    } else if (this.stockQuantity <= 5) {
      this.stock = 'low';
      this.stockLabel = 'Low stock';
    } else {
      this.stock = 'in';
      this.stockLabel = 'In stock';
    }
  }
});

module.exports = mongoose.model('Product', productSchema);
