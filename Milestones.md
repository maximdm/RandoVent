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
**Status:** 🟡 In progress. Builds a real match-setup flow so users control more than defaults:
- `MatchOptionsScreen`: per-sport option controls (tennis/volleyball/table-tennis BO3/BO5/BO7,
  basketball quarter length 10/12, rugby Union/League, e-sport best-of + round target), editable
  team names, and a seed field. Replaces the previous "always use defaults" path.
- App flow: Home → Sport Picker → Options → Live/Summary. `defaultMatchConfig` retained for
  quick/test paths.
- Wired through `LiveMatchScreen`/`MatchSummaryScreen` via `MatchConfig.participants`.

**Acceptance**
- Every sport's documented options are reachable from the UI and change the simulated match
  structure (e.g., BO5 tennis plays to 3 sets; 10-min basketball totals below 12-min).
- Custom team names and a fixed seed reproduce a match deterministically.
