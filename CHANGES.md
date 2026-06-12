# Reflexity RAM — Fix Changelog (June 2026)

## 🔧 UPDATE: One unified sidebar (no more user vs admin split)

### The change
- **New `AppLayout`** component replaces `AdminLayout`. Same component renders the left sidebar for both `/account` and every `/admin/*` page — there are no longer two parallel navigation systems.
- **Role-aware sidebar**: one nav, filtered by role. Each user sees "Orders" exactly once.
  - **As admin (Yusuf)**: Profile · Security · Settings · ── Admin ── · Products · Orders · Users
  - **As customer**: Profile · Orders · Security · Settings
- **Header dropdown simplified**: email · name · single link ("Open admin panel" if admin, "Open settings" if customer) → goes to `/account` · Sign out. The old Account / Orders / Admin Dashboard buttons in the dropdown are gone — they were the redundant entry points.
- **`/admin` no longer renders a standalone Dashboard page** — it redirects to `/admin/products`. The admin Dashboard page (`pages/admin/Dashboard.jsx`) was removed; if you want it back as an extra sidebar item later it's easy to restore.
- **Sign out is in both places** — the sidebar footer and the header dropdown — because it's needed from anywhere.

### What this fixes
- The previous structure had two layouts (`AdminLayout` + Account.jsx's own grid) which is why Orders showed in both nav systems. Now there's one layout component.
- No URL changes required — `/account?tab=...` and `/admin/products` etc. all still work; they just render inside the same shell.



## 🔧 UPDATE: Header dropdown order + listing form back to single-column

### Header dropdown
- Email now appears first (primary), name shown underneath (secondary). Matches typical account-menu conventions.

### Listings — back to one clean form
- Removed the upfront category picker step. Creating a product is now a single screen again.
- All form fields stacked vertically (one per row) with light section labels: **Product / Capacity & speed / Condition / Pricing & inventory / Identifiers / Listing / Visibility**.
- "Paste listing template" is still there at the top of the form (collapsed by default) — paste a `Field: value` template from ChatGPT and the form below fills in.
- Form Factor dropdown adapts to the selected **Line**: Server/Workstation accepts all four (RDIMM, LRDIMM, UDIMM, SO-DIMM), Laptop lines only SO-DIMM, everything else only UDIMM. Changing Line auto-snaps Form Factor to a valid option.
- Defaults remain Condition = `Used`, Warranty = `90 Days`.

### Account & admin sidebars
- These were already shipped in the previous push and unchanged in this one. If the browser is showing the old layout, hard-refresh (Cmd-Shift-R / Ctrl-Shift-R) — Cloudflare caches the JS bundle aggressively. Verified layouts:
  - Header dropdown → **Account** or **Orders** → `/account` page with left sidebar: Profile / Orders / Security / Settings / Sign out
  - Header dropdown → **Admin Dashboard** → `/admin` page with left sidebar: Dashboard / Products / Orders / Users / Security



## ✨ NEW: Unified admin entry + fast RAM listing flow

### Admin entry, flattened
- Header dropdown (your name) → **Admin Dashboard** goes straight to `/admin` — no more bouncing through `/account` first.
- Removed the redundant "Admin Dashboard →" button from the Account page (it was the intermediate step).
- AdminLayout sidebar now has **Dashboard / Products / Orders / Users / Security**, all visible at once; every page uses the same layout so clicks never leave the admin shell.

### Security page (`/admin/security`)
- Change admin password form (uses existing `/api/auth/change-password`).
- Security checklist: key rotation cadence, .env hygiene, webhook secret check, and a reminder to remove `SEED_SECRET` after launch.

### Listing creation, now under a minute per product
- **Step 1: category picker** — Server / Desktop / Laptop cards. Picking one prefills `line` and locks the Form Factor dropdown to category-appropriate options:
  - Desktop → UDIMM only
  - Laptop → SO-DIMM only
  - Server → RDIMM, LRDIMM, UDIMM, SO-DIMM
- **Step 2: paste template + form** — a collapsible "Paste listing template" box at the top of the form. Generate the template in ChatGPT in the documented `Field: value` format, paste, hit "Fill form from template", and the form populates: name, description, slug (auto from name), SKU (from part number or name), tags, compatibility, generation, capacity, speed, CAS, timings, voltage, condition, warranty, price, stock.
- **New defaults**: Condition = `Used`, Warranty = `90 Days` (both editable). Reflects the used/pulled-stick nature of most server RAM listings.
- Editing skips the category picker; the inferred category still locks the Form Factor dropdown so you can't accidentally switch a desktop UDIMM into an LRDIMM.

The parser (`frontend/src/lib/ramTemplate.js`) is a plain text utility — no API calls, no AI integration on the website. You can also paste partial templates; anything missing is left untouched.

### Template format (paste into ChatGPT)
```
Name: <product name>
Description: <one or two sentences>
Line: Desktop | Laptop / Mini-PC | Server
Generation: DDR3 | DDR4 | DDR5
Form Factor: UDIMM | SO-DIMM | RDIMM | LRDIMM
Capacity: <number, in GB>
Capacity Label: e.g. 16GB
Speed: <number, in MT/s>
Speed Label: e.g. 3200 MT/s
CAS: e.g. CL16
Timings: e.g. 16-18-18-38
Voltage: e.g. 1.35V
Condition: New | Used
Warranty: e.g. 90 Days | Limited Lifetime
Tags: comma, separated, list
Compatibility:
One item per line
Or all on one line
Price: <optional, number>
Stock: <optional, number>
Part Number: <optional — becomes SKU>
```


## ✨ NEW: Stripe Checkout Sessions (replaces custom Payment Element checkout)

**How it works now:** Cart (add items / adjust quantities) → `/checkout` order review → `POST /api/stripe/create-checkout-session` → redirect to Stripe-hosted checkout → Stripe collects address/phone/email and applies tax → customer returns to `/order/success?session_id=...` → order is fulfilled exactly once.

- **Stripe Price IDs in the DB**: Product model has `stripeProductId` / `stripePriceId` / `stripePriceAmount`. Synced automatically on admin create/update (`utils/stripeSync.js`); price changes create a new Stripe Price and archive the old (prices are immutable). Lazy re-sync at checkout if anything is missing. Line items are always `{ price: <id>, quantity }` — never ad-hoc amounts.
- **CA/US only**: `shipping_address_collection.allowed_countries: ['CA','US']`. Stripe's hosted page renders the country-correct address form automatically (Province + Postal code for Canada, State + ZIP for the US) — no custom form code. Phone collection enabled.
- **Stripe Tax**: `automatic_tax: enabled`. Canadian provincial tax (Ontario HST, Alberta GST, etc.) calculated from the shipping address. US orders: $0 tax while no US registrations exist; to enable later, add state registrations in the Stripe dashboard — zero code changes.
- **Webhooks & duplicate-proof fulfillment**: `checkout.session.completed` / `async_payment_succeeded` call `fulfillCheckoutSession()`, which is also called by the success page (`GET /api/stripe/session-status`) as a fallback if the webhook is delayed. A **unique index on `stripeCheckoutSessionId`** guarantees exactly one order per session no matter how many times either path fires. Stock decrement + cart clear + confirmation email run once, post-payment only.
- Frontend: `Checkout.jsx` rewritten as a slim order review + hand-off (custom address form and `@stripe/react-stripe-js` flow removed); new `CheckoutReturn.jsx` at `/order/success` polls the session, then redirects to the existing order confirmation page (guest email passed through for authorization).
- Legacy Payment Intent endpoints kept but unused.

### ⚙️ Stripe dashboard setup required (owner)
1. **Stripe Tax**: activate Stripe Tax, set business address (Ontario), add your **Canada tax registration** (GST/HST number). Optionally set a default product tax category (e.g. general tangible goods).
2. **Webhook endpoint** → `https://<backend>/api/stripe/webhook`, events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Optional: `STRIPE_CURRENCY=cad` env var to charge in CAD (default is `usd`).
4. After deploying, open and re-save each product once in the admin (or edit anything) to trigger the initial Stripe Product/Price sync — or just let the lazy sync handle it on first checkout.


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
