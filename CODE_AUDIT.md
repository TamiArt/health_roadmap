# Code audit and integration record

## Scope

- Repository: `TamiArt/health_roadmap`.
- Active development branch: `chore/code-quality-audit`.
- Protected base: `main`; no direct changes are made there.
- Integration source: `feat/storage-profile-isolation-tests`.
- The source branch contains 97 commits and 26 changed files relative to `main`; automatic GitHub merge reported conflicts, so changes were integrated selectively while preserving newer calendar and health-record work.

## Integrated architecture and data-model changes

- Added shared domain types in `src/app/models.ts`.
- Split fixtures/configuration into `lifeMapData.ts`, `healthData.ts`, `familyData.ts` and `analyticsData.ts`.
- Extracted the canonical laboratory catalogue into `labCatalog.ts`: concepts, age-stage assignments, stage definitions and read-model selectors.
- Kept `data.ts` as a backward-compatible export barrel; the calendar section remains part of the `Section` union.
- Added unit tests for domain fixtures, catalogue identity, stage selectors, and analytics calculations.
- Updated feature components to import domain data from the owning modules.
- Added `MedicalHistoryTab` for searchable and date-filtered history of manually entered measurements.
- Updated analytics to read saved data from the selected adult or child profile. Removed reliance on hard-coded personal health scores, fake trends and static priorities.

## Integrated storage and profile-isolation changes

- Added `deleteChildHealthRecords(childId)` to remove the child from the profile registry and tombstone every child-owned record in one IndexedDB transaction.
- `writeRecord` now checks the child registry inside the same read-write transaction before accepting any `childHealth:<id>:` write. A stale tab cannot recreate records after deletion, even if it still holds an old in-memory snapshot.
- Deletion broadcasts the updated profile registry and all tombstones to open tabs; adult records remain untouched.
- Backup migration validates child-key/profile references, preserves all supported child-owned record types and nested Blob attachments, and rejects orphaned child data.
- The family UI now waits for storage cleanup before removing the child profile and reports deletion errors.
- Delete controls support accessible labels.
- Added E2E coverage for all seven child-owned storage keys, two-child separation, adult-profile boundaries, atomic cleanup, tombstones for every key, and rejection of a stale-tab write after deletion.
- Added migration tests for schema-0 backups containing child profile data and PDF Blob attachments, plus rejection of orphaned child keys.
- Ported profile-isolation and backup-race E2E scenarios: separate child profiles, stale tabs, backup restore refresh, and stale initial snapshots.
- Existing calendar and health-record E2E scenarios remain in the current test suite.

## CI environment and Playwright

The workflow is pinned to `ubuntu-24.04` with Node.js 22. The repository currently uses Playwright 1.56.1. This avoids the unsupported Ubuntu 26.04 browser package lookup that occurs when the runner is `ubuntu-26.04` or `ubuntu-latest` resolves to that image.

The CI browser-install step is `npx playwright install --with-deps chromium`. The latest CI run `45174097271` completed successfully: TypeScript, structure validation, dependency audit, 53 unit tests, Chromium installation, all 34 E2E scenarios and production build passed. The run used commit `f740bbf7`.

- Investigated `The operation was canceled` in the TypeScript step: run `45173518658` was explicitly marked `cancelled`; `npm run typecheck` had started and was interrupted about 2.3 seconds later, with no TypeScript diagnostics. The workflow's `concurrency.cancel-in-progress: true` was the cause: a newer push canceled the active run. This was not a `tsc` type/syntax failure, timeout, or OOM.
- Changed CI concurrency to `cancel-in-progress: false` so an active typecheck/build is not terminated by a newer push. A pending run may still be superseded by GitHub, but the running validation completes. `package.json`, TypeScript configuration, and the `tsc --noEmit` command were intentionally left unchanged.

If the runner is intentionally moved to Ubuntu 26.04, update `@playwright/test` and its lockfile to at least 1.61.0 before changing the runner. Do not update only `package.json` while leaving `package-lock.json` on 1.56.1.

## Known remaining work

1. Complete calendar navigation to source records and notification behavior.
2. Perform manual mobile/tablet and screen-reader checks.
3. Keep the roadmap and this audit synchronized after each completed stage.

## Safety and release rules

- Full path-by-path comparison of all 26 changed files and full CI have completed successfully. `feat/storage-profile-isolation-tests` is safe to delete; it has intentionally been left intact for the user to remove.
- Stage 1 (storage reliability and profile isolation) is complete. CI run `45174097271` passed 53 unit tests, 34 E2E scenarios and production build.
- Do not merge this branch into `main` unless explicitly requested.
- Preserve the current development branch until the user approves the next merge/release step.
- No clinical correctness review of medical schedules is implied by the structural refactor.
