const Product = require('../models/Product');
const { syncStripeProductDetails } = require('../utils/stripeSync');

const LEGACY_CLOUDINARY_IMAGE_REPLACEMENTS = [
  {
    from: 'https://res.cloudinary.com/dfquny0nk/image/upload/v1785445409/reflexity-ram/products/product-1785445408907-uc07t4fnt.jpg',
    to: 'https://res.cloudinary.com/fike/image/upload/v1785445409/reflexity-ram/products/product-1785445408907-uc07t4fnt.jpg',
  },
  {
    from: 'https://res.cloudinary.com/dfquny0nk/image/upload/v1783288682/reflexity-ram/products/product-1783288682346-dye6s9nnk.jpg',
    to: 'https://res.cloudinary.com/fike/image/upload/v1783288682/reflexity-ram/products/product-1783288682346-dye6s9nnk.jpg',
  },
];

// One-time normalization for the two products that existed before explicit
// manufacturer identifiers were added. The brand-not-present guard makes this
// idempotent and prevents a later admin edit from being overwritten on restart.
const corrections = [
  {
    sku: 'RFX-SAMSUNG-64GB-DDR4-3200-ECC-REG',
    values: {
      name: 'Samsung 64GB DDR4-3200 ECC LRDIMM Server Memory PC4-3200AA 4Rx4 M386A8K40DM2-CWEZY',
      description: 'Samsung 64GB DDR4-3200 ECC load-reduced server memory (LRDIMM), 4Rx4, 1.2V. Manufacturer part number M386A8K40DM2-CWEZY. Used and individually tested.',
      brand: 'Samsung',
      mpn: 'M386A8K40DM2-CWEZY',
      formFactor: 'LRDIMM',
      ecc: true,
      rank: '4Rx4',
      'images.0.url': 'https://res.cloudinary.com/fike/image/upload/v1785445409/reflexity-ram/products/product-1785445408907-uc07t4fnt.jpg',
      'images.0.alt': 'Samsung M386A8K40DM2-CWEZY 64GB DDR4 LRDIMM',
    },
  },
  {
    sku: 'RFX-SK-HYNIX-64GB-DDR4-ECC-LRDIMM-',
    values: {
      name: 'SK hynix 64GB DDR4-2666 ECC LRDIMM Server Memory 4Rx4 HMAA8GL7CPR4N-VK',
      description: 'SK hynix 64GB DDR4-2666 ECC load-reduced server memory (LRDIMM), 4Rx4, 1.2V. Manufacturer part number HMAA8GL7CPR4N-VK. Used and individually tested.',
      brand: 'SK hynix',
      mpn: 'HMAA8GL7CPR4N-VK',
      formFactor: 'LRDIMM',
      ecc: true,
      rank: '4Rx4',
      'images.0.url': 'https://res.cloudinary.com/fike/image/upload/v1783288682/reflexity-ram/products/product-1783288682346-dye6s9nnk.jpg',
      'images.0.alt': 'SK hynix HMAA8GL7CPR4N-VK 64GB DDR4 LRDIMM',
    },
  },
];

async function migrateLegacyCloudinaryImageUrls({
  ProductModel = Product,
  syncProductDetails = syncStripeProductDetails,
} = {}) {
  let updated = 0;

  for (const replacement of LEGACY_CLOUDINARY_IMAGE_REPLACEMENTS) {
    const product = await ProductModel.findOneAndUpdate(
      { 'images.url': replacement.from },
      { $set: { 'images.$[image].url': replacement.to } },
      {
        arrayFilters: [{ 'image.url': replacement.from }],
        returnDocument: 'after',
        runValidators: true,
      },
    );
    if (!product) continue;

    updated += 1;
    await syncProductDetails(product);
  }

  return updated;
}

async function fixMerchantProductData() {
  let updated = 0;
  for (const correction of corrections) {
    const product = await Product.findOneAndUpdate(
      { sku: correction.sku, brand: { $exists: false } },
      { $set: correction.values },
      { returnDocument: 'after', runValidators: true },
    );
    if (!product) continue;
    updated += 1;
    try {
      await syncStripeProductDetails(product);
    } catch (err) {
      console.warn(`Stripe metadata sync failed for ${correction.sku}:`, err.message);
    }
  }
  if (updated > 0) console.log(`Normalized ${updated} legacy product record(s) for Merchant Center`);

  const migratedImages = await migrateLegacyCloudinaryImageUrls();
  if (migratedImages > 0) {
    console.log(`Migrated ${migratedImages} legacy Cloudinary product image URL(s)`);
  }
}

module.exports = {
  LEGACY_CLOUDINARY_IMAGE_REPLACEMENTS,
  fixMerchantProductData,
  migrateLegacyCloudinaryImageUrls,
};
