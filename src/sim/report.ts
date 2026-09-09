/**
 * Self-contained HTML report for a multi-season run: calibration charts,
 * finances, market activity, final tables, honours, and explained matches.
 * No external scripts; charts are inline SVG.
 */
import type { CompetitionLeague, Fixture, GoalFactor, World } from '../core/schema.js';
import { computeTable } from '../matchday/table.js';
import { overall } from '../rating.js';
import { tierFromLeagueId } from '../engines/season.js';
import type { RunResult, SeasonResult } from './runner.js';

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const money = (k: number): string => (Math.abs(k) >= 1000 ? `${(k / 1000).toFixed(1)}m` : `${Math.round(k)}k`);
const pct = (x: number): string => `${x.toFixed(1)}%`;
const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)'];

interface Series { name: string; values: number[] }

/** Multi-series line chart on one y scale with an emphasised endpoint and direct labels. */
function lineChart(labels: string[], series: Series[], opts: { unit?: string; yMin?: number; height?: number; format?: (v: number) => string } = {}): string {
  const W = 560, H = opts.height ?? 220, padL = 44, padR = 90, padT = 14, padB = 30;
  const fmt = opts.format ?? ((v: number) => String(Math.round(v)));
  const all = series.flatMap((s) => s.values);
  const lo = opts.yMin ?? Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  // A caller-supplied floor is exact; otherwise pad below the data.
  const yMin = opts.yMin !== undefined ? opts.yMin : lo - span * 0.1;
  const yMax = hi + span * 0.1;
  const x = (i: number) => padL + (labels.length > 1 ? (i / (labels.length - 1)) * (W - padL - padR) : (W - padL - padR) / 2);
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
  const ticks = 4;
  let out = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map((s) => s.name).join(', '))}">`;
  for (let t = 0; t <= ticks; t++) {
    const v = yMin + ((yMax - yMin) * t) / ticks;
    out += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`;
    out += `<text class="tick" x="${padL - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(fmt(v))}</text>`;
  }
  labels.forEach((l, i) => { out += `<text class="tick" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`; });
  series.forEach((s, si) => {
    const color = SERIES[si % SERIES.length];
    const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    out += `<polyline fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" points="${pts}"/>`;
    s.values.forEach((v, i) => {
      out += `<circle class="mark" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === s.values.length - 1 ? 4.5 : 3}" fill="${color}" stroke="var(--surface)" stroke-width="2"><title>${esc(s.name)} · ${esc(labels[i])}: ${esc(fmt(v))}${esc(opts.unit ?? '')}</title></circle>`;
    });
    const last = s.values.length - 1;
    out += `<text class="label" x="${(x(last) + 9).toFixed(1)}" y="${(y(s.values[last]) + 4).toFixed(1)}">${esc(s.name)} ${esc(fmt(s.values[last]))}${esc(opts.unit ?? '')}</text>`;
  });
  return out + '</svg>';
}

/** 100% or absolute stacked bars, one bar per label, with a 2px surface gap between segments. */
function stackedBars(labels: string[], series: Series[], opts: { normalize?: boolean; format?: (v: number) => string } = {}): string {
  const W = 560, H = 220, padL = 44, padR = 16, padT = 14, padB = 30;
  const fmt = opts.format ?? ((v: number) => String(Math.round(v)));
  const totals = labels.map((_, i) => series.reduce((s, x) => s + (x.values[i] ?? 0), 0));
  const maxTotal = opts.normalize ? 100 : Math.max(1, ...totals);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const slot = innerW / Math.max(1, labels.length);
  const barW = Math.min(48, slot * 0.6);
  let out = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map((s) => s.name).join(', '))}">`;
  for (let t = 0; t <= 4; t++) {
    const v = (maxTotal * t) / 4;
    const yy = padT + innerH - (v / maxTotal) * innerH;
    out += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/>`;
    out += `<text class="tick" x="${padL - 6}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${esc(opts.normalize ? `${Math.round(v)}%` : fmt(v))}</text>`;
  }
  labels.forEach((l, i) => {
    const cx = padL + slot * i + slot / 2;
    out += `<text class="tick" x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`;
    let acc = 0;
    series.forEach((s, si) => {
      const raw = s.values[i] ?? 0;
      const v = opts.normalize ? (totals[i] ? (raw / totals[i]) * 100 : 0) : raw;
      if (v <= 0) return;
      const hPx = (v / maxTotal) * innerH;
      const yTop = padT + innerH - ((acc + v) / maxTotal) * innerH;
      out += `<rect class="mark" x="${(cx - barW / 2).toFixed(1)}" y="${(yTop + 1).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, hPx - 2).toFixed(1)}" fill="${SERIES[si % SERIES.length]}"><title>${esc(s.name)} · ${esc(l)}: ${esc(opts.normalize ? pct(v) : fmt(raw))}</title></rect>`;
      acc += v;
    });
  });
  return out + '</svg>';
}

