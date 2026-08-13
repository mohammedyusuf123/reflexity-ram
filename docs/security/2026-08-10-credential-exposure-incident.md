# Credential Exposure Incident — 2026-08-10

## Status

**Contained and provider rotation verified.** The live Reflexity RAM deployment is healthy and uses rotated or otherwise confirmed-safe credentials. Cloudinary Support rotated the exposed historical Root key for `dfquny0nk` on 2026-08-13 after ownership verification on ticket `#383488`, linked to duplicate ticket `#383469`. The historical credential returned HTTP 200 immediately before rotation and HTTP 401 afterward. Render does not use the historical environment.

This report deliberately contains no credentials, tokens, passwords, or reusable secret fragments.

Current human-readable follow-up: [`2026-08-13-cloudinary-and-website-status.md`](2026-08-13-cloudinary-and-website-status.md)

## Executive summary

Runtime environment secrets were committed to Git beginning with commit `7b82d957953f` on 2026-05-19. Deleting `backend/.env` from the current checkout later removed the file only from the branch tip; the secrets remained recoverable from earlier commits. When `mohammedyusuf123/reflexity-ram` became public on 2026-08-10, automated scanning detected the historical MongoDB credential and MongoDB emailed an exposure warning.

The evidence supports a public Git-history exposure. It does not indicate that the production website itself was the entry point. GitHub traffic counters showed no recorded views, clones, or forks during the investigation, but those counters do not exclude automated secret scanners or unrecorded access.

## Affected material

| Secret class | Exposure state | Provider action | Production state |
|---|---|---|---|
| MongoDB Atlas database-user credential | Present in historical Git commits and valid when tested | Database-user password regenerated; historical URI now fails authentication | Replacement URI validated and saved in Render |
| Resend API keys | Two historical keys present in Git history | Both historical keys revoked; current key differs from them | Current production key retained |
| Cloudinary historical environment `dfquny0nk` | Historical credential present in Git and active when tested | Cloudinary Support rotated the key after ownership verification; historical credential now fails with HTTP 401 | Not used by current Render deployment; active product records were migrated to `fike` in commit `f0d31a3` |
| Cloudinary current environment `fike` | Current Aug 4 root key was not found in Git history | Controlled upload/delete validation passed; three unused remediation keys disabled | Current Render configuration retained |
| JWT, session, admin, and seed values | Historical assignments were present | Historical authentication values tested invalid or were replaced | Current runtime values retained |

## Timeline

- **2026-05-19:** Commit `7b82d957953f` introduced runtime secrets in `backend/.env` and related example/configuration material.
- **2026-05-19 through 2026-08-04:** Exposed values remained reachable across dozens of commits; Resend key material appeared in 68 commits.
- **2026-08-07:** The current checkout was cleaned, but the earlier Git objects were still reachable through repository history.
- **2026-08-10:** The repository was pushed publicly. MongoDB sent a public-credential warning at 20:02 UTC.
- **2026-08-10:** The reachable `main` history was rewritten, historical secret values were replaced with inert markers, and cleaned commit `a88d3b6` was force-pushed.
- **2026-08-10:** MongoDB credentials were rotated; Resend revocation was verified; Render was updated; the current Cloudinary environment was validated; GitHub secret scanning and push protection were enabled.
- **2026-08-10 23:30 UTC:** Render deployment `dep-d9t5ttqfngtc73cqepk0` connected to MongoDB, started the application, and became live.
- **2026-08-10:** Closure evidence was recorded in commit `56e8eda`.
- **2026-08-11 00:09 UTC:** The active Atlas URI was displayed during interactive transaction-test setup and was treated as exposed. The password was rotated again, Render was updated, and deployment `dep-d9t6g5egekts73cbjhqg` connected successfully and became live.
- **2026-08-12:** Located the authorized owner account for legacy Cloudinary environment `dfquny0nk`; confirmed it has one active Root key, no Account Management Keys entry, and no enabled whole-environment switch.
- **2026-08-13:** Submitted authenticated Cloudinary Support ticket `#383469` requesting rotation or revocation of the sole exposed Root key while preserving all assets and public delivery.
- **2026-08-13:** Deployed commit `f0d31a3`; Render's idempotent startup migration replaced the two exact legacy product-image URLs with `fike` copies. The public API, live feed, and product metadata now contain zero `dfquny0nk` references.
- **2026-08-13 08:18 America/Toronto:** Supplied Cloudinary's requested ownership verification on ticket `#383488` and linked duplicate ticket `#383469`.
- **2026-08-13 08:46 America/Toronto:** Cloudinary Support confirmed that it had rotated the exposed key.
- **2026-08-13 after rotation:** The historical Admin API credential changed from HTTP 200 to HTTP 401. The console showed one active replacement created that day whose public identifier differed from the historical key. The storefront, backend health, product API, live feed, two current `fike` images, and both known legacy public images remained HTTP 200.

