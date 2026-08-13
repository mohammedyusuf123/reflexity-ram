# Reflexity RAM Cloudinary and Website Status

Updated: 2026-08-13 (America/Toronto)

## Plain-language summary

The website is online and operating normally. The storefront, backend, product feed, sitemap, payments configuration, custom domain, and Merchant Center listings all passed the latest live checks.

The unresolved Cloudinary problem is a security-cleanup issue involving an old image account, not a current website outage:

- The current production backend uses the newer Cloudinary product environment `fike` for authenticated Cloudinary operations.
- An older Cloudinary product environment, `dfquny0nk`, had its Root API credential committed to historical Git revisions.
- The Git history was cleaned, but cleaning Git does not deactivate a credential that Cloudinary has already issued.
- The old Root key remains active while Cloudinary Support handles ticket `#383469`.
- Render does not use the exposed old key. Commit `f0d31a3` also migrated the two current product records from legacy `dfquny0nk` image URLs to their verified `fike` copies.
- The public product API, live Merchant feed, and both raw product-page social-image tags now contain only `fike` URLs. Both exact images return HTTP 200.

There is no evidence in the available records that the website was compromised through this issue. The risk is that anyone who obtained the historical Root credential could have administrative API access to the legacy Cloudinary environment until the key is revoked.

## How the website fits together

| Area | Service | Current state |
|---|---|---|
| Storefront | Cloudflare Pages | `VERIFIED`: live, HTTPS enabled, enforced CSP, correct `www` redirect |
| Backend API | Render | `VERIFIED`: health reports `status=ok`, production environment, Stripe enabled |
| Database | MongoDB Atlas | `VERIFIED`: exposed passwords rotated; production connects with the replacement |
| Payments | Stripe | `VERIFIED`: enabled in production; no Cloudinary dependency |
| Transactional email | Resend | `VERIFIED`: historical exposed keys revoked; production key differs |
| Current authenticated image operations | Cloudinary `fike` | `VERIFIED`: current key was not found in Git history and passed an upload/delete test |
| Legacy image account | Cloudinary `dfquny0nk` | `OPEN`: exposed sole Root key still active pending Cloudinary Support |
| Product image delivery | Public Cloudinary URLs under `fike` | `VERIFIED`: API, feed, and product metadata use only `fike`; both exact images return HTTP 200 |
| Shopping listings | Merchant Center `5832020811` | `VERIFIED`: 2 approved, 0 limited, 0 not approved, 0 under review |

Cloudinary public image URLs do not contain the API secret. Rotating the Root API key should not by itself stop public images from loading. Disabling or deleting the entire legacy product environment would stop its asset delivery, which is why that destructive shortcut was not used.

## What originally happened

1. Runtime secrets were committed to repository history beginning on 2026-05-19.
2. Removing the `.env` file from the newest revision did not remove it from older Git commits.
3. When the repository became public on 2026-08-10, MongoDB detected one historical credential and sent an exposure warning.
4. The investigation found historical MongoDB, Resend, Cloudinary, and application-secret material in reachable commits.
5. The repository history was rewritten, the exposed values were replaced with inert markers, and the cleaned history was force-pushed.
6. Provider credentials were then rotated or revoked because repository cleanup alone cannot invalidate already-issued credentials.

## Security and provider work completed

### GitHub and local repository

- `VERIFIED`: removed `backend/.env` from every reachable `main` revision.
- `VERIFIED`: replaced historical secret assignments with inert markers throughout reachable history.
- `VERIFIED`: expired local reflogs and pruned unreachable Git objects after preserving the required evidence.
- `VERIFIED`: expanded `scripts/scan-secrets.mjs` to catch more provider and authentication-secret patterns.
- `VERIFIED`: enabled GitHub secret scanning and push protection.
- `VERIFIED`: added CI for tests, production build, secret scanning, and high-severity dependency audits.
- `VERIFIED`: upgraded and commit-pinned the GitHub Actions dependencies after an older action runtime produced a deprecation annotation.

### MongoDB Atlas

- `VERIFIED`: regenerated the exposed database-user password.
- `VERIFIED`: confirmed the old URI failed and the replacement connected.
- `VERIFIED`: saved the replacement URI in Render and verified a successful deployment.
- `VERIFIED`: rotated the password a second time after an active URI appeared during interactive testing.
- `VERIFIED`: removed the disposable transaction-test database and temporary Atlas user after zero-count checks.

### Resend

- `VERIFIED`: revoked both historical exposed API keys.
- `VERIFIED`: confirmed the current production key differs from the historical values.

### Current Cloudinary environment

- `VERIFIED`: confirmed the current environment is `fike`, renamed from `akbuojoj`.
- `VERIFIED`: confirmed its current Root key was not present in the exposed Git history.
- `VERIFIED`: completed a controlled upload/delete test with the current credential.
- `VERIFIED`: disabled three unused non-root keys created during remediation.
- `VERIFIED`: deployed an idempotent database migration for the two exact legacy product-image URLs and removed the frontend legacy-host compatibility rewrite.
- `VERIFIED`: confirmed the public product API, Merchant feed, and both product-page social-image tags contain zero `dfquny0nk` references after deployment.