function legend(names: string[]): string {
  return `<ul class="legend">${names.map((n, i) => `<li><i style="background:${SERIES[i % SERIES.length]}"></i>${esc(n)}</li>`).join('')}</ul>`;
}

/** Horizontal bars for a ranked list (single series). */
function hBars(rows: { label: string; value: number }[]): string {
  const W = 560, rowH = 22, padL = 170, padR = 60, padT = 6;
  const H = padT + rows.length * rowH + 6;
  const max = Math.max(1, ...rows.map((r) => r.value));
  let out = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Event counts">`;
  rows.forEach((r, i) => {
    const yy = padT + i * rowH;
    const w = ((W - padL - padR) * r.value) / max;
    out += `<text class="tick" x="${padL - 8}" y="${yy + 15}" text-anchor="end">${esc(r.label)}</text>`;
    out += `<rect class="mark" x="${padL}" y="${yy + 4}" width="${w.toFixed(1)}" height="${rowH - 8}" rx="2" fill="var(--s1)"><title>${esc(r.label)}: ${r.value}</title></rect>`;
    out += `<text class="label" x="${(padL + w + 6).toFixed(1)}" y="${yy + 15}">${r.value}</text>`;
  });
  return out + '</svg>';
}

/** Diverging bars for goal factors: multipliers above 1 push right, below 1 push left. */
function factorBars(factors: GoalFactor[]): string {
  const W = 420, rowH = 22, mid = 220, half = 120, padT = 4;
  const rows = factors.filter((f) => f.name !== 'base');
  const H = padT + rows.length * rowH + 4;
  const scale = (m: number) => Math.max(-half, Math.min(half, Math.log(m) * 180));
  let out = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Goal factors">`;
  out += `<line x1="${mid}" x2="${mid}" y1="0" y2="${H}" stroke="var(--rule)" stroke-width="1"/>`;
  rows.forEach((f, i) => {
    const yy = padT + i * rowH;
    const dx = scale(f.multiplier);
    const color = f.multiplier >= 1 ? 'var(--up)' : 'var(--down)';
    out += `<text class="tick" x="${mid - half - 8}" y="${yy + 15}" text-anchor="end">${esc(f.name)}</text>`;
    out += `<rect class="mark" x="${(dx >= 0 ? mid : mid + dx).toFixed(1)}" y="${yy + 5}" width="${Math.abs(dx).toFixed(1)}" height="${rowH - 10}" rx="2" fill="${color}"><title>${esc(f.name)} x${f.multiplier.toFixed(3)} · ${esc(f.note)}</title></rect>`;
    out += `<text class="label" x="${mid + half + 8}" y="${yy + 15}">x${f.multiplier.toFixed(2)}</text>`;
  });
  return out + '</svg>';
}

