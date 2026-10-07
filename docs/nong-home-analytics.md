# สถิติน้องโฮม — Analytics Only

Scope: recorded search count, active staff, questions per staff/department, Knowledge Coverage/Gap, and top questions. Administrator-only navigation and report API. Search engine, AI, answers, existing logs, knowledge data, login, and B2B behavior are unchanged. Dashboard is lazy-loaded only on its tab.

## Deployment

1. Create a persistent server-only `NONG_HOME_ANALYTICS_SECRET` with 64 random hex characters. Generate with `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"` and paste directly into the hosting environment configuration. Never put the value in Git, a VITE variable, or browser storage. Preserve the same key on future deployments; changing it makes prior encrypted records unreadable.
2. Deploy the reviewed branch through the existing hosting flow. Do not reset/import/seed any database or modify existing Firestore rules. Both Vercel and the Express server expose the new POST route.
3. Use a test staff account to search once for a known topic and once for a nonexistent topic, waiting 1.5 seconds after each query. Open สถิติน้องโฮม as an active Administrator, choose today, and confirm the current admin password. Check two events, 50% coverage and 50% gap in this controlled sample. This is a deployment smoke check, not a preset KPI target.
4. Confirm Knowledge User and Operator do not have this menu. Direct report requests with wrong passwords/non-admin accounts must return 403.

Without the secret, event writes are disabled (503) and the new dashboard explains setup is incomplete. Employee search remains available. No historical Coverage/Gap is invented, and an error never becomes a displayed 0% or 100%.

## Measurement definitions

- A recorded search is a query of at least two characters after 1.5 seconds of no query changes, using results from the existing unfiltered knowledge search. It is an approximation of search completion, not an explicit submitted question.
- Same query rerenders/filter changes do not count again within the mounted search view. Clear and search again counts again. Leaving/reopening the search view can create another event for the same query.
- Cancellation/unmount before 1.5 seconds produces no event. Failed/offline writes are best effort, not replayed; these metrics describe successfully recorded searches, not all attempted activity.
- Coverage = recorded searches with one or more knowledge matches / all recorded searches. Gap = recorded searches without matches / all recorded searches. Match does not imply verified accuracy, understanding, or task resolution.
- Active staff are distinct central staff IDs in the selected Bangkok date range. Historical logs lack staff IDs; their separate view groups by name and department, with a caveat. Historical and new datasets are never added together.
- Top questions merge only case/Unicode/whitespace variants, not synonyms or semantic topics.
- Dates use Asia/Bangkok and include the full end day. Empty datasets display no percentage. Range is at most 366 days. Reports page through all matching records, reject more than 10,000 events, and fail clearly on corrupt/unreadable data.

## Storage and permissions

New records use `systemConfig/nh-analytics-event-{timestamp}-{uuid}` and a first-use `nh-analytics-meta` document in the existing named database. Event writes are idempotent, append separate documents, and never replace existing config payloads. Question, staff name/ID, department and outcomes are AES-256-GCM encrypted with event ID as authenticated data. Reports verify the central active Administrator account and password before decrypting. Admin password exists only in component memory and the HTTPS request; it is cleared after each report and never cached. No analytics request uses shared sync-error banners.

The existing application's account records and rules allow broad direct reads/writes; this change inherits that identity trust model and does not repair the entire authentication system. Encryption protects new analytics content from direct database reads; it does not prevent users with existing database write access from tampering with account roles or deleting encrypted documents. It is not an enterprise authentication redesign.

Analytics adds Firestore reads/writes to the existing quota (one account read plus transactional event/meta reads, and one event write; first event also creates metadata). Large reports also consume reads. Nonblocking logging avoids waiting on analytics in the search UI, but no change sharing database quota can honestly guarantee zero production impact. Deployment monitoring remains necessary.

## Validation and rollback

`node scripts/test-nong-home-analytics.mjs` uses fake Firestore and fake hooks/timers only: aggregates, empty data, same-name distinct IDs, Thai midnight/date validation, encryption/tampering, report role/password checks, full pagination, corrupt data, idempotence, central names, missing configuration, debounce, filtering, clear/repeat, unmount, and offline isolation. Run frontend/API TypeScript checks, production build, native API ESM smoke checks and existing B2B/Firestore regression tests. No production writes are needed for these tests.

To disable event collection, remove the secret from the runtime configuration but securely retain its original value for later reads; or roll back to the prior commit. New analytics documents may remain and do not modify old records. Do not clear the database.

## Current verification result

Frontend/API TypeScript checks, production build, new isolated analytics tests, native API ESM smoke checks and existing B2B close-flow regression passed. The older `scripts/test-firestore-sync.mjs` fails at line 64 because it expects deletion without the newer administrator password authorization; it fails identically with the original main permissions, so this unrelated baseline test was not changed. Browser visual verification could not run because a Chromium download returned a truncated archive in this environment.
