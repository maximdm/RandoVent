# Milestones — Multi-Sport Realistic Match Simulator

Each milestone lists **Deliverables** and **Acceptance Criteria**. Rules, naming, and the
`MatchConfig` contract are defined in `agents.md`; the high-level approach is in `Plan.md`.

## M0 — Scaffold & Tooling
**Status:** ✅ Done (Expo SDK 58 / React 19 / RN 0.88, TS strict). Zustand deferred — simple
`useState` machine suffices for M0–M2; revisit when shared cross-screen state grows.

**Deliverables**
- React Native project (Expo or Bare workflow) with TypeScript `strict` mode enabled.
- State management via Zustand (or Context + `useReducer`).
- Folder structure from `agents.md` §2 (`engine/`, `components/`, `screens/`, `utils/`).
- `tsconfig` rule forbidding `any` (e.g., `@typescript-eslint/no-explicit-any` as error).

**Acceptance**
- App builds and runs on an Android emulator/device.
- `tsc --noEmit` passes with `strict: true` and no `any`.

## M1 — Engine Core
**Status:** ✅ Done. Implemented as `engine/core/Distributions.ts` (seeded PRNG + Poisson/Normal/
weighted/bernoulli/pick), `MatchConfig.ts` (SportKey enum + discriminated union), `EventTypes.ts`
(SimEvent/SimResult), and `SportEngine.ts` base interface. Note: `SimulationClock` folded into
Instant/Accelerated mode handling (M4); engine is pure TS and framework-free.

**Deliverables**
- `engine/core/SimulationClock.ts` (Instant vs Accelerated tick logic).
- `engine/core/Distributions.ts` (Poisson, Normal, weighted helpers + **seeded PRNG**).
- `engine/types/MatchTypes.ts`, `engine/types/ParticipantTypes.ts`.
- `SportEngine` base interface + the `MatchConfig` discriminated union (`agents.md` §8).

**Acceptance**
- Unit tests for distributions (mean/variance within tolerance) and the seeded PRNG
  (same seed → identical sequence; different seed → different sequence).
- `MatchConfig` typechecks for every sport with the correct per-sport options.

## M2 — Football Vertical Slice
**Status:** ✅ Done (engine + screens + FlashList feed wired). `EventFeed` replaces the planned
`Scoreboard`/`SpeedControls` for now (single live screen; Accel controls land in M4).

**Deliverables**
- `FootballEngine.ts`: Poisson goals (λ ≈ 1.1–1.6), cards, corners, fouls, offsides; player attribution.
- Screens: `MatchSetupScreen`, `LiveMatchScreen`, `MatchSummaryScreen`.
- Components: `Scoreboard`, `EventFeed` (FlashList, FlatList fallback), `SpeedControls`.

**Acceptance**
- Generated scores fall within the realism ranges in `agents.md` §4.A.
- Play-by-play feed renders smoothly at 60fps on Android.
- Events are attributed to `PlayerTeamXNoY` per the naming rules (§3).

## M3 — Remaining Sports
**Status:** ✅ Done. All nine sports now have engines: Football, Tennis, Basketball, Ice Hockey,
Volleyball, Table Tennis, Rugby (Union/League), E-Soccer, E-Sport. Each respects its scoring
distribution and event taxonomy; `getEngine(sport)` + `defaultMatchConfig(sport)` make them
runnable from a new `SportPickerScreen`. Per-sport options are wired through `MatchConfig`.

**Deliverables**
- Engines: Tennis, Basketball, Ice Hockey, Volleyball, Table Tennis, Rugby (Union + League),
  E-Soccer, E-Sport — each with its rules/events from `agents.md` §4.
- Wire each sport's config options through `MatchConfig`:
  - Tennis `matchFormat: 'BO3' | 'BO5'`
  - Basketball `quarterLength: 10 | 12`
  - Rugby `code: 'UNION' | 'LEAGUE'`
  - Table Tennis `matchFormat: 'BO5' | 'BO7'`
  - Volleyball `sets: 'BO3' | 'BO5'`
  - E-Sport `bestOf: 1 | 3 | 5`

**Acceptance**
- Every sport respects its state machine, scoring distribution, and event taxonomy.
- Selecting each option produces the correct match structure (e.g., BO5 tennis goes to 3 sets;
  10-min basketball quarters total 40 mins).

