# ADR-0002 — State Management Approach

- **Status:** Accepted
- **Date:** 2026-11-23

## Context
`agents.md` allows "Zustand or React Context + `useReducer`" for state management and
requires the simulation engine to stay pure and decoupled from React. `Plan.md` Phase 0
lists Zustand. We must choose one primary approach for the app's UI state (match setup,
live simulation controls, scoreboard, event feed) while keeping the engine
framework-agnostic.

## Decision
Use **Zustand** as the primary state container. The pure engine (`src/engine`) remains
free of any store/React imports and is driven by plain function calls; the store only
holds UI-facing state (current `MatchConfig`, live clock, scoreboard, event log) and
calls into the engine. `Context + useReducer` remains acceptable for small, localized
UI state where a store would be overkill.

## Consequences
- Less boilerplate than Redux-style reducers; selective subscriptions help keep the
  play-by-play feed at 60fps (see `agents.md` §6, FlashList).
- Clear boundary: engine = pure functions + types; store = thin React-facing state.
- Risk: storing a large event log in Zustand can hurt performance — mitigate by keeping
  the raw event log as immutable arrays in the store and memoizing feed rows
  (FlashList + `React.memo`, per `agents.md` §6).
