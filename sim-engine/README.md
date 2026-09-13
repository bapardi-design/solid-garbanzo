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
- pricing a surplus player by what his club can hold out for rather than a
  flat 5% discount for everybody, so a rich club's reserves cost a premium and
  a poor club's go cheap — right in principle and worth nothing here: the top
  flight still ended at eighteen or nineteen under the halved intake, and at
  the ordinary intake it moved neither squad sizes nor the volume of the
  market, so it was not kept

The open question is why the top flight cannot restock when the intake falls,
because the intake cannot come down until it is answered. It is not money or
supply: at the point of the collapse top-flight clubs hold four unmet needs
apiece, transfer budgets in the hundreds of millions, and 1,834 of the 1,850
listings in the world are affordable to them on both fee and wage. Nor is it
that they fail to buy. They buy nine a season and **sell ten**, churning the
squad downwards, while the divisions below them hold at twenty-four. Two fixes
for that were measured and neither cured it:

- letting a club short of the squad it pays for sign past the four-a-window
  limit real clubs are held to — it buys nine and a half instead of eight and
  a half, and sells eleven
- stopping a club that is short from offering the players it picks, selling
  only those well down the pecking order — the top flight still ends at
  eighteen, and under the ordinary intake it quiets the transfer market by a
  third

Nor is it the price. What the top flight sells, the divisions below want: a
sixth-choice defender in the top flight is better than a third-tier starter,
and the only brake on a smaller club signing him is one chance roll that still
lets a second-tier club through about a fifth of the time. Twenty top-flight
clubs selling ten players a season is most of the whole world's transfer
market.

So it is the selling side, and neither the volume, the willingness nor the
price is wrong on its own. What is missing is a reason for the pyramid's best clubs to
keep their own: something about who wants to leave and who is worth keeping,
rather than another number on the size of a squad.

### Where the top flight was buying from, which was nowhere

The question the table above leaves open — why the top flight cannot restock
when the intake falls — has an answer, and it is not money, volume or
willingness. Two measurements settle it.

Count every transfer by the tier it left and the tier it joined, over seven
seasons of one world: the first division loses 86 players on balance, and
every division below it gains. It sells 205 down the pyramid and buys 118
back. Then stand in a first-division club's shoes on a transfer day in season
six: 2,169 players are listed, 661 of them midfielders, and **three** of those
clear the line the club holds its own midfield to. One is affordable. The same
count for defenders is five, and for goalkeepers ten.

So the top flight's only real supplier is its own academy, and the reason is
that a ceiling is drawn off the reputation of the club a boy happens to be
born at. A second-division academy aims at the sixties; nobody it produces can
ever play in the first division, however he develops. That is what pins the
intake at three or four a club a year, and the intake is what turns the squad
over every six years, which is the age pyramid.

Two changes, which are worth nothing apart and hold together:

- **one scholar in twelve is drawn eight to twenty-six points clear of his
  club's standing**, the same odds everywhere, so a footballer can be born at
  a small club
- **a club will sign a boy under twenty-three whose ceiling clears its line,
  not only a player whose rating already does** — without it the gifted boy
  sits where he was born, rated forty-five today and worth ninety one day, and
  nobody whose bar is what a player is worth today ever bids

Over eight seasons and three seeds, against the same seeds without them:

| | top flight, season 8 | its squad | world mean | fourth tier | the gap |
| --- | --- | --- | --- | --- | --- |
| before | 77.3 | 20.6 men | 50.5 | 45.9 | 31.4 |
| the tail alone | 78.6 | 21.1 men | 52.2 | 48.5 | 30.1 |
| the ceiling bar alone | 77.2 | 20.9 men | 50.7 | 46.2 | 31.0 |
| both | 78.7 | 21.0 men | 51.7 | 47.1 | 31.6 |

The top flight starts at 78.3 and used to end below it. It now ends above it,
and the gap to the bottom division is no narrower than it was — the tail alone
closes it by a point and a third, because the boys it creates stay where they
were born. Goals per game drift over six seasons falls from +0.094 to +0.071.

The age pyramid itself does not move: 34% of every squad is still sixteen to
nineteen by season 8. This unblocks the thing that made it immovable rather
than moving it. Cutting the intake to one or two a club, which is what the
arithmetic wants, still empties the squads — 18.0 men in the top flight and
the divisions converging hard — so the next attempt is about where a club
finds bodies, not where it finds quality.

### What the world does with the ones it does not need

Counting what the world makes against what it removes says where the prime
years actually go, and it is not the transfer market at all. Ninety-two clubs
hold 2,139 players between them, 23.3 a club, and the academies make 291 a
season:

| | made | left the game | mean age | of those, released and never signed |
| --- | --- | --- | --- | --- |
| season 1 | 283 | 87 | 33.0 | 68 |
| season 3 | 280 | 374 | 26.5 | 368 |
| season 5 | 281 | 319 | 27.5 | 303 |
| season 8 | 301 | 300 | 26.9 | 284 |

291 a season into 2,139 places means a career of 7.3 years is all that fits,
and the world balances the books by putting three hundred men a season out of
football at twenty-seven — 95% of them players nobody signed after a release,
not players who got old. The hole in the prime years is not a shortage of
buyers or sellers. It is the retirement valve absorbing an overproduction of
schoolboys, and a club is never short of bodies because the ones it discards
are gone by the time it needs them.

So the next attempt is the valve: a twenty-five-year-old released by a
second-division club should drop down the pyramid, not leave the game, and the
intake should fall to something a sixteen-year career can absorb — around 1.5 a
club. Both halves at once, because either alone has already been measured and
fails: a released man who survives longer just sits in the pool while the
intake still floods it, and a smaller intake with the valve as it is empties
the squads to 18 men.

### Nobody is ever off the market, which is the root of it

That attempt was made and it is written up here because it failed in an
instructive way. Two counts run first, over eight seasons.

What a top-flight club takes in and loses, per club per season:

| in | | out | |
| --- | --- | --- | --- |
| academy | 3.46 | transfer | 3.14 |
| transfer | 2.58 | loaned away | 3.74 |
| free agent | **0.17** | contract ran out | 2.13 |
| | | released | 0.87 |

The academy is 56% of everything arriving and the free-agent pool is a
rounding error, though 188 released men between 23 and 29 were sitting in it
that somebody could have signed that day. Cut the intake and the club does try:
transfers in go to 6.8 and out to 8.4, 7.05 signings against a hard cap of 8 a
season. It is buying as fast as the rules allow and still shrinking.

Then, why a top-flight club sold him:

| | per club per season |
| --- | --- |
| expiring contract, 27 or over | **4.64** |
| cash-strapped | 0.86 |
| squad too big | 0.83 |
| everyone has a price | 0.06 |

One rule was doing it. A player 27 or over in his last contract year is listed
at 0.7 × value — while `renewContracts` is separately trying to re-sign the
same man. The club was offering its own first-choice centre half at a thirty
per cent discount the same summer it wanted to keep him, and the sale won 4.6
times a season.

Making the market and the renewal agree on who the club keeps does exactly
what it should: those sales fall from 4.64 to 0.01. And the total does not
move, because the same players are sold through the catch-all instead — 3.98 a
season at "everyone has a price" against 0.06 before, at a premium rather than
a discount. **There is no such thing as not for sale.** The last rule in
`buildMarket` puts a price on every player beyond the starters, and on the
starters too at a club under 80 reputation, so blocking any one route only
moves the sale to the next one. That is why ten attempts at this all behaved
the same way: whatever is done to the inflow, the outflow matches it.

Giving the model a real not-for-sale state — a man the club means to keep goes
nowhere unless it is short of money or over its squad limit — does move the
pyramid, and the academy shrinks itself into the bargain, because a club that
keeps its own has no room for scholars and takes 2.4 rather than 3.5:

| | 16-19 | 24-27 | average age | top flight | its squad |
| --- | --- | --- | --- | --- | --- |
| season 1 | 12% | 34% | 24.7 | 78.3 | 24.6 men |
| season 8, as it ships | 34% | 11% | 22.9 | 78.7 | 21.0 men |
| season 8, nobody for sale | 25% | 14% | 24.5 | 73.9 | 18.7 men |

Not shipped. The average age is right and the shape is not: the boys are
replaced by 28-to-31-year-olds, 26% of every squad against 17%, and the top
flight pays 4.8 rating points and two more players for it. A club that keeps
everyone never buys better, and nothing in the world makes quality except the
academy it just stopped needing.

So the pyramid is not a transfer-market problem and never was. It is that the
only source of new quality is the academy, and the only way out of the game is
retirement, and those two facts fix the turnover rate whatever the market does.

Measured and rejected this time, each across three seeds:

- spreading the intake's quality within a year, the best scholar at the club's
  line and the rest 8, 16, 22 and 26 points behind — the pyramid does not move
  at all, 33% against 34%, and the world loses 4.7 rating points. The share is
  volume arithmetic and quality has nothing to do with it
- a club below its squad target listing nobody but genuine surplus and
  expiring contracts — the top flight gains 0.8 men and the pyramid does not
  move. Closing that valve cuts the top flight's own supply of listings as
  much as it cuts its exports, and with the intake also halved it ends at 19.2
  men rather than 20.6

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

## The dressing room

Morale has always had teeth — it moves expected goals by up to 8%, sets how
willingly a player renews and what he asks for — and the engine has always
known why it fell: he has not started in four weeks, or his contract is
running down. The manager saw a number and no reason, and had nothing to say
back.

