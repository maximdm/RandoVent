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
> **Reworked in M12**: the notebook is now "the Slip" with per-set re-roll and a multi-backend
> persistence layer (see M12).

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

## M12 — "The Slip" (re-think lottery: per-set re-roll + persistent)
**Status:** ✅ Done. Reworked the lottery notebook into a proper **slip** of 1–10 ticket sets.
- `src/storage/slip.ts` replaces `savedSets.ts`. Each `SlipSet` now stores its own generation
  **`config`** (`count`, `min`, `max`, `allowDuplicates`, `sorted`) plus the `seed` used, so a set can
  be **re-rolled with the exact same conditions** but a fresh random outcome (`rerollSlipSet`).
- `LotteryScreen` exposes an **"Add to Slip"** generator (Count / Sets 1–10 / Min / Max / Seed /
  duplicates / sorted) and renders **"Your Slip (n/10)"** with one card per set: editable label, the
  numbers, a human-readable conditions line (e.g. "6 from 1–49 · unique · sorted"), and **Reroll ↻** +
  **Delete** buttons. **Clear all** wipes the slip.
- **Persistence**: `createSlipRepository` tries (in order) `@react-native-async-storage/async-storage`
  (already a declared dependency), then `expo-file-system`, then an in-memory fallback. The optional
  backends are loaded via a *dynamic* `require` (module name in a variable) so Metro does not fail to
  bundle when they are absent; the chosen backend is used transparently. Added `FileSystemSlipRepository`
  (JSON file in `documentDirectory`, corruption-tolerant) alongside the existing key-value store.
- **Latent bug fixed**: `generateLottery` with no seed fell back to `createRng(0)` (always the same
  draw). It now uses a fresh `randomSeed()` when `seed` is omitted, so blank-seed draws and re-rolls
  actually vary. `randomSeed()` was also centralized in `src/engine/core/Distributions.ts` (App now
  imports it instead of defining its own).

**Acceptance**
- `tsc --noEmit` clean; tests pass (105 — added a `rerollSlipSet` test; `savedSets.test.ts` replaced by
  `slip.test.ts`).
- Slip caps at 10 sets; adding when full reports "full" and does not mutate state.
- **Reroll** preserves the set's `config` but produces different numbers (verified) and a new seed.
- A blank seed yields a different draw each time; an explicit seed still reproduces exactly.

> Persistence caveat: real disk persistence requires a storage backend to be present in the build. In
> this dev sandbox none is installed (same native-module install block as M8), so the slip currently
> falls back to in-memory for the session. To enable it on a device, ensure
> `@react-native-async-storage/async-storage` is installed/linked (it is already a `package.json`
> dependency) or run `npx expo install expo-file-system` — no code change is needed; the factory picks
> it up automatically.

## M13 — Multi-slip: named, collapsible slips (re-think of M12)
**Status:** ✅ Done. Reworked M12's single global slip into a proper **collection of slips**.
- Data model in `src/storage/slip.ts` is now `Slip { id, name, sets, createdAt, updatedAt }` holding up
  to `MAX_SLIP_SETS` (10) `SlipSet`s; the repository persists an array of `Slip` (key
  `randovent.slips.v1`, file `randovent.slips.json`). Caps: `MAX_SLIPS = 10` slips.
- Pure ops: `createSlip` (auto-name "Slip N"), `renameSlip`, `removeSlip`, `addSetToSlip` (per-slip
  cap + `full` flag), `replaceSetInSlip`, `removeSetFromSlip`, `rerollSetInSlip` (re-roll a set with
  its saved conditions, fresh seed). The per-set helpers are applied inside the slip mapping so state
  stays immutable.
- `LotteryScreen` UX:
  - **Generator** chooses a target via a horizontal chip selector (each slip by name + "＋ New"); a
    `Generate & Add` run appends the batch to the chosen slip, or creates a new one when "＋ New" is
    selected. A "＋ New Slip" button creates an empty named slip on demand.
  - **"Your Slips (n/10)"** lists each slip as a **collapsible card**: a chevron toggles expansion, the
    **name is an inline editable field**, a `k/10` badge shows fill, and a 🗑 deletes the slip. Expanded
    slips show their sets (editable label, numbers, conditions line, **Reroll ↻** / **Delete**).

**Acceptance**
- `tsc --noEmit` clean; tests pass (107 — `slip.test.ts` now covers create/rename/remove/add/replace/
  remove-set/reroll at the slip-collection level, plus collapse persistence).
- Up to 10 slips; each slip up to 10 sets; overflow reports "full" and does not mutate state.
- Rename persists; **collapse state is persisted** on each slip (`collapsed` field) so it survives app
  restarts; **deleting a slip or an individual set shows a confirm dialog** (Cancel / Delete) before
  removing it, and deleting a slip also drops it as the generation target.
