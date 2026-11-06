# Round Prophet validation

| Area                                          | Final worker result                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Brief requirements                            | 30 met in the build/export; 2 publication deliverables after review; 0 faked                      |
| Broken primary features                       | 0 observed after corrections in the checked Chromium flows                                        |
| Product and main action on first 390px screen | Yes, at 390×844; fixture action bottom 780.19px; Offline action visible              |
| taste@1                                       | 16/16 checks passed on the final export                                                           |
| Engine/data tests                             | 19/19 passed                                                                                      |
| Browser interaction scenarios                 | 16/16 passed                                                                                      |
| Accessibility                                 | No axe violations in unselected, closed and locked arena states; explicit coverage limits below |
| Share card                                    | Real local canvas, 1200×630 PNG download, copy text and selectable fallback                       |
| Public GitHub / HTTPS URLs                    | After review by the assignment’s publisher; no URLs claimed or fabricated                         |

These are local worker observations, not independent certification. The visual idea is **a human-versus-Brain round duel carried by one original lime hamster wheel and a coral-versus-lime scoreboard**.

## Revision review · 2026-11-06

This revision preserves the accepted game, personas, scoring, visual system and layout. All three reported conditions were reproduced against the **unchanged** production export at 390px with explicitly synthetic public-API fixtures before source changes. Direct live verification was attempted, but the official `/v1/status` endpoint returned a Cloudflare HTTP 403 challenge. The live cadence described by the reviewer could therefore not be independently remeasured here. Reproduction evidence is in [revision-reproductions.json](revision-reproductions.json); the per-finding answers are in [../.imd-responses.json](../.imd-responses.json).

| Report | Confirmed cause and change in final source | Recheck |
| --- | --- | --- |
| High · healthy feed marked Stale | `src/data.ts:207`: the hardcoded 15-second generation-age limit rejected healthy 55-second-old status. Use the API's `staleAfterSeconds` window; preserve the separate observedAt and other freshness checks. | Unit boundaries 16–120 seconds, expiry and a different API window pass. A 55-second-old healthy fixture allows locking, scoring and navigation while Online. |
| Medium · locks accepted after closure | `src/data.ts:216`, `src/useGame.ts:391`, `src/useGame.ts:417`, `src/useGame.ts:481`: keep consecutive targets, calculate their API-clock deadlines, disable closed targets and recheck after final refresh for both first and subsequent calls. `src/useGame.ts:334` also prevents late spectator calls. | Closed-but-unsettled calls are blocked; the deadline closes Lock without an anchor change; both closure races are rejected with no player pick or invented result; a later settled/open target becomes available. The 390px closed-state screenshot keeps the action and explanation on screen. |
| Low · default Active choice | `src/App.tsx:67`, `src/App.tsx:98`, `src/App.tsx:137`: initialize/reset uncalled sides to null and require an explicit choice. Lock says Pick Active or Idle; bands wait for Active. Saved locked choices still restore. | Untouched load has zero pressed sides and no match. Keyboard choice, later-round resets, rematch and Idle/High reload restoration pass. |

The six Better Interface domains were reviewed for this bounded change: **accessibility** (pressed/disabled states, keyboard choice, saved-choice restoration, axe in unselected/closed/locked states), **layout** (390 first screen in open/closed/offline states and five-width reflow), **writing** (closed-round recovery and explicit choice; rules updated from settlement to closure), **typography** (existing scale and long note wrapping), **colors** (existing status/disabled tokens, final probe contrast), and **UI details** (loading/locked/closed/paused states, spectator gating, no added motion). All are Checked within the Chromium scope; the unperformed subchecks listed below remain limits. No visual-system redesign or dependency change was needed.

An additional deadline test uses a simulated browser clock, not a real-time wait. Final results are **19/19 unit tests, 16/16 browser scenarios and 16/16 taste checks**, plus zero axe violations in the reviewed states. [revision-interface.json](revision-interface.json) records final geometry, font loading, unlocked/closed axe results and console/resource checks. The first phone screen ends the action at 780.19px while Online; the Offline action also stays within 844px. These observations are local worker evidence, not independent certification.

## Scope and consequential choices

The finished Vite/React/TypeScript export in `dist/` was served at `/preview/`, including fonts, scripts, styles, favicon and social image. Arena, spectator, history, rule dialog, locked/pending state, error/retry, win, loss, draw and share flows were reviewed. English and a single dark theme are the implemented variants.

