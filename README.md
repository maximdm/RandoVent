# RandoVent

A React Native (Android-first) app that simulates realistic sports matches and generates
statistically accurate scores, play-by-play events, and player-attributed statistics —
plus a lottery (loto) number generator. The simulation engine is **pure TypeScript**, fully
unit-testable, and decoupled from the UI.

> Project conventions, sport rules, and the shared `MatchConfig` contract live in
> [`agents.md`](agents.md). Planning and milestones are in [`Plan.md`](Plan.md) and
> [`Milestones.md`](Milestones.md). Key decisions are recorded in [`docs/adr/`](docs/adr).

## Stack
- **Expo** SDK 58 (React 19, React Native 0.88) — Android-first
- **TypeScript** strict mode, no `any`
- **FlashList** for the high-volume play-by-play feed (per `agents.md` §6)
- **Vitest** for unit tests of the pure engine

## Getting started
```bash
npm install
npm start          # Expo dev server
npm run android    # requires Android SDK / emulator or device
npm test           # run engine unit tests (Vitest)
npm run typecheck  # tsc --noEmit
```

## Project structure
```
src/
├── engine/        Pure, UI-free simulation core (Distributions, future sport engines)
├── components/    Reusable UI (EventFeed, ...)
├── screens/       MatchSetupScreen, LiveMatchScreen, MatchSummaryScreen
└── types.ts       Shared match/event types
docs/adr/          Architecture Decision Records
```

## Status
This is an early scaffold. The engine currently provides the seeded PRNG and probability
helpers (Poisson / Normal / weighted); sport-specific engines are built out per
[`Milestones.md`](Milestones.md) (M1–M3). The first screens (`MatchSetupScreen`,
`LiveMatchScreen`, `MatchSummaryScreen`) are wired to a sample match driven by the engine
and rendered with FlashList.
