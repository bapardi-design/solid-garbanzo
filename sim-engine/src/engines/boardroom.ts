/**
 * The boardroom: the money the manager signs off on and the calls that have
 * nothing to do with picking a team. Sponsorships, ticket prices, stand and
 * academy work, medical and scouting budgets, agent fees, bonus pots and the
 * overdraft. Only the human manager keeps a boardroom; the AI does not need one.
 */
import type { Ctx } from '../core/context.js';
import type { FinanceEntry } from '../core/events.js';
import type { Boardroom, Decision, DecisionOption, Facilities, Project, World } from '../core/schema.js';
import { isRealWorld, nextId, seasonDay } from '../core/schema.js';
import { clamp } from '../core/rng.js';
import { weeklyCommercial } from './finance.js';
import { currencyFor, money } from './press.js';

/** How long a decision sits on the desk before it lapses. */
const DECISION_DAYS = 14;
export const MAX_LEVEL = 5;

const BASE: Facilities = { stadium: 2, academy: 2, medical: 2, scouting: 2 };

/** Formats k in the club's own currency, the way the rest of the app does. */
function m(world: World, clubId: string, k: number): string {
  return money(k, currencyFor(world, clubId));
}

/** Scales money to the club: a Premier Division side deals in bigger numbers. */
function scale(world: World, clubId: string): number {
  const rep = world.clubs[clubId].reputation;
  return isRealWorld(world) ? Math.max(0.15, Math.pow(rep / 100, 3) * 12) : Math.max(0.1, rep / 60);
}

export function openBoardroom(ctx: Ctx, clubId: string): void {
  const { world } = ctx;
  const rep = world.clubs[clubId].reputation;
  const level = (n: number) => Math.max(1, Math.min(MAX_LEVEL, Math.round(n)));
  const boardroom: Boardroom = {
    clubId,
    facilities: {
      stadium: level(BASE.stadium + (rep - 55) / 18),
      academy: level(BASE.academy + (rep - 55) / 22),
      medical: level(BASE.medical + (rep - 55) / 22),
      scouting: level(BASE.scouting + (rep - 55) / 22),
    },
    sponsor: null,
    ticketLevel: 1,
    debt: 0,
    repayment: 0,
    projects: [],
    decisions: [],
  };
  ctx.emit('BOARDROOM_OPENED', { boardroom });
}

/* ---------- the desk ---------- */

const SPONSOR_NAMES = ['Halewood Group', 'Northcliff Energy', 'Meridian Air', 'Castellan Bank', 'Vantage Logistics', 'Oakhill Motors', 'Brightline Telecom', 'Sundara Holdings'];

type Gen = (ctx: Ctx, b: Boardroom, bank: number) => Decision | null;

function decision(ctx: Ctx, d: Omit<Decision, 'id' | 'day' | 'expiresDay' | 'chosen' | 'chosenDay'>): Decision {
  return {
    id: nextId(ctx.world, 'dec'),
    day: ctx.world.day,
    expiresDay: ctx.world.day + DECISION_DAYS,
    chosen: null,
    chosenDay: null,
    ...d,
  };
}

const sponsorDeal: Gen = (ctx, b, bank) => {
  if (b.sponsor && b.sponsor.untilSeason > ctx.world.season) return null;
  const name = ctx.rng.pick(SPONSOR_NAMES);
  const going = weeklyCommercial(ctx.world, ctx.world.clubs[b.clubId].reputation);
  const short = Math.round(going * 0.22);
  const long = Math.round(going * 0.16);
  void bank;
  return decision(ctx, {
    kind: 'sponsor',
    title: `${name} want the shirt`,
    body: `${name} have put two shapes of deal on the table for the front of the shirt. The short one pays better now; the long one is money you can plan around.`,
    approval: true,
    options: [
      { id: 'short', label: 'Two years, higher rate', detail: `${m(ctx.world, b.clubId, short)} a week until season ${ctx.world.season + 2}.`, weekly: short },
      { id: 'long', label: 'Five years, steady', detail: `${m(ctx.world, b.clubId, long)} a week until season ${ctx.world.season + 5}. Quieter, but it is there.`, weekly: long },
      { id: 'none', label: 'Hold out', detail: 'Turn both down and wait for a better offer next year.' },
    ],
  });
};

