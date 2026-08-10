# Project State

## 2026-08-10 — Repository credential incident remediation

- VERIFIED (GIT): `backend/.env` was removed from every reachable `main` commit, and historical MongoDB credential URIs, Cloudinary secrets, Resend keys, and authentication-secret assignments were replaced with inert markers. A full reachable-history scan reports zero matching credential values.
- VERIFIED (STATIC/TEST): `scripts/scan-secrets.mjs` now rejects tracked runtime `.env` files and detects refresh/session/Google client secret assignments in addition to the existing provider patterns. `npm run scan:secrets` passes on the cleaned tree.
- BLOCKED (GITHUB AUTH): The connected GitHub OAuth token lacks `workflow` scope, so GitHub rejected creation of a push/PR Actions workflow. Native secret scanning or a workflow-authorized token is still required for server-side enforcement.
- VERIFIED (PROVIDER): The GitHub repository is private. Historical Resend keys are revoked and the current production Resend key does not match either historical key.
- PENDING (PROVIDER): Rotate the still-valid historical MongoDB database-user password and Cloudinary API secret, update Render, then verify the old credentials fail and production health remains green.

## 2026-08-10 — Storefront catalog navigation and loading

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
- UNKNOWN: MongoDB transaction rollback and Stripe webhook/cancellation races are covered by guard/helper unit tests and independent static review, but no disposable Atlas integration database was available for route-level rollback testing.
