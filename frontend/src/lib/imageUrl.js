/**
 * Accept both the API image shape ({ url, ... }) and historical string values.
 * Provider migrations belong in the catalog data, not in rendering fallbacks.
 */
export function imageUrl(image) {
  if (!image) return null;
  const url = typeof image === "string" ? image : image.url;
  if (!url) return null;
  return url;
}
