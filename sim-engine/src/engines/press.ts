/**
 * Press engine: turns the day's events into headlines, spreads transfer
 * rumours, and hands out end-of-season awards. Everything goes through
 * NEWS_PUBLISHED so a replayed log carries the same news.
 */
import type { Ctx } from '../core/context.js';
import type { Award, Event } from '../core/events.js';
import type { CompetitionLeague, NewsCategory, NewsItem, Player, SeasonSummary, World } from '../core/schema.js';
import { contractOf, isRealWorld, leagueOf, nextId, seasonDay, squad, tierFromLeagueId, tierOfClub } from '../core/schema.js';
import { averageRating, overall } from '../rating.js';
import { computeTable, positionOf } from '../matchday/table.js';
import { SUMMER_WINDOW, WINTER_WINDOW, clubNeeds, inTransferWindow, leagueLines } from './transfers.js';

export function currencyFor(world: World, clubId: string | null): string {
  const nationId = clubId ? world.clubs[clubId]?.nationId : null;
  return (nationId && world.nations[nationId]?.currency) || '£';
}

/** Formats an amount in k as £4.5m / £850k. */
export function money(k: number, currency = '£'): string {
  const abs = Math.abs(k);
  const sign = k < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}${currency}${(abs / 1000000).toFixed(1)}bn`;
  if (abs >= 1000) return `${sign}${currency}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}m`;
  return `${sign}${currency}${Math.round(abs)}k`;
}

interface Draft { category: NewsCategory; headline: string; body: string; clubIds?: string[]; playerId?: string | null; nationId?: string | null }

function item(ctx: Ctx, d: Draft): NewsItem {
  const { world } = ctx;
  return {
    id: nextId(world, 'n', 6),
    day: world.day,
    season: world.season,
    category: d.category,
    headline: d.headline,
    body: d.body,
    clubIds: d.clubIds ?? [],
    playerId: d.playerId ?? null,
    nationId: d.nationId ?? (d.clubIds?.length ? world.clubs[d.clubIds[0]].nationId : null),
  };
}

export function publish(ctx: Ctx, drafts: Draft[]): void {
  if (drafts.length === 0) return;
  ctx.emit('NEWS_PUBLISHED', { items: drafts.map((d) => item(ctx, d)) });
}

const isHuman = (world: World, clubId: string | null | undefined) => clubId !== null && clubId !== undefined && clubId === world.humanClubId;

function posName(p: Player): string {
  return { GK: 'goalkeeper', DF: 'defender', MF: 'midfielder', FW: 'forward' }[p.position];
}

/** Big-fee threshold for a transfer to make the news. */
function newsworthyFee(world: World): number { return isRealWorld(world) ? 8000 : 800; }

function competitionName(world: World, id: string): string { return world.competitions[id]?.name ?? id; }

/* ---------- event-driven news ---------- */

function transferNews(ctx: Ctx, events: Event[]): Draft[] {
  const { world, rng } = ctx;
  const drafts: Draft[] = [];
  const done = events.filter((e): e is Event<'PLAYER_TRANSFERRED'> => e.type === 'PLAYER_TRANSFERRED')
    .map((e) => e.payload.record)
    .sort((a, b) => b.fee - a.fee);
  const threshold = newsworthyFee(world);
  let shown = 0;
  for (const r of done) {
    const human = isHuman(world, r.toClubId) || isHuman(world, r.fromClubId);
    const to = world.clubs[r.toClubId];
    const from = r.fromClubId ? world.clubs[r.fromClubId] : null;
    const bigClub = to.reputation >= 78 || (from?.reputation ?? 0) >= 78;
    if (!human && !(r.fee >= threshold || (bigClub && shown < 6))) continue;
    if (!human && shown >= 8) continue;
    shown++;
    const p = world.players[r.playerId];
    const cur = currencyFor(world, r.toClubId);
    const fee = r.fee > 0 ? money(r.fee, cur) : null;
    const headline = r.kind === 'free'
      ? rng.pick([`${to.name} snap up free agent ${p.name}`, `${p.name} joins ${to.name} on a free`])
      : rng.pick([`${p.name} completes ${fee} move to ${to.name}`, `${to.name} sign ${p.name} from ${from!.name} for ${fee}`, `Done deal: ${p.name} to ${to.name}`]);
    const body = `${to.name} have completed the signing of ${p.age}-year-old ${posName(p)} ${p.name}${from ? ` from ${from.name}` : ''}${fee ? ` for a fee of ${fee}` : ' on a free transfer'}. The ${p.nationality} international has agreed a deal until the end of season ${world.season + (r.kind === 'free' ? 1 : 2)}.`;
    drafts.push({ category: 'transfer', headline, body, clubIds: from ? [r.toClubId, from.id] : [r.toClubId], playerId: p.id });
  }
  for (const e of events) {
    if (e.type !== 'LOAN_STARTED') continue;
    const r = e.payload.record;
    if (!isHuman(world, r.toClubId) && !isHuman(world, r.fromClubId) && world.clubs[r.fromClubId!].reputation < 85) continue;
    const p = world.players[r.playerId];
    drafts.push({ category: 'transfer', headline: `${p.name} joins ${world.clubs[r.toClubId].name} on loan`, body: `${world.clubs[r.fromClubId!].name} have loaned ${posName(p)} ${p.name} to ${world.clubs[r.toClubId].name} for the season to get first-team minutes.`, clubIds: [r.toClubId, r.fromClubId!], playerId: p.id });
  }
  for (const e of events) {
    if (e.type === 'BID_RECEIVED') {
      const b = e.payload.bid;
      const p = world.players[b.playerId];
      const buyer = world.clubs[b.toClubId];
      drafts.push({ category: 'bid', headline: `${buyer.name} table ${money(b.fee, currencyFor(world, b.toClubId))} bid for ${p.name}`, body: `${buyer.name} have made a formal offer of ${money(b.fee, currencyFor(world, b.toClubId))} for ${world.clubs[b.fromClubId].name} ${posName(p)} ${p.name}. The offer stands for a week.`, clubIds: [b.toClubId, b.fromClubId], playerId: p.id });
    }
    if (e.type === 'PLAYER_RELEASED' && isHuman(world, e.payload.clubId)) {
      const p = world.players[e.payload.playerId];
      drafts.push({ category: 'contract', headline: `${world.clubs[e.payload.clubId].name} release ${p.name}`, body: `${p.name} leaves by mutual consent${e.payload.payoff ? ` with a ${money(e.payload.payoff, currencyFor(world, e.payload.clubId))} settlement` : ''}.`, clubIds: [e.payload.clubId], playerId: p.id });
    }
  }
  return drafts;
}

function managerNews(ctx: Ctx, events: Event[]): Draft[] {
  const { world, rng } = ctx;
  const drafts: Draft[] = [];
  for (const e of events) {
    if (e.type === 'MANAGER_SACKED') {
      const m = world.managers[e.payload.managerId];
      const c = world.clubs[e.payload.clubId];
      if (c.reputation < 55 && !isHuman(world, c.id)) continue;
      drafts.push({ category: 'manager', headline: rng.pick([`${c.name} sack ${m.name}`, `${m.name} dismissed by ${c.name}`, `${c.name} part company with ${m.name}`]), body: `${c.name} have dismissed manager ${m.name}. A club statement cited results: ${e.payload.reason}.`, clubIds: [c.id] });
    }
    if (e.type === 'MANAGER_APPOINTED' && e.payload.reason === 'appointment') {
      const m = world.managers[e.payload.managerId];
      const c = world.clubs[e.payload.clubId];
      if (c.reputation < 60 && !isHuman(world, c.id)) continue;
      drafts.push({ category: 'manager', headline: `${c.name} appoint ${m.name}`, body: `${m.name} has been named the new manager of ${c.name} on a contract to the end of season ${e.payload.contractEndSeason}.`, clubIds: [c.id] });
    }
    if (e.type === 'CLUB_TAKEN_OVER') {
      const c = world.clubs[e.payload.clubId];
      drafts.push({ category: 'manager', headline: `${c.name} appoint ${e.payload.manager.name}`, body: `${e.payload.manager.name} takes charge at ${c.name} with a brief to finish around ${c.boardTarget}th.`, clubIds: [c.id] });
    }
    if (e.type === 'CAREER_ENDED') {
      const c = world.clubs[e.payload.clubId];
      drafts.push({ category: 'board', headline: `${c.name} sack their manager`, body: `The board has lost patience: ${e.payload.reason}.`, clubIds: [c.id] });
    }
  }
  return drafts;
}

function injuryNews(ctx: Ctx, events: Event[]): Draft[] {
  const { world } = ctx;
  const drafts: Draft[] = [];
  for (const e of events) {
    if (e.type !== 'PLAYER_INJURED') continue;
    const p = world.players[e.payload.playerId];
    const human = isHuman(world, p.clubId);
    if (!human && (e.payload.days < 21 || overall(p) < 80)) continue;
    if (human && e.payload.days < 10) continue;
    const weeks = Math.max(1, Math.round(e.payload.days / 7));
    drafts.push({ category: 'injury', headline: `${p.name} out for ${weeks} week${weeks === 1 ? '' : 's'}`, body: `${p.clubId ? world.clubs[p.clubId].name : 'Free agent'} ${posName(p)} ${p.name} faces ${weeks} week${weeks === 1 ? '' : 's'} on the sidelines after picking up an injury.`, clubIds: p.clubId ? [p.clubId] : [], playerId: p.id });
  }
  return drafts;
}

function matchNews(ctx: Ctx, events: Event[]): Draft[] {
  const { world } = ctx;
  const drafts: Draft[] = [];
  const played = events.filter((e): e is Event<'MATCH_PLAYED'> => e.type === 'MATCH_PLAYED').map((e) => world.fixtures[e.payload.fixtureId]);
  if (played.length === 0) return drafts;
  const byComp = new Map<string, typeof played>();
  for (const f of played) (byComp.get(f.competitionId) ?? byComp.set(f.competitionId, []).get(f.competitionId)!).push(f);
  const score = (f: (typeof played)[number]) => `${world.clubs[f.homeClubId].short} ${f.homeGoals}-${f.awayGoals} ${world.clubs[f.awayClubId].short}${f.report?.penalties ? ` (${f.report.penalties.home}-${f.report.penalties.away} pens)` : ''}`;
  for (const [compId, fixtures] of byComp) {
    const comp = world.competitions[compId];
    if (!comp) continue;
    const topTier = comp.kind === 'league' ? comp.tier === 1 : true;
    const involvesHuman = fixtures.some((f) => isHuman(world, f.homeClubId) || isHuman(world, f.awayClubId));
    if (!topTier && !involvesHuman) continue;
    const sorted = [...fixtures].sort((a, b) => world.clubs[a.homeClubId].name.localeCompare(world.clubs[b.homeClubId].name));
    const label = comp.kind === 'league' ? `${comp.name} round ${fixtures[0].round}` : comp.stage === 'groups' && fixtures[0].group !== null ? `${comp.name} group matchday ${fixtures[0].round}` : `${comp.name} ${roundLabel(comp.round, comp.totalRounds)}`;
    const biggest = [...fixtures].sort((a, b) => Math.abs(b.homeGoals - b.awayGoals) - Math.abs(a.homeGoals - a.awayGoals))[0];
    const headline = Math.abs(biggest.homeGoals - biggest.awayGoals) >= 4
      ? `${world.clubs[biggest.winnerId!].name} hit ${Math.max(biggest.homeGoals, biggest.awayGoals)} in ${comp.name} rout`
      : `${label}: results`;
    drafts.push({ category: comp.kind === 'cup' ? 'cup' : 'match', headline, body: `${label}\n${sorted.map(score).join('\n')}`, clubIds: involvesHuman ? [world.humanClubId!] : [], nationId: comp.kind === 'league' ? comp.nationId : comp.nationId });
  }
  // The human club's own match gets a written report.
  const mine = played.find((f) => isHuman(world, f.homeClubId) || isHuman(world, f.awayClubId));
  if (mine && mine.report) {
    const home = world.clubs[mine.homeClubId];
    const away = world.clubs[mine.awayClubId];
    const us = isHuman(world, home.id) ? home : away;
    const won = mine.winnerId === us.id;
    const drew = mine.winnerId === null;
    const scorers = mine.report.goals.map((g) => `${world.players[g.scorerId].name} ${g.minute}'${g.clubId === home.id ? '' : ' (a)'}`).join(', ');
    drafts.push({ category: 'match', headline: `${home.name} ${mine.homeGoals}-${mine.awayGoals} ${away.name}: ${won ? `${us.short} ${mine.knockout ? 'go through' : 'take the points'}` : drew ? 'honours even' : `${us.short} beaten`}`, body: `${competitionName(world, mine.competitionId)}, attendance ${mine.report.attendance.toLocaleString('en-GB')}.\nScorers: ${scorers || 'none'}.\nExpected goals: ${home.short} ${mine.report.lambda.home.toFixed(2)}, ${away.short} ${mine.report.lambda.away.toFixed(2)}.`, clubIds: [us.id] });
  }
  for (const e of events) {
    if (e.type === 'CUP_ROUND_ADVANCED' && e.payload.winnerId) {
      const comp = world.competitions[e.payload.competitionId];
      const w = world.clubs[e.payload.winnerId];
      drafts.push({ category: 'cup', headline: `${w.name} win the ${comp.name}`, body: `${w.name} lifted the ${comp.name} after coming through ${comp.kind === 'cup' ? comp.totalRounds : 0} rounds.`, clubIds: [w.id], nationId: comp.kind === 'cup' ? comp.nationId : null });
    }
  }
  return drafts;
}

