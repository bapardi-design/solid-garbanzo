/**
 * Actions available to a human manager. Each validates, then emits events
 * through the same reducer the AI uses, so careers stay replayable.
 */
import type { Ctx } from './core/context.js';
import { clamp, hashString } from './core/rng.js';
import type { Club, Manager, NewsCategory, NewsItem, Player, Position, Tactic, TransferRecord, World } from './core/schema.js';
import { contractOf, isRealWorld, nextId, squad, tierOfClub } from './core/schema.js';
import { overall, playerValue, wageDemand, weeklyWageBill } from './rating.js';
import { MAX_SQUAD, MIN_PER_POSITION, buildMarket, inTransferWindow, type Listing } from './engines/transfers.js';
import { computeTable, positionOf } from './matchday/table.js';
import { contractLengthFor, makeContract } from './world/generate.js';
import { leagueOf } from './core/schema.js';

export interface ActionResult { ok: boolean; message: string }

const fail = (message: string): ActionResult => ({ ok: false, message });
const done = (message: string): ActionResult => ({ ok: true, message });

function humanClub(ctx: Ctx): Club | null {
  const id = ctx.world.humanClubId;
  return id ? ctx.world.clubs[id] : null;
}

export function takeOverClub(ctx: Ctx, clubId: string, managerName: string): Manager {
  const { world, rng } = ctx;
  const club = world.clubs[clubId];
  if (!club) throw new Error(`unknown club ${clubId}`);
  const manager: Manager = {
    id: nextId(world, 'm', 4),
    name: managerName.trim() || 'The Gaffer',
    clubId: null,
    ability: 55,
    reputation: clamp(Math.round(club.reputation * 0.8 + rng.int(-5, 5)), 1, 100),
    contractEndSeason: world.season + 2,
    unemployedSince: null,
  };
  ctx.emit('CLUB_TAKEN_OVER', { clubId, manager });
  return manager;
}

export function setTactic(ctx: Ctx, tactic: Tactic): ActionResult {
  const club = humanClub(ctx);
  if (!club) return fail('You are not managing a club.');
  if (club.tactic === tactic) return done(`Already playing ${tactic}.`);
  ctx.emit('TACTIC_CHANGED', { clubId: club.id, tactic });
  return done(`Tactic set to ${tactic}.`);
}

export interface MarketEntry {
  player: Player;
  fromClubId: string | null;
  fromClubName: string;
  askingPrice: number;
  wage: number;
  affordable: boolean;
  reason: string | null;
}

/** What the human club could buy right now, with the price the seller wants. */
export function marketForHuman(ctx: Ctx): MarketEntry[] {
  const { world } = ctx;
  const club = humanClub(ctx);
  if (!club) return [];
  const room = club.wageBudget - weeklyWageBill(world, club.id);
  const size = squad(world, club.id).length;
  return buildMarket(ctx)
    .filter((l) => l.fromClubId !== club.id)
    .map((l) => {
      const wage = askingWage(ctx, l);
      let reason: string | null = null;
      if (!inTransferWindow(world)) reason = 'Transfer window closed';
      else if (size >= MAX_SQUAD) reason = 'Squad is full';
      else if (l.askingPrice > club.transferBudget) reason = 'Over transfer budget';
      else if (wage > room) reason = 'Over wage budget';
      return { player: l.player, fromClubId: l.fromClubId, fromClubName: l.fromClubId ? world.clubs[l.fromClubId].name : 'Free agent', askingPrice: l.askingPrice, wage, affordable: reason === null, reason };
    })
    .sort((a, b) => overall(b.player) - overall(a.player) || a.player.id.localeCompare(b.player.id));
}

function askingWage(ctx: Ctx, l: Listing): number {
  const current = l.fromClubId ? contractOf(ctx.world, l.player.id)?.wage ?? 0 : 0;
  return Math.round(Math.max(current, wageDemand(l.player, isRealWorld(ctx.world))) * (l.fromClubId ? 1.1 : 1) * 10) / 10;
}