Brain precommits three forecasts and one band distribution at match start. This is a deliberate fairness choice: an absent tab never creates a hindsight forecast. Player calls still lock one round at a time, before the round closes. A closed next-unanchored round pauses locks until settlements catch up; no consecutive match leg is skipped. Tied calls award no round win; after three rounds, equal round-win counts draw. Uncalled consecutive rounds are explicit forfeits. Missing per-round proof stays pending. These rules are in the UI’s How to play dialog and README.

Recent history is derived only when cumulative ledger boundaries prove a round’s work. A positive multi-round total is not split. Zero issuance is not evidence of zero work. Thus “last 20” means up to 20 **proven** rounds, never filler rows.

## Brief requirement review

| Requirement                                                          | Status       | Evidence in the delivered site/source                                                    |
| -------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| Original beat-the-AI game, not a dashboard or link hub               | Met          | Playable duel is the entry view; original wheel, avatars, choice controls and scoreboard |
| Up to three consecutive rounds; first to two wins                    | Met          | `newMatch`, `resolveMatch`, early finish and explicit unused round                       |
| Momentum persona                                                     | Met          | Streak extrapolation, model card and reasoning                                           |
| Mean-revert persona                                                  | Met          | Baseline-gap fade, model card and reasoning                                              |
| Timekeeper persona                                                   | Met          | Public UTC half-hour cadence, model card and reasoning                                   |
| Explainable live weights                                             | Met          | Three named native meters, weight totals tested                                          |
| Player locks Active versus Idle before settlement                    | Met          | Status recheck, immutable pick, late-round rejection                                     |
| Optional Low/Mid/High band                                           | Met          | Active-only controls and frozen quantile thresholds                                      |
| Brain locks public-history side/band with reasoning                  | Met          | All three calls saved with history cutoff and explanation                                |
| Resolve on `builder.anchor.settledThroughRound` advance              | Met          | Anchor gate and exact per-round settlement proof                                         |
| Status and settlements as ground truth                               | Met          | Cumulative work adapter; no optimistic or minted-value shortcut                          |
| Side first, band bonus                                               | Met          | 3 points side, +1 correct Active band; higher round points wins                          |
| Victory and defeat screen                                            | Met          | Broke the Brain / Brain holds, plus honest draw state                                    |
| Canvas image and copy-text sharing                                   | Met          | PNG signature/dimensions and exact score/range verified                                  |
| Local season record                                                  | Met          | Current match plus last 30 completed matches; browser-only label                         |
| Arena scoreboard, lock CTA and freshness                             | Met          | Human/Brain scores; Online/Stale/Offline; Retry feed                                     |
| Spectator mode                                                       | Met          | Advance public call, side grading, local call sheet                                      |
| Last matches and approximately 20 rounds                             | Met          | Matchbook, re-openable result, rail of up to 20 proven rounds                            |
| Fairness statement                                                   | Met          | “Brain only sees the same public API” disclosure                                         |
| Original dark branding, hamster flavor, English and responsive UI    | Met          | Original inline SVG art; source and screenshots                                          |
| Poll status about two seconds; use settlements and stats             | Met          | Poll loop, change-aware refresh, explicit API paths                                      |
| Bigint-safe parsing                                                  | Met          | `lossless-json`, decimal-string state, precision tests                                   |
| Pause locks/scoring on failure, never invent settlements             | Met          | Offline/stale branches; outage/recovery and ambiguous-proof tests                        |
| No wallet, keys, contracts, claims or airdrop flow                   | Met          | Plain browser game; no transaction or wallet dependencies                                |
| Required footer                                                      | Met          | Exact community/public-data/no-real-money wording                                        |
| Production build, typecheck, useful interactions and recorded limits | Met          | Actual command results below                                                             |
| First phone screen and complete page metadata                        | Met          | 390 screenshots; title, favicon, description, og:title, og:image                         |
| Root DESIGN.md and installation/preview/rebuild documentation        | Met          | Final source-derived design system and README                                            |
| Complete relative static export, source and lockfile                 | Met          | `dist/index.html`, local assets, source, package-lock; subpath validation                |
| Apply Better Interface and pass design-critic                        | Met          | Six-domain review below; taste@1 16/16                                                   |
| Public GitHub repository                                             | After review | Source and full export handoff prepared; no remote created in this run                   |
| Hosted public HTTPS site                                             | After review | Publisher consumes committed `dist/`; URL not known in this run                          |

