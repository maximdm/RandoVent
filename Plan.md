# Plan — Multi-Sport Realistic Match Simulator (React Native / Android)

> Companion to `agents.md` (project conventions, sport rules, and the shared `MatchConfig` contract).
> For the detailed, testable breakdown of work, see `Milestones.md`.

## 1. Goal
Build a **React Native (Android-first)** app that simulates realistic sports matches and generates
statistically accurate scores, play-by-play events, and player-attributed statistics — plus a
lottery (loto) number generator. The simulation engine must be pure TypeScript, fully unit-testable,
and decoupled from the UI.

## 2. Guiding Principles
- **Pure engine, thin UI.** 100% of simulation logic lives in `src/engine` with zero React dependencies.
- **Strict TypeScript.** No `any`; every sport, event, participant, and config is explicitly typed.
- **Determinism.** An optional PRNG seed makes every run (including edge cases) reproducible.
- **Realism over randomness.** Use proper distributions (Poisson, Normal, weighted) — never naive
  uniform ranges — except the lottery, which is intentionally uniform.
- **Uniform formatting & conventions.** All naming, rosters, and rules follow `agents.md`.

## 3. Architecture
```
src/
├── engine/
│   ├── core/        SimulationClock.ts, Distributions.ts (Poisson/Normal/weighted + seeded PRNG)
│   ├── sports/      SportEngine.ts (base) + one engine per sport (incl. LotteryEngine)
│   └── types/       MatchTypes.ts, ParticipantTypes.ts
├── components/      Reusable UI (Scoreboard, EventFeed, SpeedControls)
├── screens/         MatchSetupScreen, LiveMatchScreen, MatchSummaryScreen
└── utils/           Formatters (match clock MM:SS, tennis 15/30/40/AD, lottery N-N-N)
```
- Every sport engine implements the common `SportEngine` interface and consumes a `MatchConfig`
  (see `agents.md` §8) so configuration, UI, and tests stay in agreement.
- The same underlying event generator powers both execution modes (§5): **Instant** (<50ms, full log)
  and **Accelerated** (2 match-minutes per real second, with pause/resume/reset).

## 4. Supported Sports (rules in `agents.md` §4)
Football (Soccer), Tennis, Basketball, Ice Hockey, Volleyball, Table Tennis, Rugby (Union/League),
E-Soccer (synthetic football), and a generic E-Sport match. Each has its own scoring distribution,
state machine, roster convention, and event taxonomy.

## 5. Delivery Approach (phased — details in `Milestones.md`)
- **Phase 0 — Scaffold:** RN (Expo or Bare) + TS strict + Zustand + folder structure.
- **Phase 1 — Engine core:** clock, distributions, seeded PRNG, base types & `MatchConfig`.
- **Phase 2 — Football vertical slice:** one sport end-to-end (engine + 3 screens + feed).
- **Phase 3 — Remaining sports:** Tennis, Basketball, Hockey, Volleyball, Table Tennis, Rugby, E-Soccer, E-Sport.
- **Phase 4 — Simulation modes:** Instant + Accelerated with shared generator & controls.
- **Phase 5 — Lottery generator:** `LotteryEngine` + UI, per `agents.md` §7.
- **Phase 6 — Polish & hardening:** FlashList (fallback FlatList) memoization, event badges, accent colors, edge-case tests.

## 6. Key Risks / Open Questions
- **Probability calibration:** tuning each model to land inside the realism ranges in `agents.md` §4.
- **Android performance:** the play-by-play feed (FlashList, per `agents.md` §6) must stay at 60fps when Instant mode dumps 150+ events at once.
- **E-Sport specificity:** decide whether to specialize per title (CS/Dota/LoL/Valorant) now or keep
  the generic Best-of-N skeleton and override later.
- **Expo vs Bare:** resolved in ADR-0001 (recommend Expo with a prebuild/Bare escape hatch). See `docs/adr/`.
- **State management:** resolved in ADR-0002 (Zustand as primary). See `docs/adr/`.

## Remaining work / known risks
The engine and UI are feature-complete through M16, but the following are **not yet verified
on a real device** and should be closed before any store release:

1. **Native build & run.** Every automated check so far is at the TypeScript/unit-test level
   (`tsc --noEmit`, 144 Vitest tests). No one has confirmed `expo prebuild` / `expo run:android`
   succeeds, or that the Metro bundle loads and screens render on an emulator/phone. CI now adds
   `expo config` + `expo install --check` as lightweight config sanity checks, but a full native
   build still needs local verification (requires the Android SDK). See README
   "Building on a device".
2. **Persistence across restart.** Storage uses a best-effort factory: `AsyncStorage` (a declared
   dependency, so it links on a real build and survives restarts) → `expo-file-system` → in-memory
   fallback. It has never been confirmed writing to disk on a device; verify it as part of (1).
3. **Realism re-calibration.** Several calibration bands are deliberately wide (e.g. Rugby Union
   total 14–62, Basketball total/team 82–135). A second modeling pass would tighten distributions
   toward observed averages so scores feel credible.
4. **Production hardening.** No React error boundary (one uncaught throw crashes the app); navigation
   is a hand-rolled `useState` stack with a manual `BackHandler` (React Navigation would be
   cleaner). App icons, splash, signing, and store metadata are not yet set up.
5. **Accessibility & i18n.** No screen-reader labels, dynamic-type handling, or localization beyond
   English.
