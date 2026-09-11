'use client';
/**
 * The boardroom: the club's bank account, the things the manager has to sign
 * off on, and the state of the place away from the pitch.
 */
import Engine from 'sim-engine';
import { money, wage } from '../format';
import type { GameT } from './shared';

type View = NonNullable<ReturnType<typeof Engine.boardroomView>>;
type Decision = View['pending'][number];

const KIND_LABEL: Record<string, string> = {
  sponsor: 'Commercial', stadium: 'Ground', academy: 'Academy', medical: 'Medical',
  scouting: 'Scouting', tickets: 'Supporters', bonus: 'Dressing room', agent_fee: 'Transfer',
  debt: 'The bank', community: 'Community',
};

function Meter({ level, max }: { level: number; max: number }) {
  return (
    <span className="meter" aria-label={`${level} of ${max}`}>
      {Array.from({ length: max }, (_, i) => <i key={i} className={i < level ? 'on' : ''} />)}
    </span>
  );
}

function DecisionCard({ d, cur, onDecide, busy }: { d: Decision; cur: string; onDecide: (id: string, option: string) => void; busy: boolean }) {
  return (
    <article className="decision">
      <header>
        <span className="tag">{KIND_LABEL[d.kind] ?? d.kind}</span>
        <h3>{d.title}</h3>
      </header>
      <p>{d.body}</p>
      <div className="options">
        {d.options.map((o) => (
          <button key={o.id} className="option" disabled={busy} onClick={() => onDecide(d.id, o.id)}>
            <b>{o.label}</b>
            <span>{o.detail}</span>
            <span className="cost">
              {o.cost ? <em className="out">{money(o.cost, cur)} now</em> : null}
              {o.borrow ? <em className="in">+{money(o.borrow, cur)}</em> : null}
              {o.weekly ? <em className={o.weekly > 0 ? 'in' : 'out'}>{o.weekly > 0 ? '+' : '−'}{wage(Math.abs(o.weekly), cur)}</em> : null}
              {!o.cost && !o.weekly && !o.borrow ? <em className="muted">no money moves</em> : null}
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}

export function BoardroomPanel({ game, onAction }: { game: GameT; onAction: (r: { ok: boolean; message: string }) => void }) {
  const view = Engine.boardroomView(game.world) as View | null;
  if (!view) return <p className="empty">You need a club before anyone hands you a chequebook.</p>;
  const cur = view.currency;
  const decide = (id: string, option: string) => onAction(Engine.decide(game.ctx, id, option));

  return (
    <div className="stack">
      <section className="panel account">
        <div className="account-head">
          <div>
            <p className="eyebrow">Club account</p>
            <div className="bal">{money(view.balance, cur)}</div>
            <p className="muted mono">
              {view.netWeekly >= 0 ? 'running a surplus of ' : 'losing '}
              {wage(Math.abs(view.netWeekly), cur)}
              {view.debt > 0 ? ` · ${money(view.debt, cur)} owed to the bank` : ''}
            </p>
          </div>
          <table className="ledger">
            <tbody>
              {view.lines.map((l) => (
                <tr key={l.label}>
                  <td>{l.label}</td>
                  <td className={`num ${l.weekly >= 0 ? 'in' : 'out'}`}>{l.weekly >= 0 ? '+' : '−'}{wage(Math.abs(l.weekly), cur)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Every week</td>
                <td className={`num ${view.netWeekly >= 0 ? 'in' : 'out'}`}>{view.netWeekly >= 0 ? '+' : '−'}{wage(Math.abs(view.netWeekly), cur)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header>
          <h3>On your desk</h3>
          <span className="muted">{view.pending.length ? `${view.pending.length} waiting on you` : 'nothing today'}</span>
        </header>
        {view.pending.length === 0 ? (
          <p className="empty">Nothing needs signing. The chairman will find something.</p>
        ) : (
          <div className="decisions">
            {view.pending.map((d) => <DecisionCard key={d.id} d={d} cur={cur} onDecide={decide} busy={false} />)}
          </div>
        )}
      </section>

      <div className="grid-2">
        <section className="panel">
          <header><h3>The club</h3><span className="muted">what the money has built</span></header>
          <div className="body stack" style={{ gap: 10 }}>
            {view.facilities.map((f) => (
              <div className="facility" key={f.key}>
                <span className="fname">{f.label}</span>
                <Meter level={f.level} max={f.max} />
                <span className="muted small">{f.note}</span>
              </div>
            ))}
            <dl className="facts">
              <dt>Ground</dt><dd>{view.stadiumCapacity.toLocaleString('en-GB')} seats</dd>
              <dt>Ticket price</dt><dd>{Math.round(view.ticketLevel * 100)}% of the going rate</dd>
              <dt>Shirt sponsor</dt><dd>{view.sponsor ? `${view.sponsor.name} · ${wage(view.sponsor.weekly, cur)} to season ${view.sponsor.untilSeason}` : 'none signed'}</dd>
              {view.debt > 0 ? <><dt>Loan</dt><dd>{money(view.debt, cur)} outstanding, {wage(view.repayment, cur)}</dd></> : null}
            </dl>
            {view.projects.length ? (
              <div className="projects">
                <h4>Work under way</h4>
                {view.projects.map((p) => (
                  <p key={p.label} className="muted small">{p.label} — {p.weeksLeft} week{p.weeksLeft === 1 ? '' : 's'} left{p.seats ? `, ${p.seats.toLocaleString('en-GB')} seats` : ''}</p>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <header><h3>Signed off</h3><span className="muted">your last calls</span></header>
          {view.settled.length === 0 ? <p className="empty">Nothing yet.</p> : (
            <ul className="settled">
              {view.settled.map((d) => {
                const opt = d.options.find((o) => o.id === d.chosen);
                return (
                  <li key={d.id}>
                    <span className="tag">{KIND_LABEL[d.kind] ?? d.kind}</span>
                    <b>{d.title}</b>
                    <span className={d.chosen === 'lapsed' ? 'muted' : ''}>{d.chosen === 'lapsed' ? 'Left too long; the offer went away.' : opt?.label ?? ''}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