export function roundLabel(round: number, total: number): string {
  const left = total - round;
  return left === 0 ? 'final' : left === 1 ? 'semi-finals' : left === 2 ? 'quarter-finals' : left === 3 ? 'last 16' : `round ${round}`;
}

function seasonNews(ctx: Ctx, events: Event[]): Draft[] {
  const { world } = ctx;
  const drafts: Draft[] = [];
  for (const e of events) {
    if (e.type === 'SEASON_ENDED') {
      const s = e.payload.summary;
      for (const [compId, clubId] of Object.entries(s.champions)) {
        const comp = world.competitions[compId];
        if (!comp || comp.kind !== 'league') continue;
        const c = world.clubs[clubId];
        const runnerUp = Object.entries(s.positions).find(([id, pos]) => pos === 2 && comp.clubIds.includes(id))?.[0];
        drafts.push({ category: 'match', headline: `${c.name} are ${comp.name} champions`, body: `${c.name} finished top of the ${comp.name}${runnerUp ? ` ahead of ${world.clubs[runnerUp].name}` : ''}.${comp.tier === 1 ? '' : ` They go up${s.promoted.filter((id) => comp.clubIds.includes(id) && id !== c.id).map((id) => ` with ${world.clubs[id].name}`).join('')}.`}`, clubIds: [c.id], nationId: comp.nationId });
      }
      const relegated = s.relegated.filter((id) => tierOfClub(world, id) === 1 || isHuman(world, id));
      for (const id of relegated) {
        const c = world.clubs[id];
        drafts.push({ category: 'match', headline: `${c.name} relegated`, body: `${c.name} go down after finishing ${s.positions[id]}th.`, clubIds: [id] });
      }
    }
    if (e.type === 'BUDGETS_SET' && world.humanClubId && e.payload.budgets[world.humanClubId]) {
      const b = e.payload.budgets[world.humanClubId];
      const c = world.clubs[world.humanClubId];
      const cur = currencyFor(world, c.id);
      drafts.push({ category: 'board', headline: `${c.name} board set the target: finish ${ordinal(b.boardTarget)}`, body: `The board expects a finish of ${ordinal(b.boardTarget)} or better this season. Wage budget ${money(b.wageBudget, cur)} a week, transfer budget ${money(b.transferBudget, cur)}.`, clubIds: [c.id] });
    }
    if (e.type === 'BID_RESOLVED') {
      // Lapsed or rejected bids are reported by the action that resolved them.
    }
  }
  return drafts;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/* ---------- rumours ---------- */

function rumourTargets(ctx: Ctx, buyerId: string): Player[] {
  const { world } = ctx;
  const buyer = world.clubs[buyerId];
  const lines = leagueLines(ctx, buyer.leagueId);
  const needs = clubNeeds(ctx, buyerId, lines).filter((n) => n.priority >= 1.5);
  if (needs.length === 0) return [];
  const out: Player[] = [];
  for (const club of Object.values(world.clubs)) {
    if (club.id === buyerId || club.reputation > buyer.reputation + 8) continue;
    for (const p of squad(world, club.id)) {
      if (p.loan || p.age > 31) continue;
      const need = needs.find((n) => n.pos === p.position);
      if (!need || overall(p) < Math.max(need.minRating, 60)) continue;
      if (p.value > buyer.transferBudget * 1.4) continue;
      out.push(p);
    }
  }
  return out;
}

export function spreadRumours(ctx: Ctx): Draft[] {
  const { world, rng } = ctx;
  const sd = seasonDay(world);
  const windowSoon = inTransferWindow(world) || (sd >= WINTER_WINDOW[0] - 28 && sd < WINTER_WINDOW[0]) || sd >= world.seasonLength - 42;
  if (!windowSoon) return [];
  const drafts: Draft[] = [];
  const bigClubs = Object.values(world.clubs).filter((c) => c.reputation >= 72).map((c) => c.id);
  const buyers = rng.shuffle(bigClubs).slice(0, 3);
  if (world.humanClubId && rng.chance(0.5)) buyers.push(world.humanClubId);
  for (const buyerId of buyers) {
    const targets = rumourTargets(ctx, buyerId);
    if (targets.length === 0) continue;
    const p = rng.pick(targets.sort((a, b) => b.value - a.value || a.id.localeCompare(b.id)).slice(0, 12));
    const buyer = world.clubs[buyerId];
    const owner = world.clubs[p.clubId!];
    const cur = currencyFor(world, buyerId);
    const price = money(Math.round(p.value * rng.float(1.0, 1.6)), cur);
    const headline = rng.pick([
      `${buyer.name} weigh up ${price} move for ${p.name}`,
      `${p.name} on ${buyer.name}'s summer shortlist`,
      `${buyer.name} scouts watch ${owner.name}'s ${p.name}`,
      `Sources: ${buyer.name} preparing ${price} bid for ${p.name}`,
      `${owner.name} brace for ${buyer.name} interest in ${p.name}`,
    ]);
    const body = `${buyer.name} are understood to be interested in ${owner.name} ${posName(p)} ${p.name}, ${p.age}, who has ${contractOf(world, p.id) ? `a contract to the end of season ${contractOf(world, p.id)!.endSeason}` : 'no contract'}. ${owner.name} value the player at around ${money(p.value, currencyFor(world, owner.id))}.`;
    drafts.push({ category: 'rumour', headline, body, clubIds: [buyerId, owner.id], playerId: p.id });
  }
  return drafts;
}

function windowNews(ctx: Ctx): Draft[] {
  const { world } = ctx;
  const sd = seasonDay(world);
  const drafts: Draft[] = [];
  const closing = sd === SUMMER_WINDOW[1] || sd === WINTER_WINDOW[1];
  const opening = sd === SUMMER_WINDOW[0] + 1 || sd === WINTER_WINDOW[0];
  if (opening) drafts.push({ category: 'transfer', headline: `${sd < 100 ? 'Summer' : 'Winter'} transfer window opens`, body: `Clubs have ${SUMMER_WINDOW[1] - SUMMER_WINDOW[0]} days to do business before the window shuts.` });
  if (closing) {
    const start = world.seasonStartDay + (sd === SUMMER_WINDOW[1] ? SUMMER_WINDOW[0] : WINTER_WINDOW[0]);
    const deals = world.transfers.filter((t) => t.day >= start && t.day <= world.day && (t.kind === 'transfer' || t.kind === 'free'));
    const spend = deals.reduce((s, t) => s + t.fee, 0);
    const top = [...deals].sort((a, b) => b.fee - a.fee).slice(0, 5).map((t) => `${world.players[t.playerId].name} to ${world.clubs[t.toClubId].name} (${money(t.fee, currencyFor(world, t.toClubId))})`);
    drafts.push({ category: 'transfer', headline: `Deadline day: window shuts after ${deals.length} deals worth ${money(spend, '£')}`, body: `Biggest moves of the window:\n${top.join('\n')}` });
  }
  return drafts;
}

/* ---------- awards ---------- */

export function giveAwards(ctx: Ctx, summary: SeasonSummary): void {
  const { world } = ctx;
  const awards: Award[] = [];
  const leagues = Object.values(world.competitions).filter((c): c is CompetitionLeague => c.kind === 'league' && c.season === world.season && c.tier === 1);
  const bestBy = (players: Player[], minApps: number, key: (p: Player) => number) =>
    players.filter((p) => p.stats.apps >= minApps).sort((a, b) => key(b) - key(a) || a.id.localeCompare(b.id))[0] ?? null;
  for (const league of leagues) {
    const players = league.clubIds.flatMap((id) => squad(world, id));
    const games = (league.clubIds.length - 1) * 2;
    const minApps = Math.round(games * 0.5);
    const nation = world.nations[league.nationId];
    const player = bestBy(players, minApps, averageRating);
    if (player) awards.push({ title: `${nation.name} Player of the Season`, nationId: league.nationId, playerId: player.id, clubId: player.clubId, managerId: null, detail: `${averageRating(player).toFixed(2)} average rating, ${player.stats.goals} goals` });
    const young = bestBy(players.filter((p) => p.age <= 21), Math.round(games * 0.35), averageRating);
    if (young) awards.push({ title: `${nation.name} Young Player of the Season`, nationId: league.nationId, playerId: young.id, clubId: young.clubId, managerId: null, detail: `${averageRating(young).toFixed(2)} average rating at ${young.age}` });
    const scorer = bestBy(players, 1, (p) => p.stats.goals);
    if (scorer) awards.push({ title: `${nation.name} Golden Boot`, nationId: league.nationId, playerId: scorer.id, clubId: scorer.clubId, managerId: null, detail: `${scorer.stats.goals} goals` });
    const table = computeTable(world, league);
    const managers = league.clubIds.map((id) => world.clubs[id]).filter((c) => c.managerId).map((c) => ({ c, over: c.boardTarget - positionOf(table, c.id), pos: positionOf(table, c.id) }))
      .sort((a, b) => b.over - a.over || a.pos - b.pos || a.c.id.localeCompare(b.c.id));
    if (managers.length) awards.push({ title: `${nation.name} Manager of the Season`, nationId: league.nationId, playerId: null, clubId: managers[0].c.id, managerId: managers[0].c.managerId, detail: `finished ${ordinal(managers[0].pos)} against a target of ${ordinal(managers[0].c.boardTarget)}` });
  }
  const everyone = Object.values(world.players).filter((p) => !p.retired && p.clubId && tierOfClub(world, p.clubId) === 1);
  const world1 = bestBy(everyone, 25, averageRating);
  if (world1) awards.push({ title: 'World Player of the Year', nationId: null, playerId: world1.id, clubId: world1.clubId, managerId: null, detail: `${averageRating(world1).toFixed(2)} average rating, ${world1.stats.goals} goals, ${world1.stats.assists} assists` });
  if (awards.length === 0) return;
  ctx.emit('AWARDS_GIVEN', { season: summary.season, awards });
  publish(ctx, awards.filter((a) => a.nationId === null || a.title.includes('Player of the Season') || a.title.includes('Golden Boot')).map((a) => ({
    category: 'award' as const,
    headline: `${a.playerId ? world.players[a.playerId].name : world.managers[a.managerId!].name} named ${a.title}`,
    body: `${a.detail}. Club: ${a.clubId ? world.clubs[a.clubId].name : 'none'}.`,
    clubIds: a.clubId ? [a.clubId] : [],
    playerId: a.playerId,
    nationId: a.nationId,
  })));
}

/* ---------- daily entry point ---------- */

export function dailyPress(ctx: Ctx): void {
  const { world } = ctx;
  const events = ctx.today;
  const drafts: Draft[] = [
    ...transferNews(ctx, events),
    ...managerNews(ctx, events),
    ...injuryNews(ctx, events),
    ...matchNews(ctx, events),
    ...seasonNews(ctx, events),
    ...windowNews(ctx),
  ];
  const dow = seasonDay(world) % 7;
  if (dow === 0 || dow === 3) drafts.push(...spreadRumours(ctx));
  publish(ctx, drafts);
}

export function leagueOfHuman(world: World): CompetitionLeague | null {
  return world.humanClubId ? leagueOf(world, world.humanClubId) : null;
}
export { tierFromLeagueId };
