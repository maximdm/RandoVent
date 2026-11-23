# ADR-0001 — Choose React Native Workflow (Expo vs Bare)

- **Status:** Accepted
- **Date:** 2026-11-23

## Context
`agents.md` targets React Native with Android-first delivery and allows either the
Expo managed workflow or a Bare (React Native CLI) workflow. Phase 0 of `Plan.md`
needs a decision before scaffolding because the choice affects native-module freedom,
build tooling, and iteration speed. Key constraints:
- The simulation engine (`src/engine`) is pure TypeScript with zero React/native
  dependencies, so the workflow choice does not constrain the engine.
- The UI relies on FlashList (`@shopify/flash-list`), a native module — both workflows
  support it (via an Expo config plugin or direct native install).
- Team velocity and OTA updates are valuable for a simulation app that will be tuned
  frequently (probability calibration per `agents.md` §4).

## Decision
Use the **Expo** managed workflow as the default, with a clear escape hatch to
**Prebuild / Bare** (`npx expo prebuild`) if a required native module is unavailable
through Expo config plugins. This keeps `expo-image`, EAS Build, and OTA updates
available while preserving the option to drop to Bare without rewriting application code.

## Consequences
- Faster iteration, simpler native dependency management via config plugins, and OTA updates.
- Slight overhead if a future module requires a Bare-only API; mitigated by Prebuild.
- The `src` layout and all `agents.md` conventions are identical regardless of workflow,
  so this decision does not leak into the engine or sport rules.
