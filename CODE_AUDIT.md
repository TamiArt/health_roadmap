# Code audit — 2026-11-06

## Scope and baseline

- Repository: `TamiArt/health_roadmap`.
- Audit branch: `chore/code-quality-audit`.
- Base: `main` at `e3701650e418d0912498822ddbf97df83e40cdad`.
- Audit type: static source/configuration/documentation review. No local npm/Playwright execution was available during this review; findings below are based on the current repository contents and should be verified with CI before behavior-changing refactors.
- No production user data or storage migration was touched.

## Findings

### High priority

1. **[Partially remediated] Feature state is lost when navigating between main sections.**
   - `src/app/App.tsx` renders only the currently selected feature from a switch statement.
   - `LifeMapSection`, `FamilySection`, `HealthSection` own their editable state locally. Switching to another section unmounts the previous component and recreates its state on return.
   - Result: added life events, family members/events, dental notes and health-tab state can disappear during ordinary navigation. Vaccine statuses are lifted to `App`, but still reset after a full reload.
   - Implemented on the audit branch: main sections and health tabs remain mounted while hidden; E2E scenarios cover life-map/family edits and dental notes across main-section and health-tab navigation.
   - Scope: this preserves React state only during the current page session. Reloading the page or closing the tab still resets the in-memory data.
   - Implemented: each child health view remains mounted while the family list or another child is displayed, preserving its vaccine, dental and test-tab state when the profile is closed and reopened.
   - Scope: all these changes remain in memory for the current page session only. Reloading the page or closing the tab still resets them. Define data ownership and privacy/export/deletion behavior before adding persistent storage.

2. **The lab-test catalogue has overlapping and duplicate records.**
   - `src/app/data.ts`: the base and newborn groups both contain “Группа крови и резус-фактор” (lines 112 and 135).
   - The same test names recur across age groups: ОАК (149, 162, 201, 219), ОАМ (151, 164, 202, 220), ферритин (155, 207, 225, 246), glucose, lipid profile, TSH and biochemistry.
   - Some recurrence may represent a legitimate repeat screening interval, but records currently have independent IDs and no shared test identity, so counts/uploads can be duplicated and there is no explicit distinction between “same test at a new age” and “duplicate catalogue entry”.
   - `childAgeStages(0)` returns both `base` and `newborn`, so the exact blood-group test appears twice for a newborn.
   - Next: define canonical test IDs and age-stage references; preserve repeated schedules only where explicitly justified. Add tests for unique catalogue identity and expected age-stage composition. Medical schedules require source review before consolidation.

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

6. **CI push trigger excludes the new development branch.**
   - `.github/workflows/ci.yml` only runs push builds for `chore/initial-technical-roadmap`.
   - The new branch will not receive push CI feedback until a pull request is opened against `main`.
   - Next: run CI on development branches (or all branches) while retaining the PR-to-main trigger.

7. **Russian interface metadata is configured as English.**
   - `index.html` declares `lang="en"`, English title and an English description that mentions career, finances and goals, while the actual app is a Russian life/health/family navigator.
   - Next: align document language, title and description with the real interface and current scope.

8. **Architecture documentation names a directory that does not exist.**
   - `OVERVIEW.md` lists `src/app/components/ui/`, but the current repository tree has no such directory; the reusable UI helpers currently live in `src/app/shared.tsx`.
   - Next: keep the overview tree synchronized with the repository.

9. **The app has no committed dependency lockfile.**
   - The repository contains `package.json` but no `package-lock.json` or `pnpm-lock.yaml`; CI uses `npm install`.
   - This makes dependency resolution less reproducible than `npm ci` with a committed npm lockfile.
   - Next: generate and commit the npm lockfile using the project's supported Node/npm version, then switch CI to `npm ci`. Do not fabricate a lockfile by hand.

### Lower priority / verification

10. **Automated regression coverage is still narrow.**
    - Playwright runs only Chromium and the 390 px overflow scenario checks main-section shells, not every health sub-tab, child-health tab, or tablet viewport.
    - Add coverage for dental and lab tabs at mobile widths, tablet widths, keyboard navigation, and persistence across section/tab changes after the state model is decided.

11. **Unused-code checks are not enforced.**
    - `tsconfig.json` sets `noUnusedLocals` and `noUnusedParameters` to `false`.
    - No lint script is configured. Dead imports/variables and inconsistent patterns can therefore escape CI.
    - Next: first enable unused checks and fix the resulting verified warnings; consider a lightweight lint configuration only if it adds clear value.

12. **The project guidelines file is still the untouched template.**
    - `guidelines/Guidelines.md` contains “Add your own guidelines here” and generic template text.
    - Next: either replace it with concise project-specific rules or remove it if no tooling consumes it.

## Confirmed duplicates vs. intentional repetition

- No duplicate literal `id` values were found in `data.ts` during the static scan.
- Repeated lab-test names were found across age stages. They are not automatically safe to delete: a repeated test may represent a valid age-specific interval. Consolidation must preserve the intended schedule and clinical source.
- The recommendation ID set is a confirmed second source of truth and has mismatches with `priority`.

## Prioritized implementation plan

1. **Stabilize state ownership and define data boundaries.** Map which state must survive section/tab navigation; lift it to a feature-level store/repository with typed models. Add regression tests before moving state. Keep persistence in memory for this substep; do not introduce remote services.
2. **Normalize the screening catalogue.** Introduce canonical test identity, age-stage membership and one recommendation field. Review repeated tests and schedules against trustworthy, jurisdiction-specific sources before changing medical content.
3. **Fix resource and identity lifecycle.** Revoke object URLs, centralize unique IDs, and validate add/edit forms (year ranges, birth year, required text, numeric fields).
4. **Restore reproducible CI.** Add the npm lockfile, use `npm ci`, make push CI cover the active development branch, enable unused TypeScript checks, and verify the full pipeline.
5. **Close metadata and documentation drift.** Correct document language/meta, synchronize `OVERVIEW.md`, replace/remove the generic guidelines template, and keep this roadmap current.
6. **Expand regression and accessibility.** Test all tabs and child views at mobile/tablet sizes, keyboard/focus behavior, empty/error states, and state preservation. Perform a manual visual review before declaring responsive work complete.

## Constraints for follow-up work

- Work only in `chore/code-quality-audit`; never commit to `main`.
- No paid APIs/services, no external analytics/telemetry.
- Preserve the existing visual design unless a verified defect requires a narrowly scoped fix.
- Keep files below 1500 lines; prefer focused modules.
- No real personal/medical data in source code or fixtures.
- Do not change clinical recommendations without cited source, jurisdiction, version/date and an explicit review.
- Do not add persistent storage until backup, export/import, deletion and privacy behavior are designed.
- Run typecheck, unit tests, E2E and production build after each functional change; report what was actually run.