## Better Interface: six-domain coverage

| Domain        | Coverage and observed evidence                                                                                                                                                                                                                                 | Unperformed or inapplicable checks                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility | **Checked.** Native buttons/fieldsets/selects/meters, labels and pressed states, named dialog, Tab/Shift+Tab loop, Escape and focus return, visible focus screenshot, polite result announcement, keyboard-scrollable rail, reduced motion, automated axe scan | Screen-reader session, physical touch device and forced-colors rendering **not verified**. Passing axe is not full accessibility compliance. |
| Layout        | **Checked.** Production subpath, 320/390/760/1024/1440 widths, first-screen primary action, contained round rail, no normal-width overflow; 200% CSS text enlargement rechecked at 390                                                                         | Browser-native 200% zoom, RTL mirror and pseudo-localization **not verified**. English is the only supported locale.                         |
| Writing       | **Checked.** Verbs match actions, scoring/ties/forfeits explicit, missed and unused rounds distinct, recoverable errors, local-only record and model-lean qualifications                                                                                       | No settings or data-entry form requiring settings/autocomplete review.                                                                       |
| Typography    | **Checked.** Six-token scale, five computed sizes at 390/six including one-offs at 1440, two loaded local faces, three weights, wrapping and tabular changing numbers                                                                                          | Font binary variation metadata **not verified**; both requested faces were observed loaded.                                                  |
| Colors        | **Checked.** Actual rendered solid foreground/background pairs measured at rest; probe contrast passed; labels and icons duplicate color meaning                                                                                                               | No light theme exists. Native high-contrast rendering and colors behind every transient animation frame **not verified**.                    |
| UI details    | **Checked.** Hover/focus/press, loading/empty, pending/locked, success/loss/draw, stale/offline, retry, native disclosure/dialog, PNG/copy; wheel animation removed with reduced motion                                                                        | Physical Safari motion and browser Animation-panel playback at 10% speed **not verified**.                                                   |

The design reference’s six core domains and documentation method were read before implementation and used during construction. The final `DESIGN.md` was extracted from CSS tokens, source components and rendered behavior. The preserved notices are in `design-guidance-LICENSE.txt`.

## Initial implementation corrections (historical)

The following table records the accepted first build, before this revision; source line numbers are from that build and have shifted. Current revision source locations and rechecks are in the revision table above. Earlier live observations are not claimed as current live verification.

| Severity / root cause                 | Source                                      | Before and correction                                                                                                                                                                              | Recheck                                                                                                              |
| ------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| High · main action too low            | `src/styles.css:505`, `src/styles.css:1750` | Initial full-width wheel pushed the lock action below the phone screen. Put wheel beside controls on desktop; compact mobile art and connection notice.                                            | Final live 390 action bottom 780.19px; offline checked bottom 830.19px. Main product/action both visible.            |
| High · modal keyboard loop            | `src/App.tsx:880`                           | Native dialog allowed focus to leave its controls at the boundary in the tested Chromium automation. Add explicit forward/backward Tab loop and a named heading; preserve Escape and focus return. | Keyboard scenario passed; actual focused screenshot inspected.                                                       |
| Medium · too many slogans             | `src/App.tsx:212`, `src/components/Art.tsx` | Initial probe counted eight short multi-beat lines. Keep the wheel caption; replace extra lines with plain task and section labels.                                                                | Final slogan check passed with one multi-beat line; copy budget 45 words at 390 and 74 at 1440.                      |
| High · restored selected choice       | `src/App.tsx:98`                            | Reload initially reset the visible controls to Active even when the saved call was Idle. Initialize the selection and band from the locked leg.                                                    | Both Idle and Active/High restored in browser tests; live High call restored after reload.                           |
| High · settlement racing a new lock   | `src/useGame.ts:365`                        | A newly settled target could otherwise silently start the next round. Compare the visible anchor/installation with the fresh response and reject the changed target.                               | Race scenario rejects the first attempt, leaves no match, and accepts an explicit subsequent call for the new round. |
| Medium · enlarged navigation overflow | `src/styles.css:244`                        | At 200% CSS text size, the navigation extended document width to 465px at a 390px viewport. Allow mode navigation to wrap.                                                                         | Rechecked document scroll width 390px. Intentionally scrollable rail stays contained.                                |
| Medium · unused third-round copy      | `src/App.tsx:42`                            | The third row after an early 2–0 win still said “Up next.” Show “Not needed / Duel ended early.”                                                                                                   | Early-win browser scenario checks the actual third row.                                                              |
| Medium · persisted data robustness    | `src/useGame.ts:30`                         | Shallow local match/call checks could accept incomplete stored structures. Validate decimal IDs, consecutive legs, picks, model fields and result fields before restoring.                         | Corrupt-storage recovery and normal saved-match reload scenarios passed. No remote integrity claim is made.          |

