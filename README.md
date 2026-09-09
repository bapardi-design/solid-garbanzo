# Sports Simulation Engine

A deterministic, event-sourced football club management simulation. Given a
seed it generates a league pyramid of clubs, players and managers, then plays
season after season: fixtures, matches, transfers, contracts, finances, player
development, board pressure and promotion/relegation.

Every change to the world is an event applied by a single reducer, so a run can
be replayed from its event log and two runs with the same seed produce the same
state hash.

## Quick start

```bash
npm install
npm run sim -- run --seasons 3 --seed alpha          # simulate and print metrics + tables
npm run sim -- run --seasons 1 --explain 3            # also print goal-factor breakdowns
npm run sim -- verify --seasons 2 --seed alpha        # run twice, compare season hashes
npm run sim -- run --seasons 2 --out out/             # write a JSON snapshot per season
npm run sim -- resume --from out/world_s2.json --seasons 1   # continue from a snapshot
npm test
```

Flags: `--seasons N`, `--seed S`, `--leagues L`, `--clubs C` (per league),
`--squad Q`, `--season-length D`, `--no-cup`, `--explain N`, `--out DIR`,
`--quiet`, `--lenient` (report invariant failures instead of throwing).

## Layout

| Path | What it does |
| --- | --- |
| `src/core/rng.ts` | Seeded sfc32 PRNG with int/normal/poisson/weighted helpers |
| `src/core/schema.ts` | World state types, id generation, indexes |
| `src/core/events.ts` | Event union and payloads |
| `src/core/reducer.ts` | Applies events to the world and maintains indexes |
| `src/core/context.ts` | `emit()` = clone payload, reduce, append to log |
| `src/rating.ts` | Overall/effective ratings, value and wage demand |
| `src/world/generate.ts` | Clubs, squads, managers, contracts |
| `src/matchday/fixtures.ts` | Berger-table round robin, cup rounds with byes |
| `src/matchday/table.ts` | League table ordering |
| `src/matchday/xi.ts` | Starting XI selection per tactic/formation |
| `src/matchday/match.ts` | Match engine with explainable expected-goal factors |
| `src/engines/finance.ts` | Wages, gate, sponsorship, prize money, budgets |
| `src/engines/transfers.ts` | Market listings, needs, signings, loans, renewals |
| `src/engines/development.ts` | Growth toward potential, age decline, valuation |
| `src/engines/morale.ts` | Post-match and weekly morale |
| `src/engines/ai.ts` | Tactics, board reviews, sackings, appointments |
| `src/engines/season.ts` | Season start (competitions, youth, budgets) and rollover |
| `src/sim/tick.ts` | One simulated day |
| `src/sim/runner.ts` | Runs seasons, collects metrics, hashes, snapshots |
| `src/sim/snapshot.ts` | Stable JSON serialisation and SHA-256 hashing |
| `src/sim/metrics.ts` | Per-season calibration metrics and event type counts |
| `src/sim/invariants.ts` | Structural checks run at every season end |
| `src/sim/cli.ts` | Command line entry point |

## Calendar

A season is 52 weeks. League rounds are played on Saturdays from week 4; cup
rounds on Wednesdays every four weeks from week 6. Transfer windows are the
first four weeks and weeks 24-27. Weekly jobs run on fixed weekdays: finance
(Sun), transfers (Mon), tactics (Wed), development and morale (Thu). Board
reviews happen every eight weeks from week 12 and at season end.

## Match model

Each side's expected goals is a base rate (home 1.43, away 1.12) multiplied by
named factors: strength (attack vs defence ratio), tactics, morale, manager
ability and recent form. Goals are Poisson-distributed; scorers are weighted by
position and rating. The factors are stored on the fixture report so
`--explain` can show why a result happened. Calibration target is about 2.7
goals per match with roughly 45/25/30 home/draw/away.

## Determinism

All randomness comes from one seeded generator consumed in a fixed order. The
`verify` command runs the same configuration twice and compares end-of-season
hashes. The test suite also replays a season's event log into an empty world
and checks the hash matches.