const standWork: Gen = (ctx, b, bank) => {
  if (b.facilities.stadium >= MAX_LEVEL) return null;
  if (b.projects.some((p) => p.upgrade === 'stadium')) return null;
  // A stand in proportion to the ground, priced per seat. The bank is in
  // thousands, so the old multiplier on it turned any healthy balance into a
  // stand nobody could pay for; the board only proposes what the club can fund.
  const capacity = ctx.world.clubs[b.clubId].stadiumCapacity;
  const seats = Math.round(clamp(capacity * ctx.rng.float(0.05, 0.12), 600, 9000) / 100) * 100;
  const cost = Math.round(seats * (isRealWorld(ctx.world) ? 5 : 2));
  if (bank < cost) return null;
  return decision(ctx, {
    kind: 'stadium',
    title: 'Plans for the east stand',
    body: `The club can add about ${seats.toLocaleString('en-GB')} seats. It is your call whether the money goes into concrete or into the squad.`,
    approval: true,
    options: [
      { id: 'build', label: 'Approve the work', detail: `${m(ctx.world, b.clubId, cost)} now, ${seats.toLocaleString('en-GB')} extra seats in 12 weeks, and a bigger gate every home game after.`, cost, seats, weeks: 12, upgrade: 'stadium' },
      { id: 'later', label: 'Not this year', detail: 'Keep the money where it is.' },
    ],
  });
};

const academyWork: Gen = (ctx, b) => {
  if (b.facilities.academy >= MAX_LEVEL) return null;
  if (b.projects.some((p) => p.upgrade === 'academy')) return null;
  const cost = Math.round(900 * scale(ctx.world, b.clubId) + 200);
  const weekly = Math.round(cost / 60);
  return decision(ctx, {
    kind: 'academy',
    title: 'The academy wants a floodlit pitch',
    body: 'The youth coaches say the best local fifteen-year-olds are going elsewhere because the facilities are behind. Better ones would mean better players coming through.',
    approval: true,
    options: [
      { id: 'build', label: 'Fund it', detail: `${m(ctx.world, b.clubId, cost)} now and ${m(ctx.world, b.clubId, weekly)} a week to run. Stronger youth intakes from next summer.`, cost, weekly: -weekly, weeks: 8, upgrade: 'academy' },
      { id: 'no', label: 'Make do', detail: 'The coaches will not be happy, but the money stays in the bank.' },
    ],
  });
};

const medicalWork: Gen = (ctx, b) => {
  if (b.facilities.medical >= MAX_LEVEL) return null;
  if (b.projects.some((p) => p.upgrade === 'medical')) return null;
  const cost = Math.round(700 * scale(ctx.world, b.clubId) + 150);
  const weekly = Math.round(cost / 45);
  return decision(ctx, {
    kind: 'medical',
    title: 'The physio room is not good enough',
    body: 'Your head of medicine wants a second physio and the equipment to go with it. Players would be fit sooner and go down less often.',
    approval: true,
    options: [
      { id: 'yes', label: 'Sign it off', detail: `${m(ctx.world, b.clubId, cost)} now and ${m(ctx.world, b.clubId, weekly)} a week. Fewer injuries and shorter ones.`, cost, weekly: -weekly, weeks: 4, upgrade: 'medical' },
      { id: 'no', label: 'Turn it down', detail: 'Carry on as you are.' },
    ],
  });
};

const scoutingWork: Gen = (ctx, b) => {
  if (b.facilities.scouting >= MAX_LEVEL) return null;
  if (b.projects.some((p) => p.upgrade === 'scouting')) return null;
  const weekly = Math.round(60 * scale(ctx.world, b.clubId) + 12);
  return decision(ctx, {
    kind: 'scouting',
    title: 'Scouts abroad, or nothing',
    body: 'Your chief scout wants two more pairs of eyes on the road. Reports would come back tighter, and you would stop guessing at what you are buying.',
    approval: true,
    options: [
      { id: 'yes', label: 'Put them on the road', detail: `${m(ctx.world, b.clubId, weekly)} a week. Scout reports narrow considerably.`, weekly: -weekly, weeks: 2, upgrade: 'scouting' },
      { id: 'no', label: 'Keep it local', detail: 'Save the money and trust what you can see.' },
    ],
  });
};

