# Code audit — 2026-11-06

## Scope and baseline

- Repository: `TamiArt/health_roadmap`.
- Audit branch: `chore/code-quality-audit`.
- Base: `main` at `e3701650e418d0912498822ddbf97df83e40cdad`.
- Audit type: static source/configuration/documentation review plus completed GitHub Actions verification for commit 36213a78c176ee8334987831862fcecae0e5e523. The current CI run completed successfully; no local npm/Playwright execution was performed.
- No production user data or storage migration was touched.

## Findings

### High priority

1. **[Session-level remediation implemented] Feature state was lost when navigating between sections and child profiles.**
   - `src/app/App.tsx` now keeps all four main sections mounted and hides inactive sections; local state is not destroyed by main navigation.
   - `HealthSection` keeps its four tabs mounted. `ChildHealthView` tabs also remain mounted, and each child view is retained while the user returns to the family list or opens another child.
   - E2E scenarios cover life-map and family edits across section navigation, dental notes across health-tab/section navigation, and child dental notes after closing/reopening a child profile.
   - Scope: this preserves React state only during the current page session. Reloading the page or closing the tab still resets in-memory data. Persistent storage is intentionally deferred until data ownership, privacy, export/import, deletion and backup behavior are designed.

2. **The lab-test catalogue has overlapping and duplicate records.**
   - The `base` and `newborn` groups both contain “Группа крови и резус-фактор”; they also both contain the neonatal screening test (the labels differ slightly, but the description is the same).
   - `childAgeStages(0)` returns both `base` and `newborn`, so both records are currently rendered twice for an infant. This is a confirmed presentation/data duplication.
   - The same test concepts recur across age groups: ОАК, ОАМ, ферритин, glucose, lipid profile, TSH and biochemistry. Some recurrence may represent a legitimate repeat screening interval, but records have independent IDs and no shared concept identity.
   - The catalogue currently mixes a test concept, an age-stage assignment and a screening frequency. Represent these separately before broad consolidation.
   - Next: define canonical test concept IDs and age-stage assignments; preserve repeat intervals only where explicitly justified. Medical schedules require source review before changing their meaning.

3. **[Remediated on this branch] “Recommended” test classification had two sources of truth.**
   - `src/app/data.ts` marks tests with `priority: "r"`.
   - `src/app/HealthSection.tsx` separately maintains `RECOMMENDED_IDS`.
   - These diverge: `r11`, `a4`, `a5`, `a9`, `a10` are in the UI set but do not carry the data priority flag. This can produce inconsistent labels if one list is updated without the other.
   - Implemented: the UI now reads `LabTest.priority` directly. The five catalogue records that were present in the old UI-only set (`r11`, `a4`, `a5`, `a9`, `a10`) were marked with the same existing `priority: "r"` value so visible labels remain unchanged. A unit test locks the recommendation IDs and verifies catalogue IDs are unique. This is a UI classification consistency fix, not a clinical guideline review.

### Medium priority

4. **[Remediated on this branch] Temporary file object URLs were not released.**
   - `LabTestsTab.handleFile` creates URLs using `URL.createObjectURL(file)`.
   - Removing an upload only removes the record; it does not call `URL.revokeObjectURL`. Switching tabs can also unmount the tab and discard the upload state while leaving the URL allocated.
   - Implemented: object URLs are tracked, revoked when an upload is removed, and all remaining URLs are revoked when the lab tab unmounts. Browser-level upload/remove verification remains to be added.

5. **[Remediated on this branch] Generated record IDs relied on millisecond timestamps.**
   - Life events and family members/children/events use `Date.now().toString()`.
   - Two creations within the same millisecond can collide, causing duplicate React keys and incorrect updates/deletes.
   - Implemented: centralized ID creation in `shared.tsx` using `crypto.randomUUID()` with a monotonic in-session fallback; life events, family records and uploaded results now use it. A unit test checks uniqueness across repeated calls.

