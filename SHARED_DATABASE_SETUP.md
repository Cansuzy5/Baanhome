# Shared database change — activation required before merging

This branch is not a verified production deployment. Keep it as a draft until the setup and live checks below pass.

## Data ownership

- Employee questions, unanswered-question workflow and appointments: existing spreadsheet `1sY0GAv6nCT_0gIM2qK91i76ZL5_VjoUBJPX0DGw5Bdg`.
- Accounts: existing Firestore `appUsers` collection only. No browser/default-account login fallback or automatic account seeding. Existing account hashes are retained; login is verified server-side, and password hashes are omitted from responses.
- Knowledge: existing file upload workflow and schema remain unchanged.
- B2B leads: existing central Firestore B2B document. Appointment data in that legacy document is retained for explicit migration but no longer serves active appointments.

## Required setup

1. In the Apps Script bound to the existing Sheet, replace the gateway code with `scripts/shared-sheet-webapp.gs`. Set Script Property `APP_KEY` to a strong random secret. Update the existing Web App deployment to the new version (execute as owner).
2. In Vercel Preview environment set:
   - `GOOGLE_SHEETS_WEBAPP_URL`: the existing `/exec` URL supplied by the owner.
   - `GOOGLE_SHEETS_APP_KEY`: exactly the Script Property value, server-only.
   - `SESSION_SECRET`: an independently generated random secret of at least 32 characters, server-only.
3. Redeploy the preview. Check that the existing intended administrator account exists in Firestore `appUsers` and can log in. The previous browser/demo fallback passwords deliberately no longer authenticate. Do not reset or seed accounts automatically if the collection is empty; reconcile existing `systemConfig/users`, `data/persistent_users.json`, and the administrator's saved account data first.
4. Open Sheets DB and verify the actual connection and counts. As administrator, preview and confirm the one-time import from persisted Firestore questions/appointments. Existing Sheet IDs are skipped. Import runs in small batches and can resume after a failure. Individual legacy documents take precedence over whole-list mirrors; review conflicting sources before importing. This does not import old browser-only data automatically.
5. Test with two browser sessions: create/edit/delete a test appointment, refresh the second session, then delete the last test record. Test an unanswered question and its status. Create a temporary user, change role, suspend it and reset its password. Verify that failed writes display an error and do not remove the item. Remove test data afterward.
6. Only after validation, set the same environment variables for Production and merge/deploy.

## Preservation and limitations

- A one-time `*_before_shared_db` local backup is kept before refreshing old browser caches. Do not clear browser storage before reconciling browser-only records. Old Firestore records are not deleted by migration.
- The gateway verifies the spreadsheet ID, serializes mutations with ScriptLock, updates by ID and removes duplicate rows for that same ID. It never clears a whole tab. Existing visible columns remain in order; questions L/M and appointments O/P preserve workflow/title/link metadata.
- The current repository Firestore rules allow public access to `appUsers` and `systemConfig`. Signed API sessions do **not** fix that pre-existing direct-database exposure. A service-account-backed server and corresponding restrictive Firestore rules are still needed before treating account authorization as secure. Do not blindly deploy restrictive rules while using the client Firestore SDK on the server: it would block server access too.
- Database writes outside the requested questions, appointments and accounts flows have not received a full security or synchronization audit.
- Apps Script may time out after accepting a write; re-read before retrying. Stable IDs make retries idempotent. Polling refreshes other sessions every 10–15 seconds, not instantaneous push.

## Local verification

`npm run lint`

`npx tsc -p tsconfig.api.json`

`node scripts/test-api-esm.mjs`

`node scripts/test-shared-db.mjs`

`npm run build`

Tests use a mocked Sheet gateway. They are not evidence of a live Google Sheet or Vercel connection.
