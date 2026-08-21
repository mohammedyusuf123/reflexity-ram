import assert from "node:assert/strict";
import test from "node:test";
import {
  formatStorePrice,
  formatStorePriceWithCode,
  STANDARD_SHIPPING_PRICE,
  STORE_CURRENCY_CODE,
  STORE_CURRENCY_NAME,
} from "../src/lib/currency.js";

test("storefront prices default to CAD", () => {
  assert.equal(STORE_CURRENCY_CODE, "CAD");
  assert.equal(STORE_CURRENCY_NAME, "Canadian dollars (CAD)");
  assert.equal(STANDARD_SHIPPING_PRICE, 14);
  assert.equal(formatStorePrice(1299.5), "$1,299.50");
  assert.equal(formatStorePriceWithCode(14, 0), "$14 CAD");
});