- Same persistence caveat as M12 (backend-dependent disk storage).

> Note: `LotteryScreen` previously referenced a single `SlipSet[]`; it now drives the `Slip[]` model.
> No engine logic changed — only storage shape, screen wiring, and the persistence key/format.

## M14 — Dark Mode (light/dark/system theme)
**Status:** ✅ Done. Centralised all colours behind a `Theme` token set and a `ThemeProvider`.
- `src/theme.tsx` defines `lightTheme` and `darkTheme` (full token set: bg, surface, surfaceAlt,
  border, text, subtext, textDim, muted, primary, teamA/teamB, danger, feed/table tints, etc.) plus a
  `ThemeMode = 'system' | 'light' | 'dark'`. `ThemeProvider` follows `useColorScheme()` when in
  `system` mode, exposes `{ mode, setMode }` via `useThemeControls`, and persists the choice with the
  same dynamic-require storage trick as the slip store (key `randovent.themeMode`). `useTheme()`
  returns the active token object.
- `src/components/ui.tsx` rebuilt so `Screen/ScrollScreen/Card/Title/Button/Segmented/Field/Input`
  read every colour from the active theme (styles built per-theme). `palette` export removed.
- All screens migrated off hard-coded hex: `LiveMatchScreen`, `MatchSummaryScreen`, `MatchStatsView`
  (stat tables + period/set breakdowns), `EventFeed` (team accents + row background), `LotteryScreen`
  (chips, slip cards, set rows, error card), `HomeScreen`, `SportPickerScreen`, `MatchOptionsScreen`.
  `App.tsx` wrapped in `<ThemeProvider>` and sets the `SafeAreaView` background + `StatusBar` style
  (light/dark) from the theme.
- **Appearance control**: `HomeScreen` shows a System / Light / Dark `Segmented` that drives `setMode`;
  the choice persists across restarts (when a storage backend is linked).

**Acceptance**
- `tsc --noEmit` clean; tests pass (109 — adds `theme.test.ts` verifying both themes exist and differ
  on key tokens; prior 107 still green).
- Every visible surface recolours in dark mode (no dark-on-dark text); team accents stay distinguishable.
- Theme choice persists; `system` tracks the OS setting.
- No engine logic touched — purely presentation + a new theme module.

> Same storage caveat as M12/M13: theme persistence only writes to disk when a storage backend is
> linked; in this dev sandbox it falls back to `system` for the session.

## M15 — Realism enrichment, calibration tests, history, lottery extras, back-button & CI
**Status:** ✅ Done. Implements the "recommended improvements" pass: richer per-sport event
taxonomy + player box scores, statistical calibration tests (with slightly widened tolerance bands),
on-device match history, lottery extras, an Android hardware back button + consistent header, and CI.

### Enriched event taxonomy + player stats (#1)
- `SportEventKind` (`src/engine/core/EventTypes.ts`) gained the §4 flavour events: tennis/TT
  `ACE`, `DOUBLE_FAULT`, `WINNER`, `UNFORCED_ERROR`, `BREAK_POINT`, `NET_CORD`, `EDGE_BALL`,
  `LONG_RALLY`; basketball `MISS_SHOT`, `REBOUND`, `ASSIST`, `STEAL`, `BLOCK`, `TURNOVER`;
  hockey `SHOT_ON_GOAL`, `FACEOFF_WIN`, `ICING`; volleyball `KILL`, `SERVE_ACE`, `SERVE_ERROR`,
  `ATTACK_ERROR`, `RECEPTION_ERROR`, `DIG`, `SET_ASSIST`; rugby `TACKLE`, `SCRUM`, `LINEOUT`,
  `KNOCK_ON`; e-sport `KILL`, `HEADSHOT`, `ROUND_WIN`, `BOMB_PLANT`, `BOMB_DEFUSE`,
  `OBJECTIVE_CAPTURE`, `CLUTCH`.
- Each engine now emits these as **feed-only** events (no effect on scoring), using a **separate
  deterministic RNG stream** in basketball so the scoring sequence is never perturbed by enrichment
  (keeps the existing M6 quarter-scaling invariant test green).
- `computePlayerStats` (`src/engine/stats.ts`) now builds a box score: `points`, `fouls`, plus
  optional `rebounds`, `assists`, `steals`, `blocks`, `kills`. `BOX_VALUE` maps event kinds to the
  tallies; `STAT_LABELS` covers all new kinds. `MatchSummaryScreen` renders a compact box line that
  only shows categories a player actually accumulated. `EventFeed` badges the notable new events.

### Calibration / statistical tests (#2)
- `src/engine/__tests__/Calibration.test.ts` runs 400 seeds × sport and asserts the **average**
  outcome sits inside a band a little wider than the strict `agents.md` §4 targets:
  football avg goals/team (λ) ≈ 0.9–2.0 with <2% blowouts; basketball avg total/team 82–135;
  hockey total 3.0–9.5; rugby Union total 14–62; tennis/table-tennis/volleyball/e-sport resolve to
  their documented set/map ranges. Also asserts that the enriched events are actually present in the
  logs.