const ticketReview: Gen = (ctx, b) => {
  const now = b.ticketLevel;
  const opts: DecisionOption[] = [];
  if (now < 1.25) opts.push({ id: 'up', label: 'Put prices up 10%', detail: 'More per head, but some of the crowd will vote with their feet.', ticketDelta: 0.1, boardMood: 0.3 });
  opts.push({ id: 'hold', label: 'Freeze them', detail: 'No change. The supporters notice that too.' });
  if (now > 0.8) opts.push({ id: 'down', label: 'Cut them 10%', detail: 'Less per head, a fuller ground, and goodwill you can spend later.', ticketDelta: -0.1, boardMood: -0.2 });
  return decision(ctx, {
    kind: 'tickets',
    title: 'Season ticket prices',
    body: `The commercial department needs a number for next year's books. Prices are currently ${Math.round(now * 100)}% of the going rate for this division.`,
    approval: false,
    options: opts,
  });
};

const bonusPot: Gen = (ctx, b, bank) => {
  const cost = Math.round(400 * scale(ctx.world, b.clubId) + 60);
  if (bank < cost * 2) return null;
  return decision(ctx, {
    kind: 'bonus',
    title: 'The squad want a bonus in writing',
    body: 'The senior players have asked for a win bonus to be agreed now rather than argued about in April. Your captain is waiting on an answer.',
    approval: true,
    options: [
      { id: 'yes', label: 'Agree the pot', detail: `${m(ctx.world, b.clubId, cost)} set aside. The dressing room lifts.`, cost, boardMood: -0.2 },
      { id: 'half', label: 'Offer half', detail: `${m(ctx.world, b.clubId, Math.round(cost / 2))}, and tell them the rest depends on results.`, cost: Math.round(cost / 2) },
      { id: 'no', label: 'Refuse', detail: 'They play for the shirt. Some of them will remember this.' },
    ],
  });
};

const agentFee: Gen = (ctx, b, bank) => {
  const recent = ctx.world.transfers.filter((t) => t.toClubId === b.clubId && t.kind === 'transfer' && ctx.world.day - t.day < 21 && t.fee > 0);
  if (recent.length === 0) return null;
  const t = ctx.rng.pick(recent);
  const player = ctx.world.players[t.playerId];
  if (!player) return null;
  const fee = Math.max(40, Math.round(t.fee * 0.08));
  if (fee > bank) return null;
  return decision(ctx, {
    kind: 'agent_fee',
    title: `${player.name}'s agent wants paying`,
    body: `The deal is done and the agent has invoiced ${m(ctx.world, b.clubId, fee)} on top of the fee. Refuse it and you will find him harder to deal with next time.`,
    approval: true,
    options: [
      { id: 'pay', label: 'Pay it', detail: `${m(ctx.world, b.clubId, fee)} out of the bank today.`, cost: fee },
      { id: 'haggle', label: 'Haggle him down', detail: `Settle at ${m(ctx.world, b.clubId, Math.round(fee * 0.6))} and take the frostiness.`, cost: Math.round(fee * 0.6) },
      { id: 'refuse', label: 'Refuse outright', detail: 'Not a penny. Word gets round.' },
    ],
  });
};

const overdraft: Gen = (ctx, b, bank) => {
  if (bank > 0 || b.debt > 0) return null;
  const borrow = Math.round(Math.abs(bank) * 1.6 + 500);
  const weekly = Math.round(borrow / 80);
  return decision(ctx, {
    kind: 'debt',
    title: 'The bank has been in touch',
    body: `The account is ${m(ctx.world, b.clubId, Math.round(-bank))} overdrawn. The bank will extend a facility, at a price, or you can sell your way out of it.`,
    approval: true,
    options: [
      { id: 'borrow', label: `Borrow ${m(ctx.world, b.clubId, borrow)}`, detail: `Repaid at ${m(ctx.world, b.clubId, weekly)} a week until it is cleared. The board will not forget it.`, borrow, weekly: -weekly, boardMood: 0.5 },
      { id: 'no', label: 'Trade out of it', detail: 'No loan. You will have to sell somebody.' },
    ],
  });
};

