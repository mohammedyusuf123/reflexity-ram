const RELOCATED_CLOUDINARY_ASSETS = new Map([
  [
    "https://res.cloudinary.com/akbuojoj/image/upload/v1785445409/reflexity-ram/products/product-1785445408907-uc07t4fnt.jpg",
    "https://res.cloudinary.com/dfquny0nk/image/upload/v1785445409/reflexity-ram/products/product-1785445408907-uc07t4fnt.jpg",
  ],
  [
    "https://res.cloudinary.com/akbuojoj/image/upload/v1783288682/reflexity-ram/products/product-1783288682346-dye6s9nnk.jpg",
    "https://res.cloudinary.com/dfquny0nk/image/upload/v1783288682/reflexity-ram/products/product-1783288682346-dye6s9nnk.jpg",
  ],
]);

/**
 * Accept both the API image shape ({ url, ... }) and legacy string URLs.
 * Two live product records point at Cloudinary copies that now return 404;
 * their original assets remain available in the legacy cloud account.
 */
export function imageUrl(image) {
  if (!image) return null;
  const url = typeof image === "string" ? image : image.url;
  if (!url) return null;
  return RELOCATED_CLOUDINARY_ASSETS.get(url) || url;
}
