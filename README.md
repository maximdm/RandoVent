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
> **Node:** the Expo 58 / React Native 0.88 / Metro toolchain requires **Node 22+**
> (`^22.13 || ^24.3 || >=26`). Use Node 22 in CI and locally.

## Project structure
```
Root entry:
- index.ts        — registers the root component (App.tsx) with Expo / React Native.
- App.tsx         — in-app navigation stack + Android BackHandler.
- app.json        — Expo project config.

src/
├── engine/            Pure, UI-free simulation core (no React imports)
│   ├── core/          MatchConfig, EventTypes, Distributions, RNG, SportEngine, roster
│   ├── sports/        10 sport engines (Football, Tennis, Basketball, Hockey,
│   │                  Volleyball, TableTennis, Rugby, Handball, E-Soccer, E-Sport)
│   ├── lottery/       Lottery number generator + match helpers
│   └── stats.ts       Box-score / period-breakdown derivation
├── components/        Reusable UI (EventFeed, MatchStatsView, ui primitives)
├── screens/           Home, SportPicker, MatchOptions, LiveMatch, MatchSummary,
│                      History, Lottery
├── storage/           Persistence repositories (history, slips) + best-effort factory
└── theme.tsx          Light/dark theme tokens
docs/adr/              Architecture Decision Records
```

## Status
Feature-complete through **M16**: a pure-TypeScript simulation engine with **10 sports**
(Football, Tennis, Basketball, Ice Hockey, Volleyball, Table Tennis, Rugby, Handball,
E-Soccer, E-Sport), each with realistic Poisson/Normal scoring, play-by-play events, and
player-attributed box scores. The app layer adds a sport picker, match setup, live
play-by-play (FlashList), a summary with stats, **match history** (persisted), a **lottery**
number generator with named slips, and dark mode. **144 Vitest tests** pass and
`tsc --noEmit` is clean.

Verified so far: the pure engine (unit tests + typecheck) and the Expo project config (CI).
**Not yet verified on a real device:** a native build/run and on-disk persistence — see
"Building on a device" below.

## Persistence
Match history and lottery slips are saved through a best-effort repository factory in
`src/storage`:

1. **AsyncStorage** (`@react-native-async-storage/async-storage`, a declared dependency) —
   links on a real build and **survives app restarts**.
2. **expo-file-system** — file-backed fallback (only if AsyncStorage is unavailable).
3. **In-memory** — session-only fallback used when no persistent backend resolves (e.g. a
   plain Node/test environment). Data is lost on restart in this mode.

On a real device/emulator AsyncStorage is present, so persistence works; the in-memory mode
is what runs in the pure-JS test environment.

## Building on a device
CI does **not** run a full native build (that needs the Android SDK). To verify the app on a
device/emulator:

```bash
npm install
npm start            # Expo dev server (Metro) — scan the QR code with Expo Go,
                    # or press 'a' to open the Android emulator.
# or a full native build:
npm run android      # expo run:android — requires Android SDK / emulator or device
```

If the Metro bundle loads and the screens render, persistence (above) is active.

## CI
This repo runs GitHub Actions on push to `main` / `feature/m9-stats` and on every pull request:
- **`ci.yml` → test** — `npm ci`, `npm run typecheck` (`tsc --noEmit`), `npm test` (Vitest),
  then two lightweight native-config sanity checks that need **no Android SDK**:
  - `npx expo config --type public` — validates the Expo project config (`app.json`) resolves.
  - `npx expo install --check` — verifies installed dependencies match the Expo SDK.
- **`label-pr.yml`** — auto-applies `engine` / `ui` / `docs` / `deps` / `ci` labels from
  changed paths.
- **`automerge.yml`** — a *guard*: only PRs explicitly labeled `automerge` merge, and only
  after all status checks pass. Delete it if you prefer manual merging.