function record(ctx: Ctx, player: Player, fromClubId: string | null, toClubId: string, fee: number, kind: TransferRecord['kind']): TransferRecord {
  return { id: nextId(ctx.world, 't'), season: ctx.world.season, day: ctx.world.day, playerId: player.id, fromClubId, toClubId, fee, kind };
}

/** Bid for a player at the seller's asking price (or higher). Player may still refuse. */
export function bidForPlayer(ctx: Ctx, playerId: string, years = 3, offer?: number): ActionResult {
  const { world, rng } = ctx;
  const club = humanClub(ctx);
  if (!club) return fail('You are not managing a club.');
  const entry = marketForHuman(ctx).find((m) => m.player.id === playerId);
  if (!entry) return fail('That player is not available.');
  if (entry.reason) return fail(entry.reason);
  const fee = Math.max(entry.askingPrice, offer ?? 0);
  if (fee > club.transferBudget) return fail('Over transfer budget');
  const fromRep = entry.fromClubId ? world.clubs[entry.fromClubId].reputation : club.reputation - 10;
  const willing = 0.7 + (club.reputation - fromRep) / 150 + (fee - entry.askingPrice) / Math.max(1, entry.askingPrice) * 0.5;
  if (!rng.chance(clamp(willing, 0.15, 0.97))) return fail(`${entry.player.name} turned you down. Try a bigger club or a higher offer.`);
  const length = clamp(Math.round(years), 1, 5);
  const contract = makeContract(ctx, playerId, club.id, entry.wage, length);
  ctx.emit('PLAYER_TRANSFERRED', { record: record(ctx, entry.player, entry.fromClubId, club.id, fee, entry.fromClubId ? 'transfer' : 'free'), contract });
  return done(`${entry.player.name} signs for ${length} season${length === 1 ? '' : 's'} at ${entry.wage}k a week${fee ? ` (fee ${fee}k)` : ''}.`);
}

export function listPlayer(ctx: Ctx, playerId: string, askingPrice?: number): ActionResult {
  const club = humanClub(ctx);
  const p = ctx.world.players[playerId];
  if (!club || !p || p.clubId !== club.id) return fail('Not your player.');
  if (p.loan) return fail('Loan players cannot be sold.');
  const price = Math.max(0, Math.round(askingPrice ?? p.value));
  ctx.emit('PLAYER_LISTED', { playerId, askingPrice: price });
  return done(`${p.name} listed at ${price}k.`);
}

export function unlistPlayer(ctx: Ctx, playerId: string): ActionResult {
  const club = humanClub(ctx);
  const p = ctx.world.players[playerId];
  if (!club || !p || p.clubId !== club.id) return fail('Not your player.');
  ctx.emit('PLAYER_UNLISTED', { playerId });
  return done(`${p.name} taken off the market.`);
}

/** Terminate a contract; the club pays half the remaining wages. */
export function releasePlayer(ctx: Ctx, playerId: string): ActionResult {
  const { world } = ctx;
  const club = humanClub(ctx);
  const p = world.players[playerId];
  if (!club || !p || p.clubId !== club.id) return fail('Not your player.');
  if (p.loan) return fail('Loan players cannot be released.');
  const same = squad(world, club.id).filter((x) => x.position === p.position && x.id !== p.id).length;
  if (same < MIN_PER_POSITION[p.position]) return fail(`You need at least ${MIN_PER_POSITION[p.position]} ${p.position}s.`);
  const c = contractOf(world, playerId);
  const seasonsLeft = c ? c.endSeason - world.season + 1 : 0;
  const payoff = c ? Math.round(c.wage * 52 * seasonsLeft * 0.5) : 0;
  ctx.emit('PLAYER_RELEASED', { playerId, clubId: club.id, payoff });
  return done(`${p.name} released${payoff ? ` with a ${payoff}k payoff` : ''}.`);
}

export interface RenewalTerms { wage: number; maxYears: number; willing: boolean; note: string }