## Remediation completed

### Repository and GitHub

- Removed `backend/.env` from every reachable `main` commit.
- Replaced the exposed MongoDB URIs, Cloudinary assignments, Resend keys, and authentication-secret assignments throughout reachable history.
- Force-pushed the cleaned branch.
- Removed the local legacy remote-tracking reference, expired reflogs, and pruned unreachable Git objects.
- Confirmed no unreachable objects remained after garbage collection.
- Enhanced `scripts/scan-secrets.mjs` to reject tracked runtime `.env` files and detect additional authentication-secret assignments.
- Enabled GitHub native secret scanning and push protection.
- Restored public repository visibility only after the history scan passed, because Render's existing GitHub credential could not deploy the private repository.

### Providers and deployment

- Regenerated the MongoDB Atlas database-user password.
- Verified the old MongoDB URI fails authentication and the replacement succeeds.
- Saved the replacement MongoDB URI in Render.
- Verified both historical Resend keys are revoked and differ from the current production key.
- Confirmed the current Cloudinary environment is `fike`, renamed from `akbuojoj`.
- Validated the current Cloudinary credential with a controlled upload and cleanup.
- Disabled three unused non-root Cloudinary keys created during remediation.
- Had Cloudinary Support rotate the exposed Root key for historical environment `dfquny0nk`; verified that the old credential now fails authentication and the replacement public key identifier differs from it.
- Migrated both active product image records to verified `fike` copies and removed the frontend legacy-host compatibility rewrite.
- Confirmed Render checked out cleaned commit `a88d3b6`, connected to MongoDB, started on port 3001, and reported the service live.
- Re-rotated the Atlas database-user password after the interactive display, verified the replacement directly, removed the disposable transaction-test database and temporary user, and confirmed the replacement Render deployment became live.

## Verification evidence

| Check | Result |
|---|---|
| Reachable commits containing `backend/.env` | 0 |
| Exact historical MongoDB credential matches | 0 |
| Exact historical Resend key matches | 0 |
| Exact exposed Cloudinary secret matches | 0 |
| Local unreachable Git objects after pruning | 0 |
| `npm run scan:secrets` | Pass |
| Local `main` versus GitHub `main` | Match confirmed after report publication |
| GitHub native secret scanning | Enabled |
| GitHub push protection | Enabled |
| `GET /api/health` | `status=ok` |
| `GET /api/products?page=1&limit=1` | Valid paginated response containing one product |
| Atlas rollback integration | Pass against isolated Atlas database; exact-marker cleanup left zero fixtures |
| Render deployment after follow-up rotation | `dep-d9t6g5egekts73cbjhqg` live with MongoDB connected |
| Active product image URLs after `f0d31a3` | Public API, live feed, and raw product metadata use only `fike`; both exact images return HTTP 200 |
| Historical `dfquny0nk` credential before/after provider rotation | HTTP 200 before; HTTP 401 with Cloudinary authentication error after |
| Legacy Cloudinary public delivery after rotation | Both exact known legacy images return HTTP 200 |
| Replacement-key console state | One active key created 2026-08-13; public identifier differs from historical key |

The broad example-pattern scan still recognizes documentation placeholders such as `<user>:<password>` and dummy `re_...` examples in old documentation revisions. Exact-value scans and the repository scanner distinguish those inert examples from the exposed credentials.

## Closure verification

### Legacy Cloudinary environment `dfquny0nk`

The historical credential tested active before Cloudinary acted. Ownership verification was supplied on ticket `#383488`, linked to duplicate ticket `#383469`, and Support rotated the key while preserving the environment and its assets. The requested closure checks now show:

1. `VERIFIED`: the historical credential receives HTTP 401 from the Cloudinary Admin API.
2. `VERIFIED`: current `fike` product image delivery and both exact known legacy public images remain HTTP 200.
3. `VERIFIED`: the public product API and live feed contain zero `dfquny0nk` references; Render uses `fike`.
4. `PRECAUTION`: inventory any additional legacy Media Library assets before any future whole-environment shutdown. No shutdown or asset deletion was part of this remediation.

## Superseded limitation

At the time of the original remediation, the connected GitHub OAuth token lacked `workflow` scope, so GitHub rejected creation of an Actions secret-scan workflow. A CI workflow was later added through the normal repository path and verified clean. GitHub native secret scanning and push protection remain enabled, and the local scanner remains available through `npm run scan:secrets`.

## Preservation notes

- User work in `frontend/src/pages/Wholesale.jsx` and `frontend/src/pages/wholesale-concepts.css` was kept uncommitted and was not included in incident-remediation commits.
- No secret values are stored in this report or `PROJECT_STATE.md`.
