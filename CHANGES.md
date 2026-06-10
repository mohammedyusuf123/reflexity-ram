# Reflexity RAM — Fix Changelog (June 2026)

Apply this entire repo state to `main`. Summary of every change and why.

## 🔴 SECURITY — ACTION REQUIRED BY OWNER (not just code)

`backend/.env` previously contained LIVE credentials and was distributed in a zip.
The file is now scrubbed to placeholders. **Rotate all of these before deploying:**

1. **MongoDB Atlas** — change the `mohammedyusufnakhuda_db_user` password, update `MONGODB_URI` in the hosting dashboard
2. **Resend** — revoke key `re_V7Uk9NW3...`, create a new one
3. **Cloudinary** — regenerate the API secret
4. **JWT_SECRET** — generate with `openssl rand -hex 32` (old one was a guessable sentence; rotating logs everyone out, which is fine)
5. Set all real values in Railway/Render env vars — never commit them to git

## Backend changes

### New files
- `src/config/shipping.js` — server-side shipping price table. Clients now send only a shipping option ID; the server looks up the price. **Fixes vulnerability:** the client previously sent `shippingCost` as a number, so anyone could POST a negative/zero shipping cost and underpay (the PI amount check compared against the same client-supplied number, so it passed).
- `src/utils/stock.js` — idempotent stock decrement/restore helpers that also keep `stock`/`stockLabel` in sync with `stockQuantity` (previously raw `$inc` left products showing "In stock" at 0 quantity).

### `src/models/Order.js`
- `stripePaymentIntentId` index is now `unique: true, sparse: true` — the DB enforces one order per payment even if duplicate submissions race past the app-level check.
- Order number generation moved from `pre('save')` to `pre('validate')`. **This was likely breaking order creation entirely:** `orderNumber` is `required: true` and validation runs before save hooks, so the number was never set in time. Also switched from `Math.random()` to `crypto.randomBytes` (collision-proof).
- Added `stockDecremented` flag (guards exactly-once stock decrement).

### `src/routes/orders.js`
- Shipping cost computed server-side from the option ID.
- **Race fix:** if the retrieved PaymentIntent is already `succeeded` (normal flow — frontend confirms payment before creating the order), the order is created as `paid`/`processing` immediately instead of waiting for a webhook that may have already fired and found nothing. Previously such orders stayed "pending" forever.
- Stock is decremented only on confirmed payment (was: on order creation, leaking reserved stock on abandoned checkouts).
- Fixed oversell bug: `stockQuantity > 0 && qty > stockQuantity` skipped the check entirely when quantity was exactly 0.
- Duplicate PI submissions now also handled via the unique index (11000 → 409).
- Confirmation email only sent at creation when payment is confirmed (webhook handles pending→paid), preventing double emails.

### `src/routes/stripe.js`
- `create-payment-intent`: shipping from server table; subtotal recomputed from live product prices, not cart-stored prices.
- Webhook `payment_intent.succeeded`: idempotent (`paymentStatus: { $ne: 'paid' }` guard) + decrements stock via the guarded helper.
- Webhook `payment_intent.payment_failed`: restores stock only if it was actually decremented.

### `src/routes/seed.js`
- Removed hardcoded default admin password from source. Seeding the admin now requires `ADMIN_PASSWORD` env var (12+ chars).

## Frontend changes

### Admin simplification
- **Single edit flow:** deleted `pages/admin/EditProduct.jsx` and its route. The pencil button on the Products table now opens the same modal as "Add product" — no more bouncing to a separate page.
- **Modal reorganized:** essentials first (name, price, compare-at, stock, images, description, active/featured), RAM specs collapsed under a "Memory specs & details" section you open only when needed.
- **Slug + SKU auto-fill** from the product name on new listings (stops if you edit them manually) — type the name once.
- **Dashboard quick actions:** "+ Add product" (opens the modal directly via `/admin/products?new=1`) and "View orders" buttons in the header.

### Restock signup removed
- Deleted `components/RestockSignup.jsx`, its usage in `pages/Product.jsx`, and the unused `useRestockAlerts` store in `lib/store.jsx`.

### Checkout
- Sends `shippingMethod: <id>` only (e.g. `'standard'`); no longer sends `shippingCost`. Display prices in `SHIPPING_OPTIONS` (Checkout.jsx) must stay in sync with `backend/src/config/shipping.js`.

## Verified
- All edited backend files pass `node --check`.
- Frontend builds cleanly with `vite build`.

## Still open (decide before launch)
- Tax: the Order model has a `tax` field that's never populated. Selling from Ontario you likely need GST/HST — consider Stripe Tax.
- Currency is hardcoded `usd` in `create-payment-intent` — confirm that's intentional vs CAD.