## M4 — Simulation Modes
**Status:** ✅ Done. Instant and Accelerated both consume the same precomputed `SimResult`
(the engine output), so Accelerated is a timed reveal — guaranteeing byte-identical final logs.
Implemented in `src/engine/playback.ts` (`MatchPlayback`, `runningScore`) + `src/hooks/useMatchPlayback.ts`,
exposed via an Instant/Accelerated toggle, match clock, progress bar, live running score, and
Pause/Resume/Reset/Skip controls in `LiveMatchScreen`.

**Deliverables**
- Instant mode: full match in <50ms, immediate scoreboard + stats + full event log.
- Accelerated mode: 2 match-minutes per real second (100ms/250ms ticks), with Pause/Resume/Reset.
- Both modes driven by the **same** underlying event generator.

**Acceptance**
- For a fixed seed, Instant and Accelerated produce byte-identical event logs.
- Accelerated UI updates feel continuous and stay at 60fps on Android.

## M5 — Lottery Generator
**Status:** ✅ Done. Engine (`src/engine/lottery/Lottery.ts`) + `LotteryScreen` (form with
count/min/max/sets/allowDuplicates/sorted/seed, hyphen output, typed error display) wired into
the home menu via a top-level screen switcher.

**Deliverables**
- `LotteryEngine.ts` + UI, implementing `LotteryConfig` (`agents.md` §7):
  `count`, `min`, `max`, `allowDuplicates`, `sorted`, `sets`, `seed`.

**Acceptance**
- Output is hyphen-joined and zero-padded to `max` width (e.g., `10-15-16-23-41-47`).
- Respects uniqueness when `allowDuplicates: false`; generates `sets` independent draws.
- Validation throws a typed error when `count > (max - min + 1)` and duplicates are off.
- Seeded runs are reproducible.

## M6 — Polish & Hardening
**Status:** ✅ Done. FlashList feed with `keyExtractor` + `React.memo` rows and TeamA/TeamB accent
colors + bold badges for key events (GOAL, RED_CARD, POINTS_3/THREE_POINTER, SET_WIN, GAME_WIN,
TRY, MAP_WIN, FOUL_OUT, BONUS) were completed in M2. This milestone adds the edge-case models and tests:
- Football: red cards reduce team scoring strength (`applyRedCardPenalty`, applied per match).
- Hockey: ties resolved by a shootout (never a draw).
- Basketball: ties resolved by repeated 5-min overtimes.
- Basketball: **team-foul / bonus / foul-out modeling** — personal fouls tracked per player
  (foul out at 5), team fouls reset per quarter, opponent enters the bonus at the 5th team foul
  and shoots two bonus free throws each (made with `FT_RATE`); `FREE_THROW_MISS` event keeps
  `runningScore` exact.
- `sortEvents` guarantees period/match-end markers always sort last (fixed a bug where
  stoppage-time / overtime events sorted after the final whistle).
- `EdgeCases.test.ts`: tennis tiebreak (7-6) validity, table-tennis/volleyball win-by-2 bounds,
  hockey no-draw + shootout occurrence, basketball OT + bonus/foul-out, football red-card penalty
  + realistic score bounds, lottery boundary validation, mismatched-config rejection, and
  determinism across 50 seeds × 9 sports.

**Deliverables**
- FlashList (with `keyExtractor` + `React.memo` row items; FlatList fallback) for the event feed.
- Visual clarity: bold badges for key events (GOAL, SERVICE_BREAK, RED_CARD, THREE_POINTER_MADE)
  and distinct accent colors for TeamA/Player A vs TeamB/Player B.
- Edge-case test coverage: tennis tiebreaks/deuce, red cards & reduced strength, overtime,
  basketball fouls-out/bonus, hockey shootout, lottery boundary validation.

**Acceptance**
- 150+ instantly generated events (basketball/tennis) scroll without dropped frames.
- All edge-case tests pass; `tsc --noEmit` and lint stay green.

## M7 — UI Depth (options + customization)
**Status:** ✅ Done.
- `MatchOptionsScreen`: per-sport option controls (tennis/volleyball/table-tennis BO3/BO5/BO7,
  basketball quarter length 10/12, rugby Union/League, e-sport best-of + round target), editable
  team names, and a seed field. Replaces the previous "always use defaults" path.