6. **[Remediated on this branch] CI push trigger excluded new development branches.**
   - Push CI now runs on all branches while PR validation remains scoped to PRs targeting `main`.
   - A concurrency group cancels superseded runs on the same ref to avoid wasting CI time on intermediate commits.
   - Final branch revision `96404168aeed60ee96e1e26751fe57059972b8a6` passed the complete GitHub Actions pipeline: TypeScript, 12 unit tests, 10 E2E tests and production build. [Run](https://github.com/TamiArt/health_roadmap/actions/runs/42205150923).

7. **[Remediated on this branch] Russian interface metadata was configured as English.**
   - `index.html` now declares `lang="ru"` and uses a Russian title/description aligned with the current life, health and family scope.

8. **[Remediated on this branch] Architecture documentation named a directory that does not exist.**
   - `OVERVIEW.md` now describes the actual `src/app` layout and `shared.tsx` helpers.

9. **The app has no committed dependency lockfile.**
   - The repository contains `package.json` but no `package-lock.json` or `pnpm-lock.yaml`; CI uses `npm install`.
   - This makes dependency resolution less reproducible than `npm ci` with a committed npm lockfile.
   - Next: generate and commit the npm lockfile using the project's supported Node/npm version, then switch CI to `npm ci`. Do not fabricate a lockfile by hand.

### Lower priority / verification

10. **Automated regression coverage is improving but still incomplete.**
    - Playwright currently runs Chromium. E2E now covers 10 scenarios, including session-state retention, but tablet widths, every child-health path, keyboard accessibility and manual visual review remain outstanding.
    - Add coverage for dental and lab tabs at mobile widths, tablet widths, keyboard navigation, and persistence across section/tab changes after the state model is decided.

11. **[Partially remediated] Unused-code checks were not enforced.**
    - `tsconfig.json` now enables `noUnusedLocals` and `noUnusedParameters`.
    - The first strict run found two unused imports (`INP` in `HealthSection.tsx` and `Trash2` in `LifeMapSection.tsx`); both were removed.
    - No lint script is configured. Consider a lightweight lint configuration only if it adds clear value.

12. **[Remediated on this branch] The project guidelines file contained only a generic template.**
    - `guidelines/Guidelines.md` now contains project-specific rules for privacy, medical content, data integrity, architecture, accessibility and verification.

## Confirmed duplicates vs. intentional repetition

- No duplicate literal `id` values were found in `data.ts` during the static scan.
- Two duplicated infant records are confirmed: blood group/Rh and neonatal screening appear in both `base` and `newborn`, and `childAgeStages(0)` displays both stage groups.
- Other repeated lab-test concepts across age stages are not automatically safe to delete: a repeated test may represent a valid age-specific interval. Consolidation must preserve the intended schedule and clinical source.
- The recommendation ID set is a confirmed second source of truth and has mismatches with `priority`.

## Prioritized implementation plan

1. **Stabilize state ownership and define data boundaries.** Map which state must survive section/tab navigation; lift it to a feature-level store/repository with typed models. Add regression tests before moving state. Keep persistence in memory for this substep; do not introduce remote services.
2. **Normalize the screening catalogue.** Introduce canonical test identity, age-stage membership and one recommendation field. Review repeated tests and schedules against trustworthy, jurisdiction-specific sources before changing medical content.
3. **Fix resource and identity lifecycle.** Revoke object URLs, centralize unique IDs, and validate add/edit forms (year ranges, birth year, required text, numeric fields).
4. **Restore reproducible CI.** Add the npm lockfile, use `npm ci`, make push CI cover the active development branch, enable unused TypeScript checks, and verify the full pipeline.
5. **Close metadata and documentation drift.** Correct document language/meta, synchronize `OVERVIEW.md`, keep project-specific guidelines current, and keep this roadmap current.
6. **Expand regression and accessibility.** Test all tabs and child views at mobile/tablet sizes, keyboard/focus behavior, empty/error states, and state preservation. Perform a manual visual review before declaring responsive work complete.

## Constraints for follow-up work

- Latest verified branch SHA before documentation follow-up: `36213a78c176ee8334987831862fcecae0e5e523`; CI run `42205611369` completed successfully.
- `main` remains at `e3701650e418d0912498822ddbf97df83e40cdad`; it was not modified.
- Work only in `chore/code-quality-audit`; never commit to `main`.
- No paid APIs/services, no external analytics/telemetry.
- Preserve the existing visual design unless a verified defect requires a narrowly scoped fix.
- Keep files below 1500 lines; prefer focused modules.
- No real personal/medical data in source code or fixtures.
- Do not change clinical recommendations without cited source, jurisdiction, version/date and an explicit review.
- Do not add persistent storage until backup, export/import, deletion and privacy behavior are designed.
- Run typecheck, unit tests, E2E and production build after each functional change; report what was actually run.


## Follow-up implementation — feat/local-first-data-platform

Base: `main` at `f877d4c69f46ce145c5f7264452cffe3f067d49b`. This section supersedes the earlier "main remains" note above.

### Implemented
- Replaced personal-looking life-event and family seed data with generic demo fixtures. Health-roadmap examples were also generalized.
- Removed duplicate infant assignments for blood group/Rh and neonatal screening. Moved the adult chest-imaging example out of the birth-stage group, preserving the existing text and frequency.
- Corrected age-stage selection: birth-stage entries are shown only for infants; preschool, school and young-adult stages no longer inherit birth-only items.
- Added stable `conceptId` values for recurring test concepts and separate `LAB_TEST_CONCEPTS` / `LAB_TEST_ASSIGNMENTS` read models. `LIFE_STAGES` remains the compatibility grouping consumed by current UI components.
- Added IndexedDB persistence for life events, family members, children, family events, vaccine statuses, adult/child dental records and uploaded lab-result Blobs.
- Added JSON backup export/import, schema versioning, a 0→1 migration path, validation of record keys, import confirmation and Blob base64 encoding.
- Added E2E coverage for 768 px tablet overflow, keyboard activation, child form validation, reload persistence and backup restore.
- Added a source-file line-count check (1500 lines maximum).
- Added npm audit to CI. The first audit found vulnerable Vite and Vitest dependency trees; direct versions were raised from Vite 6.3.5 to 6.4.5 and Vitest 3.2.4 to 3.2.7. The latest observed CI run on the follow-up branch is pending final E2E/build completion; the earlier run at Vitest 5.1.0 passed TypeScript, structure validation, dependency audit and unit tests.

### Remaining / not yet verified
- [Resolved in this branch] A real npm lockfile v3 was generated by npm 10.9.x on Node 22 in GitHub Actions. The lockfile pins Vite 6.4.5 and Vitest 5.1.0; CI now uses `npm ci`.
- GitHub Actions reported TypeScript errors during intermediate commits; those were corrected (missing demo fixture export and BlobPart typing). The newest full run must pass before this branch is considered stable.
- Browser-native IndexedDB is local to one browser profile. There is no server database, account system, encryption-at-rest layer or cross-device sync.
- JSON backups contain sensitive personal/medical data in readable form. Users must protect exported files. Encryption/password protection is not implemented.
- Lab-result Blobs are included in backups, but backup size is capped at 100 MB and each uploaded file at 15 MB.
- Manual tablet review, full keyboard/screen-reader audit and all-form validation remain incomplete; E2E coverage is not a substitute for manual review.
- The normalized catalogue is a compatibility projection. A future refactor should make concepts and assignments the canonical source rather than keeping the legacy nested `LIFE_STAGES` shape as the authoring source.
- Medical content and schedules have not been clinically reviewed or updated.

### Data safety notes
- IndexedDB records are not encrypted by this implementation.
- Import atomically replaces the current app-record store after format/schema/key validation; it is destructive by design and guarded by a confirmation dialog.
- Clearing browser site data deletes the local database. Keep independent backups.
- The first app launch seeds generic demo content; subsequent edits are saved locally. There is no migration of earlier in-memory-only session data after a page refresh.


## Дополнительный аудит — восстановление резервной копии (2026-11-06)

### Высокий приоритет — исправлено, ожидает CI

1. **Восстановление IndexedDB размонтировало приложение во время обновления состояния.**
   - В `usePersistentState` событие `life-maps:backup-restored` вызывало `setReady(false)`. Корневой `App` при `!storageReady` возвращал экран загрузки вместо дерева приложения.
   - Размонтирование запускало cleanup эффекта (`active = false`), поэтому завершившийся асинхронный `readRecord` не мог выполнить `setReady(true)`. Панель статуса и управления исчезала; это объясняет нестабильное наблюдение Playwright (старый status затем отсутствует).
   - Исправлено: обновление после импорта не сбрасывает `ready`, перечитывает IndexedDB при смонтированном дереве; ключи, отсутствующие в восстановленной копии, возвращаются к начальному значению.
   - E2E дополнен проверками доступности панели и навигации после успешного импорта, а также ошибочного файла и сохранения работоспособности приложения после ошибки.

2. **Риск повторного появления исходных данных для отсутствующих в backup ключей.**
   - Ранее reload обновлял только ключи, найденные в backup. После корректного импорта отсутствующий ключ мог остаться в React state со старым значением, хотя в IndexedDB запись уже очищена.
   - Исправлено сбросом такого ключа к переданному начальному значению при событии восстановления.

### Проверки
- На ревизии `64e7f94c7f2ab4afd1edc6cdb538e4fce5b1a603` CI: TypeScript, структура, npm audit и unit tests прошли; E2E выявил первопричину, production build был пропущен из-за падения E2E.
- Исправление и новые E2E-сценарии закоммичены отдельно; итоговый статус будет зафиксирован после завершения CI.


## UI/accessibility and input-boundary audit — 2026-11-07

### Fixed in `feat/ui-quality-accessibility`
- The persistent local-storage notice is hidden at mobile breakpoints. Transient operation/error feedback remains visible.
- Backup controls are offset above the fixed mobile navigation; E2E now checks their bounding boxes do not overlap.
- E2E navigation selectors now use `tab` roles; vaccine status controls are queried by their accessible labels rather than visible status text alone.
- Added pure validation helpers for bounded integers and required trimmed text, with unit tests.
- Family forms now reject blank/oversized names, ages outside 0–120, non-integer ages, child birth years outside 1900–2026, and oversized optional relation/date/emoji values.
- Life timeline create/edit paths now reject years outside 1900–2100, blank/oversized titles, descriptions over 500 characters, and oversized emoji values.
- Added E2E coverage for whitespace-only child names, future birth years, invalid timeline years and mobile menu clearance.

### Verification status
- TypeScript, project structure, dependency audit and unit tests were observed passing on the preceding CI revision before the final combined validation changes.
- The latest combined revision's full CI is pending; do not treat E2E or production build as passed until GitHub Actions completes.
- Manual testing on real mobile devices and a full screen-reader review remain outstanding.


## Medical attachment validation — 2026-11-07
- Added client-side allowlisting for PDF, PNG, JPEG, WEBP and GIF. SVG and unknown extensions are rejected.
- The validator checks extension/MIME consistency, zero-byte files and the existing 15 MiB per-file limit. Empty MIME metadata is tolerated when the extension is supported.
- The file input now has an accessible name; invalid selection is reported and the input is reset so the same file can be selected again.
- Unit tests cover allowed formats, unsupported SVG, MIME mismatch, empty files and the exact/over-limit size boundary. E2E covers rejecting SVG and accepting a PDF.
- Full CI for the final E2E revision is still pending; do not mark browser tests/build as passed until the latest workflow completes.


## IndexedDB connection lifecycle — 2026-11-07
- Fixed a connection lifecycle issue in `openDatabase`: `IDBOpenDBRequest.onblocked` is a waiting notification, not a terminal failure. Rejecting the promise there left a rejected promise cached and could permanently prevent retries in that tab.
- The open request now remains pending while another tab releases its connection. Successful connections close on `versionchange` and clear the cached connection promise so the next access can reopen the database.
- Browser multi-tab upgrade behavior is not yet covered by a dedicated automated IndexedDB integration test; latest CI is pending.


## Manual lab measurements — 2026-11-07
- Added a separate IndexedDB collection (`labMeasurements`) so manually entered values do not replace uploaded file records.
- Each result stores a stable ID, sample date (`YYYY-MM-DD`), original value text and optional unit. Multiple dated measurements per test are retained and displayed newest first.
- Numeric and qualitative values (including comparator strings) are accepted without clinical interpretation or reference-range judgment.
- Validation rejects blank/oversized values, invalid calendar dates, future dates and oversized units. Individual measurements can be deleted independently.
- Added the new storage key to the backup allowlist, including per-child health keys, so results are included in export/restore.
- Unit tests cover valid/invalid dates, qualitative/numeric values and backup schema validation. E2E covers persistence after reload and restoration from backup.
- The attachment-upload E2E selector was updated to match the visible `Файл` action. The earlier run's failure was a stale selector, not a failure of the new measurement flow; final CI remains pending.


## Lab measurement editing — 2026-11-07
- Added an edit action to each saved manual result. The form is prefilled with the existing date, value and unit.
- Saving an edit preserves the original record ID and replaces that record in the per-test history; it does not append a duplicate. Results are re-sorted by sample date.
- Cancel clears edit mode without mutating the stored record. Deletion remains a separate action.
- Extended the Playwright scenario to edit a saved result, change its date, and assert that the previous value is no longer rendered.
- The preceding revision (`f9d4f109`) passed the complete CI pipeline, including E2E and production build. CI for this edit is running separately.


### E2E assertion correction — 2026-11-07
- The first edit-flow E2E revision correctly changed the stored value from `5.4` to `<0.1`, but its post-reload assertions still expected the original value/date. The failure was a stale test expectation, not an observed IndexedDB write failure.
- Updated the post-reload assertions to expect `<0.1 ммоль/л` on `07.11.2026` and to verify that `5.4 ммоль/л` is absent.
- Re-run the full CI pipeline for the corrected test before treating this path as verified.


## Cross-tab IndexedDB updates — 2026-11-07
- Added `BroadcastChannel` notifications after successful IndexedDB write transactions. Messages carry the record key and structured-cloneable value; no medical data is sent to a remote service.
- Each persistent-state hook listens for updates to its own key, applies the received value, and suppresses the resulting persistence effect once to prevent cross-tab echo loops.
- The listener is closed during hook cleanup. Browsers without `BroadcastChannel` continue to use the existing local IndexedDB behavior, without cross-tab live updates.
- E2E now opens a second browser tab, edits a lab measurement in the first tab, and verifies the second tab receives the new value/date before reload.
- Full CI for this revision is pending.


## Stale-write protection — 2026-11-07
- IndexedDB records now carry a monotonically increasing `revision`. Legacy records without this field remain readable and are treated as revision `0`; no data migration or destructive rewrite is required.
- `writeRecord` performs a compare-and-write in a single `readwrite` transaction. If the stored revision differs from the caller's expected revision, the transaction does not write and returns the already committed value/revision.
- The hook adopts the winning committed value on conflict instead of overwriting it. BroadcastChannel messages include revisions; older or duplicate messages are ignored.
- E2E asserts the revision metadata exists and has advanced after creating and editing a manual lab result. Full CI for this revision is pending.


## Deterministic stale-tab conflict E2E — 2026-11-07
- Added a two-tab Playwright scenario where both tabs load the same initial revision.
- The second tab disables `BroadcastChannel` before app initialization so it deliberately remains stale while the first tab commits a newer revision. The test waits for the first transaction's revision to reach `2` before submitting the stale edit.
- The stale tab then attempts a different value. Assertions verify that compare-and-write rejects it, the stale tab adopts the committed value, and a reload still reads the winning value (the rejected value is absent).
- This tests the IndexedDB conflict guard independently of live cross-tab notifications. Full CI is pending.


## Persistence integration correction and write ordering — 2026-11-07
- Review of the new branch found that the compare-and-write API had been added but the React persistence effect still called `writeRecord` without `expectedRevision`. This meant the conflict guard was not active through normal UI edits. The hook now passes its current revision to every write.
- Writes from one hook are serialized through a promise queue. Each queued operation reads the latest committed revision when it executes, so rapid local updates do not race using the same revision.
- A generation counter invalidates queued writes after a newer remote notification or storage-key change. The conflict E2E now exercises the wired hook path and checks the stale edit is rejected.
- This correction is important: earlier documentation described the intended compare-and-write behavior before it was fully connected to the UI persistence path. Treat the feature as verified only after the current CI passes.


### Conflict-test calibration — 2026-11-07
- The first conflict E2E failed because it assumed a newly created record would have exactly revision `2`. The app legitimately advances revisions more than once during initial persistence/Strict Mode lifecycle, so the exact count was not a valid invariant.
- Updated the test to capture the settled stale tab's actual revision, then require the first tab's committed revision to be greater before submitting the stale edit. This tests ordering, not an implementation-specific counter value.
- The failed run had TypeScript, structure, dependency audit and unit tests green; Playwright had 21 passing tests and this single failing scenario. Production build was skipped because E2E failed.


### Restore/write ordering — 2026-11-07
- Loading a record (including after a backup-restore event) now increments the write generation before reading IndexedDB. Any queued pre-restore writes are invalidated, preventing stale in-memory state from being written back over the restored backup.


### Исправление лишней записи при загрузке состояния — 2026-11-07
- Найдена причина падения `stale tab cannot overwrite a newer lab measurement revision`: после загрузки записи из IndexedDB хук запускал эффект сохранения для уже загруженного значения. Это создавало лишнюю ревизию без пользовательского изменения.
- Вторая вкладка, открытая для проверки конфликта, могла тем самым увеличить ревизию, не отправляя BroadcastChannel-сообщение (в тесте канал намеренно отключён). Первая вкладка оставалась со старой ревизией, и её обычное сохранение `6.1` ошибочно отклонялось как конфликт.
- Исправлено: загруженный снимок помечается как пропускаемый для следующей записи; добавлена защита `loadedKey`, не позволяющая сохранять прежнее состояние при смене ключа до завершения загрузки нового.
- E2E теперь отдельно проверяет, что простое открытие второй вкладки не увеличивает ревизию, после чего проверяет обычное сохранение `6.1` и отклонение устаревшего `7.2`.
- Проверки CI для этой корректировки должны быть запущены заново; результат предыдущего запуска не считается подтверждением исправления.


## Уведомление о конфликте сохранения — 2026-11-07
- [x] Расширить `usePersistentState`: отдельно от технических ошибок возвращать признак конфликта ревизий.
- [x] При отклонении устаревшей записи показывать доступное предупреждение в разделе анализов: пользователь видит, что загружена последняя версия и его изменение не сохранено.
- [x] Сбрасывать предупреждение после следующей успешной локальной записи; получение актуального значения из другой вкладки само по себе не считается пользовательским сохранением.
- [x] Расширить двухвкладочный Playwright сценарий проверкой предупреждения после stale write.
- [ ] Проверить TypeScript, unit, E2E и production build на этой ветке.


### Уточнение E2E-селектора уведомления о конфликте — 2026-11-07
- Первый запуск после добавления предупреждения показал, что на странице одновременно присутствуют два элемента `role=status`: существующая подпись о локальном хранении и новое предупреждение конфликта.
- Само предупреждение отображалось корректно; падение вызвано строгим Playwright-селектором, который выбрал оба элемента.
- Селектор уточнён через фильтр по тексту предупреждения. Повторный полный CI запущен после исправления.


## Безопасность восстановления резервной копии между вкладками — 2026-11-07
- [x] При импорте резервной копии читать прежние ревизии внутри одной readwrite-транзакции и увеличивать ревизию каждого восстановленного ключа.
- [x] Для ключей, отсутствующих в резервной копии, сохранять tombstone с увеличенной ревизией: устаревшая вкладка не сможет воскресить удалённые данные.
- [x] Исключать tombstone-записи из экспорта резервной копии.
- [x] Рассылать событие восстановления через BroadcastChannel; остальные вкладки перечитывают записи из IndexedDB.
- [x] Добавить Playwright сценарий: вкладка с начальной ревизией 0 пытается записать старое состояние после восстановления, но восстановленное событие остаётся в базе.
- [ ] Подтвердить TypeScript, unit, E2E и production build.


### Защита удалённых при восстановлении ключей — 2026-11-07
- [x] При конфликте записи, если резервная копия намеренно удалила ключ, хук восстанавливает `initialValue`, а не передаёт `undefined` в React state.
- [x] Добавлен отдельный двухвкладочный E2E: старая вкладка не может воскресить запись, удалённую импортом резервной копии; интерфейс остаётся работоспособным.
- [ ] Проверить новые сценарии на полном CI.