No unresolved high or medium finding was observed within the checked Chromium scope. The probe notes two small brand/utility targets below the preferred 44px comfort size; all measured controls meet its 24px-or-spacing baseline. This is retained as a low-priority comfort limitation, not reported as a WCAG failure.

## Actual verification commands and outcomes

Dependencies and browsers for this revision were installed only in disposable `test/scratch/` scaffolding. The root package manifest, lockfile and dependency versions are unchanged. Normal installation remains `npm ci`. The existing optional Vite dependency alias resolves the scratch installation without altering production configuration. For strict typechecking, the final source, unchanged root `tsconfig.json`, package and lockfile were copied into `test/scratch/check/`, where the same `npm run typecheck` command ran.

The browser commands below used `PLAYWRIGHT_BROWSERS_PATH="$PWD/test/scratch/browser-binaries"`. Paths refer to disposable validation tooling, not required runtime files.

| Actual revision command | Result |
| --- | --- |
| `npm ci --prefix test/scratch/check --cache test/scratch/npm-cache --no-audit --no-fund` | Installed the locked dependencies in scratch. No repository dependency tree or manifest was changed. |
| `PLAYWRIGHT_BROWSERS_PATH=test/scratch/browser-binaries node test/scratch/reproduce.mjs` | All three reports reproduced against the unchanged export before edits. |
| `ROUND_PROPHET_DEPS="$PWD/test/scratch/check/node_modules" node test/scratch/check/node_modules/vite/bin/vite.js build` | Passed. 44 modules; main JS 245.16kB / 77.93kB gzip; CSS 29.12kB / 5.98kB gzip. |
| `npm run typecheck --prefix test/scratch/check` | Passed; strict `tsc --noEmit` on an exact final-source copy with the unchanged root configuration. |
| `node --import ./test/scratch/test-loader.mjs --experimental-strip-types --test test/engine.test.ts` | 19/19 passed directly against root source. The scratch loader only resolves lossless-json. |
| `ROUND_PROPHET_PLAYWRIGHT="$PWD/test/scratch/check/node_modules/playwright/index.mjs" ROUND_PROPHET_AXE="$PWD/test/scratch/check/node_modules/@axe-core/playwright/dist/index.mjs" node test/browser.mjs` | 16/16 passed against root dist at `/preview/`, including five added revision scenarios. Full results: interaction-report.json. |
| `IMD_PLAYWRIGHT="$PWD/test/scratch/check/node_modules/playwright/index.mjs" node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | 16/16 passed; render, layout, targets, contrast, casing, tracking, eyebrows, type sizes, faces, glyphs, slogans, repetition, copy budget, chrome, motion and share. |
| `node test/scratch/review-revision.mjs` | Final-source fixture screenshots, five viewport measurements, loaded local fonts, zero unselected/closed axe violations and no script errors or missing local resources. An initial scaffold attempt used browser.newPage, which axe rejects; using an explicit browser.newContext fixed the scaffold and the final run passed. |
| `curl -sS --max-time 20 -D test/scratch/live-status.headers https://api.squeekchain.com/v1/status -o test/scratch/live-status.json` | HTTP 403, cf-mitigated: challenge; no current live JSON cadence or live lock claimed. |
| `node scripts/check-budget.mjs` | Export assets resolve relatively; no included dependency archives or symlinks; inventory below both 8MiB total and 2MiB artifacts budgets. Exact bytes: submission-budget.json. |

The source test suite covers lossless unquoted integers, exact cumulative differences, proven zero intervals, unknown positive batches, anchor clipping, contradictory ledger values, installation mismatches, freshness including the API-provided age window, bigint-safe round deadlines, quantile boundaries, deterministic models/weight totals, side-first scoring, precommitments, 2–0/2–1 results, draws, forfeits and idempotent resolution.

