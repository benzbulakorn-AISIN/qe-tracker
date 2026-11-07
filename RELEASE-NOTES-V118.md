# QE Elec. Daily Job Tracker V118

## P0 Data Safety fixes
- Excludes internal `qe_v78_migration` from Cloud shared-local collection. The key remains in localStorage for QE78 migration logic but is no longer a user data record to upload.
- Initial Checklist hydration now re-baselines only existing Cloud `ChecklistDay` records during the initial hydration window, preventing normalized Cloud data from appearing as an unsaved user edit.
- Main QE Jobs V117 initial-hydration protection remains.
- Initial-hydration mode closes immediately after the first completed Cloud pull/baseline refresh so later real Checklist edits are detected normally.
- No database schema, RLS, role, storage-key format, API contract, or data-format changes.

## Acceptance test
1. Fresh/new mobile session: login and do not edit anything. Pending must be 0.
2. Tap Pull latest: pending must stay 0.
3. Edit one Checklist item: pending must become Checklist 1.
4. Save it, pull latest: pending returns to 0.
5. Main QE Jobs should not create hundreds of pending records on initial load.