function dataTable(head: string[], rows: (string | number)[][], numericFrom = 1): string {
  const th = head.map((h, i) => `<th${i >= numericFrom ? ' class="num"' : ''}>${esc(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c, i) => `<td${i >= numericFrom ? ' class="num"' : ''}>${esc(String(c))}</td>`).join('')}</tr>`).join('');
  return `<div class="scroll"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function leagueTableHtml(world: World, comp: CompetitionLeague): string {
  const rows = computeTable(world, comp).map((r) => {
    const c = world.clubs[r.clubId];
    const rel = comp.relegate > 0 && r.position > comp.clubIds.length - comp.relegate;
    const pro = comp.promote > 0 && r.position <= comp.promote;
    const champ = r.position === 1;
    const tag = champ ? '<span class="pill champ">champions</span>' : pro ? '<span class="pill up">promoted</span>' : rel ? '<span class="pill down">relegated</span>' : '';
    return `<tr><td class="num">${r.position}</td><td>${esc(c.name)} ${tag}</td><td class="num">${r.played}</td><td class="num">${r.won}</td><td class="num">${r.drawn}</td><td class="num">${r.lost}</td><td class="num">${r.gf}</td><td class="num">${r.ga}</td><td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="num pts">${r.points}</td></tr>`;
  }).join('');
  return `<div class="scroll"><table class="league"><thead><tr><th class="num">#</th><th>Club</th><th class="num">P</th><th class="num">W</th><th class="num">D</th><th class="num">L</th><th class="num">GF</th><th class="num">GA</th><th class="num">GD</th><th class="num">Pts</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function matchCard(world: World, f: Fixture, caption: string): string {
  const r = f.report;
  if (!r) return '';
  const h = world.clubs[f.homeClubId], a = world.clubs[f.awayClubId];
  const comp = world.competitions[f.competitionId];
  const goals = r.goals.map((g) => {
    const scorer = world.players[g.scorerId]?.name ?? g.scorerId;
    const assist = g.assistId ? ` <span class="muted">(${esc(world.players[g.assistId]?.name ?? g.assistId)})</span>` : '';
    return `<li><span class="min">${g.minute}'</span> <span class="who">${esc(world.clubs[g.clubId].short)}</span> ${esc(scorer)}${assist}</li>`;
  }).join('');
  const pens = r.penalties ? `<p class="muted">Penalties ${r.penalties.home}–${r.penalties.away}</p>` : '';
  return `<article class="match">
    <p class="eyebrow">${esc(caption)} · ${esc(comp.name)} · day ${f.day} · att ${r.attendance.toLocaleString('en-GB')}</p>
    <h3 class="score"><span>${esc(h.name)}</span><b>${f.homeGoals}–${f.awayGoals}</b><span>${esc(a.name)}</span></h3>
    <p class="muted">${esc(r.homeFormation)} v ${esc(r.awayFormation)} · expected goals ${r.lambda.home.toFixed(2)} v ${r.lambda.away.toFixed(2)}</p>
    <div class="factors">
      <div><p class="side">${esc(h.short)} factors</p>${factorBars(r.factors.home)}</div>
      <div><p class="side">${esc(a.short)} factors</p>${factorBars(r.factors.away)}</div>
    </div>
    ${goals ? `<ol class="goals">${goals}</ol>` : '<p class="muted">No goals.</p>'}
    ${pens}
  </article>`;
}

function pickSampleMatches(world: World): { fixture: Fixture; caption: string }[] {
  const played = Object.values(world.fixtures).filter((f) => f.played && f.report && f.season === world.season);
  const picks: { fixture: Fixture; caption: string }[] = [];
  const cupFinal = played.filter((f) => f.knockout).sort((x, y) => y.round - x.round || x.id.localeCompare(y.id))[0];
  if (cupFinal) picks.push({ fixture: cupFinal, caption: 'Cup final' });
  const thriller = [...played].sort((x, y) => (y.homeGoals + y.awayGoals) - (x.homeGoals + x.awayGoals) || x.id.localeCompare(y.id)).find((f) => !picks.some((p) => p.fixture.id === f.id));
  if (thriller) picks.push({ fixture: thriller, caption: 'Highest-scoring match' });
  const upset = [...played]
    .filter((f) => f.winnerId && !f.knockout)
    .map((f) => ({ f, gap: (f.winnerId === f.homeClubId ? f.report!.lambda.away - f.report!.lambda.home : f.report!.lambda.home - f.report!.lambda.away) }))
    .sort((x, y) => y.gap - x.gap || x.f.id.localeCompare(y.f.id))
    .find((x) => !picks.some((p) => p.fixture.id === x.f.id));
  if (upset) picks.push({ fixture: upset.f, caption: 'Biggest upset' });
  return picks;
}

