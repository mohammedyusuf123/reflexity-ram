# Credential Exposure Incident — 2026-08-10

## Status

**Contained with one legacy-provider action remaining.** The live Reflexity RAM deployment is healthy and uses rotated or otherwise confirmed-safe production credentials. The only unresolved credential belongs to the historical, non-production Cloudinary environment `dfquny0nk`, which is not available in the currently accessible Cloudinary account and is not used by Render.

This report deliberately contains no credentials, tokens, passwords, or reusable secret fragments.

## Executive summary

Runtime environment secrets were committed to Git beginning with commit `7b82d957953f` on 2026-05-19. Deleting `backend/.env` from the current checkout later removed the file only from the branch tip; the secrets remained recoverable from earlier commits. When `mohammedyusuf123/reflexity-ram` became public on 2026-08-10, automated scanning detected the historical MongoDB credential and MongoDB emailed an exposure warning.

The evidence supports a public Git-history exposure. It does not indicate that the production website itself was the entry point. GitHub traffic counters showed no recorded views, clones, or forks during the investigation, but those counters do not exclude automated secret scanners or unrecorded access.

## Affected material

| Secret class | Exposure state | Provider action | Production state |
|---|---|---|---|
| MongoDB Atlas database-user credential | Present in historical Git commits and valid when tested | Database-user password regenerated; historical URI now fails authentication | Replacement URI validated and saved in Render |
| Resend API keys | Two historical keys present in Git history | Both historical keys revoked; current key differs from them | Current production key retained |
| Cloudinary historical environment `dfquny0nk` | Historical credential present in Git and active when tested | Owning account not accessible during remediation | Not used by current Render deployment |
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

The broad example-pattern scan still recognizes documentation placeholders such as `<user>:<password>` and dummy `re_...` examples in old documentation revisions. Exact-value scans and the repository scanner distinguish those inert examples from the exposed credentials.

## Remaining action

### Legacy Cloudinary environment `dfquny0nk`

The historical credential tested active, but its product environment is absent from the currently accessible Cloudinary account and it is not referenced by Render's active configuration. The owner of that legacy Cloudinary account must disable or delete the exposed key. After access is available, verify:

1. The historical credential receives an authentication failure.
2. Current product image delivery remains unaffected.
3. No application or deployment configuration still references `dfquny0nk` except migration history or intentionally retained old image URLs.

## Non-blocking limitation

The connected GitHub OAuth token lacks `workflow` scope, so GitHub rejected creation of an Actions secret-scan workflow. GitHub's native secret scanning and push protection are enabled and provide server-side enforcement; the local scanner remains available through `npm run scan:secrets`.

## Preservation notes

- User work in `frontend/src/pages/Wholesale.jsx` and `frontend/src/pages/wholesale-concepts.css` was kept uncommitted and was not included in incident-remediation commits.
- No secret values are stored in this report or `PROJECT_STATE.md`.