The browser suite covers first-screen persona/side/band controls, five viewport widths, enlarged text, 2–1 victory, early victory and rematch, defeat and missed calls, draw, outage/recovery without scoring while offline, stale measurement/status, spectator grading, rule-dialog focus/Escape, reduced motion, a lock/settlement race, corrupt local storage, image export, successful copying, blocked clipboard fallback and opening match history. Revision scenarios additionally cover healthy 55-second-old status, explicit side selection/reset, closed targets and spectator gating, automatic deadline expiry, and both first/later closure races. The saved final report contains all 16 passing scenarios.

### Live data and networking limits

During this revision, `https://api.squeekchain.com/v1/status` returned HTTP 403 with `cf-mitigated: challenge`. No current live-status cadence, live prediction lock or full live match was verified. All timing regressions and complete games use explicitly synthetic fixtures, and the shipped application continues to fetch the official HTTPS API directly with no proxy or synthetic fallback. The actual failed-feed first screen remains Offline with locks and scoring paused.

`live-data-check.json` is the preserved **initial-build** capture from 2026-11-06 around 10:03 UTC (24 proven rounds through anchor #372 and a call on #373), not evidence for the revised build or current service availability. It is retained for provenance only.

The supplied browser tool failed at startup with a Chromium temporary socket-path error. The checked production export was instead inspected with the installed headless Chromium through Playwright, with screenshots opened for visual review. WebKit downloaded but host validation reported missing GTK, rendering and multimedia system libraries; Safari interactions were **not performed**. No system packages or private account configuration were modified to work around that limit.

### Rendered evidence

- [Phone arena](arena-390.png), final source/export with synthetic fixtures, 390×844; no side preselected, product and action visible.
- [Desktop arena](arena-1440.png), final source/export with synthetic fixtures, 1440×1000 viewport, full-page capture.
- [Spectator](spectator-390.png), final source/export with synthetic fixtures; calls and grading separate from local human play.
- [Closed target](closed-round-390.png), final source/export with synthetic fixtures; Online feed and disabled Round closed action with an explanation.
- [Actual offline first screen](offline-first-screen-390.png), final taste run; direct browser API egress unavailable, no live rounds invented.
- [Visible keyboard focus](help-focus-390.png), retained initial-build rules-dialog evidence; keyboard trapping/Escape/focus return were rechecked in the revision interaction suite.
- [Fixture share card](fixture-share-card.png), a **synthetic 2–1 test result**, not a claimed live victory; the downloaded PNG was inspected visually.
- [Probe result](taste-report.json), [interaction result](interaction-report.json), [accessibility/contrast provenance](accessibility-report.json), [revision interface checks](revision-interface.json), [initial-build live check](live-data-check.json), [byte inventory](submission-budget.json).

Final 390px unselected, closed and actual Offline screenshots and the 1440px screenshot were inspected, not inferred from source alone. Initial-build share/focus evidence is retained; those flows also passed the final interaction suite. The first 390 screen, original hamster, score/controls hierarchy, result PNG, dialog focus ring and enlarged-text reflow were viewed. The probe found no normal-width document overflow, text overlap, covered text, clipped text, missing local resource or script error. Font loading was observed for both local faces. Additional fonts are not fetched at runtime.

## Completion and remaining limits

Current live service timing and WebKit behavior are not verified in this revision for the concrete reasons above. No worker claim substitutes for the independent reviewer.

**Build and static-export scope complete.** Production build, strict typecheck, meaningful interactions, six design domains, final design probe, documentation and size checks are complete within the stated Chromium coverage.

Public GitHub repository creation and public HTTPS publication remain **after review**, through the assignment’s publisher. The handoff includes the full source, lockfile and `dist/`. No public URL, remote creation, Git commit or completed external publication is claimed by the worker.

Not verified: physical iPhone/Safari, real screen-reader operation, browser-native zoom, RTL/pseudo-localization, forced-colors rendering, binary font variation metadata, and native browser animation-panel replay. No light theme is implemented. Local records are browser-local and editable, not cross-device or tamper-proof. Public history gaps can keep a result pending indefinitely; that is deliberately preferable to inventing a per-round result. Unknown service timing and public availability remain external constraints.

Final packaging correction: ordinary repository file discovery omitted `artifacts/` under an inherited ignore rule. Root `.gitignore` explicitly includes that directory, with a **2MiB** path budget enforced by `scripts/check-budget.mjs`; cache and dependency exclusions follow it and still apply at every depth. `dist/` remains included. The final inventory includes these reports and screenshots.