`squadConcerns` names what each unhappy player is unhappy about. The one
answer available is a promise of football: it lifts him eight now and costs
twelve if the four weeks pass without a start, so promising what cannot be
given is worse than saying nothing, and a player already waiting cannot be
promised again. Never having started counts as the strongest form of being
left out rather than the weakest — a last-start day of −1 must not read as
"started today".

## Careers

A player's record used to be two running totals, so the season a squad player
scored fifteen and the season he never got on the pitch were the same thing
once the stats were wiped. Each player now keeps a line per season he played —
club, appearances, goals, assists, cards and average rating — written at the
season's end, while he is still at the club he played it for: loans go home and
contracts expire before the wipe, so anything recorded later names the wrong
club. A season without a game leaves no line.

Retired players are skipped when stats are wiped, so theirs stand frozen for
ever; left in, they wrote the same last season again every year until the world
ended. A player retiring this summer is not marked yet, so his final season is
still kept. Saves written before this start their record from the day they are
loaded, and carry about a fifth more weight after six seasons — 775 KB gzipped
against 911.

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

## Intake day

The academy has always turned out three or four players a club a season and
never said so: they appeared in the squad list with no more ceremony than a
signing nobody made. The news feed now carries one item a club a season, for
the manager's club only — ninety clubs taking scholars is not news — naming
everyone who came through with the ceiling the scouts put on him, and singling
out whoever they rate highest. The scouted range is the same estimate the
scout report gives, so the two never disagree about the same boy; a club with
a poor scouting setup gets a wider range on both.

Written against what the intake actually is, not what it looks like. Measured
over three seeds, the intake at the very top (reputation 90 and up) averages a
ceiling of 85.9 against a squad of 85.2, and the best of them reaches 92 — the
aim in `startSeason` is deliberately the side they are trying to get into, and
the news reports it rather than flattering it. By tier the intake's ceiling
against its club's squad strength runs −5.4, +0.6, +1.1, −1.1 from the top
division down, and between 8% and 27% of scholars are drawn more than five
points clear of the squad they join.

Two intakes are in reach in a manager's first year: the one the career opens on
and the one at the first rollover. The rollover item is the one that goes
missing when something is wrong, and it goes missing honestly — a manager
sacked in May has no club when the scholars arrive in June, which is what the
first seed the test was written against did.


## Ten men

A player sent off in the first half of the manager's own match was dropped from
the eleven on the half-time screen, as he should be, and nothing took him off
the bench with it — the bench was everyone not in the eleven. So the game
offered your own dismissed player as a substitute, top of the list four times
in five, because a man good enough to be picked is usually better than the ones
who were not. Bringing him back on was allowed, and since he then stood in both
halves' elevens his record showed ninety minutes for a match he had been sent
off in.

Sendings-off are rare enough that no ordinary seed produced one, which is why
the minutes test looked fragile rather than right: it only failed when a change
elsewhere happened to push a red card into the first half of the match it
watches. The bench now excludes him, and `finishMatch` refuses him whatever it
is asked for, because a saved game or a script does not go through the screen.

Auditing every match of four seasons for that — nine thousand of them — turned
up the same mistake in the engine itself, and not only in the manager's own
games. A player's minutes were the halves he was named in, 45 for each, so a
man sent off in the twentieth minute was credited the full ninety: 607 matches
in 9,152. With the minutes went a clean sheet he was not on the pitch for, a
whole match's fitness cost and a whole match's injury risk, all of them
computed from the same number. He is now credited from the minute he came on to
the minute he walked. The eighteen that still read ninety were sent off in the
ninetieth.


## What is checked

`checkInvariants` covers the world's structure — squads against club membership,
contracts against players, fixtures against the day index — and runs at every
season boundary in the tests. It says nothing about what happens in a match,
which is where the last two defects lived, so two sweeps now do:

- **eligibility**, over two seasons and some three thousand matches: nobody
  retired, injured, suspended or belonging to another club takes the field,
  every side uses between eleven and fourteen men, nobody plays twice in a day,
  and nobody records more than ninety minutes. Availability is read before the
  day is played, so an injury with one day left is allowed — it heals during
  the tick, before kick-off
- **dismissals**, over two seasons: nobody is credited a minute past his red
  card

Two more were run as one-offs and found nothing, which is worth writing down so
nobody looks again without reason. Money: every movement in a club's balance
over three seasons is explained by a ledger entry, a transfer fee or a contract
pay-off, and all 106 fees paid went to another club rather than into the air —
the ledger is updated in the same three places the balance is, so the books
cannot drift apart. Tables: 628 snapshots over three seasons agree with the
fixtures behind them on played, won, drawn, lost, goals for and against, points
as 3W + D, and the order clubs sit in.


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
