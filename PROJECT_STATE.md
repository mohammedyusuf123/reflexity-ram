# Project State

## 2026-08-10 — Render 8 PM failure investigation

- VERIFIED (GMAIL/RENDER): Render sent a deploy-failed notification at 8:06 PM and instance-failure notifications at 8:07–8:09 PM for commit `4116811`.
- VERIFIED (RUNTIME LOG): The failed instances exited because MongoDB rejected authentication. This was an environment credential problem, not a build/compiler failure in commit `4116811`.
- VERIFIED (RUNTIME): A manual deploy of the same commit connected to MongoDB and became live at 8:09 PM after the credential was corrected. Commit `14ed06b` then deployed successfully and became live at 8:14 PM.
- VERIFIED (RUNTIME): Production returned HTTP 200 for backend health, normalized product pagination, product feed, dynamic sitemap, storefront home, Server shop, wholesale, support, terms, and privacy. The Server shop rendered both active products. Health reported `env=production` and Stripe enabled.
- VERIFIED (TEST/BUILD): Secret scanning passed; all five frontend tests and ten runnable backend tests passed; the Atlas transaction test remained intentionally skipped without a disposable test database; the Vite production build succeeded.
- VERIFIED (STATIC/TEST/RUNTIME): Backend cleanup in commit `6571815` replaces Mongoose 9's deprecated `new: true` update option with `returnDocument: 'after'` and removes duplicate Order/Cart schema-index declarations. Model loading produced no duplicate-index or deprecation warnings locally, and the 9:31 PM Render startup connected to MongoDB and reached live status without those warnings.
- VERIFIED (RUNTIME): Both active product images still use the legacy `dfquny0nk` delivery hostname, but the exact legacy and current `fike` URLs return HTTP 200. This is data-hygiene debt, not the cause of the Render outage.

## 2026-08-10 — Repository credential incident remediation

Detailed report: [`docs/security/2026-08-10-credential-exposure-incident.md`](docs/security/2026-08-10-credential-exposure-incident.md)

- VERIFIED (GIT): `backend/.env` was removed from every reachable `main` commit, and historical MongoDB credential URIs, Cloudinary secrets, Resend keys, and authentication-secret assignments were replaced with inert markers. A full reachable-history scan reports zero matching credential values.
- VERIFIED (STATIC/TEST): `scripts/scan-secrets.mjs` now rejects tracked runtime `.env` files and detects refresh/session/Google client secret assignments in addition to the existing provider patterns. `npm run scan:secrets` passes on the cleaned tree.
- VERIFIED (GITHUB): The cleaned repository is public again so Render's existing GitHub credential can deploy it. GitHub native secret scanning and push protection are enabled. The connected OAuth token still lacks `workflow` scope, so no Actions workflow was added; native server-side enforcement is active instead.
- VERIFIED (PROVIDER/RUNTIME): Historical Resend keys are revoked and the current production Resend key does not match either historical key. The Atlas database-user password was regenerated; the historical URI now fails authentication, the replacement URI succeeds, and Render persisted it.
- VERIFIED (PROVIDER/RUNTIME): The current Cloudinary product environment is `fike` (renamed from `akbuojoj`). Its Aug 4 root key was not present in Git history, passed a controlled upload/delete test, and is configured in Render. Three unused non-root keys created during remediation are disabled.
- VERIFIED (DEPLOY/RUNTIME): Render deployment `dep-d9t5ttqfngtc73cqepk0` checked out cleaned commit `a88d3b6`, connected to MongoDB, started the server, and became live. `/api/health` returned `status=ok`; `/api/products?page=1&limit=1` returned one product in the paginated response.
- OPEN (LEGACY PROVIDER): The exposed credential for historical Cloudinary environment `dfquny0nk` tested active during this incident, but that environment is not in the currently accessible Cloudinary account and is not used by Render. Its owning account must disable that legacy key.

## 2026-08-10 — Storefront catalog navigation and loading

- VERIFIED (STATIC/BUILD): Shared desktop/mobile navigation order is `Shop RAM`, `Wholesale`, `Liquidation`, `Support`, `Guides`. Frontend tests and the Vite production build pass with this order.
- VERIFIED (RUNTIME): Wholesale email CTA uses an HTTPS Gmail compose URL instead of relying on an operating-system `mailto:` handler. Production opens a new Gmail compose tab addressed to `reflexityram@gmail.com` with subject `Wholesale RAM request`; commit `e9263d6` is live.
- VERIFIED (STATIC): Home and Categories now use `frontend/src/lib/catalog.js` as the source of truth for Desktop, Laptop, and Server URLs (`line=Desktop|Laptop|Server`). Shop still accepts legacy form-factor URLs, including `form=RDIMM&form=LRDIMM` for Server RAM.
- VERIFIED (STATIC): The Shop catalog loader requests every `/api/products` page at the backend-supported 100-item size, forwards cancellation through Axios, and orders same-timestamp records by identifier for stable display.
- VERIFIED (STATIC): `Header.jsx` imports `LayoutDashboard`, which is rendered for authenticated mobile admins.

