'use client';
import Engine, { type Tactic } from 'sim-engine';
import { Ovr, type Action, type GameT } from './shared';

const TACTICS: { id: Tactic; name: string; shape: string; blurb: string }[] = [
  { id: 'balanced', name: 'Balanced', shape: '4-4-2', blurb: 'Even attack and defence. The safe default.' },
  { id: 'attacking', name: 'Attacking', shape: '4-3-3', blurb: 'About 12% more expected goals for you, and 12% more for them.' },
  { id: 'defensive', name: 'Defensive', shape: '5-4-1', blurb: 'About 14% fewer goals conceded, 12% fewer scored. For protecting a lead or a weak squad.' },
];

const ROWS: Record<string, number[]> = { '4-4-2': [1, 4, 4, 2], '4-3-3': [1, 4, 3, 3], '5-4-1': [1, 5, 4, 1] };

export function TacticsPanel({ game, clubId, onAction, onPlayer }: { game: GameT; clubId: string; onAction: Action; onPlayer: (id: string) => void }) {
  const { world, ctx } = game;
  const club = world.clubs[clubId];
  const sel = Engine.selectXI(world, clubId, club.tactic);
  const rows = ROWS[sel.formation] ?? [1, 4, 4, 2];
  const lines = (['GK', 'DF', 'MF', 'FW'] as const).map((pos) => sel.byPos[pos]);
  return (
    <div className="grid-2">
      <section className="panel">
        <header><h3>Shape</h3><span className="muted">current: {club.tactic}</span></header>
        <div className="body stack">
          {TACTICS.map((t) => (
            <label key={t.id} className="card" style={{ cursor: 'pointer', borderColor: club.tactic === t.id ? 'var(--accent)' : undefined }}>
              <div className="actions"><input type="radio" name="tactic" checked={club.tactic === t.id} onChange={() => onAction(Engine.setTactic(ctx, t.id))} /><h3 style={{ margin: 0 }}>{t.name} <span className="mono muted">{t.shape}</span></h3></div>
              <p className="muted" style={{ margin: 0 }}>{t.blurb}</p>
            </label>
          ))}
          <p className="muted">The XI is picked automatically from your fittest, best-rated players for the shape. Injured players are skipped; out-of-position players play at a discount.</p>
        </div>
      </section>
      <section className="panel">
        <header><h3>Starting XI</h3><span className="muted">{sel.formation}</span></header>
        <div className="pitch">
          {lines.map((line, i) => (
            <div className="line" key={i}>
              {line.slice(0, rows[i]).map((s) => { const p = world.players[s.playerId]; return <button key={s.playerId} className="dot" onClick={() => onPlayer(s.playerId)} title={`${p.name} ${s.rating.toFixed(1)}`}><span className="n">{p.name.split(' ').slice(-1)[0]}</span><Ovr v={s.rating} /></button>; })}
            </div>
          ))}
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Slot</th><th>Player</th><th className="num">Rating</th><th className="num">Fit</th><th className="num">Form</th></tr></thead>
            <tbody>
              {(['GK', 'DF', 'MF', 'FW'] as const).flatMap((pos) => sel.byPos[pos].map((s) => { const p = world.players[s.playerId]; return <tr key={s.playerId} onClick={() => onPlayer(s.playerId)} style={{ cursor: 'pointer' }}><td>{pos}</td><td><a>{p.name}</a>{p.position !== pos ? <span className="muted"> (out of position)</span> : null}</td><td className="num">{s.rating.toFixed(1)}</td><td className="num">{Math.round(p.fitness)}</td><td className="num">{Math.round(p.form)}</td></tr>; }))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