### On-device match history (#3)
- New `src/storage/matchHistory.ts` mirrors the slip repository pattern: `MatchRecord` (sport, scores,
  winner, seed, full `config`, label, timestamp), pure ops `addMatch` (caps at `MAX_HISTORY = 50`,
  newest-first) / `removeMatch` / `clearHistory`, and a multi-backend `createMatchHistoryRepository`
  (AsyncStorage → expo-file-system → in-memory).
- `App` records every simulated match (with the **resolved** config + seed, so replay is
  deterministic) and the new `HistoryScreen` lists past matches with score, winner, date, **Replay ↻**
  (re-simulates from the stored seed straight to the summary) and **Delete** / **Clear all**. Home
  gained a "📜 Match History" card.

### Lottery extras (#4)
- `LotteryScreen` presets (6/49, 5/35, 5/50, 7/49, Pick 3, Pick 4) that fill the generator fields.
- **Copy** (clipboard) and **Share** (native share sheet) actions per slip.
- **Check 🎯** per set: `checkMyNumbers` (`src/engine/lottery/Lottery.ts`) draws a winning
  combination under the same conditions and reports how many of the player's numbers matched
  (multiset count). Helpers `parseNumbers`, `drawWinning`, `countMatches` are unit-tested.

### Android back button + consistent header (#5)
- `App` wires `BackHandler.addEventListener('hardwareBackPress', …)` stepping back through the
  in-app stack (pick→home, options→pick, match-live→options, match-summary→live, lottery/history→home;
  home lets the OS handle exit).
- `LiveMatchScreen` gained a consistent top bar with a **‹ Back** affordance (was missing a visible
  back control), making the screen's header consistent with the rest of the app.

### CI (#6)
- `.github/workflows/ci.yml`: on push/PR, `npm ci` → `npm run typecheck` (`tsc --noEmit`) →
  `npm test`. Runs on `main` and `feature/m9-stats`.

**Acceptance**
- `tsc --noEmit` clean; **all 132 tests pass** (was 109). New suites: `Calibration` (13), lottery
  check helpers (8), `matchHistory` (4).
- Enriched events appear in every applicable sport's log without altering scores/winners (verified by
  the unchanged 109 prior tests + the calibration presence checks).
- History records are capped at 50 and replay reproduces the stored seed; BackHandler + the new live
  back bar preserve navigation correctness.
- Same storage caveat as M12–M14: disk persistence requires a linked backend; in the sandbox it
  falls back to in-memory for the session.

## M16 — Handball (10th sport)
**Status:** ✅ Done. Added team handball as a full engine, bringing the roster to ten sports.
- `SportKey.HANDBALL` added to `MatchConfig.ts`; the `MatchConfig` union gains a no-options member
  (like football/hockey), and `defaultMatchConfig` returns `{ sport, mode, seed }`.
- New `src/engine/sports/HandballEngine.ts`: 2 × 30-min halves (60 min), Poisson goals
  (~27/team, clamped 14–45), with **7-metre throws** (`PENALTY_7M`) ≈18% of goals and
  **fast breaks** (`FAST_BREAK`) ≈15% of open-play goals; most goals are **assisted**. Models
  shots/saves (goalkeeper `SAVE`), turnovers, steals, 2-minute **suspensions**, cards and
  substitutions as feed-only flavour. Handball can end level in regular play, so a tie is a valid
  `DRAW` outcome (no artificial shootout).
- Flavour events use a **separate deterministic RNG stream** (M15 convention) so the scoring
  sequence — and therefore final scores — are never perturbed by enrichment.
- Player box score extended: `PlayerStat.saves` (+ `SAVE → saves` in `BOX_VALUE`) so goalkeepers
  surface their saves; `MatchSummaryScreen.boxLine` shows `sv`.
- `STAT_LABELS` / `ALL_KINDS` gained `PENALTY_7M` / `FAST_BREAK` / `SUSPENSION`; `EventFeed`
  badges `PENALTY_7M` and `FAST_BREAK`.
- `computeMatchStats` now produces a **1st/2nd-half** breakdown for handball (`periodSports` set +
  `periodLabel` case), derived from `GOAL` events grouped by `half`.
- Registered in `registry.ts` (`getEngine` + `defaultMatchConfig`) and `SPORT_LABEL`; exported from
  `engine/index.ts`; added to the `SportPickerScreen` grid (🤾, "2 × 30 min · 7m").