### Legacy Cloudinary environment

- `VERIFIED`: recovered the owning Cloudinary account under the authorized Google identity.
- `VERIFIED`: found one active Root key and no replacement key.
- `VERIFIED`: Cloudinary disables the Root-key status control while it is the sole key.
- `VERIFIED`: generating a replacement key invokes Cloudinary's emailed-verification step.
- `VERIFIED`: the account exposes no Account Management Keys entry; Cloudinary documents programmatic access-key management as an Enterprise Provisioning API feature.
- `VERIFIED`: the sole product environment's Active switch is disabled in the console.
- `VERIFIED`: the legacy Media Library contains multiple assets, so deleting the account or whole environment without a complete migration would be unsafe.
- `VERIFIED`: submitted authenticated Cloudinary Support ticket `#383469`; the ticket is `Open` and has a matching acknowledgement email.
- `OPEN`: Cloudinary staff have not replied or changed the key yet.

## Website, SEO, and Merchant Center work completed

### Merchant Center

- `VERIFIED`: Google completed the Misrepresentation review and removed the issue from account `5832020811`.
- `VERIFIED` on 2026-08-13: 2 approved products, 0 limited, 0 not approved, and 0 under review.
- `VERIFIED`: the current notifications are growth suggestions and tips rather than policy violations.
- `VERIFIED`: the overview reports 7 clicks in the last 28 days.

### Domain and delivery

- `VERIFIED`: `reflexityram.com` serves the Cloudflare Pages production project.
- `VERIFIED`: `www.reflexityram.com` has active SSL and redirects to the apex while preserving paths and query strings.
- `VERIFIED`: HSTS is live.
- `VERIFIED`: the Content Security Policy is enforced after allowing the exact Cloudflare Web Analytics script origin observed during report-only testing.

### Feed, sitemap, and product metadata

- `VERIFIED`: identified that the original apex `feed.xml` and `sitemap.xml` were static files rather than live backend output.
- `VERIFIED`: replaced the invalid external rewrite with Cloudflare Pages Functions that proxy the live Render catalog for only the feed and sitemap routes.
- `VERIFIED`: the live feed and backend feed matched and contain the two current in-stock products.
- `VERIFIED`: the sitemap contains all expected static routes plus both product URLs.
- `VERIFIED`: product-edge code injects product-specific title, description, canonical, Open Graph, and Twitter metadata before React loads.
- `VERIFIED`: missing product slugs return HTTP 404 with `noindex` instead of a misleading homepage response.

### Storefront and backend correctness

- `VERIFIED`: Desktop, Laptop, and Server category navigation uses one canonical catalog mapping.
- `VERIFIED`: Server inventory correctly includes both RDIMM and LRDIMM-compatible routing.
- `VERIFIED`: product pagination normalizes invalid parameters, caps page size, and uses a stable secondary sort.
- `VERIFIED`: signup and login share the same stock-aware guest-cart merge logic.
- `VERIFIED`: partial Stripe refunds are not treated as terminal full refunds.
- `VERIFIED`: order cancellation and stock restoration share a MongoDB transaction and are idempotent.
- `VERIFIED`: admin product deletion is a reversible deactivation that preserves order, cart, and review references.
- `VERIFIED`: storefront product reviews now appear as a fifth details tab and remain separate from Google Customer Reviews.
- `VERIFIED`: the production storefront, shop, product pages, cart, checkout, and authentication modal rendered without CSP errors, JavaScript errors, broken images, or unhandled rejections.
- `VERIFIED`: the latest comprehensive local verification passed 17 frontend tests, 13 backend tests with the opt-in Atlas integration intentionally skipped, the production build, secret scan, and dependency audits with zero reported vulnerabilities.
- `VERIFIED`: pull request `#1`, main CI run `31670637356`, and the Cloudflare Pages deployment for commit `f0d31a3` completed successfully.

## Problems and dead ends encountered

These are retained so the next investigation does not repeat the same work.