- App flow: Home → Sport Picker → Options → Live/Summary. `defaultMatchConfig` retained for
  quick/test paths.
- **Player-attribution summary** (`src/engine/stats.ts` `computePlayerStats`/`topBy`): derives
  per-team top scorers and discipline leaders directly from the event log (no engine pre-aggregation).
  Engines now carry `player` + `team` on scoring/foul events — basketball (points + fouls, fully
  attributed), football (goals + cards), hockey (goals + penalties), rugby (tries), volleyball
  (per-rally points attributed to a roster player). `MatchSummaryScreen` renders Top Scorers and
  Discipline Leaders per team (hidden for individual sports that emit no team-roster players).
- **Deuce / tiebreak badges**: new `DEUCE` event kind; `EventFeed` badges `DEUCE` and `TIEBREAK`
  (bold, like other key events). Tennis emits `DEUCE` at 40-40; volleyball emits `DEUCE` at
  set point (24-24 / 14-14).
- _Note: a real-device run (`npx expo prebuild` + `npm run android`) to verify the FlashList
  native module and 60fps cannot be performed in this sandbox and remains a manual step._

**Acceptance**
- Every sport's documented options are reachable from the UI and change the simulated match
  structure (e.g., BO5 tennis plays to 3 sets; 10-min basketball totals below 12-min).
- Custom team names and a fixed seed reproduce a match deterministically.
- Player leaderboards sum exactly to team totals (basketball points/fouls verified); deuce badges
  appear across seeds.

## M8 — Lottery Notebook (save / replace / delete sets)
**Status:** ✅ Done. A persistent "notebook" of up to 10 saved lottery sets, each with an editable
note (label). Built in `src/storage/savedSets.ts`:
- Pure, IO-free operations `addSavedSet` / `replaceSavedSet` / `removeSavedSet` (capped at
  `MAX_SAVED_SETS = 10`).
- `SavedSetsRepository` interface with an `InMemorySavedSetsRepository` (session) and an
  `AsyncStorageSavedSetsRepository` (JSON round-trip, corruption-tolerant). `createSavedSetsRepository`
  uses AsyncStorage when the package is present and falls back to in-memory otherwise. Because Metro
  will not bundle a variable `require`, enabling disk persistence after installing the package
  requires a one-line change in that factory (swap the guarded `require` for a static
  `import AsyncStorage from '@react-native-async-storage/async-storage'`).
- `LotteryScreen` UI: each generated line gets a **Save** button; the notebook lists saved sets with
  editable label + numbers, and **Save / Replace / Delete** per set, plus **Clear all**. Saving is
  blocked (with a hint) when the notebook is full.

