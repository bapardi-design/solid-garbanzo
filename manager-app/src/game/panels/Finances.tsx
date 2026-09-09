'use client';
import Engine, { type BoardStatus } from 'sim-engine';
import { money, wage } from '../format';
import type { GameT } from './shared';

const LABELS: Record<string, string> = { wages: 'Player wages', sponsorship: 'Commercial and broadcast', operations: 'Running costs', gate: 'Gate receipts', prize: 'League prize money', cup: 'Cup prize money', transfers_in: 'Transfer fees paid', transfers_out: 'Transfer fees received', payoff: 'Contract payoffs' };

export function FinancesPanel({ game, clubId, board, onPlayer }: { game: GameT; clubId: string; board: BoardStatus | null; onPlayer: (id: string) => void }) {
  const { world } = game;
  const club = world.clubs[clubId];
  const cur = Engine.currencyFor(world, clubId);
  const ledger = Object.entries(club.ledger).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const income = ledger.filter(([, v]) => v > 0).reduce((s, [, v]) => s + v, 0);
  const spend = ledger.filter(([, v]) => v < 0).reduce((s, [, v]) => s + v, 0);
  const earners = Engine.squad(world, clubId).map((p) => ({ p, c: Engine.contractOf(world, p.id) })).filter((x) => x.c).sort((a, b) => (b.c!.wage - a.c!.wage)).slice(0, 10);
  const bar = (v: number) => Math.min(100, (Math.abs(v) / Math.max(1, Math.abs(ledger[0]?.[1] ?? 1))) * 100);
  return (
    <div className="stack">
      <div className="tiles">
        <div className="tile"><div className="v">{money(club.balance, cur)}</div><div className="k">Bank</div><div className="sub">{club.balance < 0 ? 'in the red: the market stops answering' : 'in credit'}</div></div>
        <div className="tile"><div className="v">{wage(board?.wageBill ?? 0, cur)}</div><div className="k">Wage bill</div><div className="sub">budget {wage(board?.wageBudget ?? 0, cur)}</div></div>
        <div className="tile"><div className="v">{money(board?.transferBudget ?? 0, cur)}</div><div className="k">Transfer budget</div><div className="sub">reset each pre-season</div></div>
        <div className="tile"><div className="v">{money(income + spend, cur)}</div><div className="k">Season result</div><div className="sub">in {money(income, cur)} · out {money(spend, cur)}</div></div>
      </div>
      <div className="grid-2">
        <section className="panel">
          <header><h3>This season</h3></header>
          <div className="scroll">
            <table>
              <thead><tr><th>Category</th><th></th><th className="num">Total</th></tr></thead>
              <tbody>{ledger.length === 0 ? <tr><td colSpan={3} className="empty">Nothing posted yet this season.</td></tr> : ledger.map(([k, v]) => <tr key={k}><td>{LABELS[k] ?? k.replace('_', ' ')}</td><td style={{ width: '40%' }}><div className="bar"><i style={{ width: `${bar(v)}%`, background: v >= 0 ? 'var(--up)' : 'var(--down)' }} /></div></td><td className="num">{money(v, cur)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <header><h3>Top earners</h3></header>
          <div className="scroll">
            <table>
              <thead><tr><th>Player</th><th>Pos</th><th className="num">Ovr</th><th className="num">Wage</th><th className="num">Until</th></tr></thead>
              <tbody>{earners.map(({ p, c }) => <tr key={p.id} onClick={() => onPlayer(p.id)} style={{ cursor: 'pointer' }}><td><a>{p.name}</a></td><td>{p.position}</td><td className="num">{Math.round(Engine.overall(p))}</td><td className="num">{wage(c!.wage, cur)}</td><td className="num">S{c!.endSeason}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
