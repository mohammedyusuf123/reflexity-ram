const mongoose = require('mongoose');

// Editable content for informational pages (shipping, returns, warranty, faq).
// One document per page slug. Content is stored as sanitized HTML produced by
// the inline admin editor. If a page has no document yet, the frontend falls
// back to its built-in default content.
const pageContentSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      enum: ['shipping', 'returns', 'warranty', 'faq'],
    },
    title: { type: String, required: true, trim: true },
    // Sanitized HTML body
    html: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PageContent', pageContentSchema);