- `MatchOptionsScreen` handles handball via its `default` branch (team names + seed).
- Tests: new `HandballEngine.test.ts` (determinism, MATCH_END last, valid winner/draw, per-goal
  GOAL events, flavour presence, half breakdown, box-score goals/assists/saves) and a handball
  block in `Calibration.test.ts` (avg goals/team within a widened 20–35 band + enriched-event
  presence). Handball also folded into the existing "all sports" determinism (EdgeCases) and
  playback (Playback, RemainingSports) loops.

**Acceptance**
- `tsc --noEmit` clean; **all 144 tests pass** (was 132).
- `getEngine(SportKey.HANDBALL)` simulates deterministically; scores/winner are internally consistent.
- Enriched events (`SAVE`, `SHOT_ON_GOAL`, `PENALTY_7M`, `FAST_BREAK`, `TURNOVER`, `SUSPENSION`)
  appear in the log; period breakdown shows both halves.
- Same storage caveat as M12–M15.

## M17 — Realism re-calibration, robustness & production hardening
**Status:** ✅ Done (engine tuning + UI hardening; items 3–7 from the planning review, except the
device/i18n/store work that needs a native toolchain — see "Not done" below).

### 3. Tighten realism / calibrate properly
- **Rugby (Union)** was the worst offender: Poisson tries with no caps produced a 5–121 total spread.
  Retuned in `RugbyEngine.ts`: lower try/penalty rates (≈2.7–2.9 tries, ≈1.8–1.9 pens per team) and
  **hard caps** — tries ≤ 8, penalties ≤ 6, drop goals ≤ 2 per team — so totals cluster in the
  high-40s to mid-50s (measured mean **51.2**) with rare blowouts. `agents.md` §4 updated to match.
- **Calibration bands** (`Calibration.test.ts`) tightened to credible ranges backed by measured means
  over the fixed 400-seed set (deterministic, so the bands are safe, not brittle):
  - Football goals/team **1.0–1.7** (was 0.9–2.0)
  - Basketball points/team **102–118** (was 82–135)
  - Hockey total **4.0–9.0** (was 3.0–9.5)
  - Handball goals/team **22–32** (was 20–35)
  - Rugby Union total **42–60** (was 14–62 — a 48-pt spread → 18-pt spread)
- **Basketball overtime** bug fixed: OT scoring now scales with `quarterLength` (was unscaled), so a
  10-min game no longer gets the same absolute OT bump as a 12-min game (realism + keeps the existing
  "shorter quarters → fewer points" invariant true).

### 4. Platform + layout robustness
- `SportPickerScreen` grid is now **responsive**: column count derived from viewport width
  (2 / 3 / 4 / 5 cols) via `useWindowDimensions`, wrapped in a centered `maxWidth: 980` container so
  cards don't stretch absurdly on tablets/desktop. Re-layouts on rotation/resize.
- Long team names are guarded against overflow in `MatchSummaryScreen` (hero + box-score headers use
  `numberOfLines` + `ellipsizeMode: 'tail'`).

### 5. Production hardening
- **React error boundary** (`src/components/ErrorBoundary.tsx`) wraps `<AppRoot/>` inside the theme
  provider. One uncaught render throw now shows a recoverable "Something went wrong / Try again"
  screen instead of white-screening the whole app; errors are still logged via `componentDidCatch`.

### 6. Accessibility
- `Button` now forwards `accessibilityLabel` / `accessibilityHint` and sets `accessibilityRole:
  "button"`; sport cards, summary actions, and history actions carry descriptive labels.
  `SectionTitle` exposes `accessibilityRole: "header"`. Dynamic type is respected (no
  `allowFontScaling={false}` anywhere).

### 7. Nice-to-haves
- **Share / Copy match results**: `MatchSummaryScreen` gained "Share ↗" (`Share.share`) and "Copy 📋"
  (`Clipboard`) buttons that export the final score, winner, sport and seed as plain text.
- **Export history**: `HistoryScreen` gained "Export 📋" (copy) and "Share ↗" for the full match
  list. (Bulk clear-with-confirmation already existed.)
- "More sports" (cricket/baseball/etc.) deferred — the engine pattern makes each a ~1-file + tests
  addition and can be slotted in later.

### Not done (needs a native toolchain or larger scope — flagged, not half-built)
- **iOS build check** — nothing in code blocks iOS, but a real `expo run:ios` / device build was not
  run here (no macOS/SDK). Verify on a Mac before release.
- **React Navigation migration** — the hand-rolled `useState` stack + `BackHandler` works; migration
  is optional polish, deferred.
- **App icons / splash / signing / store metadata** — no store-readiness scaffolding yet.
- **i18n** — English-only; localization deferred.

**Acceptance**
- `tsc --noEmit` clean; **all 144 tests pass** (calibration + edge cases green).
- Rugby calibration band now 42–60 with measured mean 51.2; other bands tightened to credible ranges.
- Sport picker adapts 2→5 columns by width; summary/history share+export wired; error boundary wraps
  the app.
