const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LEGACY_CLOUDINARY_IMAGE_REPLACEMENTS,
  migrateLegacyCloudinaryImageUrls,
} = require('../src/migrations/fixMerchantProductData');

test('legacy Cloudinary migration updates only exact image URLs and syncs changed products', async () => {
  const updates = [];
  const synced = [];
  const changedProduct = { slug: 'changed-product' };

  const ProductModel = {
    async findOneAndUpdate(filter, update, options) {
      updates.push({ filter, update, options });
      return updates.length === 1 ? changedProduct : null;
    },
  };

  const updated = await migrateLegacyCloudinaryImageUrls({
    ProductModel,
    syncProductDetails: async (product) => synced.push(product),
  });

  assert.equal(updated, 1);
  assert.deepEqual(synced, [changedProduct]);
  assert.equal(updates.length, LEGACY_CLOUDINARY_IMAGE_REPLACEMENTS.length);

  for (const [index, replacement] of LEGACY_CLOUDINARY_IMAGE_REPLACEMENTS.entries()) {
    assert.deepEqual(updates[index], {
      filter: { 'images.url': replacement.from },
      update: { $set: { 'images.$[image].url': replacement.to } },
      options: {
        arrayFilters: [{ 'image.url': replacement.from }],
        returnDocument: 'after',
        runValidators: true,
      },
    });
    assert.match(replacement.from, /res\.cloudinary\.com\/dfquny0nk\//);
    assert.match(replacement.to, /res\.cloudinary\.com\/fike\//);
  }
});

test('legacy Cloudinary migration is a no-op after all exact URLs are gone', async () => {
  let syncCalls = 0;
  const ProductModel = {
    async findOneAndUpdate() {
      return null;
    },
  };

  const updated = await migrateLegacyCloudinaryImageUrls({
    ProductModel,
    syncProductDetails: async () => { syncCalls += 1; },
  });

  assert.equal(updated, 0);
  assert.equal(syncCalls, 0);
});
