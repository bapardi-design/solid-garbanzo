import Link from 'next/link';
import { LIMITS, PRO_PRICE_LABEL } from '@/lib/entitlements';

export default function Home() {
  return (
    <main className="page">
      <div className="wrap">
        <section className="hero">
          <div>
            <p className="eyebrow">Football management, no download</p>
            <h1>Take the touchline. Keep your job.</h1>
            <p className="lede">
              Pick a club in a two-division pyramid, set the tactics, work the transfer market, keep the wage bill honest, and give the board a reason not to sack you. Every season plays out in seconds, and the same seed always produces the same world.
            </p>
            <div className="actions">
              <Link href="/play/new" className="btn primary">Start a career, free</Link>
              <Link href="/pricing" className="btn">See Pro</Link>
            </div>
          </div>
          <aside className="board" aria-label="What the board expects">
            <p className="eyebrow">Board expectations</p>
            <h3>Finish where your squad says you should</h3>
            <p className="muted">Each pre-season the board ranks every squad in the division and sets your target. Fall five places short with poor form and you are gone. Beat it and the budget grows.</p>
            <ul className="muted" style={{ paddingLeft: 18, margin: 0 }}>
              <li>Explainable results: every goal traces back to named factors</li>
              <li>A live market: AI clubs buy, sell, loan and renew around you</li>
              <li>Promotion, relegation and a national cup every season</li>
            </ul>
          </aside>
        </section>

        <section className="features" aria-label="Features">
          <div><h3>Tactics that matter</h3><p>Balanced, attacking or defensive shapes change your expected goals both ways. The match report shows exactly how much.</p></div>
          <div><h3>Squad building</h3><p>Bid for listed players, poach unsettled ones, release deadwood with a payoff, and renew the ones who want to stay.</p></div>
          <div><h3>Money is real</h3><p>Wages, gate receipts, sponsorship, prize money and running costs. Go into the red and the market stops answering.</p></div>
          <div><h3>Plays anywhere</h3><p>The whole engine runs in your browser. Free careers save on this device; Pro careers save to the cloud.</p></div>
        </section>

        <section>
          <p className="eyebrow">Plans</p>
          <h2>Free to start. Pro to keep going.</h2>
          <div className="plans">
            <div className="plan-card">
              <h3>Free</h3>
              <div className="price">£0</div>
              <ul>
                <li>{LIMITS.free.maxSeasons} seasons per career</li>
                <li>Saves on this device</li>
                <li>Full tactics, transfers and contracts</li>
              </ul>
              <Link href="/play/new" className="btn">Play now</Link>
            </div>
            <div className="plan-card featured">
              <h3>Pro</h3>
              <div className="price">{PRO_PRICE_LABEL}</div>
              <ul>
                <li>Unlimited seasons and careers</li>
                <li>Cloud saves across devices</li>
                <li>Season reports with charts</li>
              </ul>
              <Link href="/pricing" className="btn primary">Go Pro</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