1. **Deleting a current `.env` was insufficient.** The secrets remained in historical Git objects. Resolution: rewrite reachable history, scan exact values, expire reflogs, prune, then rotate providers.
2. **Render failed with MongoDB authentication errors.** The code revision was not the cause. Resolution: correct the environment credential, redeploy, and verify a live database connection.
3. **A live Atlas URI appeared during interactive verification.** It was treated as exposed immediately. Resolution: rotate again, update Render, and retest production.
4. **The original Cloudflare rewrite did not proxy external XML.** Pages served static files. Resolution: implement bounded Pages Functions and verify the public bytes and headers.
5. **CSP report-only testing found Cloudflare Web Analytics.** Enforcing the first draft would have blocked that script. Resolution: add only the observed Cloudflare analytics origin, lock the policy with tests, then enforce it.
6. **Older GitHub Actions used a deprecated runtime.** Resolution: upgrade and pin current official action revisions, then verify a clean CI run.
7. **Cloudinary would not disable the only Root key.** Resolution path: create a replacement first or have Cloudinary Support rotate it.
8. **Cloudinary replacement creation required emailed verification.** No verification code is stored in project files or reports.
9. **The non-code Provisioning API route was unavailable.** The account has no Account Management Keys entry, and Cloudinary limits programmatic access-key management to eligible Enterprise accounts.
10. **The whole-environment Active switch was disabled.** At that point the Media Library contained additional assets and the current database still referenced legacy delivery URLs, so deletion would have been unsafe. The two active product records were subsequently migrated, but the additional legacy assets still require an inventory before any whole-environment deletion.
11. **The first anonymous support-form attempt did not create a ticket.** Cloudinary marked it pending email-address verification. Resolution: sign the support portal into the already-authorized Cloudinary Google account and submit the request there; this produced ticket `#383469`.
12. **Some BrowserOS accessibility clicks reported success without changing the page.** Resolution: inspect the actual target, use the page's supported navigation URL or focused browser input, and always verify the resulting URL and visible state.
13. **One Render product request timed out during a cold response.** A bounded retry returned the expected live catalog. This was not a persistent outage.
14. **Older project notes still showed resolved items as open.** The `www` DNS and rendered-QA entries were marked `STALE` after current runtime evidence superseded them.
15. **The Stripe connector was not authenticated for an independent dashboard read-back.** The deployed migration calls the existing non-fatal Stripe Product detail synchronizer, but this audit did not independently confirm the resulting image field inside Stripe. Checkout remained enabled and the public storefront paths were unaffected.
16. **A final Chrome support-ticket/tab pass could not connect.** Chrome was running and its native messaging manifest was valid, but the ChatGPT browser extension was not installed in the detected Chrome profiles. The supported browser runtime listed no available browser binding. No shell-level browser workaround was used and no unrelated user tabs were touched.
17. **The connected Gmail integration was not the Cloudinary support mailbox.** A `Cloudinary` search returned only a GitHub deployment notification. Resolution: use the already-authorized Pixel 8a Gmail app for a narrowly scoped account check.
18. **The authorized phone check found no human Cloudinary response.** The known Cloudinary support account contained the automated receipt for ticket `#383469` and no staff reply. The prior Gmail account and foregrounded app were restored afterward. Four exact temporary UI-dump XML files were deleted and verified absent; no verification code or reusable credential was retained.
19. **Local evidence cannot inventory every legacy Media Library asset.** The repository, reachable history, and broader workspace recover only the two exact public URLs already migrated. Earlier console evidence showed additional assets whose identifiers were not retained locally, so a complete inventory still requires supported console/admin access or Cloudinary Support.

## What remains

### Required to close the security incident

1. Wait for Cloudinary Support to respond to ticket `#383469`.
2. Have Cloudinary create/rotate the replacement credential or provide its supported secure verification route.
3. Disable or revoke the exposed legacy Root key.
4. Prove the historical credential now receives an authentication failure without printing it.
5. Confirm all intended public assets still load.

### Data cleanup completed and residual precaution

1. `VERIFIED`: the two live product image records now use their exact `fike` copies.
2. `VERIFIED`: the frontend no longer rewrites image URLs through a legacy-host fallback.
3. `VERIFIED`: product API data, product-page social metadata, the live Merchant feed, and both image responses passed post-deployment checks.
4. `OPEN`: Google Merchant Center's next image recrawl is asynchronous and was not forced; the account was already at two approved products with no policy or item issues before the migration.
5. `OPEN`: inventory and migrate any other legacy Media Library assets before considering whole-environment deactivation or account deletion.

### Lower-priority verification gap

The stock rollback helper passed a real Atlas transaction test. The authenticated admin cancellation HTTP route and a truly concurrent cancellation-versus-Stripe recovery race have not been exercised end-to-end. This does not block the current storefront but remains useful regression coverage.

An authenticated Stripe Dashboard or connector read-back could additionally confirm that both Stripe Product image fields received the new `fike` URLs. The migration invokes that sync path, but public API/feed/page verification does not prove Stripe's independently stored display field.

The remaining access-dependent checks are now explicit: Stripe connector authorization is needed for its dashboard read-back; the ChatGPT browser extension must be installed/enabled for supported Chrome tab and portal control; and Cloudinary must either answer ticket `#383469` or expose a supported replacement-key path. None of these access gaps blocks the live storefront.

## Current conclusion

`VERIFIED`: Reflexity RAM is live, Merchant Center is clear, production credentials other than the legacy Cloudinary key are contained, and the repository/deployment security work is active.

`OPEN`: Cloudinary Support must rotate or revoke the sole exposed Root key for `dfquny0nk`.

`VERIFIED`: The active storefront catalog no longer depends on legacy `dfquny0nk` delivery URLs; the API, feed, metadata, and image checks all use `fike`.

`UNKNOWN`: There is no direct evidence that the exposed Cloudinary credential was abused. Absence of evidence is not proof that it was never accessed.

No passwords, API secrets, session tokens, authentication codes, or reusable credential fragments are included in this report.
