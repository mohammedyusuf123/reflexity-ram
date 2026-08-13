import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { proxyCatalogXml } from "../functions-shared/proxyCatalogXml.js";
import { onRequest as feedHandler } from "../functions/feed.xml.js";
import { onRequest as sitemapHandler } from "../functions/sitemap.xml.js";

const context = (method = "GET") => ({
  request: new Request("https://reflexityram.com/feed.xml", { method }),
});

test("Pages Functions expose the two live XML routes", () => {
  assert.equal(typeof feedHandler, "function");
  assert.equal(typeof sitemapHandler, "function");
});

test("catalog XML proxy requests the live backend and normalizes safe response headers", async () => {
  const calls = [];
  const response = await proxyCatalogXml(context(), "/feed.xml", {
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return new Response("<rss><channel /></rss>", {
        status: 200,
        headers: { ETag: '"catalog-v1"' },
      });
    },
  });

  assert.deepEqual(calls.map(({ url }) => url), [
    "https://reflexity-ram.onrender.com/feed.xml",
  ]);
  assert.equal(calls[0].init.method, "GET");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<rss><channel /></rss>");
  assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("x-reflexity-source"), "live-catalog-api");
  assert.equal(response.headers.get("etag"), '"catalog-v1"');
});

test("catalog XML proxy supports HEAD without returning a body", async () => {
  const response = await proxyCatalogXml(context("HEAD"), "/sitemap.xml", {
    fetchImpl: async (_url, init) => {
      assert.equal(init.method, "HEAD");
      return new Response(null, { status: 200 });
    },
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
});

test("catalog XML proxy rejects writes and fails closed on upstream errors", async () => {
  const writeResponse = await proxyCatalogXml(context("POST"), "/feed.xml");
  assert.equal(writeResponse.status, 405);
  assert.equal(writeResponse.headers.get("allow"), "GET, HEAD");

  const upstreamResponse = await proxyCatalogXml(context(), "/feed.xml", {
    fetchImpl: async () => new Response("failure", { status: 503 }),
    logger: { error() {} },
  });
  assert.equal(upstreamResponse.status, 502);
  assert.equal(upstreamResponse.headers.get("cache-control"), "no-store");
});

test("Pages route manifest invokes Functions only for feed and sitemap", async () => {
  const routes = JSON.parse(
    await readFile(new URL("../public/_routes.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(routes, {
    version: 1,
    include: ["/feed.xml", "/sitemap.xml"],
    exclude: [],
  });
});
