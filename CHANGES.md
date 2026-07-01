# Reflexity RAM — Update (June 2026)

## 1. Inline editing for support pages (Shipping / Returns / Warranty / FAQ)
- No CMS, no admin nav item. Visit the page → if you're an admin, an **Edit** button appears top-right.
- Click Edit → the content becomes editable in place with a small toolbar (bold, italic, heading, bullet list, normal text) → click **Save** → live immediately, returns to view mode.
- Customers only ever see view mode.
- **Backend:** new `PageContent` model + `/api/pages/:slug` (public GET, admin-only PUT). HTML is sanitized server-side via a tight allowlist (`utils/sanitizeHtml.js`) — scripts, event handlers, and `javascript:` URLs are stripped. No new npm dependency.
- Each page ships with its original copy as a built-in default (the fallback when nothing's been saved yet), so the pages look identical until you edit them.
- Terms and Privacy intentionally stay static (not in scope).

## 2. Product creation — single screen, manual entry
- **Removed the template/import system entirely** (and deleted the now-unused `lib/ramTemplate.js`).
- Redesigned to fit on one screen, minimal scrolling: Product (name, description, images) on top, Memory Specs in a 4-column grid, Condition and Pricing side-by-side at the bottom.
- **Removed fields:** Compare At Price, Capacity Label, Speed Label, Featured on Homepage, ECC toggle, Active/Visible toggle.
  - Capacity Label and Speed Label are now **auto-derived** (`16` → `16GB`, `3200` → `3200 MT/s`) and sent to the backend silently, since they drive the storefront display.
  - New products are always created Active.
- **Slug and SKU are auto-generated** from the product name and no longer shown in the form. (Both are required by the DB's unique indexes, so they're generated on submit.)
- Form Factor still adapts to Line (Server = all four, Laptop = SO-DIMM, Desktop = UDIMM).
- Defaults remain Condition = `Used`, Warranty = `90 Days`.

## 3. Footer
- Removed the entire **Shop** section (All Memory / Desktop / Laptop / Server). Support links are all that remain in the center column.

## 4. Performance / dead-code cleanup
- Deleted dead duplicate pages `Home.tsx` and `NotFound.tsx` (the live app uses the `.jsx` versions; the `.tsx` stubs imported `streamdown`, a package that isn't even installed — proof they were never built).
- Removed unused Stripe React dependencies `@stripe/react-stripe-js` and `@stripe/stripe-js` from package.json and the Vite manual-chunk config. We moved to hosted Stripe Checkout (redirect), so the embedded Elements libraries were no longer imported anywhere.
- Note on `components/ui/*` (shadcn boilerplate): these are not imported by any live `.jsx` page, but they're left in place because Vite tree-shakes unused modules out of the shipped bundle — they add nothing to what users download. Safe to delete later if you want a tidier repo, but it's not a perf issue.

## Build
- Frontend builds clean. All backend files pass syntax checks.

## Reminder — still blocking launch
Credentials still need rotating, Stripe Tax + webhook still need setup in the Stripe dashboard, and there are still zero live products. The store can't take an order until those are done.

## 2026-07-01 — Disposable email blocking

- Added `backend/src/utils/disposableEmail.js` with server-side disposable/temp email detection.
- Signup now rejects temporary inboxes such as Mailinator, Guerrilla Mail, 10 Minute Mail, Temp Mail, YOPmail, and related variants.
- Google OAuth account creation now rejects disposable-email domains if one ever appears from the provider profile.
- Guest checkout now requires an email before redirecting to Stripe Checkout so the backend can block temporary inboxes before payment.
- Stripe Checkout Sessions now receive the validated guest email as `customer_email`, and the fulfillment path flags any disposable address that somehow appears after Stripe checkout for manual admin review.
