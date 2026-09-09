#!/usr/bin/env node
/**
 * sim run     --seasons 2 --seed abc --leagues 2 --clubs 12 --squad 24 [--out DIR] [--report FILE] [--explain N] [--quiet]
 * sim verify  same flags; runs twice and compares end-of-season hashes
 * sim explain --seasons 1 ... --explain 5 ; prints goal factor breakdowns
 * sim resume  --from out/world_s2.json --seasons 2 [--out DIR] ; continue from a snapshot
 */
import { DEFAULT_CONFIG, type WorldConfig } from '../core/schema.js';
import { explainMatch } from '../matchday/match.js';
import { computeTable } from '../matchday/table.js';
import { runSeasons, type SeasonResult } from './runner.js';
import { loadSnapshot } from './snapshot.js';
import { renderReport } from './report.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

interface Args { command: string; flags: Record<string, string | boolean> }

export function parseArgs(argv: string[]): Args {
  const flags: Record<string, string | boolean> = {};
  let command = 'run';
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith('--')) command = rest.shift() as string;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith('--')) { flags[key] = next; i++; }
    else flags[key] = true;
  }
  return { command, flags };
}

function num(flags: Args['flags'], key: string, def: number): number {
  const v = flags[key];
  return typeof v === 'string' ? Number(v) : def;
}

export function configFromFlags(flags: Args['flags']): WorldConfig {
  return {
    seed: typeof flags.seed === 'string' ? flags.seed : DEFAULT_CONFIG.seed,
    leagues: num(flags, 'leagues', DEFAULT_CONFIG.leagues),
    clubsPerLeague: num(flags, 'clubs', DEFAULT_CONFIG.clubsPerLeague),
    squadSize: num(flags, 'squad', DEFAULT_CONFIG.squadSize),
    seasonLength: num(flags, 'season-length', DEFAULT_CONFIG.seasonLength),
    cup: flags['no-cup'] ? false : DEFAULT_CONFIG.cup,
  };
}

function printSeason(r: SeasonResult): void {
  const m = r.metrics;
  console.log(`\n=== Season ${r.season} (${r.elapsedMs} ms) hash ${r.hash.slice(0, 12)} ===`);
  console.log(`matches ${m.matches}  goals/match ${m.goalsPerMatch}  H/D/A ${m.homeWinPct}/${m.drawPct}/${m.awayWinPct}%  clean sheets ${m.cleanSheetPct}%  biggest ${m.maxScoreline}`);
  console.log(`transfers ${JSON.stringify(m.transfers)}  fees ${m.totalFees}k  contracts ${m.contractsSigned} (avg ${m.avgContractLength} seasons)  free agents ${m.freeAgents}`);
  console.log(`injuries ${m.injuries}  sackings ${m.sackings}  retirements ${m.retirements}  dropouts ${m.droppedOut}  squad ${m.avgSquadSize}  age ${m.avgAge}  ovr ${JSON.stringify(m.avgOverallByTier)}`);
  console.log(`balance by tier ${JSON.stringify(m.balanceByTier)}k  insolvent ${m.insolventClubs}  top scorer ${m.topScorer}`);
  console.log(`events ${JSON.stringify(m.eventCounts)}`);
  if (r.invariantErrors.length) console.log(`INVARIANTS: ${r.invariantErrors.length} violations\n  ${r.invariantErrors.join('\n  ')}`);
}

export function main(argv: string[]): number {
  const { command, flags } = parseArgs(argv);
  const config = configFromFlags(flags);
  const seasons = num(flags, 'seasons', 1);
  const quiet = Boolean(flags.quiet);
  const outDir = typeof flags.out === 'string' ? flags.out : undefined;

  if (command === 'run' || command === 'explain' || command === 'resume') {
    let resumeFrom;
    if (command === 'resume') {
      if (typeof flags.from !== 'string') { console.error('resume needs --from <snapshot.json>'); return 2; }
      resumeFrom = loadSnapshot(flags.from);
      console.log(`resuming ${flags.from} at day ${resumeFrom.world.day}, season ${resumeFrom.world.season}`);
    }
    const result = runSeasons({ config: resumeFrom ? resumeFrom.world.config : config, seasons, resumeFrom, outDir, strict: !flags.lenient, onSeason: quiet ? undefined : printSeason });
    const world = result.world;
    if (!quiet) {
      for (const comp of Object.values(world.competitions)) {
        if (comp.kind !== 'league' || comp.season !== world.season) continue;
        console.log(`\n${comp.name} (season ${comp.season})`);
        for (const row of computeTable(world, comp)) {
          console.log(`${String(row.position).padStart(2)} ${world.clubs[row.clubId].name.padEnd(22)} ${String(row.played).padStart(2)} ${String(row.won).padStart(2)} ${String(row.drawn).padStart(2)} ${String(row.lost).padStart(2)} ${String(row.gf).padStart(3)} ${String(row.ga).padStart(3)} ${String(row.gd).padStart(4)} ${String(row.points).padStart(3)}`);
        }
      }
    }
    const explain = num(flags, 'explain', command === 'explain' ? 3 : 0);
    if (explain > 0) {
      const played = Object.values(world.fixtures).filter((f) => f.played && f.season === world.season).sort((a, b) => a.id.localeCompare(b.id));
      const step = Math.max(1, Math.floor(played.length / explain));
      console.log('\n--- match explanations ---');
      for (let i = 0; i < played.length && i / step < explain; i += step) console.log(explainMatch(world, played[i]) + '\n');
    }
    if (typeof flags.report === 'string') {
      mkdirSync(dirname(flags.report), { recursive: true });
      writeFileSync(flags.report, renderReport(result));
      console.log(`report written to ${flags.report}`);
    }
    console.log(`\nran ${seasons} season(s), ${result.totalEvents} events, ${result.elapsedMs} ms, final hash ${result.seasons.at(-1)?.hash}`);
    return 0;
  }

  if (command === 'verify') {
    const a = runSeasons({ config, seasons, strict: true });
    const b = runSeasons({ config, seasons, strict: true });
    let ok = true;
    for (let i = 0; i < a.seasons.length; i++) {
      const same = a.seasons[i].hash === b.seasons[i].hash;
      ok &&= same;
      console.log(`season ${a.seasons[i].season}: ${same ? 'MATCH' : 'MISMATCH'} ${a.seasons[i].hash.slice(0, 16)} ${b.seasons[i].hash.slice(0, 16)}`);
    }
    console.log(ok ? 'deterministic: yes' : 'deterministic: NO');
    return ok ? 0 : 1;
  }

  console.error(`unknown command ${command}`);
  return 2;
}

const isEntry = process.argv[1] && /cli\.js$/.test(process.argv[1]);
if (isEntry) process.exit(main(process.argv.slice(2)));
