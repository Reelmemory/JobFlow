# JobFlow beta

## Deployed baseline

On November 25, 2026, the public production alias served `main` at `5b80245`. The feature branch started at that commit after refreshing the remote. `fix/core-stability` remained at `a7a4001`. Its Clerk frontend matcher and explicit auth routes were already present in main. This implementation keeps the newer dashboard and carries forward the stability branch's draft-first behavior, lazy AI setup and signed Mailgun handling.

An anonymous browser reached the production landing, sign-in and sign-up pages without a Vercel team account. The dashboard redirected to the app's sign-in page and the CV endpoint returned 401. Vercel protects generated deployment URLs. Use the public production alias for guests.

## Clerk observations

The deployed publishable key matched the connected development instance. Public sign-up, Clerk test mode, single-session mode, cookieless development and URL-based session syncing were enabled. A newly created synthetic session reported a seven-day maximum lifetime and a 30-day abandonment timestamp. A shorter independent dashboard inactivity timeout was not exposed by the APIs inspected. Production had both FORCE and FALLBACK redirect variables for sign-in and sign-up. This PR explicitly configures the local auth paths, fallback destination and sign-out destination.

Unauthenticated browser automation initially stalled at Clerk's protect-check step. Clerk's supported testing token enabled the mobile sign-up test. On the baseline, Back showed a dashboard after the scripted sign-out attempt. On the feature preview, two fresh sign-ups at 390 px, sign-in, refresh, sign-out via the account menu followed by Back, and access after session revocation and token expiry all passed. The preview uses an isolated Neon schema and synthetic accounts. [Clerk test identities](https://clerk.com/docs/guides/development/testing/test-emails-and-phones)

## Application lifecycle

Discovery reads saved roles across Remotive and the existing Greenhouse, Lever and optional Techmap sources. It checks published expiry and closed-listing signals, deduplicates title and employer, and explains location and experience fit. An unspecified remote region, missing application address or uncertain requirement routes the application to review. Listings without a published closing date can disappear between discovery and submission.

Grok receives extracted CV text and the listing. The response must include a letter, supporting CV excerpts and missing qualifications. The app checks quoted evidence against the CV. The model's assessment can still be wrong. Each draft pins its CV, source URL and listing revision. Only an explicitly published application address qualifies for sending.

The daily cron reloads each account's preferences. A PostgreSQL transaction locks the owner row, checks consent, quota, duplicates and CV, then reserves the attempt. The transaction commits before the network request. A pause takes effect for future reservations. Queued includes an in-flight request or an unknown outcome. Accepted, deferred, delivered and bounced are distinct. A short-lived network error or a crash after reservation leaves the application queued. Cron and the review button query Mailgun events. Absence of evidence keeps the application on hold to avoid a duplicate. An explicit provider rejection allows a retry. Drafts and portal applications stay outside submitted counts.

Recruiter replies use an application-specific Reply-To address. The signed inbound route derives the owner from the application or an exact inbox address and deduplicates inbound message IDs. A generic inbox message stays unlinked when its application is unknown.

## Verification and rollout

The focused test runs the cron and webhook route handlers with PostgreSQL, real PDF/DOCX/TXT fixtures and intercepted provider HTTP responses. It checks pinned attachment bytes after replacement, atomic upload failure, repeated and overlapping runs, a reached cap, pause, uncertain acceptance reconciliation, manual sending and reply linkage. The Vercel preview tests recovered both accounts’ uploaded CVs byte-for-byte after redeployment. Each account could read its own letter, application and linked reply, and could not read the other account’s records or CV. The deployed cron rejected an anonymous request and completed two authenticated runs with both accounts paused. The public production alias continued to serve the baseline throughout these checks.

A real Grok request with synthetic inputs returned HTTP 402. The deployed environment had no Mailgun credentials and the local settings had no usable sandbox API key or verified recipient. Provider-backed generation, sandbox delivery, an actual reply and live employer submissions remain unverified. Keep live mail disabled until the sandbox workflow in the README passes. Production rollout and database upgrade are owner-controlled. [Setup and sandbox acceptance](README.md)