const community: Gen = (ctx, b) => {
  const cost = Math.round(120 * scale(ctx.world, b.clubId) + 25);
  return decision(ctx, {
    kind: 'community',
    title: 'The supporters trust has a proposal',
    body: 'The trust wants the club to fund a minibus and a coaching scheme in the city. It buys nothing on the pitch. It buys a lot in the stands.',
    approval: true,
    options: [
      { id: 'yes', label: 'Back it', detail: `${m(ctx.world, b.clubId, cost)}. The board reads the local paper too.`, cost, boardMood: -0.25 },
      { id: 'no', label: 'Decline politely', detail: 'Not while the budget is what it is.' },
    ],
  });
};

const GENERATORS: Gen[] = [sponsorDeal, standWork, academyWork, medicalWork, scoutingWork, ticketReview, bonusPot, agentFee, overdraft, community];

/** One decision at most per week, and never two of a kind on the desk. */
function raise(ctx: Ctx, b: Boardroom): void {
  const bank = ctx.world.clubs[b.clubId].balance;
  const open = new Set(b.decisions.filter((d) => d.chosen === null).map((d) => d.kind));
  const pool = ctx.rng.shuffle([...GENERATORS]);
  for (const gen of pool) {
    const d = gen(ctx, b, bank);
    if (!d || open.has(d.kind)) continue;
    if (d.options.length < 2) continue;
    ctx.emit('DECISION_RAISED', { decision: d });
    return;
  }
}

/** Weekly boardroom tick: money in and out, projects finishing, a new call. */
export function boardroomWeek(ctx: Ctx): void {
  const { world } = ctx;
  const b = world.boardroom;
  if (!b || world.humanClubId !== b.clubId) return;

  const entries: FinanceEntry[] = [];
  if (b.sponsor && b.sponsor.untilSeason >= world.season) entries.push({ clubId: b.clubId, category: 'sponsorship', amount: b.sponsor.weekly });
  for (const d of b.decisions) {
    if (d.chosen === null || d.chosen === 'lapsed') continue;
    const opt = d.options.find((o) => o.id === d.chosen);
    if (opt?.weekly && opt.weekly < 0) entries.push({ clubId: b.clubId, category: d.kind === 'debt' ? 'loan repayment' : 'facilities', amount: opt.weekly });
  }
  if (entries.length) ctx.emit('FINANCE_POSTED', { entries });

  if (b.debt > 0 && b.repayment > 0) {
    const paid = Math.min(b.debt, b.repayment);
    ctx.emit('BOARDROOM_UPDATED', { patch: { debt: Math.round((b.debt - paid) * 10) / 10 } });
  }

  // Projects finish on their day.
  for (const p of [...b.projects]) {
    if (world.day < p.endDay) continue;
    if (p.seats > 0) ctx.emit('STADIUM_EXPANDED', { clubId: b.clubId, seats: p.seats });
    if (p.upgrade) {
      const next = { ...world.boardroom!.facilities };
      next[p.upgrade] = Math.min(MAX_LEVEL, next[p.upgrade] + 1);
      ctx.emit('BOARDROOM_UPDATED', { patch: { facilities: next } });
    }
    ctx.emit('PROJECT_COMPLETED', { projectId: p.id });
    ctx.emit('NEWS_PUBLISHED', {
      items: [{
        id: nextId(world, 'news'), day: world.day, season: world.season, category: 'board',
        headline: `${world.clubs[b.clubId].name}: ${p.label} complete`,
        body: p.seats > 0 ? `The work is finished and the ground now holds ${world.clubs[b.clubId].stadiumCapacity.toLocaleString('en-GB')}.` : 'The work is finished and in use from today.',
        clubIds: [b.clubId], playerId: null, nationId: world.clubs[b.clubId].nationId,
      }],
    });
  }

  // Lapse anything left too long, then put one new thing on the desk.
  for (const d of b.decisions) {
    if (d.chosen === null && world.day >= d.expiresDay) ctx.emit('DECISION_RESOLVED', { decisionId: d.id, optionId: 'lapsed', day: world.day });
  }
  const pending = b.decisions.filter((d) => d.chosen === null).length;
  if (pending < 2 && ctx.rng.chance(seasonDay(world) < 28 ? 0.85 : 0.45)) raise(ctx, b);
}