export function renewalTerms(ctx: Ctx, playerId: string): RenewalTerms | null {
  const { world } = ctx;
  const club = humanClub(ctx);
  const p = world.players[playerId];
  if (!club || !p || p.clubId !== club.id) return null;
  const c = contractOf(world, playerId);
  const demand = Math.round(Math.max(c?.wage ?? 0, wageDemand(p, isRealWorld(world))) * (1 + (50 - p.morale) / 250) * 10) / 10;
  const maxYears = p.age >= 33 ? 1 : p.age >= 30 ? 2 : 4;
  const willing = p.morale >= 30;
  return { wage: demand, maxYears, willing, note: willing ? `Wants ${demand}k a week, up to ${maxYears} season${maxYears === 1 ? '' : 's'}.` : `${p.name} is unhappy and will not talk terms yet.` };
}

export function renewContract(ctx: Ctx, playerId: string, years: number, wage: number): ActionResult {
  const { world, rng } = ctx;
  const club = humanClub(ctx);
  const p = world.players[playerId];
  const terms = renewalTerms(ctx, playerId);
  if (!club || !p || !terms) return fail('Not your player.');
  if (!terms.willing) return fail(terms.note);
  const length = clamp(Math.round(years), 1, terms.maxYears);
  if (wage < terms.wage * 0.9) return fail(`${p.name} wants at least ${terms.wage}k a week.`);
  const room = club.wageBudget - weeklyWageBill(world, club.id) + (contractOf(world, playerId)?.wage ?? 0);
  if (wage > room) return fail('Over wage budget');
  if (wage < terms.wage && !rng.chance(0.5)) return fail(`${p.name} rejected ${wage}k; come back with more.`);
  const contract = makeContract(ctx, playerId, club.id, wage, length);
  ctx.emit('CONTRACT_SIGNED', { contract, record: record(ctx, p, club.id, club.id, 0, 'renewal') });
  return done(`${p.name} signs until the end of season ${contract.endSeason}.`);
}

export interface BoardStatus {
  clubId: string;
  position: number;
  target: number;
  formPoints: number;
  mood: 'delighted' | 'content' | 'concerned' | 'furious';
  note: string;
  balance: number;
  wageBill: number;
  wageBudget: number;
  transferBudget: number;
  windowOpen: boolean;
}

export function boardStatus(ctx: Ctx): BoardStatus | null {
  const { world } = ctx;
  const club = humanClub(ctx);
  if (!club) return null;
  const league = leagueOf(world, club.id);
  const table = league ? computeTable(world, league) : [];
  const position = league ? positionOf(table, club.id) : club.boardTarget;
  const formPoints = club.form.reduce((a, b) => a + b, 0);
  // Early-season positions mean little; the board waits for a body of results.
  const played = table.find((r) => r.clubId === club.id)?.played ?? 0;
  const gap = (position - club.boardTarget) * Math.min(1, played / 8);
  const mood = gap <= -2 ? 'delighted' : gap <= 2 ? 'content' : gap <= 5 ? 'concerned' : 'furious';
  const notes = {
    delighted: 'The board is delighted with progress.',
    content: 'The board is content; keep it up.',
    concerned: 'The board expects better. Results need to improve.',
    furious: 'Your job is on the line. Win now.',
  } as const;
  return {
    clubId: club.id,
    position,
    target: club.boardTarget,
    formPoints,
    mood,
    note: notes[mood],
    balance: club.balance,
    wageBill: weeklyWageBill(world, club.id),
    wageBudget: club.wageBudget,
    transferBudget: club.transferBudget,
    windowOpen: inTransferWindow(world),
  };
}

/** Clubs a new manager may take over, with a difficulty hint. */
export function jobOffers(ctx: Ctx): { club: Club; tier: number; strengthRank: number; difficulty: 'easy' | 'medium' | 'hard' }[] {
  const { world } = ctx;
  const out = Object.values(world.clubs).map((club) => {
    const league = leagueOf(world, club.id);
    const rank = club.boardTarget;
    const n = league ? league.clubIds.length : 12;
    const difficulty = rank <= n / 4 ? 'easy' : rank <= (3 * n) / 4 ? 'medium' : 'hard';
    return { club, tier: tierOfClub(world, club.id), strengthRank: rank, difficulty } as const;
  });
  return out.sort((a, b) => a.tier - b.tier || a.strengthRank - b.strengthRank);
}

