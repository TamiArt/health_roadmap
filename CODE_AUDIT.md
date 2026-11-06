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
