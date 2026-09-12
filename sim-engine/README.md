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
npm run sim -- run --seasons 8 --report out/annual.html   # self-contained HTML report with charts
npm run build:web                                     # dist/web/explorer.html: interactive in-browser explorer
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
| `src/engines/transfers.ts` | Market listings, needs, signings, loans (in and out), renewals, releases |
| `src/engines/development.ts` | Growth toward potential, age decline, valuation |
| `src/engines/morale.ts` | Post-match and weekly morale |
| `src/engines/ai.ts` | Tactics, board reviews, sackings, appointments |
| `src/engines/season.ts` | Season start (competitions, youth, budgets) and rollover |
| `src/sim/tick.ts` | One simulated day |
| `src/sim/runner.ts` | Runs seasons, collects metrics, hashes, snapshots |
| `src/sim/snapshot.ts` | Stable JSON serialisation and SHA-256 hashing |
| `src/sim/metrics.ts` | Per-season calibration metrics and event type counts |
| `src/sim/invariants.ts` | Structural checks run at every season end |
| `src/sim/report.ts` | Self-contained HTML report: charts, tables, honours, explained matches |
| `src/sim/cli.ts` | Command line entry point |
| `src/browser/engine.ts` | Browser entry bundled by `scripts/build-web.mjs` into `web/explorer.html` |

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

Matches are played in two halves, each a Poisson draw on half the rate, which
leaves the full-match distribution unchanged. That gives the human manager a
decision point: with `step(game, days, { halfTime: true })` the day stops when
their match reaches the interval, the paused state lives on `world.halfTime`
(so it survives a save and reload), and `resumeHalfTime(game, decision)` plays
the second half on a new basis. A decision is a tactic switch, up to three
substitutions, or both; illegal swaps are ignored. The second half's factors,
the substitutions and the half-time score are all recorded on the report.

### The drift, and where it came from

Goals per match used to rise about 0.13 across six seasons. Over three seeds
they now move between −0.01 and +0.11, a mean of +0.04, comparing seasons one
and two with five and six against a 0.05 swing from one season to the next.
Most of what is left is the price of an open loan market — with loans shut the
same three seeds came out at −0.03 to +0.03 — because a boy out on loan plays,
and a boy who plays comes good. That is the right trade: a dead loan market is
a worse game than a tenth of a goal.

The chain took a while to find, because the visible symptom was the last link
in it. Mid-season the top flight's goalkeeping line fell about eight points
over six seasons and its defensive line six, while the attack fell five and
the midfield two; defence leans on the two that decay fastest, so the
attack-to-defence ratio climbed from 1.03 to 1.08 and the goals followed.
Underneath that is an order statistic: a side picks two forwards out of many
and one keeper out of two or three, so the attack sits above whatever standard
the world produces and the goalkeeping sits at it. That explains which line
falls furthest, but not why any of them fell.

Why they fell was a discarded number. The academy drew a boy to peak at a
given standard, and the line that assigned his ceiling ignored it and guessed
one off his age instead. A top-flight graduate was drawn to peak at 75 and
given a ceiling of 64; a fourth-tier one was drawn at 41 and given 39. Eleven
points a graduate against two, every intake, for as long as the world ran, is
what rotted the top flight and closed the divisions on each other.

Letting a graduate reach the peak he was drawn for needed three things with
it, because on its own it traded one runaway for another:

- **The academy aims at standing, not at the squad.** Aiming at the club's own
  squad is a loop — good graduates raise the squad, which raises the aim —
  and the fixed point of that loop is the same number for every club in the
  world. Regressed over 276 generated clubs, a squad's strength runs
  `0.86 × reputation + 10`, and reputation moves on results and money rather
  than on who the academy turned out last summer.
- **A boy who never plays barely improves.** Growth had a floor of 0.55 for a
  player with no minutes, so the teenagers who fill half of every squad
  reached their ceilings watching, and the standard of the whole world climbed
  season after season. It is 0.15 now, and a player getting a full game
  develops exactly as fast as he did.
- **A prospect is one who will make this side.** Both the renewal and the
  release rules asked only for room to improve, which every sixteen-year-old
  has. Squads filled with boys and released the men. The bar is now his
  club's own standard.

Measured over eight seasons the top flight holds its level where it used to
fall eleven points, and the gap between the top flight and the fourth tier
holds inside three points of where it starts. The fourth tier still creeps up
about a point a season, so the pyramid is not finished closing — it is just no
longer doing it fast enough to spoil a career.

## Loans

A loan splits the wage: the club he plays for pays 35% of it, the club that
owns him pays the rest. Charged the whole wage no club below the top flight
could afford anybody's reserves, and held to the squad it pays for every club
in the pyramid was full — between them they shut the loan market completely,
at about five loans a season in a world of ninety-two clubs. A loanee now sits
up to two bodies above the squad a club pays for, three loans at a time, which
puts it at forty in the first season and a hundred and fifty a year after
that.