export interface DecideResult { ok: boolean; message: string }

/** Answers one decision and applies what it costs and what it changes. */
export function decide(ctx: Ctx, decisionId: string, optionId: string): DecideResult {
  const { world } = ctx;
  const b = world.boardroom;
  if (!b) return { ok: false, message: 'You have no club to run.' };
  const d = b.decisions.find((x) => x.id === decisionId);
  if (!d) return { ok: false, message: 'That item is not on the desk.' };
  if (d.chosen !== null) return { ok: false, message: 'That one is already answered.' };
  const opt = d.options.find((o) => o.id === optionId);
  if (!opt) return { ok: false, message: 'That is not one of the options.' };

  const club = world.clubs[b.clubId];
  if (opt.cost && opt.cost > club.balance) return { ok: false, message: `You cannot cover ${opt.cost}k. The bank holds ${Math.round(club.balance)}k.` };

  if (opt.cost) ctx.emit('FINANCE_POSTED', { entries: [{ clubId: b.clubId, category: d.kind === 'agent_fee' ? 'agent fees' : d.kind, amount: -opt.cost }] });
  if (opt.borrow) {
    ctx.emit('FINANCE_POSTED', { entries: [{ clubId: b.clubId, category: 'loan', amount: opt.borrow }] });
    ctx.emit('BOARDROOM_UPDATED', { patch: { debt: b.debt + opt.borrow, repayment: b.repayment + Math.abs(opt.weekly ?? 0) } });
  }
  if (d.kind === 'sponsor' && opt.weekly) {
    const years = opt.id === 'long' ? 5 : 2;
    ctx.emit('BOARDROOM_UPDATED', { patch: { sponsor: { name: d.title.split(' want')[0], weekly: opt.weekly, untilSeason: world.season + years } } });
  }
  if (opt.ticketDelta) {
    ctx.emit('BOARDROOM_UPDATED', { patch: { ticketLevel: Math.round((b.ticketLevel + opt.ticketDelta) * 100) / 100 } });
  }
  if (opt.weeks && (opt.upgrade || opt.seats)) {
    const project: Project = {
      id: nextId(world, 'proj'),
      label: d.title,
      endDay: world.day + opt.weeks * 7,
      seats: opt.seats ?? 0,
      upgrade: opt.upgrade ?? null,
    };
    ctx.emit('BOARDROOM_UPDATED', { patch: { projects: [...b.projects, project] } });
  }
  ctx.emit('DECISION_RESOLVED', { decisionId: d.id, optionId, day: world.day });
  return { ok: true, message: `${d.title}: ${opt.label}.` };
}

/* ---------- what the rest of the engine reads ---------- */

const lvl = (world: World, clubId: string, key: keyof Facilities): number =>
  world.boardroom && world.boardroom.clubId === clubId ? world.boardroom.facilities[key] : BASE[key];

/** Injury odds multiplier: a good medical room keeps players on the pitch. */
export const medicalFactor = (world: World, clubId: string): number => 1 - (lvl(world, clubId, 'medical') - 2) * 0.12;
/** Recovery multiplier on injury length. */
export const recoveryFactor = (world: World, clubId: string): number => 1 - (lvl(world, clubId, 'medical') - 2) * 0.10;
/** Youth intake quality bonus, in overall points. */
export const academyBonus = (world: World, clubId: string): number => (lvl(world, clubId, 'academy') - 2) * 2.5;
/** Scout report spread: better scouting narrows the range. */
export const scoutSpread = (world: World, clubId: string): number => Math.max(1, 4 - (lvl(world, clubId, 'scouting') - 2));
/** Gate price multiplier set by the manager. */
export const ticketFactor = (world: World, clubId: string): number =>
  world.boardroom && world.boardroom.clubId === clubId ? world.boardroom.ticketLevel : 1;
/** Dearer tickets thin the crowd; cheaper ones fill it. */
export const attendanceFactor = (world: World, clubId: string): number => {
  const t = ticketFactor(world, clubId);
  return 1 - (t - 1) * 0.55;
};
