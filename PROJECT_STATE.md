# Project State

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
