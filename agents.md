# AGENTS.md — Multi-Sport Realistic Match Simulator (React Native / Android)

## 1. Project Overview & Tech Stack
This is a **React Native (Android-first)** application that simulates realistic sports matches and generates statistically accurate scores, play-by-play events, and player-attributed statistics.

- **Framework:** React Native (Expo or Bare Workflow with TypeScript strict mode enabled)
- **Target Platform:** Android (prioritize Material Design 3 conventions, Android hardware back button handling, and smooth 60fps list rendering for live event feeds — use FlashList for the play-by-play feed).
- **State Management:** Zustand or React Context + `useReducer` (keep simulation engine logic pure and decoupled from React UI components)
- **Language:** TypeScript (`.ts` / `.tsx`). Never use `any`; strictly type all sport rules, events, and player entities.

---

## 2. Core Architecture & Directory Structure
Keep the simulation engine 100% pure TypeScript with zero UI dependencies so it can be unit-tested and run either synchronously (Instant mode) or via timers (Accelerated mode).

```text
src/
├── engine/
│   ├── core/
│   │   ├── SimulationClock.ts    # Handles Instant vs. 2-min-per-1-sec tick logic
│   │   └── Distributions.ts      # Poisson, Normal, and weighted probability helpers
│   ├── sports/
│   │   ├── SportEngine.ts        # Base interface/abstract class for all sports
│   │   ├── FootballEngine.ts     # Soccer: goals, cards, corners, fouls, offsides
│   │   ├── TennisEngine.ts       # Tennis: points, games, sets, breaks, aces, double faults
│   │   ├── BasketballEngine.ts   # Basketball: 2PT, 3PT, FT, fouls, rebounds, quarters
│   │   ├── HockeyEngine.ts       # Ice Hockey: periods, goals, penalties/powerplays, shots
│   │   ├── VolleyballEngine.ts   # Volleyball: rally scoring, sets, kills, blocks, serves
│   │   ├── TableTennisEngine.ts  # Table Tennis: points, games, deuce, serves
│   │   ├── RugbyEngine.ts        # Rugby Union: tries, conversions, penalties, drop goals
│   │   ├── ESoccerEngine.ts      # E-Soccer: synthetic/virtual football (RNG-driven)
│   │   └── ESportEngine.ts       # Generic Esport: rounds, maps, Best-of-N series
│   └── types/
│       ├── MatchTypes.ts         # Generic match state, clock speed, event log types
│       └── ParticipantTypes.ts   # Player & Team naming schemas
├── components/                   # Reusable UI (Scoreboard, EventFeed, SpeedControls)
├── screens/                      # MatchSetupScreen, LiveMatchScreen, MatchSummaryScreen
└── utils/                        # Formatters (e.g., match clock MM:SS, tennis score 15/30/40/AD)
```

---

## 3. Participant & Naming Conventions (STRICT)
All generated participants must strictly follow these naming patterns:

**Individual Sports (e.g., Tennis)**
- Participants: Player A and Player B
- No real-world athlete names unless explicitly entered by the user.

**Team Sports (e.g., Football/Soccer, Basketball, Hockey)**
- Teams: TeamA and TeamB
- Players: PlayerTeamANo1, PlayerTeamANo2, ... up to the sport's active/bench roster size.
- Examples: PlayerTeamANo9 (scores a goal), PlayerTeamBNo4 (receives a yellow card).

**Customization (optional)**
- The defaults above are always the fallback. A user may override team and/or player names per match through the `participants` config field (see §8 `MatchConfig`).
- **Team names:** supply `teamAName` / `teamBName` (e.g., `"Home"` / `"Away"`, or club names). When provided, the custom name replaces the default everywhere — scoreboard, event feed, and logs.
- **Player names (team sports):** supply `teamARoster` / `teamBRoster` as ordered arrays mapped 1:1 to jersey numbers (index 0 → No1, index 1 → No2, …). Any slot left undefined falls back to `PlayerTeamXNoY`. Custom names must preserve the jersey-number → attribution mapping.
- **Player names (individual sports):** supply `playerAName` / `playerBName`; otherwise `Player A` / `Player B` are used.
- **Constraint:** custom names are only ever used when explicitly entered by the user. The engine must never auto-insert real-world athlete or club names.

