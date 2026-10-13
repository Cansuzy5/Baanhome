# Private chat backup — isolated draft, disabled by default

This is an opt-in MANUAL backup/restore prototype, not automatic synchronization.
Existing local chat, AI generation, shared knowledge, B2B, logs and login remain unchanged.
No production data or deployed Firestore rules have been changed.

## Why separate authentication
Existing app login verifies mutable `appUsers` records on the client. Existing repo rules allow broad reads/writes of those records; a claimed app user ID is not a trusted Firebase identity. This implementation therefore uses a separately provisioned Firebase Authentication email/password account, on an ephemeral secondary Firebase app with in-memory auth. It never copies the application's existing passwords/hashes. The owner is Firebase Auth UID, not the legacy app ID. Users explicitly choose whether to upload the chat visible in their local account. Closing/navigating away logs out of the backup identity. This is intentionally a separate backup sign-in until the legacy login is migrated properly.

## Activation gates (not performed)
1. Confirm billing/free-quota eligibility and current usage in the EXISTING named Firestore database. Do not create another database. Free quota is shared with the rest of the app and may not be assigned to this database.
2. Enable Firebase Authentication email/password, provision individual pilot accounts, and add the actual preview host to authorized domains. No account self-registration is included.
3. Test the additive rules fragment in an emulator: unauthenticated denied, UID A cannot get/write/delete UID B, collection listing denied, owner operations allowed, invalid/oversized/future-expiry writes denied. Inspect actual deployed rules for overlapping wildcard grants. The repo's general wildcard is deny-all; production has not been inspected.
4. Apply ONLY the new collection rule to the existing deployed rules. Do not replace the entire ruleset with the fragment. Default rules deny this collection, so failures leave local history intact.
5. Set VITE_PRIVATE_CHAT_BACKUP=true ONLY in the dedicated preview deployment and rebuild. Keep absent/false in production. Run a two-user/two-device pilot before enabling production.

## Data and quota behavior
One `privateChatBackups/{FirebaseAuthUID}` document per backup account, at most 20 text turns from the last 30 days, at most 180,000 UTF-8 bytes. No images, knowledge documents or API keys in the backup. Explicit opening performs one server read. Each save normally performs one transaction read + one write; conflicts/retries can add reads. Delete normally performs one transaction read + one delete. There are no listeners, polling, automatic uploads or background retries. Conflicting writes reject and require reopening rather than overwriting another device. Restoring only updates the existing local history; it never calls AI. Network/permission failures do not delete or replace local chat.

30 days is a content filter, NOT guaranteed physical deletion on day 30. Old turns are excluded on upload/restore. An inactive account's backup remains stored until manually deleted or overwritten. No TTL is enabled because managed TTL deletion requires billing. A hard physical 30-day deletion requirement needs a separately approved cleanup strategy.

Example estimate, excluding existing application traffic: 20 staff each opening backup once and saving 30 times/day = about 620 document reads and 600 writes/day, without transaction retries. Maximum payload total for 20 accounts is 3.6 MB plus document/index overhead. Text payload index exemption is advisable before larger rollout. Free standard Firestore quota: 50k reads/day, 20k writes/day, 20k deletes/day, 1 GiB storage, 10 GiB outbound/month; only one database qualifies. Check console eligibility and actual usage, not estimates alone.

## Validation
Local payload tests and both disabled/enabled TypeScript/build checks are recorded in the PR. Real Firebase auth, actual database access, rule-emulator tests and browser cross-device verification are NOT yet performed. Do not call the draft production-ready.

Rollback: unset VITE_PRIVATE_CHAT_BACKUP and redeploy. No existing schema migration is required. Remove the additive rule only after deciding what to do with pilot backups; never clear other collections.