**Acceptance**
- Notebook holds at most 10 sets; saving when full reports "full" and does not mutate state.
- Replace overwrites a slot; Delete removes it; both preserve other slots and ids.
- (Future) Install `@react-native-async-storage/async-storage` and switch `createSavedSetsRepository`
  to a static import to persist across app restarts — currently falls back to in-memory in this
  environment (native-module script installs are blocked by the project's npm policy).

> Note: the project's npm policy blocks native-module script execution, so AsyncStorage is not yet
> installed; the feature works in-session and will persist to disk once the package is added and the
> factory's `require` is swapped for a static import.

## M9 — Match Statistics Panel (all sports)
**Status:** ✅ Done. The Match Summary now shows a **Match Stats** table (per-team tallies derived
from the event log) plus **period / set breakdowns**, covering all nine sports:
- `computeMatchStats(sim)` in `src/engine/stats.ts`: per-team counts of every event kind (goals,
  corners, fouls, cards, saves, offsides, substitutions, penalties, 2/3-pt shots, free throws,
  tries, conversions, penalty/drop goals, rally points, **service breaks**, shootout goals, etc.)
  surfaced via `STAT_LABELS` — only rows with data for at least one team are shown.
- **Period Breakdown** for period-based sports: football & rugby (1st/2nd half), hockey (Period 1–3),
  basketball (Q1–Q4 / OT) — the latter read from authoritative `quarterScores` metadata.
- **Set Breakdown** for set-based sports: tennis / volleyball (sets) and table-tennis (games) from
  `setScores` / `gameScores` metadata.
- **Tennis service breaks**: new `BREAK` event kind, emitted by `TennisEngine` when the returner wins
  a game (serve now alternates each game). `DEUCE` / `TIEBREAK` counts also surfaced.
- `EventFeed` now badges `BREAK` like other key events.
- **Live stats toggle**: `LiveMatchScreen` gained a **Feed / Stats** switch (works in both Instant
  and Accelerated modes) that shows the same stats panel mid-match. The rendering was extracted into a
  shared `src/components/MatchStatsView.tsx` (`StatTable` + `MatchStatsSections` + `MatchStatsView`)
  so the Summary screen and the live toggle use one implementation.
- **Random seed by default**: `MatchOptionsScreen`'s seed field is now optional — blank means a fresh
  random 32-bit seed is generated at match start (in `App.start`), so every "new game" differs. A typed
  non-negative integer is still honoured for reproducible results. The seed actually used is recorded
  in `match.metadata.seed` and shown in both Live and Summary screens.

**Bug fixed (latent, surfaced by this feature):** `BasketballEngine.recordQuarter` subtracted the
previous *delta* instead of the running cumulative, so per-quarter scores were wrong from Q3 onward.
Now uses explicit cumulative trackers; quarter scores sum exactly to the final score (verified by a
new invariant test). Also fixed rugby `half` (was always `1`; now 1st/2nd half by minute) so the
half breakdown is correct.

**Acceptance**
- Football corners tally equals the `CORNER` event count; goal tallies equal team scores and sum to
  the final across both halves.
- Tennis service breaks occur across seeds; set breakdown length equals sets played.
- Basketball quarter breakdown sums to the final score; hockey shows 3 periods.
- `computeMatchStats` runs without error for all nine sports.
- Live **Stats** toggle renders the same panel (per-team tallies + period/set breakdowns) during a
  match in both Instant and Accelerated modes.
- Leaving the seed blank yields a different match each game; entering a seed reproduces the same match
  (the used seed is displayed in Live + Summary for reproducibility).

## M10 — UI Redesign (cohesive visual system)
**Status:** ✅ Done. Re-skinned every screen around a shared component kit
(`src/components/ui.tsx`: `Screen`, `Card`, `Title`, `Subtitle`, `SectionTitle`, `Button` via
`Pressable` with variants, `Segmented` control, `Field`, `Input`, plus a `palette`) so the app is
visually consistent and more usable:
- **Home**: card-based menu with descriptions for Simulate Match and Lottery.
- **Sport picker**: 2-column card grid with emoji + tagline per sport (e.g. "11 v 11 · 90 min").
- **Match options**: grouped cards (Teams / Match setup), styled inputs, and segmented controls
  replacing the old single-tap cycle buttons for BO3/BO5, quarter length, rugby code, etc.
- **Live**: scoreboard header (team colours, big score, seed), segmented toggles for
  Instant/Accelerated and Feed/Stats, custom buttons; the play-by-play rows now have a team-coloured
  left accent.
- **Summary**: hero score card + sectioned cards (stats, top scorers, discipline leaders).
- **Lottery**: card layout, 2-up numeric grid, segmented On/Off toggles, notebook cards.

**Acceptance**
- `tsc --noEmit` clean; all engine + stats tests still pass (104).
- Every screen uses the shared kit (no ad-hoc `StyleSheet` duplication); the look is uniform across
  Home, picker, options, live, summary and lottery.
- No behaviour changed — only presentation and control affordances (segmented vs cycle button).

## M11 — Match loop controls (replay same sport + return to all sports)
**Status:** ✅ Done. Streamlined the post-match loop so users can re-roll without re-entering options.
- `App` now remembers `lastConfig` (sport, team names, options) and exposes a `replay` action that
  re-simulates the **same sport and settings with a fresh random seed** (the last-config seed is
  cleared so it differs each time).
- **Live** and **Summary** screens gained two actions: **"Same Sport ↻"** (replay) and **"All Sports"**
  (return to the sport picker). The Live screen's old "New Match" (which also went to the picker) is
  replaced by these two clearer buttons; Summary's "Back to Home" is now paired with "All Sports".

**Acceptance**
- `tsc --noEmit` clean; all tests pass (104).
- "Same Sport ↻" yields a different match each tap (random seed) while keeping sport + team names +
  options; "All Sports" returns to `SportPickerScreen`.
- No engine/stats logic changed — only navigation actions and button wiring.