**Roster Sizes per Sport**
- Football (Soccer) / E-Soccer: No1 to No11 (starters) + optional No12–No18 (subs)
- Basketball: No1 to No5 (on-court) + No6–No12 (bench)
- Hockey: No1 to No6 (on-ice) + No7–No20 (bench)
- Volleyball: No1 to No6 (on-court) + No7–No12 (subs; No7 typically Libero)
- Rugby (Union): No1 to No15 (starters) + No16–No23 (subs)
- E-Sport: No1 to No5 (active) + optional No6–No7 (subs)
- Table Tennis / Individual Sports: Player A and Player B (no roster)

---

## 4. Realistic Scoring & Probability Rules
CRITICAL: Never use uniform random ranges (e.g., `Math.floor(Math.random() * 30)`). Every sport must enforce realistic scoring distributions and state machines.

### A. Football (Soccer)
- **Duration:** 90 minutes (two 45-min halves + 1–5 mins stoppage time per half).
- **Score Realism:** Use a Poisson distribution with typical expected goals ($\lambda \approx 1.1$ to $1.6$ per team). Typical final scores: 0-0, 1-0, 2-1, 1-1, 3-1. Scores above 6 should be statistically rare (<0.5%).
- **Sport-Specific Events:**
  - GOAL (attributed to a player; weighted toward higher jersey numbers No7–No11)
  - FOUL (~20–28 per match)
  - YELLOW_CARD (~3–5 per match; second yellow for the same PlayerTeamXNoY triggers RED_CARD and reduces team strength)
  - RED_CARD (rare, ~0.15 per match)
  - CORNER (~8–12 per match)
  - OFFSIDE (~2–5 per match)

### B. Tennis
- **Structure:** Hierarchical state machine (Points $\rightarrow$ Games $\rightarrow$ Sets $\rightarrow$ Match). Never generate a final score like 1-0 or 15-12.
- **Scoring Rules:**
  - Points: 0 (Love), 15, 30, 40, DEUCE, AD (Advantage).
  - Games: First to 4 points by a margin of 2.
  - Sets: First to 6 games by a margin of 2; at 6-6, play a 7-point Tiebreak (7-6).
  - Match (configurable): **Best of 3 sets** (default, standard) or **Best of 5 sets**. The winner is the first player to win the set majority (2 of 3, or 3 of 5).
