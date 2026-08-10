const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

const positiveSafeIntegerOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Normalize public product-list pagination before it is used for both skip and
 * limit. Applying the limit cap first keeps page boundaries contiguous when a
 * client requests a value above the server maximum.
 */
const normalizeProductPagination = (page, limit) => {
  const normalizedLimit = Math.min(positiveSafeIntegerOr(limit, DEFAULT_LIMIT), MAX_LIMIT);
  const requestedPage = positiveSafeIntegerOr(page, DEFAULT_PAGE);
  const maxPage = Math.floor(Number.MAX_SAFE_INTEGER / normalizedLimit) + 1;
  const normalizedPage = Math.min(requestedPage, maxPage);

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit,
  };
};

// MongoDB does not guarantee an order between documents with equal values for
// the requested field. `_id` makes page boundaries stable across those ties.
const buildProductSort = (field, order) => ({
  [field]: order === 'asc' ? 1 : -1,
  _id: 1,
});

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  normalizeProductPagination,
  buildProductSort,
};
