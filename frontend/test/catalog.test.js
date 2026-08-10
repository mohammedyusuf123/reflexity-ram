import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchAllCatalogProducts,
  getCatalogCategoryLabel,
  matchesCatalogLines,
  RAM_CATEGORIES,
} from "../src/lib/catalog.js";

test("RAM category URLs use line as the top-level category authority", () => {
  assert.deepEqual(
    new URLSearchParams(RAM_CATEGORIES.desktop.href.split("?")[1]).getAll("form"),
    [],
  );
  assert.deepEqual(
    new URLSearchParams(RAM_CATEGORIES.desktop.href.split("?")[1]).getAll("line"),
    ["Desktop"],
  );
  assert.deepEqual(
    new URLSearchParams(RAM_CATEGORIES.laptop.href.split("?")[1]).getAll("form"),
    [],
  );
  assert.deepEqual(
    new URLSearchParams(RAM_CATEGORIES.laptop.href.split("?")[1]).getAll("line"),
    ["Laptop"],
  );
  assert.deepEqual(
    new URLSearchParams(RAM_CATEGORIES.server.href.split("?")[1]).getAll("form"),
    [],
  );
  assert.deepEqual(
    new URLSearchParams(RAM_CATEGORIES.server.href.split("?")[1]).getAll("line"),
    ["Server"],
  );
});

test("catalog labels support line links and the legacy repeated Server form URL", () => {
  assert.equal(getCatalogCategoryLabel([], [], ["Desktop"], false), "Desktop RAM");
  assert.equal(getCatalogCategoryLabel([], [], ["Laptop"], false), "Laptop RAM");
  assert.equal(getCatalogCategoryLabel([], [], ["Server"], false), "Server RAM");
  assert.equal(getCatalogCategoryLabel([], ["RDIMM", "LRDIMM"], [], false), "Server RAM");
});

test("line filters retain Server products regardless of form factor", () => {
  assert.equal(matchesCatalogLines({ line: "Server", formFactor: "UDIMM" }, ["Server"]), true);
  assert.equal(matchesCatalogLines({ line: "Server", formFactor: "SO-DIMM" }, ["Server"]), true);
  assert.equal(matchesCatalogLines({ line: "Desktop", formFactor: "UDIMM" }, ["Server"]), false);
  assert.equal(matchesCatalogLines({ line: "Server" }, ["Desktop", "Server"]), true);
});

test("fetchAllCatalogProducts requests every backend page and orders ties consistently", async () => {
  const requestedPages = [];
  const pageResponses = {
    1: {
      products: [
        { _id: "a", createdAt: "2026-01-01T00:00:00.000Z" },
        { _id: "c", createdAt: "2026-02-01T00:00:00.000Z" },
      ],
      pagination: { pages: 3 },
    },
    2: {
      products: [{ _id: "b", createdAt: "2026-01-01T00:00:00.000Z" }],
    },
    3: {
      products: [{ _id: "d", createdAt: "2025-01-01T00:00:00.000Z" }],
    },
  };

  const products = await fetchAllCatalogProducts(async ({ page, limit }) => {
    requestedPages.push({ page, limit });
    return { data: pageResponses[page] };
  });

  assert.deepEqual(requestedPages, [
    { page: 1, limit: 100 },
    { page: 2, limit: 100 },
    { page: 3, limit: 100 },
  ]);
  assert.deepEqual(products.map((product) => product._id), ["c", "b", "a", "d"]);
});

test("fetchAllCatalogProducts stops before requesting a later page when cancelled", async () => {
  const controller = new AbortController();
  const requestedPages = [];

  await assert.rejects(
    fetchAllCatalogProducts(async ({ page }) => {
      requestedPages.push(page);
      controller.abort();
      return { data: { products: [], pagination: { pages: 2 } } };
    }, { signal: controller.signal }),
    { name: "AbortError" },
  );

  assert.deepEqual(requestedPages, [1]);
});