export function renderReport(result: RunResult): string {
  const { world, seasons } = result;
  const cfg = world.config;
  const labels = seasons.map((s) => `S${s.season}`);
  const m = (f: (s: SeasonResult) => number) => seasons.map(f);
  const last = seasons[seasons.length - 1];
  const tiers = Object.keys(last.metrics.balanceByTier).sort();
  const seedName = cfg.seed.charAt(0).toUpperCase() + cfg.seed.slice(1);

  const leagues = Object.values(world.competitions)
    .filter((c): c is CompetitionLeague => c.kind === 'league' && c.season === world.season)
    .sort((a, b) => a.tier - b.tier);

  const honours = world.history.map((h) => {
    const cells = Object.entries(h.champions).sort().map(([cid, clubId]) => `${world.competitions[cid]?.name ?? cid}: ${world.clubs[clubId].name}`).join(' · ');
    const ts = h.topScorer ? `${world.players[h.topScorer.playerId]?.name ?? '?'} (${h.topScorer.goals})` : '—';
    return [`Season ${h.season}`, cells, h.promoted.map((id) => world.clubs[id].name).join(', ') || '—', ts];
  });

  const scorers = Object.values(world.players)
    .filter((p) => !p.retired && p.stats.goals > 0)
    .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists || a.id.localeCompare(b.id))
    .slice(0, 10)
    .map((p) => [p.name, p.clubId ? world.clubs[p.clubId].short : 'FA', p.position, p.age, Math.round(overall(p)), p.stats.apps, p.stats.goals, p.stats.assists, p.stats.apps ? (p.stats.ratingSum / p.stats.apps).toFixed(2) : '—']);

  const richest = Object.values(world.clubs)
    .sort((a, b) => b.balance - a.balance)
    .map((c) => [c.name, `Div ${tierFromLeagueId(c.leagueId)}`, money(c.balance), c.reputation, (world.idx.squadByClub[c.id] ?? []).length, c.managerId ? world.managers[c.managerId].name : 'vacant']);

  const eventRows = Object.entries(last.metrics.eventCounts).map(([label, value]) => ({ label, value }));
  const kinds = ['transfer', 'free', 'loan', 'renewal'];
  const transferSeries: Series[] = kinds.map((k) => ({ name: k, values: m((s) => s.metrics.transfers[k] ?? 0) }));
  const totalMatches = seasons.reduce((s, x) => s + x.metrics.matches, 0);
  const avgGoals = seasons.reduce((s, x) => s + x.metrics.goalsPerMatch * x.metrics.matches, 0) / Math.max(1, totalMatches);
  const avg = (f: (s: SeasonResult) => number) => seasons.reduce((s, x) => s + f(x), 0) / seasons.length;

  const samples = pickSampleMatches(world).map((s) => matchCard(world, s.fixture, s.caption)).join('');

  return `<title>${esc(seedName)} Simulation Annual</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{color-scheme:light;--bg:#f4f6f2;--surface:#fbfcfa;--ink:#14211b;--muted:#5b6862;--rule:#d7ddd6;--accent:#1e6e46;--accent-ink:#ffffff;--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--up:#2a78d6;--down:#e34948;--good:#0ca30c;--critical:#d03b3b;--display:"Barlow Condensed","Arial Narrow",Impact,sans-serif;--body:"IBM Plex Sans","Helvetica Neue",Arial,sans-serif;--mono:"IBM Plex Mono",Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#101613;--surface:#171f1a;--ink:#eef2ec;--muted:#a3ada6;--rule:#2b352f;--accent:#4cc48a;--accent-ink:#0b120e;--s1:#3987e5;--s2:#d95926;--s3:#199e70;--up:#3987e5;--down:#e66767}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#101613;--surface:#171f1a;--ink:#eef2ec;--muted:#a3ada6;--rule:#2b352f;--accent:#4cc48a;--accent-ink:#0b120e;--s1:#3987e5;--s2:#d95926;--s3:#199e70;--up:#3987e5;--down:#e66767}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.5}
a{color:var(--accent)}
main{max-width:1160px;margin:0 auto;padding:0 24px 64px}
.mast{border-bottom:3px solid var(--accent);padding:28px 0 18px;display:flex;flex-wrap:wrap;gap:16px 40px;align-items:flex-end;justify-content:space-between}
.mast h1{font-family:var(--display);font-weight:700;font-size:clamp(36px,6vw,64px);line-height:.95;margin:0;text-transform:uppercase;letter-spacing:.01em;text-wrap:balance}
.mast h1 small{display:block;font-size:.4em;font-weight:600;color:var(--accent);letter-spacing:.12em}
.runinfo{font-family:var(--mono);font-size:12px;color:var(--muted);display:grid;grid-template-columns:auto auto;gap:2px 14px}
.runinfo b{color:var(--ink);font-weight:500}
.eyebrow{font-family:var(--display);font-weight:600;text-transform:uppercase;letter-spacing:.14em;font-size:13px;color:var(--accent);margin:0 0 6px}
h2{font-family:var(--display);font-weight:700;font-size:30px;line-height:1.05;margin:0 0 4px;text-transform:uppercase;letter-spacing:.02em;text-wrap:balance}
section{padding:36px 0 8px;border-bottom:1px solid var(--rule)}
section > p.lede{max-width:64ch;color:var(--muted);margin:0 0 18px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:2px;background:var(--rule);border:1px solid var(--rule);margin-top:18px}
.tile{background:var(--surface);padding:14px 16px}
.tile .v{font-family:var(--display);font-weight:700;font-size:38px;line-height:1;font-variant-numeric:tabular-nums}
.tile .k{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:6px}
.tile .sub{font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:4px}
.duo{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:24px;align-items:start;margin:14px 0 22px}
@media (max-width:820px){.duo{grid-template-columns:1fr}}
.chart{width:100%;height:auto;display:block;background:var(--surface);border:1px solid var(--rule)}
.chart .grid{stroke:var(--rule);stroke-width:1}
.chart .tick{font-family:var(--mono);font-size:11px;fill:var(--muted)}
.chart .label{font-family:var(--body);font-size:11px;font-weight:500;fill:var(--ink)}
.chart .mark:hover{opacity:.75}
.legend{list-style:none;padding:0;margin:8px 0 0;display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--muted)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
th{font-family:var(--display);font-weight:600;text-transform:uppercase;letter-spacing:.06em;font-size:12px;color:var(--muted);text-align:left;padding:6px 8px;border-bottom:2px solid var(--rule)}
td{padding:6px 8px;border-bottom:1px solid var(--rule);vertical-align:top}
.num{text-align:right;font-family:var(--mono)}
td.pts{font-weight:600}
.league td:nth-child(2){white-space:nowrap}
.pill{display:inline-block;font-family:var(--display);font-weight:600;text-transform:uppercase;letter-spacing:.08em;font-size:10px;padding:1px 6px;margin-left:6px;border-radius:2px;vertical-align:1px}
.pill.champ{background:var(--accent);color:var(--accent-ink)}
.pill.up{border:1px solid var(--accent);color:var(--accent)}
.pill.down{border:1px solid var(--critical);color:var(--critical)}
.tables{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:24px;margin:14px 0 22px}
.tables h3{font-family:var(--display);font-weight:600;font-size:20px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.04em}
.matches{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:20px;margin:14px 0 22px}
.match{background:var(--surface);border:1px solid var(--rule);padding:16px 18px}
.match .eyebrow{color:var(--muted);letter-spacing:.1em;font-size:12px}
.score{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;font-family:var(--display);font-weight:600;font-size:20px;margin:6px 0 2px;text-transform:uppercase}
.score span:last-child{text-align:right}
.score b{font-size:34px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--accent)}
.factors{display:grid;grid-template-columns:1fr;gap:6px;margin:10px 0}
.factors .chart{border:0;background:transparent}
.side{font-family:var(--display);font-weight:600;text-transform:uppercase;letter-spacing:.08em;font-size:12px;color:var(--muted);margin:6px 0 0}
.goals{list-style:none;padding:0;margin:8px 0 0;font-size:13px}
.goals li{padding:2px 0;border-top:1px dotted var(--rule)}
.goals .min{font-family:var(--mono);display:inline-block;width:32px;color:var(--muted)}
.goals .who{font-family:var(--display);font-weight:600;display:inline-block;width:40px;letter-spacing:.06em}
.muted{color:var(--muted)}
footer{padding:24px 0;font-family:var(--mono);font-size:12px;color:var(--muted)}
@media (prefers-reduced-motion:no-preference){.chart .mark{transition:opacity .12s}}
</style>
<main>
<header class="mast">
  <h1><small>Simulation annual</small>${esc(seedName)} · Seasons ${seasons[0].season}–${last.season}</h1>
  <dl class="runinfo">
    <dt>seed</dt><dd><b>${esc(cfg.seed)}</b></dd>
    <dt>world</dt><dd><b>${cfg.leagues} divisions × ${cfg.clubsPerLeague} clubs, squads of ${cfg.squadSize}</b></dd>
    <dt>events</dt><dd><b>${result.totalEvents.toLocaleString('en-GB')}</b> in ${result.elapsedMs} ms</dd>
    <dt>final hash</dt><dd><b>${last.hash.slice(0, 16)}</b></dd>
  </dl>
</header>

<section>
  <p class="eyebrow">At a glance</p>
  <h2>${totalMatches.toLocaleString('en-GB')} matches over ${seasons.length} season${seasons.length === 1 ? '' : 's'}</h2>
  <div class="tiles">
    <div class="tile"><div class="v">${avgGoals.toFixed(2)}</div><div class="k">Goals per match</div><div class="sub">target 2.6–2.8</div></div>
    <div class="tile"><div class="v">${avg((s) => s.metrics.homeWinPct).toFixed(0)}%</div><div class="k">Home wins</div><div class="sub">draws ${avg((s) => s.metrics.drawPct).toFixed(0)}% · away ${avg((s) => s.metrics.awayWinPct).toFixed(0)}%</div></div>
    <div class="tile"><div class="v">${seasons.reduce((s, x) => s + (x.metrics.transfers.transfer ?? 0) + (x.metrics.transfers.free ?? 0), 0)}</div><div class="k">Signings</div><div class="sub">${money(seasons.reduce((s, x) => s + x.metrics.totalFees, 0))} in fees</div></div>
    <div class="tile"><div class="v">${seasons.reduce((s, x) => s + x.metrics.sackings, 0)}</div><div class="k">Managers sacked</div><div class="sub">${seasons.reduce((s, x) => s + x.metrics.injuries, 0)} injuries</div></div>
    <div class="tile"><div class="v">${last.metrics.insolventClubs}</div><div class="k">Clubs in the red</div><div class="sub">avg squad ${last.metrics.avgSquadSize}, age ${last.metrics.avgAge}</div></div>
  </div>
</section>

<section>
  <p class="eyebrow">Results</p>
  <h2>Scoring and outcome balance</h2>
  <p class="lede">Expected goals come from a base rate multiplied by named factors, then Poisson draws. The line should sit inside the 2.6–2.8 band; the split should hover near 45/25/30.</p>
  <div class="duo">
    <div>${lineChart(labels, [{ name: 'goals/match', values: m((s) => s.metrics.goalsPerMatch) }], { yMin: 2.0, format: (v) => v.toFixed(2) })}</div>
    ${dataTable(['Season', 'Matches', 'Goals/match', 'Clean sheets', 'Biggest'], seasons.map((s) => [labels[s.season - seasons[0].season], s.metrics.matches, s.metrics.goalsPerMatch.toFixed(2), pct(s.metrics.cleanSheetPct), s.metrics.maxScoreline]))}
  </div>
  <div class="duo">
    <div>${stackedBars(labels, [{ name: 'home win', values: m((s) => s.metrics.homeWinPct) }, { name: 'draw', values: m((s) => s.metrics.drawPct) }, { name: 'away win', values: m((s) => s.metrics.awayWinPct) }], { normalize: true })}${legend(['home win', 'draw', 'away win'])}</div>
    ${dataTable(['Season', 'Home', 'Draw', 'Away'], seasons.map((s) => [labels[s.season - seasons[0].season], pct(s.metrics.homeWinPct), pct(s.metrics.drawPct), pct(s.metrics.awayWinPct)]))}
  </div>
</section>

<section>
  <p class="eyebrow">Money</p>
  <h2>Average club balance by division</h2>
  <p class="lede">Wages, running costs, gate receipts, sponsorship and prize money should net to roughly zero over a season, so the lines should drift rather than climb.</p>
  <div class="duo">
    <div>${lineChart(labels, tiers.map((t) => ({ name: `Div ${t.slice(1)}`, values: m((s) => s.metrics.balanceByTier[t] ?? 0) })), { yMin: 0, format: (v) => money(v) })}${legend(tiers.map((t) => `Div ${t.slice(1)}`))}</div>
    ${dataTable(['Club', 'Division', 'Balance', 'Rep', 'Squad', 'Manager'], richest.slice(0, 8))}
  </div>
</section>

<section>
  <p class="eyebrow">Market</p>
  <h2>Transfer activity by kind</h2>
  <p class="lede">Permanent signings, free-agent captures and loans per season; renewals are shown in the table. Windows open for the first four weeks and weeks 24–27.</p>
  <div class="duo">
    <div>${stackedBars(labels, transferSeries.slice(0, 3))}${legend(kinds.slice(0, 3))}</div>
    ${dataTable(['Season', 'Transfers', 'Free', 'Loans', 'Renewals', 'Fees', 'Contract'], seasons.map((s) => [labels[s.season - seasons[0].season], s.metrics.transfers.transfer ?? 0, s.metrics.transfers.free ?? 0, s.metrics.transfers.loan ?? 0, s.metrics.transfers.renewal ?? 0, money(s.metrics.totalFees), `${s.metrics.avgContractLength}y`]))}
  </div>
</section>

<section>
  <p class="eyebrow">Tables</p>
  <h2>Final standings, season ${world.season}</h2>
  <div class="tables">${leagues.map((l) => `<div><h3>${esc(l.name)}</h3>${leagueTableHtml(world, l)}</div>`).join('')}</div>
</section>

<section>
  <p class="eyebrow">Honours</p>
  <h2>Champions, promotions and golden boots</h2>
  <div style="margin:14px 0 22px">${dataTable(['Season', 'Champions', 'Promoted', 'Top scorer'], honours, 99)}</div>
</section>

<section>
  <p class="eyebrow">Scorers</p>
  <h2>Season ${world.season} leading scorers</h2>
  <div style="margin:14px 0 22px">${dataTable(['Player', 'Club', 'Pos', 'Age', 'Ovr', 'Apps', 'Goals', 'Assists', 'Rating'], scorers, 3)}</div>
</section>

<section>
  <p class="eyebrow">Match reports</p>
  <h2>Why results happened</h2>
  <p class="lede">Each side's expected goals is the base rate times these multipliers. Bars to the right raised the expectation; bars to the left lowered it.</p>
  <div class="matches">${samples}</div>
</section>

<section>
  <p class="eyebrow">Events</p>
  <h2>Event log, season ${last.season}</h2>
  <div class="duo">
    <div>${hBars(eventRows)}</div>
    <p class="lede">Every state change is one of these events. Replaying the log from an empty world rebuilds the same hash, which is how determinism is tested.</p>
  </div>
</section>

<footer>Generated by the sports simulation engine · seed ${esc(cfg.seed)} · final hash ${last.hash}</footer>
</main>
`;
}
