/** Broadcast-style preview for the landing page: all drawn, nothing fetched. */
import { Crest } from '@/game/marks';

const TABLE = [
  { pos: 1, club: 'Arsenal', pl: 12, gd: '+14', pts: 28 },
  { pos: 2, club: 'Manchester City', pl: 12, gd: '+16', pts: 27 },
  { pos: 3, club: 'Liverpool', pl: 12, gd: '+9', pts: 24 },
  { pos: 4, club: 'Aston Villa', pl: 12, gd: '+4', pts: 21 },
];

export function HeroArt() {
  return (
    <div className="hero-art">
      <div className="pitch-bg" aria-hidden="true" />
      <div className="hero-card">
        <p className="eyebrow" style={{ color: 'var(--accent)' }}>Premier Division · matchday 12</p>
        <div className="hero-score">
          <div><Crest name="Arsenal" short="ARS" size="l" /><b>Arsenal</b></div>
          <div className="n">2<span>–</span>1</div>
          <div><Crest name="Chelsea" short="CHE" size="l" /><b>Chelsea</b></div>
        </div>
        <ul className="hero-feed">
          <li><span>31&apos;</span> GOAL! Saka finishes clinically. ARS 1-0 CHE.</li>
          <li><span>68&apos;</span> Half-time switch to attacking pays off.</li>
          <li><span>84&apos;</span> GOAL! Gyökeres heads the winner. ARS 2-1 CHE.</li>
        </ul>
        <table className="hero-table">
          <tbody>
            {TABLE.map((r) => (
              <tr key={r.pos} className={r.club === 'Arsenal' ? 'mine' : ''}>
                <td className="p">{r.pos}</td>
                <td><Crest name={r.club} short={r.club.slice(0, 3).toUpperCase()} size="xs" /></td>
                <td className="c">{r.club}</td>
                <td className="num">{r.pl}</td>
                <td className="num">{r.gd}</td>
                <td className="num pts">{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FeatureIcon({ kind }: { kind: 'tactics' | 'squad' | 'money' | 'browser' }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (kind === 'tactics') return <svg {...common}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 4v16M2 12h4M18 12h4" /><circle cx="12" cy="12" r="3" /></svg>;
  if (kind === 'squad') return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0-2-5.2M21 20a6 6 0 0 0-4-5.6" /></svg>;
  if (kind === 'money') return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>;
  return <svg {...common}><rect x="2" y="4" width="20" height="15" rx="2" /><path d="M2 9h20M8 22h8" /></svg>;
}