- **Sport-Specific Events:** ACE, DOUBLE_FAULT, WINNER, UNFORCED_ERROR
  - BREAK_POINT (when receiver is 1 point from winning the server's game)
  - SERVICE_BREAK (explicitly log when the returning player wins the game against serve)

### C. Basketball
- **Duration (configurable):** 4 quarters, each **12 minutes** (48 mins total, default / NBA-style) or **10 minutes** (40 mins total, FIBA-style). Overtime (5 mins) if tied at end of Q4.
- **Score Realism:** Never generate low soccer-like scores (1-0, 5-3). Teams score via discrete possessions (~95–105 possessions per team/game), resulting in realistic totals around 85–125 points per team.
- **Sport-Specific Events:**
  - TWO_POINTER_MADE (+2 pts), THREE_POINTER_MADE (+3 pts), FREE_THROW_MADE (+1 pt)
  - MISSED_SHOT + REBOUND (Offensive/Defensive)
  - PERSONAL_FOUL (track individual fouls; at 6 fouls, PlayerTeamXNoY fouls out; team bonus free throws after 4/5 team fouls in a quarter)
  - TURNOVER, STEAL, BLOCK

### D. Ice Hockey
- **Duration:** 3 Periods $\times$ 20 minutes (60 mins total). Overtime + Shootout if tied.
- **Score Realism:** Poisson-based scoring ($\lambda \approx 2.6$ to $3.2$ goals per team). Realistic totals: 2-1, 3-2, 4-1, 5-3.
- **Sport-Specific Events:**
  - GOAL (with optional primary/secondary assist by teammates)
  - SHOT_ON_GOAL / SAVE (~25–35 per team)
  - MINOR_PENALTY (2-minute powerplay for opposing team; increases scoring probability for advantaged team during that window)
  - FACEOFF_WIN, ICING, OFFSIDE

### E. Volleyball
- **Structure:** Rally-scoring match decided by sets. Indoor: **Best of 5 sets** (first to 3 sets wins); each of the first 4 sets is **first to 25 points (win by 2)**, and the deciding 5th set is **first to 15 points (win by 2)**. There is no hard point cap — play continues until a 2-point margin is reached.
- **Score Realism:** Typical set scores 25-15 to 25-23; deciding sets 15-10 to 15-13. Sets beyond ~30 points are rare. Never generate a set like 25-0.
- **Roster (per team):** 6 players on court (PlayerTeamANo1–No6) + subs (No7–No12). The Libero (typically No7) is defensive-only and may not rotate into the front row to attack.
- **Sport-Specific Events:**
  - SPIKE / KILL (wins the rally when landed in the opponent court; +1 point)
  - BLOCK (stuff block at the net; can win the rally outright)
  - SERVE_ACE (serve unreturned), SERVE_ERROR, ATTACK_ERROR, RECEPTION_ERROR (award the point to the opponent)
  - DIG (successful defensive pass), SET (assist leading to a kill — track for player stats)

### F. Table Tennis
- **Structure:** Hierarchical state machine (Points → Games → Match). Each game is **first to 11 points (win by 2)**; at 10-10 the game continues until a 2-point lead (deuce). Match is **Best of 5 games** (standard) or **Best of 7 games** (configurable).
- **Score Realism:** Typical game scores 11-3 to 11-9; deuce games 13-11, 15-13. A clean 11-0 game is a rare outlier.
- **Participants:** Individual sport — Player A vs Player B (no real-world athlete names unless user-entered).
- **Sport-Specific Events:** WINNER, UNFORCED_ERROR, SERVE, SERVE_FAULT, EDGE_BALL, NET_CORD, LONG_RALLY

### G. Rugby (Union, 15-a-side)
- **Duration:** 80 minutes (two 40-min halves) + 1–5 mins stoppage per half.
- **Scoring System (points):**
  - TRY = 5 points (grounding the ball in the opponent in-goal)
  - CONVERSION = 2 points (kick after a try)
  - PENALTY_GOAL = 3 points
  - DROP_GOAL = 3 points
- **Score Realism:** Typical final scores 12-9, 15-12, 24-20, 30-15, 35-21. Most points come from tries plus conversions; penalty goals are frequent but lower-value. **Calibrated totals** average in the high-40s to mid-50s per match (two teams combined), with blowouts to ~70 rare. The engine caps tries at 8, penalties at 6, and drop goals at 2 per team to keep Poisson tails realistic.
- **Roster (per team):** 15 starters (PlayerTeamANo1–No15) + 8 substitutes (No16–No23).
- **Sport-Specific Events:** TRY (5pts), CONVERSION (2pts, after try), PENALTY_GOAL (3pts), DROP_GOAL (3pts), KNOCK_ON, TACKLE, SCRUM, LINEOUT, YELLOW_CARD (10-min sin bin), RED_CARD (sending off)
- **Note:** Rugby League (13-a-side, 6-tackle rule, 80 mins) may be selected as an alternative code; keep the try/conversion/penalty/drop-goal point values identical.

### H. E-Soccer (Virtual / Simulated Soccer)
- **Concept:** A fully synthetic football match generated by the engine — no real-world teams, form, or external data. It reuses the **Football (Soccer)** scoring model but is explicitly RNG-driven, matching virtual/match-sim betting style simulations.
- **Duration:** 90 minutes (two 45-min halves + 1–5 mins stoppage).
- **Score Realism:** Poisson distribution with expected goals ($\lambda \approx 1.1$ to $1.6$ per team); typical scores 0-0, 1-0, 2-1, 1-1, 3-1; scores above 6 statistically rare (<0.5%).
- **Roster (per team):** Same as Football/Soccer — No1–No11 starters + optional No12–No18 subs. Teams are generic (TeamA / TeamB) unless the user supplies names.
- **Sport-Specific Events:** GOAL (weighted toward No7–No11), FOUL, YELLOW_CARD, RED_CARD, CORNER, OFFSIDE — identical event taxonomy to Football (Soccer).

### I. E-Sport (Generic Esports Match)
- **Structure:** Round/objective-based match decided by **maps**; the series is **Best of 1 / 3 / 5 maps** (configurable). Within a map, the first side to reach the round/objective target wins (e.g., 16 rounds for CS-style, 13 for Valorant-style; win by 2, with overtime rounds if tied).
- **Score Realism:** Round scores cluster around the target (e.g., 16-12, 13-9); clean sweeps are uncommon. Per-round win probability should be near 50% for balanced teams, skewed by a skill/seed parameter.
- **Roster (per team):** 5 players (PlayerTeamANo1–No5) + optional subs (No6–No7).
- **Sport-Specific Events:** KILL, HEADSHOT, BOMB_PLANT, BOMB_DEFUSE, ROUND_WIN, ACE (all 5 kills in a round), CLUTCH (win a round from disadvantage), OBJECTIVE_CAPTURE
- **Note:** This is a generic skeleton; specific titles (CS, Dota, LoL, Valorant) may override round targets, roster size, or objective events while keeping the Best-of-N map structure.

---

## 5. Simulation Speed & Execution Modes
The engine must support two execution modes using the exact same underlying event generator:

**Accelerated Real-Time Mode (2 minutes in 1 second):**
- Ratio: 120 simulation seconds = 1,000 real-world milliseconds (1 second real time = 2 minutes match time).
- Implementation: Run a simulation loop ticking every 100ms (advancing match clock by 12 match seconds per tick) or 250ms (advancing 30 match seconds per tick) so UI updates feel smooth and continuous on Android.
- Support Pause, Resume, and Reset controls.

**Instant Mode (instant):**
- Executes the entire match loop synchronously in < 50ms without `setInterval` delays.
- Outputs the complete final scoreboard, match stats summary, and full chronological event log immediately.

---

## 6. Coding & UI Guidelines for Agents
- **Determinism & Testing:** Accept an optional PRNG seed in the match config so bugs in edge cases (e.g., tiebreaks, red cards, overtime) can be reproduced reliably.
- **Android Performance:** Use **FlashList** (`@shopify/flash-list`) with `keyExtractor` and memoized event row items (`React.memo`) for the play-by-play feed — required when Instant mode dumps 150+ basketball or tennis events at once, since FlashList virtualizes far better than FlatList. Fall back to `FlatList` only if a native dependency cannot be added.
- **Visual Clarity:** Highlight key events in the feed (e.g., bold badge for GOAL, SERVICE_BREAK, RED_CARD, THREE_POINTER_MADE) and clearly distinguish TeamA/Player A from TeamB/Player B using distinct accent colors.

---

## 7. Lottery (Loto) Number Generator
A lightweight utility that produces randomized draw numbers, e.g. `10-15-16-23-41-47`. Unlike the sports engines, uniform randomness is acceptable here (a real lottery draw is uniformly random), but the generator must still be deterministic when a seed is provided so results are reproducible.

### Options / Configuration
- **count** (`number`, required): How many numbers to draw (e.g., `5`, `6`, `7`).
- **min** / **max** (`number`, required): Inclusive range for each number (e.g., `1`–`49`, `1`–`90`).
- **allowDuplicates** (`boolean`, default `false`): If `false`, numbers are unique (no repeats); if `true`, the same value may appear more than once.
- **sorted** (`boolean`, default `true`): When `true`, output is ascending (`08-15-16-23`); when `false`, output keeps draw order.
- **sets** (`number`, default `1`): How many independent tickets/sets to generate in one call.
- **seed** (`number`, optional): PRNG seed for reproducible results (same convention as the sports engines).

### Output Format
A single set is joined with hyphens, zero-padded to the width of `max` so columns align:
- `max` ≤ 99 → two digits: `08-15-16-23-41-47`
- `max` ≥ 100 → three digits: `007-042-088-105`

When `sets > 1`, return an array of these strings (or render one per line in the UI).

### Example
Config: `{ count: 6, min: 1, max: 49, allowDuplicates: false, sorted: true }`
Possible output: `10-15-16-23-41-47`

Config: `{ count: 5, min: 1, max: 90, sets: 3, seed: 12345 }`
Possible output:
```text
07-19-33-61-88
04-22-45-70-82
11-28-39-54-90
```

### Implementation Notes
- Use the same seeded PRNG helper from `engine/core/Distributions.ts` so behavior matches the sports simulators.
- Validate `count <= (max - min + 1)` when `allowDuplicates` is `false`; throw a typed error otherwise.
- Never use `any`; type the config as a `LotteryConfig` interface and the result as `string` (single set) or `string[]` (multiple sets).

---

## 8. Shared Match Configuration (`MatchConfig`)
Central contract for every sport so engines, UI, and tests agree on the configurable knobs defined in Sections 3–4. All configs extend a common base and are combined into a discriminated union keyed by `sport`.

```ts
// ---- Canonical list of supported sports ----
enum SportKey {
  FOOTBALL = 'FOOTBALL',
  TENNIS = 'TENNIS',
  BASKETBALL = 'BASKETBALL',
  HOCKEY = 'HOCKEY',
  VOLLEYBALL = 'VOLLEYBALL',
  TABLE_TENNIS = 'TABLE_TENNIS',
  RUGBY = 'RUGBY',
  E_SOCCER = 'E_SOCCER',
  E_SPORT = 'E_SPORT',
}

// ---- Participant customization (all names optional; defaults apply when omitted) ----
interface ParticipantConfig {
  teamAName?: string;    // default 'TeamA'
  teamBName?: string;    // default 'TeamB'
  teamARoster?: string[]; // ordered: index 0 => No1, index 1 => No2, ... (team sports)
  teamBRoster?: string[]; // ordered: index 0 => No1, index 1 => No2, ... (team sports)
  playerAName?: string;  // individual sports default 'Player A'
  playerBName?: string;  // individual sports default 'Player B'
}

// ---- Base shared by every sport (Sections 2, 5) ----
interface BaseMatchConfig {
  sport: SportKey;
  mode: 'INSTANT' | 'ACCELERATED';  // from Section 5
  seed?: number;                    // optional PRNG seed -> reproducible runs
  participants?: ParticipantConfig; // optional custom team/player names (Section 3)
}

// ---- Per-sport configurable options (defaults noted) ----
interface TennisOptions      { matchFormat: 'BO3' | 'BO5'; }                // default 'BO3'
interface BasketballOptions  { quarterLength: 10 | 12; }                   // default 12
interface RugbyOptions       { code: 'UNION' | 'LEAGUE'; }                 // default 'UNION'
interface TableTennisOptions { matchFormat: 'BO5' | 'BO7'; }               // default 'BO5'
interface VolleyballOptions  { sets: 'BO3' | 'BO5'; }                      // default 'BO5' (indoor)
interface ESportOptions      { bestOf: 1 | 3 | 5; roundTarget?: 13 | 16; } // default bestOf 3, 16

// Football, E-Soccer, Hockey: no extra options beyond BaseMatchConfig

// ---- Discriminated union: one concrete config per sport ----
type MatchConfig =
  | (BaseMatchConfig & { sport: 'TENNIS';       options: TennisOptions })
  | (BaseMatchConfig & { sport: 'BASKETBALL';   options: BasketballOptions })
  | (BaseMatchConfig & { sport: 'RUGBY';        options: RugbyOptions })
  | (BaseMatchConfig & { sport: 'TABLE_TENNIS'; options: TableTennisOptions })
  | (BaseMatchConfig & { sport: 'VOLLEYBALL';   options: VolleyballOptions })
  | (BaseMatchConfig & { sport: 'E_SPORT';      options: ESportOptions })
  | (BaseMatchConfig & { sport: 'FOOTBALL' | 'E_SOCCER' | 'HOCKEY'; options?: Record<string, never> });

// ---- Lottery generator config (Section 7) ----
interface LotteryConfig {
  count: number;
  min: number;
  max: number;
  allowDuplicates?: boolean; // default false
  sorted?: boolean;          // default true
  sets?: number;             // default 1
  seed?: number;
}
```

- Engines must read their options from `config.options` and fall back to the documented default when a field is omitted.
- `SportKey` is the canonical uppercase enum of all supported sports (incl. `E_SOCCER`, `E_SPORT`).
- Never use `any`; the union guarantees each engine receives the correct options type.