The squad a club is measured against for every other purpose is the one it
pays for: the players it has sent out count, the ones it has taken in do not.
So the top flight carries 25 on the books against the fourth tier's 23, while
the fourth tier has more bodies in the building.

A human manager can send a player of 22 or under out for the rest of the
season, to any club a division or more below that has a hole where he plays.
That matters more than it looks: with growth turning on minutes, a boy behind
two better players comes good nowhere else.

### The age pyramid, which is the root of it

What is left of the drift is one thing, and it is not calibration. Measured
over eight seasons of the English world, with squads and club counts steady
throughout:

| Share of every squad | Season 1 | Season 8, before | Season 8, now |
| --- | --- | --- | --- |
| 16-19 | 12% | 37% | 33% |
| 20-23 | 29% | 30% | 31% |
| 24-27 | 33% | 10% | 11% |
| 28-31 | 21% | 16% | 18% |
| 32+ | 5% | 7% | 8% |
| Average age | 24.7 | 22.5 | 22.9 |

A footballer's best years empty out and schoolboys fill the squad. It is
arithmetic: three or four academy intakes a year into a squad of twenty-four
turns the whole thing over in eight years, so nobody can be much older than
that, and a squad of boys is a squad whose ratings are all still climbing
towards their ceilings. That is the ratchet under everything above.

Two links in the chain that fed it are fixed. A useful backup's renewal used
to be gated on the squad being under its target, which after a summer's
signings it never is, so at twenty-four — the age prospect cover ran out —
anybody outside the first eleven or two was let go. And a free agent nobody
wanted retired after a single season unattached, so a twenty-five year old
released in the summer and not signed by the next left football for good
rather than dropping down the pyramid. Together they are worth about four
points on the sixteen to nineteens and half a year on the average age. The
shape is still wrong.

Measured over eight seasons, and where each one got to:

- releasing a prospect at twenty-one instead of twenty-four, and raising the
  bar to clearly above the club's standard — no effect on the pyramid
- halving the academy intake — the shape improves, but the top flight falls to
  seventeen players and clubs turn up without a fit goalkeeper, because
  nothing else in the world makes footballers: a transfer moves a player,
  only an intake creates one and only retirement removes one
- halving the intake with free agents surviving two seasons — the same
  collapse, the top flight at eighteen or nineteen while the lower divisions
  hold at twenty-four

The open question is why the top flight cannot restock from the market when
the intake falls. It is not money or supply: measured at the point of the
collapse, top-flight clubs hold four unmet needs apiece, transfer budgets in
the hundreds of millions, and 1,834 of the 1,850 listings in the world are
affordable to them. Something between a need and a signing is refusing, and
finding it is the next thing.

Measured and rejected along the way, each across three seeds:

- a rare high-potential roll on young players — no effect on the decay
- a reputation ceiling on academy output, with the ceiling still discarded —
  cost the top flight three points and made the drift worse
- raising the growth floor for players who get no minutes — no effect, though
  72% of under-23 goalkeepers get none against 55% of outfielders
- pitching each academy intake at the club's own line for that position rather
  than its eleven-man average — neutral over three seeds
- letting the graduate reach his drawn peak on its own — the top flight stops
  rotting and the fourth tier runs away instead, 42 to 58 in eight seasons

## Squad size

A club carries about `18 + reputation × 0.09` players, twenty at the least and
twenty-eight at the most: a top-flight squad of around twenty-five against a
fourth-tier one of around twenty-three. Clubs sign depth only up to that
number, replace a position below the league standard up to two past it, and
cover a genuine shortage up to three; at the end of the season anyone above it
releases the bottom of the squad, paying off what is left of the contract, and
takes no youth intake it has no room for. A loanee sits above that number
rather than in it, because somebody else is paying most of his wages.

Against a single cap for every club the order came out backwards — the fourth
tier filled to thirty and the top flight sat at twenty-one, because a cheap
starter is easy to improve on and a dear one is not, and because nothing ever
forced a small club to let anyone go.

## Report

`--report FILE` writes a single HTML file with no external scripts: goals and
outcome balance per season, club balances by division, transfer activity, final
league tables, honours, leading scorers, three explained matches with their
goal-factor bars, and the season's event counts. Each chart has its data table
beside it and renders in light and dark themes.

## Explorer

`npm run build:web` bundles the engine with esbuild and inlines it into
`web/explorer.html`, producing a single-file page at `dist/web/explorer.html`.
Pick a seed, number of divisions and clubs, then play week by week or to the
end of the season: live league tables with promotion and relegation zones,
form and bank balance, a results feed, a match report with goal-factor bars for
any result, club news (transfers, sackings, cup wins, long injuries), completed
season summaries, and leading scorers. The same seed always gives the same
world.

## Determinism

All randomness comes from one seeded generator consumed in a fixed order. The
`verify` command runs the same configuration twice and compares end-of-season
hashes. The test suite also replays a season's event log into an empty world
and checks the hash matches.
