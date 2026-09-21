# Firestore operational synchronization

This branch supersedes the Sheets proposal in PR #3 for operational records. It is based on main f72dc2dc4299a4c0a86bb0d8229e606c4c686e9b.

## Canonical data
- Project/database: firebase-applet-config.json, named database ai-studio-1982e74e-9ff9-469a-9cec-64e98f787d0b.
- Accounts: appUsers (per-document writes, central login reads).
- Appointments and leads: systemConfig/b2b payload (transactional mutations).
- Questions: questionLogs; unanswered workflow: unansweredQuestions; audit display: userActivityLogs.
- Uploaded general knowledge retains its existing workflow and server database.

Browser storage is a display cache only. Users are no longer merged from a device cache, uploaded as a whole list, or recreated from built-in accounts. Mutations wait for Firestore acknowledgment. Empty confirmed snapshots clear lists. B2B writes return 503 on database failure, never success from memory or /tmp. Both preview Express routes and Vercel routes use the same handlers.

B2B compatibility: when the named systemConfig/b2b document is absent, the API copies the old durable default-database document in a destination transaction. An existing named document, including an empty payload, is never overwritten. The source is retained. Browser-only and /tmp records are not automatically imported. Account records stored only in the legacy systemConfig/users mirror or browser caches must be reconciled before production activation; no automatic default/password seeding is performed.

## Verification
- TypeScript frontend and API checks.
- Native Node ESM API import/OPTIONS checks.
- Production build.
- Mocked Firestore regression: duplicate concurrent user creation, failed write preservation, central account status/login, stale-cache login rejection, last-record deletion, two-device appointment create/edit/delete, rejection of bulk replacement, durable B2B copy and no resurrection from legacy after deletion.

## Live verification limits
Live Firestore account reads were blocked by automatic approval review because unauthenticated document reads could expose password hashes/private account data. No actual two-browser production verification or live data migration was performed. Latest main already uses named appUsers as its account source; this change retains that source and existing IDs. Live cross-device confirmation still requires an authenticated account. Do not interpret passing mocks as proof that deployed database rules or quota allow writes.

Existing client-side account authentication and permissive Firestore rules are not redesigned here. This fix addresses consistency; it is not a claim of secure server-enforced RBAC. No database rules are changed.

Latest main appointment form, not-met status, outcome metrics and exports are retained. Account audits include the actual pre-change identity/role/department read inside the write transaction. No password values are logged.