export function valueOf(ctx: Ctx, p: Player): number { return playerValue(p, isRealWorld(ctx.world)); }

export interface Vacancy { club: Club; tier: number; reputation: number; interest: 'keen' | 'open' | 'long shot'; note: string }

/** Clubs without a manager that would consider the human, by reputation gap. */
export function vacancies(ctx: Ctx): Vacancy[] {
  const { world } = ctx;
  const humanId = world.careerOver ? null : world.humanClubId;
  const manager = world.humanManagerId ? world.managers[world.humanManagerId] : null;
  const rep = manager?.reputation ?? 40;
  const out: Vacancy[] = [];
  for (const club of Object.values(world.clubs)) {
    if (club.managerId || club.id === humanId) continue;
    const gap = club.reputation - rep;
    if (gap > 20) continue;
    const interest = gap <= 0 ? 'keen' : gap <= 10 ? 'open' : 'long shot';
    out.push({ club, tier: tierOfClub(world, club.id), reputation: club.reputation, interest, note: interest === 'keen' ? 'The board would appoint you today.' : interest === 'open' ? 'You are on the shortlist.' : 'An outside chance; a good run of results would help.' });
  }
  return out.sort((a, b) => b.reputation - a.reputation || a.club.id.localeCompare(b.club.id));
}

/** Leave the current club for a vacancy. Long shots can say no. */
export function acceptJob(ctx: Ctx, clubId: string): ActionResult {
  const { world, rng } = ctx;
  const v = vacancies(ctx).find((x) => x.club.id === clubId);
  if (!v) return fail('That job is not available.');
  const managerId = world.humanManagerId;
  const humanId = world.careerOver ? null : world.humanClubId;
  if (!managerId) return fail('You have no manager profile yet.');
  if (v.interest === 'long shot' && !rng.chance(0.35)) return fail(`${v.club.name} went with another candidate.`);
  if (v.interest === 'open' && !rng.chance(0.75)) return fail(`${v.club.name} interviewed you but chose someone else.`);
  ctx.emit('MANAGER_MOVED', { managerId, fromClubId: humanId, toClubId: clubId, contractEndSeason: world.season + 2 });
  return done(`You are the new manager of ${v.club.name}.`);
}
export { contractLengthFor };

/* ---------- scouting and research ---------- */

export interface PlayerQuery {
  text?: string;
  pos?: Position | 'ALL';
  minOverall?: number;
  maxAge?: number;
  minAge?: number;
  maxValue?: number;
  nationality?: string;
  /** League nation of the player's club. */
  nationId?: string;
  tier?: number;
  freeAgentsOnly?: boolean;
  expiringOnly?: boolean;
  sort?: 'overall' | 'value' | 'potential' | 'age' | 'goals';
  limit?: number;
}

export interface PlayerHit { player: Player; club: Club | null; overall: number; tier: number | null }

export function searchPlayers(world: World, q: PlayerQuery): PlayerHit[] {
  const text = q.text?.trim().toLowerCase() ?? '';
  const hits: PlayerHit[] = [];
  for (const id in world.players) {
    const p = world.players[id];
    if (p.retired) continue;
    if (q.freeAgentsOnly && p.clubId) continue;
    if (q.pos && q.pos !== 'ALL' && p.position !== q.pos) continue;
    if (q.maxAge !== undefined && p.age > q.maxAge) continue;
    if (q.minAge !== undefined && p.age < q.minAge) continue;
    if (q.maxValue !== undefined && p.value > q.maxValue) continue;
    if (q.nationality && p.nationality !== q.nationality) continue;
    const ovr = overall(p);
    if (q.minOverall !== undefined && ovr < q.minOverall) continue;
    const club = p.clubId ? world.clubs[p.clubId] : null;
    if (q.nationId && club?.nationId !== q.nationId) continue;
    const tier = club ? tierOfClub(world, club.id) : null;
    if (q.tier !== undefined && tier !== q.tier) continue;
    if (q.expiringOnly) { const c = contractOf(world, p.id); if (!c || c.endSeason !== world.season) continue; }
    if (text && !p.name.toLowerCase().includes(text) && !(club?.name.toLowerCase().includes(text) ?? false)) continue;
    hits.push({ player: p, club, overall: ovr, tier });
  }
  const sort = q.sort ?? 'overall';
  hits.sort((a, b) => {
    switch (sort) {
      case 'value': return b.player.value - a.player.value;
      case 'potential': return b.player.potential - a.player.potential || b.overall - a.overall;
      case 'age': return a.player.age - b.player.age || b.overall - a.overall;
      case 'goals': return b.player.stats.goals - a.player.stats.goals;
      default: return b.overall - a.overall;
    }
  });
  return hits.slice(0, q.limit ?? 100);
}