## 2026-08-10 — Backend catalog, order, and cart correctness

- VERIFIED (TEST): `backend/src/utils/pagination.js` normalizes product `page` and `limit` before computing `skip`, caps public product pages at 100 items, and adds `_id` as a stable secondary sort key. `npm test` covers the capped page boundary.
- VERIFIED (TEST): `backend/src/utils/orderAccess.js` compares an authenticated owner against both raw ObjectIds and populated `order.user._id` values without changing admin or guest-email access rules.
- VERIFIED (TEST): `backend/src/utils/guestCartMerge.js` is now the shared signup/login guest-cart merger. It drops unavailable guest items, refreshes active product cart details from the catalog, and caps every merged/transfer quantity at live stock and 99.
- VERIFIED (STATIC/TEST): Stripe `charge.refunded` handling now distinguishes partial from full refunds without treating partial refunds as terminal. Admin cancellation calls the idempotent stock-restoration helper; refunds leave inventory unchanged pending physical return inspection.
- VERIFIED (TEST): Stripe fulfillment recovery skips cancelled/refunded orders, so a delayed webhook or repeated session-status request cannot re-decrement stock after cancellation restored it.
- VERIFIED (STATIC): Stock decrement/restoration updates the order guard, all affected products, derived stock labels, and per-item decrement quantities in MongoDB transactions. Admin cancellation status/history and restoration share the same transaction, preventing split-brain cancellation state after a crash.
- VERIFIED (STATIC): Admin product deletion is now a reversible soft deactivation that preserves product references in orders, carts, and reviews. The product table can reactivate inactive records, and the editor persists the ECC flag.
- VERIFIED (STATIC): Admin Products now consumes the existing `?stock=in|low|out` quick-action parameter and forwards it to the validated admin API filter.

## 2026-08-10 — Production deployment verification

- VERIFIED (RUNTIME): Cloudflare Pages project `reflexity-ram2` serves `reflexityram.com` and is connected to `mohammedyusuf123/reflexity-ram` on production branch `main`. The previous `reflexityram-create/reflexity-ram` connection was inaccessible and was replaced.
- VERIFIED (RUNTIME): Cloudflare deployment `6a645d8b` completed successfully from clean commit `01fc9d2d2be886ea3e8d7e1e19403e6dfe292b9a`. A fresh browser journey through Home -> Shop RAM -> Server RAM reached `/shop?line=Server` and rendered both active LRDIMM products.
- VERIFIED (RUNTIME): Desktop and Laptop category cards reach `/shop?line=Desktop` and `/shop?line=Laptop`; production currently has zero active inventory for both lines and renders the category-specific empty state.
- VERIFIED (RUNTIME): `https://reflexity-ram.onrender.com/api/products?page=bogus&limit=0` returns normalized `page: 1` and `limit: 24`, confirming the updated backend pagination path is deployed. `/api/health` reports `status: ok` and `env: production`.
- VERIFIED (ATLAS/TEST): `backend/test/atlas-stock-transaction.integration.test.js` ran against an isolated Atlas database with a temporary cluster-restricted user. It observed cancellation plus the first product's `5 -> 7`, `low -> in` writes inside the open transaction, injected a failure before the second restore, and verified the order, history, `stockDecremented`, item metadata, both products, and labels fully rolled back outside the transaction. Retrying the same cancellation then committed successfully.
- VERIFIED (CLEANUP): The integration run's exact-marker cleanup left zero Order and Product fixtures. The empty disposable database was dropped only after an administrator-side zero-count check, and the temporary Atlas user was deleted.
- VERIFIED (DEPLOY/RUNTIME): Render deployment `dep-d9t6inuq1p3s73ait860` checked out Atlas-test commit `14ed06ba6a7f0525686fa9e397f4d92e06456961`, connected to MongoDB, and became live. Fresh public probes returned HTTP 200 health with `env: production` and normalized product pagination with `page: 1`, `limit: 24`, and the two active Server products.
- UNKNOWN: This live integration proof calls the stock transaction helper directly. It does not exercise the authenticated admin cancellation HTTP route or orchestrate a truly concurrent Stripe webhook/session-recovery race against that route.

## 2026-08-10 — Atlas verification credential follow-up

- VERIFIED (SECURITY/PROVIDER): The production Atlas URI was displayed during interactive verification and was treated as exposed. Its password was rotated again, the previous password was revoked, and Render now stores the replacement URI.
- VERIFIED (DEPLOY/RUNTIME): Render deployment `dep-d9t6g5egekts73cbjhqg` connected to MongoDB with the rotated credential, started the API, and became live. `/api/health` returned HTTP 200 with `env: production`; the normalized product pagination probe returned the two active products.