export interface ScoutReport { potentialLow: number; potentialHigh: number; verdict: string; strengths: string[]; weaknesses: string[] }

/** A scout's view of a player: a potential range and a plain-language verdict. */
export function scoutReport(world: World, playerId: string): ScoutReport {
  const p = world.players[playerId];
  const noise = (hashString(`${world.config.seed}:${playerId}`) % 5) - 2;
  const centre = p.potential + noise;
  const ovr = overall(p);
  const attrs = Object.entries(p.attrs).filter(([k]) => p.position === 'GK' || k !== 'goalkeeping') as [string, number][];
  const sorted = [...attrs].sort((a, b) => b[1] - a[1]);
  const growth = centre - ovr;
  const verdict = p.age <= 21 && growth >= 10 ? 'Outstanding prospect: could become a star.'
    : p.age <= 23 && growth >= 5 ? 'Good prospect with clear room to improve.'
    : ovr >= 82 ? 'Elite player who would improve almost any side.'
    : ovr >= 72 ? 'Solid first-team player at top-flight level.'
    : ovr >= 60 ? 'Useful squad player; a starter in the lower leagues.'
    : 'Limited ability; lower-league level.';
  return { potentialLow: Math.max(1, Math.round(centre - 3)), potentialHigh: Math.min(99, Math.round(centre + 3)), verdict, strengths: sorted.slice(0, 2).map(([k]) => k), weaknesses: sorted.slice(-2).map(([k]) => k) };
}

export interface Honour { season: number; title: string; kind: 'league' | 'cup' | 'award'; detail: string }

export function clubHonours(world: World, clubId: string): Honour[] {
  const out: Honour[] = [];
  for (const s of world.history) {
    for (const [compId, winner] of Object.entries(s.champions)) {
      if (winner !== clubId) continue;
      const comp = world.competitions[compId];
      const name = comp?.name ?? compId.replace(/_S\d+$/, '');
      out.push({ season: s.season, title: comp?.kind === 'cup' ? `${name} winners` : `${name} champions`, kind: comp?.kind === 'cup' ? 'cup' : 'league', detail: '' });
    }
    if (s.promoted.includes(clubId)) out.push({ season: s.season, title: 'Promoted', kind: 'league', detail: `finished ${s.positions[clubId] ?? '?'}` });
    for (const a of s.awards ?? []) if (a.clubId === clubId) out.push({ season: s.season, title: a.title, kind: 'award', detail: `${a.playerId ? world.players[a.playerId]?.name ?? '' : a.managerId ? world.managers[a.managerId]?.name ?? '' : ''} — ${a.detail}` });
  }
  return out.sort((a, b) => b.season - a.season);
}

export interface NewsQuery { clubId?: string; nationId?: string | null; category?: NewsCategory | 'all'; playerId?: string; limit?: number }

/** Latest news first. */
export function newsFeed(world: World, q: NewsQuery = {}): NewsItem[] {
  const out: NewsItem[] = [];
  for (let i = world.news.length - 1; i >= 0 && out.length < (q.limit ?? 60); i--) {
    const n = world.news[i];
    if (q.clubId && !n.clubIds.includes(q.clubId)) continue;
    if (q.nationId !== undefined && q.nationId !== null && n.nationId !== q.nationId && n.nationId !== null) continue;
    if (q.category && q.category !== 'all' && n.category !== q.category) continue;
    if (q.playerId && n.playerId !== q.playerId) continue;
    out.push(n);
  }
  return out;
}

export { respondToBid } from './engines/bids.js';
